// Point d'entrée : état de la partie, logique des tours et liaison avec l'interface.

import { createRng, randomSeed } from "./rng.js";
import { generateDungeon, TILE } from "./dungeon.js";
import { createRenderer } from "./render.js";
import { bindInput } from "./input.js";
import { computeFov } from "./fov.js";
import { spawnMonsters } from "./spawn.js";
import { distanceMap } from "./pathfinding.js";
import { decideAction } from "./ai.js";
import { attack } from "./combat.js";
import { nameOf } from "./monsters.js";

const MAP_WIDTH = 60;
const MAP_HEIGHT = 36;
const MAX_LOG_LINES = 5;
const FOV_RADIUS = 8;
const REGEN_EVERY = 8; // le joueur récupère 1 PV tous les N tours

const PLAYER_STATS = { maxHp: 30, attack: 5, defense: 1 };

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
};

const renderer = createRenderer(ui.canvas);
renderer.resize(MAP_WIDTH, MAP_HEIGHT);

let state;

function readSeedFromUrl() {
  const param = new URLSearchParams(location.search).get("seed");
  const seed = Number(param);
  return param !== null && Number.isFinite(seed) ? seed >>> 0 : null;
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
    player: { x: 0, y: 0, hp: PLAYER_STATS.maxHp, ...PLAYER_STATS },
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
    if (onStairs()) log("Un escalier s'enfonce dans les ténèbres… (Entrée pour descendre)");
  } else {
    return; // foncer dans un mur ne coûte pas de tour
  }
  endTurn();
}

function playerAttack(monster) {
  const result = attack(state.player, monster, state.combatRng);
  if (!result.hit) {
    log(`Tu rates ${nameOf(monster)}.`);
  } else if (result.killed) {
    state.monsters = state.monsters.filter((m) => m !== monster);
    state.kills++;
    log(`Tu terrasses ${nameOf(monster)} !`, "kill");
  } else {
    log(`Tu frappes ${nameOf(monster)} (−${result.damage}).`, "hit");
  }
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

function render() {
  const { player } = state;
  renderer.draw(state.dungeon, player, state.monsters, state.dead);

  ui.hp.textContent = `${player.hp}/${player.maxHp}`;
  const ratio = player.hp / player.maxHp;
  ui.hpFill.style.width = `${ratio * 100}%`;
  ui.hpFill.classList.toggle("low", ratio <= 0.3);

  ui.depth.textContent = state.depth;
  ui.turns.textContent = state.turns;
  ui.explored.textContent = `${Math.round(state.dungeon.explorationRatio() * 100)} %`;
  ui.seed.textContent = state.seed;
}

bindInput(window, {
  onMove: playerMove,
  onAction: descend,
  onWait: playerWait,
  onRestart: () => newGame(),
});

newGame(readSeedFromUrl() ?? randomSeed());

// La police web peut arriver après le premier rendu : on redessine une fois chargée.
document.fonts?.ready.then(render);
