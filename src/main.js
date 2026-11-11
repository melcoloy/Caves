// Point d'entrée : état de la partie, logique des tours et liaison avec l'interface.

import { createRng, randomSeed } from "./rng.js";
import { generateDungeon, TILE } from "./dungeon.js";
import { createRenderer } from "./render.js";
import { bindInput } from "./input.js";
import { computeFov } from "./fov.js";

const MAP_WIDTH = 60;
const MAP_HEIGHT = 36;
const MAX_LOG_LINES = 5;
const FOV_RADIUS = 8;

const ui = {
  canvas: document.getElementById("screen"),
  depth: document.getElementById("depth"),
  turns: document.getElementById("turns"),
  explored: document.getElementById("explored"),
  seed: document.getElementById("seed"),
  log: document.getElementById("log"),
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
    rng: createRng(seed),
    depth: 1,
    turns: 0,
    dungeon: null,
    player: { x: 0, y: 0 },
    messages: [],
  };
  ui.log.innerHTML = "";
  enterLevel();
  log("Tu descends dans les caves sous la Grand-Place…");
  render();
}

function enterLevel() {
  state.dungeon = generateDungeon(MAP_WIDTH, MAP_HEIGHT, state.rng);
  state.player = { ...state.dungeon.start };
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

function log(text) {
  state.messages.unshift(text);
  state.messages.length = Math.min(state.messages.length, MAX_LOG_LINES);
  ui.log.innerHTML = state.messages.map((m) => `<li>${m}</li>`).join("");
}

function onStairs() {
  const { x, y } = state.player;
  return state.dungeon.get(x, y) === TILE.STAIRS;
}

function tryMove(dx, dy) {
  const nx = state.player.x + dx;
  const ny = state.player.y + dy;
  if (!state.dungeon.isWalkable(nx, ny)) return;

  state.player.x = nx;
  state.player.y = ny;
  state.turns++;
  updateFov();

  if (onStairs()) log("Un escalier s'enfonce dans les ténèbres… (Entrée pour descendre)");
  render();
}

function descend() {
  if (!onStairs()) {
    log("Il n'y a pas d'escalier ici.");
    return;
  }
  state.depth++;
  enterLevel();
  log(`Tu descends à la profondeur ${state.depth}. L'air devient plus froid.`);
  render();
}

function render() {
  renderer.draw(state.dungeon, state.player);
  ui.depth.textContent = state.depth;
  ui.turns.textContent = state.turns;
  ui.explored.textContent = `${Math.round(state.dungeon.explorationRatio() * 100)} %`;
  ui.seed.textContent = state.seed;
}

bindInput(window, {
  onMove: tryMove,
  onAction: descend,
  onRestart: () => newGame(),
});

newGame(readSeedFromUrl() ?? randomSeed());

// La police web peut arriver après le premier rendu : on redessine une fois chargée.
document.fonts?.ready.then(render);
