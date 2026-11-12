// Point d'entrée : état de la partie, logique des tours et liaison avec l'interface.

import { createRng, randomSeed } from "./rng.js";
import { generateDungeon, restoreDungeon, TILE } from "./dungeon.js";
import { createRenderer } from "./render.js";
import { bindInput } from "./input.js";
import { computeFov } from "./fov.js";
import { spawnMonsters, spawnItems, spawnAround } from "./spawn.js";
import { distanceMap } from "./pathfinding.js";
import { decideAction } from "./ai.js";
import { attack } from "./combat.js";
import { nameOf } from "./monsters.js";
import { gainXp, xpToNextLevel } from "./progression.js";
import { FINAL_DEPTH, createDragon, decideBossAction, breathDamage, shouldEnrage, enrage } from "./boss.js";
import { flameTrail } from "./effects.js";
import { saveGame, loadGame, clearSave } from "./save.js";
import { computeScore, recordScore } from "./scores.js";
import { play, toggleMute, isMuted } from "./audio.js";
import { ITEM_TYPES, createItem, randomItemType, itemLabel, itemSummary } from "./items.js";
import {
  INVENTORY_SIZE,
  createInventory,
  addItem,
  removeAt,
  equip,
  recomputeStats,
} from "./inventory.js";

const MAP_WIDTH = 60;
const MAP_HEIGHT = 36;
const MAX_LOG_LINES = 5;
const FOV_RADIUS = 8;
const REGEN_EVERY = 8; // le joueur récupère 1 PV tous les N tours
const LOOT_CHANCE = 0.2; // probabilité qu'un monstre lâche un objet

const PLAYER_STATS = { maxHp: 30, baseAttack: 5, baseDefense: 1 };

const ui = {
  canvas: document.getElementById("screen"),
  hp: document.getElementById("hp"),
  hpFill: document.getElementById("hp-fill"),
  depth: document.getElementById("depth"),
  turns: document.getElementById("turns"),
  explored: document.getElementById("explored"),
  seed: document.getElementById("seed"),
  log: document.getElementById("log"),
  gameover: document.getElementById("gameover"),
  gameoverText: document.getElementById("gameover-text"),
  atk: document.getElementById("atk"),
  def: document.getElementById("def"),
  weapon: document.getElementById("weapon"),
  armor: document.getElementById("armor"),
  kills: document.getElementById("kills"),
  bagCount: document.getElementById("bag-count"),
  inventory: document.getElementById("inventory"),
  panel: document.querySelector(".panel"),
  level: document.getElementById("level"),
  xp: document.getElementById("xp"),
  xpFill: document.getElementById("xp-fill"),
  gameoverTitle: document.getElementById("gameover-title"),
  bossBar: document.getElementById("boss-bar"),
  bossFill: document.getElementById("boss-fill"),
  bossState: document.getElementById("boss-state"),
  scoreLine: document.getElementById("score-line"),
  scores: document.getElementById("scores"),
  soundState: document.getElementById("sound-state"),
};

const renderer = createRenderer(ui.canvas);
renderer.resize(MAP_WIDTH, MAP_HEIGHT);

let state;

function readSeedFromUrl() {
  const param = new URLSearchParams(location.search).get("seed");
  const seed = Number(param);
  return param !== null && Number.isFinite(seed) ? seed >>> 0 : null;
}

function createPlayer() {
  const player = { x: 0, y: 0, hp: PLAYER_STATS.maxHp, level: 1, xp: 0, ...PLAYER_STATS };
  recomputeStats(player, createInventory());
  return player;
}

function freshState(seed) {
  return {
    seed,
    // Deux générateurs séparés : les niveaux ne dépendent que de la graine,
    // pas de la façon dont se sont déroulés les combats.
    levelRng: createRng(seed),
    combatRng: createRng(seed ^ 0x9e3779b9),
    depth: 1,
    turns: 0,
    kills: 0,
    over: false, // partie terminée (mort ou victoire) : plus aucune action possible
    dead: false,
    won: false,
    effects: [],
    dungeon: null,
    monsters: [],
    items: [],
    player: createPlayer(),
    inventory: createInventory(),
    messages: [],
  };
}

function resetScreen() {
  ui.log.innerHTML = "";
  ui.gameover.hidden = true;
  ui.gameover.classList.remove("victory");
}

function newGame(seed = randomSeed()) {
  clearSave();
  state = freshState(seed);
  resetScreen();
  enterLevel();
  log("Tu descends dans les caves sous la Grand-Place…");
  saveGame(state);
  render();
}

// Reprend la partie sauvegardée là où elle s'était arrêtée.
function resumeGame(data) {
  state = {
    ...freshState(data.seed),
    depth: data.depth,
    turns: data.turns,
    kills: data.kills,
    dungeon: restoreDungeon(data.dungeon),
    monsters: data.monsters,
    items: data.items,
    player: data.player,
    inventory: data.inventory,
    messages: data.messages,
  };
  state.levelRng.setState(data.levelRng);
  state.combatRng.setState(data.combatRng);
  resetScreen();
  updateFov();
  log("Partie reprise. Bon retour dans les caves !", "loot");
  render();
}

function isFinalLevel() {
  return state.depth === FINAL_DEPTH;
}

function enterLevel() {
  const final = isFinalLevel();
  const rng = state.levelRng;
  state.dungeon = generateDungeon(MAP_WIDTH, MAP_HEIGHT, rng, { withStairs: !final });
  const { dungeon } = state;

  // Au dernier étage, l'antre (salle la plus éloignée) est réservée au Dragon.
  state.monsters = spawnMonsters(dungeon, state.depth, rng, {
    exclude: final ? [dungeon.exitRoom] : [],
  });
  state.items = spawnItems(dungeon, state.depth, rng);
  if (final) {
    state.monsters.push(createDragon(dungeon.stairs.x, dungeon.stairs.y));
    placeLastGift();
  }

  state.player.x = dungeon.start.x;
  state.player.y = dungeon.start.y;
  state.effects = [];
  updateFov();
}

// Une grande potion offerte à côté de l'entrée de l'antre, pour aborder le combat final.
function placeLastGift() {
  const { dungeon } = state;
  const type = ITEM_TYPES.find((t) => t.id === "big-potion");
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
    const x = dungeon.start.x + dx;
    const y = dungeon.start.y + dy;
    if (dungeon.get(x, y) === TILE.FLOOR && !itemAt(x, y)) {
      state.items.push(createItem(type, x, y));
      return;
    }
  }
}

// Recalcule ce que le joueur voit depuis sa position actuelle.
function updateFov() {
  const { dungeon, player } = state;
  dungeon.clearVisible();
  computeFov(
    player.x,
    player.y,
    FOV_RADIUS,
    (x, y) => dungeon.isOpaque(x, y),
    (x, y) => dungeon.reveal(x, y),
  );
}

function log(text, kind = "") {
  state.messages.unshift({ text, kind });
  state.messages.length = Math.min(state.messages.length, MAX_LOG_LINES);
  ui.log.innerHTML = state.messages
    .map((m) => `<li class="${m.kind}">${m.text}</li>`)
    .join("");
}

function monsterAt(x, y) {
  return state.monsters.find((m) => m.x === x && m.y === y);
}

function itemAt(x, y) {
  return state.items.find((i) => i.x === x && i.y === y);
}

function onStairs() {
  const { x, y } = state.player;
  return state.dungeon.get(x, y) === TILE.STAIRS;
}

// ---- Actions du joueur -------------------------------------------------

function playerMove(dx, dy) {
  if (state.over) return;
  const nx = state.player.x + dx;
  const ny = state.player.y + dy;

  const target = monsterAt(nx, ny);
  if (target) {
    playerAttack(target);
  } else if (state.dungeon.isWalkable(nx, ny)) {
    state.player.x = nx;
    state.player.y = ny;
    updateFov();
    pickUp();
    if (onStairs()) log("Un escalier s'enfonce dans les ténèbres… (Entrée pour descendre)");
  } else {
    return; // foncer dans un mur ne coûte pas de tour
  }
  endTurn();
}

// Ramassage automatique quand on marche sur un objet.
function pickUp() {
  const item = itemAt(state.player.x, state.player.y);
  if (!item) return;
  if (!addItem(state.inventory, item)) {
    log(`Tu vois ${itemLabel(item)}, mais ton sac est plein.`);
    return;
  }
  state.items = state.items.filter((i) => i !== item);
  const slot = state.inventory.items.length;
  log(`Tu ramasses ${itemLabel(item)}. (touche ${slot})`, "loot");
  play("pickup");
}

function playerAttack(monster) {
  const result = attack(state.player, monster, state.combatRng);
  if (!result.hit) {
    log(`Tu rates ${nameOf(monster)}.`);
    play("miss");
  } else if (result.killed) {
    play("kill");
    state.monsters = state.monsters.filter((m) => m !== monster);
    state.kills++;
    log(`Tu terrasses ${nameOf(monster)} ! (+${monster.xp} XP)`, "kill");
    earnXp(monster.xp);
    if (monster.boss) {
      victory();
      return;
    }
    dropLoot(monster);
  } else {
    log(`Tu frappes ${nameOf(monster)} (−${result.damage}).`, "hit");
    play("hit");
    if (monster.boss && shouldEnrage(monster)) dragonRage(monster);
  }
}

// Sous 50 % de PV, le Dragon enrage et les hommes de feuilles accourent, comme au Lumeçon.
function dragonRage(dragon) {
  enrage(dragon);
  const helpers = spawnAround(dragon, "leafman", 2, FINAL_DEPTH - 4, isFreeTile);
  state.monsters.push(...helpers);
  log("Le Dragon rugit de rage ! Des hommes de feuilles accourent à son secours !", "fire");
  play("roar");
}

function earnXp(amount) {
  const { player } = state;
  for (const gain of gainXp(player, amount)) {
    const bonuses = [`+${gain.hp} PV max`, `+${gain.attack} ATQ`];
    if (gain.defense) bonuses.push(`+${gain.defense} DÉF`);
    log(`Tu passes au niveau ${gain.level} ! (${bonuses.join(", ")}, PV restaurés)`, "level");
    flashLevelUp();
    play("levelup");
  }
  recomputeStats(player, state.inventory);
}

// Relance l'animation CSS même si elle vient déjà d'être jouée.
function flashLevelUp() {
  ui.panel.classList.remove("levelup");
  void ui.panel.offsetWidth;
  ui.panel.classList.add("levelup");
}

function dropLoot(monster) {
  if (itemAt(monster.x, monster.y) || !state.combatRng.chance(LOOT_CHANCE)) return;
  const item = createItem(randomItemType(state.depth, state.combatRng), monster.x, monster.y);
  state.items.push(item);
  log(`${nameOf(monster, true)} lâche ${itemLabel(item)}.`, "loot");
}

function useItem(index) {
  if (state.over) return;
  const item = state.inventory.items[index];
  if (!item) return;
  const { player } = state;

  if (item.kind === "weapon" || item.kind === "armor") {
    const previous = equip(player, state.inventory, index);
    const swap = previous ? ` (${itemLabel(previous)} retourne dans le sac)` : "";
    log(`Tu équipes ${itemLabel(item)}${swap}.`, "loot");
    play("pickup");
  } else if (item.effect === "heal") {
    if (player.hp === player.maxHp) {
      log("Tu es déjà en pleine forme.");
      return; // pas de tour perdu
    }
    removeAt(state.inventory, index);
    const healed = Math.min(item.amount, player.maxHp - player.hp);
    player.hp += healed;
    log(`Tu bois ${itemLabel(item)} (+${healed} PV).`, "hit");
    play("heal");
  } else if (item.effect === "reveal") {
    removeAt(state.inventory, index);
    state.dungeon.exploreAll();
    log("Le parchemin s'embrase : le plan de l'étage apparaît dans ton esprit.", "loot");
    play("magic");
  } else if (item.effect === "teleport") {
    removeAt(state.inventory, index);
    teleportPlayer();
    log("Le parchemin t'emporte ailleurs dans l'étage !", "loot");
    play("magic");
  }
  endTurn();
}

function teleportPlayer() {
  const { dungeon, player } = state;
  for (let attempt = 0; attempt < 500; attempt++) {
    const x = state.combatRng.int(1, dungeon.width - 2);
    const y = state.combatRng.int(1, dungeon.height - 2);
    if (dungeon.get(x, y) === TILE.FLOOR && !monsterAt(x, y) && !itemAt(x, y)) {
      player.x = x;
      player.y = y;
      break;
    }
  }
  updateFov();
}

function playerWait() {
  if (state.over) return;
  endTurn();
}

function descend() {
  if (state.over) return;
  if (!onStairs()) {
    log("Il n'y a pas d'escalier ici.");
    return;
  }
  state.depth++;
  enterLevel();
  play("stairs");
  if (isFinalLevel()) {
    log("Tu pénètres dans l'antre du Dragon. Il n'y a plus d'escalier : la seule issue est la victoire.", "fire");
  } else if (state.depth === FINAL_DEPTH - 1) {
    log(`Profondeur ${state.depth}. Une chaleur étouffante monte des profondeurs…`, "fire");
  } else {
    log(`Tu descends à la profondeur ${state.depth}. L'air devient plus froid.`);
  }
  saveGame(state);
  render();
}

// ---- Tour des monstres --------------------------------------------------

function isFreeTile(x, y) {
  const { dungeon, player } = state;
  return dungeon.isWalkable(x, y) && !monsterAt(x, y) && !(x === player.x && y === player.y);
}

function monstersAct() {
  const { dungeon, player } = state;
  const context = {
    dungeon,
    player,
    distances: distanceMap(dungeon, player.x, player.y),
    isFree: isFreeTile,
    rng: state.combatRng,
  };

  // Copie : des renforts peuvent rejoindre la liste pendant le tour.
  for (const monster of [...state.monsters]) {
    const action = monster.boss
      ? decideBossAction(monster, context)
      : decideAction(monster, context);

    if (action.type === "move") {
      monster.x = action.x;
      monster.y = action.y;
    } else if (action.type === "attack") {
      if (monsterAttack(monster)) return;
    } else if (monster.boss && bossSpecial(monster, action)) {
      return;
    }
  }
}

/** @returns true si le joueur est mort */
function monsterAttack(monster) {
  const result = attack(monster, state.player, state.combatRng);
  if (!result.hit) {
    log(`${nameOf(monster, true)} te rate.`);
  } else {
    log(`${nameOf(monster, true)} ${monster.verb} (−${result.damage}).`, "damage");
    play("hurt");
  }
  if (result.killed) {
    die(monster);
    return true;
  }
  return false;
}

/** Actions propres au Dragon. @returns true si le joueur est mort */
function bossSpecial(dragon, action) {
  const { player } = state;
  switch (action.type) {
    case "roar":
      log("Un rugissement fait trembler la roche : le Dragon du Doudou s'éveille !", "fire");
      play("roar");
      break;
    case "charge":
      log("Le Dragon prend une grande inspiration… mets-toi à l'abri derrière un mur !", "fire");
      play("charge");
      break;
    case "fizzle":
      log("Les flammes du Dragon lèchent la roche sans t'atteindre.");
      break;
    case "breath": {
      const damage = breathDamage(player, state.combatRng);
      player.hp = Math.max(0, player.hp - damage);
      state.effects = flameTrail(dragon, player);
      log(`Le Dragon crache un torrent de flammes ! (−${damage})`, "fire");
      play("breath");
      if (player.hp === 0) {
        die(dragon);
        return true;
      }
      break;
    }
  }
  return false;
}

function endTurn() {
  state.turns++;
  state.effects = [];
  if (state.over) {
    // La partie vient de se terminer (victoire) : les monstres restants ne jouent plus.
    render();
    return;
  }
  const { player } = state;
  if (state.turns % REGEN_EVERY === 0 && player.hp < player.maxHp) player.hp++;
  monstersAct();
  if (!state.over) saveGame(state);
  render();
}

// « 1 monstre vaincu », « 12 monstres vaincus »
function monstersDefeated() {
  const plural = state.kills > 1 ? "s" : "";
  return `${state.kills} monstre${plural} vaincu${plural}`;
}

function die(killer) {
  state.over = true;
  state.dead = true;
  log(`${nameOf(killer, true)} t'a vaincu…`, "damage");
  ui.gameoverTitle.textContent = "Tu as péri dans les caves";
  ui.gameoverText.textContent =
    `Tué par ${nameOf(killer)} à la profondeur ${state.depth}, au niveau ${state.player.level}, ` +
    `après ${state.turns} tours et ${monstersDefeated()}.`;
  play("death");
  finishGame();
}

function victory() {
  state.over = true;
  state.won = true;
  log("Le Dragon du Doudou s'effondre ! Mons est sauvée !", "level");
  ui.gameoverTitle.textContent = "Le Doudou est vaincu !";
  ui.gameoverText.textContent =
    `Tel Saint-Georges, tu as terrassé le Dragon en ${state.turns} tours, ` +
    `au niveau ${state.player.level}, avec ${monstersDefeated()}.`;
  ui.gameover.classList.add("victory");
  play("victory");
  finishGame();
}

// Partie terminée : la sauvegarde disparaît et le score entre au classement.
function finishGame() {
  clearSave();
  const { player } = state;
  const entry = {
    score: computeScore({
      depth: state.depth,
      kills: state.kills,
      level: player.level,
      won: state.won,
      turns: state.turns,
    }),
    depth: state.depth,
    level: player.level,
    kills: state.kills,
    turns: state.turns,
    won: state.won,
    seed: state.seed,
    date: new Date().toLocaleDateString("fr-BE"),
  };
  const { scores, rank } = recordScore(entry);

  let rankText = "";
  if (rank === 1) rankText = " — nouveau record !";
  else if (rank) rankText = ` — ${rank}ᵉ place`;
  ui.scoreLine.innerHTML = `Score : <strong>${entry.score}</strong>${rankText}`;
  ui.scores.innerHTML = scores
    .slice(0, 5)
    .map((s) => {
      const outcome = s.won ? "★ victoire" : `profondeur ${s.depth}`;
      return (
        `<li class="${s === entry ? "current" : ""}">` +
        `<span class="points">${s.score}</span>` +
        `<span>${outcome} · niv. ${s.level} · ${s.date}</span></li>`
      );
    })
    .join("");
  ui.gameover.hidden = false;
}

// ---- Affichage ----------------------------------------------------------

function renderInventory() {
  const { inventory, player } = state;
  const needed = xpToNextLevel(player.level);
  ui.level.textContent = `Niv. ${player.level}`;
  ui.xp.textContent = `${player.xp} / ${needed} XP`;
  ui.xpFill.style.width = `${(player.xp / needed) * 100}%`;
  ui.atk.textContent = player.attack;
  ui.def.textContent = player.defense;
  ui.weapon.textContent = inventory.weapon ? inventory.weapon.name : "poings";
  ui.armor.textContent = inventory.armor ? inventory.armor.name : "aucune";
  ui.kills.textContent = state.kills;
  ui.bagCount.textContent = `${inventory.items.length}/${INVENTORY_SIZE}`;

  const rows = [];
  for (let i = 0; i < INVENTORY_SIZE; i++) {
    const item = inventory.items[i];
    rows.push(
      item
        ? `<li><kbd>${i + 1}</kbd><span class="glyph" style="color:${item.color}">${item.glyph}</span>` +
            `<span>${item.name}<small>${itemSummary(item)}</small></span></li>`
        : `<li class="empty"><kbd>${i + 1}</kbd><span></span><span>—</span></li>`,
    );
  }
  ui.inventory.innerHTML = rows.join("");
}

// La barre du boss apparaît dès que le Dragon est réveillé.
function renderBossBar() {
  const dragon = state.monsters.find((m) => m.boss);
  ui.bossBar.hidden = !dragon || !dragon.awake;
  if (!dragon) return;
  ui.bossFill.style.width = `${(dragon.hp / dragon.maxHp) * 100}%`;
  ui.bossState.textContent = dragon.charging ? "· inspire…" : dragon.enraged ? "· enragé" : "";
}

function render() {
  const { player } = state;
  renderer.draw(state.dungeon, player, state.monsters, state.items, state.dead, state.effects);

  ui.hp.textContent = `${player.hp}/${player.maxHp}`;
  const ratio = player.hp / player.maxHp;
  ui.hpFill.style.width = `${ratio * 100}%`;
  ui.hpFill.classList.toggle("low", ratio <= 0.3);

  ui.depth.textContent = `${state.depth} / ${FINAL_DEPTH}`;
  renderBossBar();
  ui.turns.textContent = state.turns;
  ui.explored.textContent = `${Math.round(state.dungeon.explorationRatio() * 100)} %`;
  ui.seed.textContent = state.seed;
  renderInventory();
}

function renderSoundState() {
  const muted = isMuted();
  ui.soundState.textContent = muted ? "coupé" : "activé";
  ui.soundState.classList.toggle("off", muted);
}

function onToggleMute() {
  const muted = toggleMute();
  renderSoundState();
  log(muted ? "Son coupé." : "Son activé.");
}

bindInput(window, {
  onMove: playerMove,
  onAction: descend,
  onWait: playerWait,
  onUseItem: useItem,
  onRestart: () => newGame(),
  onToggleMute,
});

// Au chargement : on reprend la partie en cours, sauf si une graine est imposée dans l'URL.
const urlSeed = readSeedFromUrl();
const saved = urlSeed === null ? loadGame() : null;
if (saved) {
  resumeGame(saved);
} else {
  newGame(urlSeed ?? randomSeed());
}
renderSoundState();

// La police web peut arriver après le premier rendu : on redessine une fois chargée.
document.fonts?.ready.then(render);
