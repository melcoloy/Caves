// Point d'entrée : état de la partie, logique des tours et liaison avec l'interface.

import { createRng, randomSeed } from "./rng.js";
import { generateDungeon, TILE } from "./dungeon.js";
import { createRenderer } from "./render.js";
import { bindInput } from "./input.js";
import { computeFov } from "./fov.js";
import { spawnMonsters, spawnItems } from "./spawn.js";
import { distanceMap } from "./pathfinding.js";
import { decideAction } from "./ai.js";
import { attack } from "./combat.js";
import { nameOf } from "./monsters.js";
import { createItem, randomItemType, itemLabel, itemSummary } from "./items.js";
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
  const player = { x: 0, y: 0, hp: PLAYER_STATS.maxHp, ...PLAYER_STATS };
  recomputeStats(player, createInventory());
  return player;
}

function newGame(seed = randomSeed()) {
  state = {
    seed,
    // Deux générateurs séparés : les niveaux ne dépendent que de la graine,
    // pas de la façon dont se sont déroulés les combats.
    levelRng: createRng(seed),
    combatRng: createRng(seed ^ 0x9e3779b9),
    depth: 1,
    turns: 0,
    kills: 0,
    dead: false,
    dungeon: null,
    monsters: [],
    items: [],
    player: createPlayer(),
    inventory: createInventory(),
    messages: [],
  };
  ui.log.innerHTML = "";
  ui.gameover.hidden = true;
  enterLevel();
  log("Tu descends dans les caves sous la Grand-Place…");
  render();
}

function enterLevel() {
  state.dungeon = generateDungeon(MAP_WIDTH, MAP_HEIGHT, state.levelRng);
  state.monsters = spawnMonsters(state.dungeon, state.depth, state.levelRng);
  state.items = spawnItems(state.dungeon, state.depth, state.levelRng);
  state.player.x = state.dungeon.start.x;
  state.player.y = state.dungeon.start.y;
  updateFov();
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
  if (state.dead) return;
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
}

function playerAttack(monster) {
  const result = attack(state.player, monster, state.combatRng);
  if (!result.hit) {
    log(`Tu rates ${nameOf(monster)}.`);
  } else if (result.killed) {
    state.monsters = state.monsters.filter((m) => m !== monster);
    state.kills++;
    log(`Tu terrasses ${nameOf(monster)} !`, "kill");
    dropLoot(monster);
  } else {
    log(`Tu frappes ${nameOf(monster)} (−${result.damage}).`, "hit");
  }
}

function dropLoot(monster) {
  if (itemAt(monster.x, monster.y) || !state.combatRng.chance(LOOT_CHANCE)) return;
  const item = createItem(randomItemType(state.depth, state.combatRng), monster.x, monster.y);
  state.items.push(item);
  log(`${nameOf(monster, true)} lâche ${itemLabel(item)}.`, "loot");
}

function useItem(index) {
  if (state.dead) return;
  const item = state.inventory.items[index];
  if (!item) return;
  const { player } = state;

  if (item.kind === "weapon" || item.kind === "armor") {
    const previous = equip(player, state.inventory, index);
    const swap = previous ? ` (${itemLabel(previous)} retourne dans le sac)` : "";
    log(`Tu équipes ${itemLabel(item)}${swap}.`, "loot");
  } else if (item.effect === "heal") {
    if (player.hp === player.maxHp) {
      log("Tu es déjà en pleine forme.");
      return; // pas de tour perdu
    }
    removeAt(state.inventory, index);
    const healed = Math.min(item.amount, player.maxHp - player.hp);
    player.hp += healed;
    log(`Tu bois ${itemLabel(item)} (+${healed} PV).`, "hit");
  } else if (item.effect === "reveal") {
    removeAt(state.inventory, index);
    state.dungeon.exploreAll();
    log("Le parchemin s'embrase : le plan de l'étage apparaît dans ton esprit.", "loot");
  } else if (item.effect === "teleport") {
    removeAt(state.inventory, index);
    teleportPlayer();
    log("Le parchemin t'emporte ailleurs dans l'étage !", "loot");
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
  if (state.dead) return;
  endTurn();
}

function descend() {
  if (state.dead) return;
  if (!onStairs()) {
    log("Il n'y a pas d'escalier ici.");
    return;
  }
  state.depth++;
  enterLevel();
  log(`Tu descends à la profondeur ${state.depth}. L'air devient plus froid.`);
  render();
}

// ---- Tour des monstres --------------------------------------------------

function monstersAct() {
  const { dungeon, player } = state;
  const distances = distanceMap(dungeon, player.x, player.y);
  const isFree = (x, y) =>
    dungeon.isWalkable(x, y) && !monsterAt(x, y) && !(x === player.x && y === player.y);

  for (const monster of state.monsters) {
    const action = decideAction(monster, {
      dungeon,
      player,
      distances,
      isFree,
      rng: state.combatRng,
    });

    if (action.type === "move") {
      monster.x = action.x;
      monster.y = action.y;
    } else if (action.type === "attack") {
      const result = attack(monster, player, state.combatRng);
      if (!result.hit) {
        log(`${nameOf(monster, true)} te rate.`);
      } else {
        log(`${nameOf(monster, true)} ${monster.verb} (−${result.damage}).`, "damage");
      }
      if (result.killed) {
        die(monster);
        return;
      }
    }
  }
}

function endTurn() {
  state.turns++;
  const { player } = state;
  if (state.turns % REGEN_EVERY === 0 && player.hp < player.maxHp) player.hp++;
  monstersAct();
  render();
}

function die(killer) {
  state.dead = true;
  log(`${nameOf(killer, true)} t'a vaincu…`, "damage");
  ui.gameoverText.textContent =
    `Tué par ${nameOf(killer)} à la profondeur ${state.depth}, ` +
    `après ${state.turns} tours et ${state.kills} monstre${state.kills > 1 ? "s" : ""} vaincu${state.kills > 1 ? "s" : ""}.`;
  ui.gameover.hidden = false;
}

// ---- Affichage ----------------------------------------------------------

function renderInventory() {
  const { inventory, player } = state;
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

function render() {
  const { player } = state;
  renderer.draw(state.dungeon, player, state.monsters, state.items, state.dead);

  ui.hp.textContent = `${player.hp}/${player.maxHp}`;
  const ratio = player.hp / player.maxHp;
  ui.hpFill.style.width = `${ratio * 100}%`;
  ui.hpFill.classList.toggle("low", ratio <= 0.3);

  ui.depth.textContent = state.depth;
  ui.turns.textContent = state.turns;
  ui.explored.textContent = `${Math.round(state.dungeon.explorationRatio() * 100)} %`;
  ui.seed.textContent = state.seed;
  renderInventory();
}

bindInput(window, {
  onMove: playerMove,
  onAction: descend,
  onWait: playerWait,
  onUseItem: useItem,
  onRestart: () => newGame(),
});

newGame(readSeedFromUrl() ?? randomSeed());

// La police web peut arriver après le premier rendu : on redessine une fois chargée.
document.fonts?.ready.then(render);
