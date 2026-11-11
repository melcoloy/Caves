// Comportement des monstres : endormis tant qu'ils n'ont pas vu le joueur,
// puis poursuite via la carte de distances et attaque au contact.

import { NEIGHBORS_8 } from "./pathfinding.js";

const WANDER_CHANCE = 0.25;

function isAdjacent(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) === 1;
}

/**
 * Décide de l'action d'un monstre pour ce tour.
 * @returns {{ type: "attack" } | { type: "move", x: number, y: number } | { type: "wait" }}
 */
export function decideAction(monster, { dungeon, player, distances, isFree, rng }) {
  // Si le joueur voit la case du monstre, le monstre voit le joueur.
  if (!monster.awake && dungeon.isVisible(monster.x, monster.y)) {
    monster.awake = true;
  }

  if (!monster.awake) {
    if (!rng.chance(WANDER_CHANCE)) return { type: "wait" };
    const [dx, dy] = rng.pick(NEIGHBORS_8);
    const x = monster.x + dx;
    const y = monster.y + dy;
    return isFree(x, y) ? { type: "move", x, y } : { type: "wait" };
  }

  if (isAdjacent(monster, player)) return { type: "attack" };

  // Descente de gradient : on choisit la case voisine libre la plus proche du joueur.
  const { width } = dungeon;
  let best = null;
  let bestDistance = distances[monster.y * width + monster.x];
  for (const [dx, dy] of NEIGHBORS_8) {
    const x = monster.x + dx;
    const y = monster.y + dy;
    if (!dungeon.inBounds(x, y) || !isFree(x, y)) continue;
    const d = distances[y * width + x];
    if (d < bestDistance) {
      bestDistance = d;
      best = { x, y };
    }
  }
  return best ? { type: "move", ...best } : { type: "wait" };
}
