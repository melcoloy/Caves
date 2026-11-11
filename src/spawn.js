// Peuplement d'un niveau : quelques monstres par salle, plus nombreux et plus forts en profondeur.

import { MONSTER_TYPES, createMonster } from "./monsters.js";
import { TILE } from "./dungeon.js";

function maxPerRoom(depth) {
  return Math.min(4, 1 + Math.floor(depth / 2));
}

// Les créatures les plus récemment débloquées sont un peu plus fréquentes.
function pickType(depth, rng) {
  const eligible = MONSTER_TYPES.filter((t) => t.minDepth <= depth);
  const weights = eligible.map((t) => 1 + t.minDepth);
  let roll = rng.next() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < eligible.length; i++) {
    roll -= weights[i];
    if (roll < 0) return eligible[i];
  }
  return eligible[eligible.length - 1];
}

export function spawnMonsters(dungeon, depth, rng) {
  const monsters = [];
  const occupied = new Set();

  // La première salle (départ du joueur) reste sûre.
  for (const room of dungeon.rooms.slice(1)) {
    const count = rng.int(0, maxPerRoom(depth));
    for (let i = 0; i < count; i++) {
      const x = rng.int(room.x, room.x + room.w - 1);
      const y = rng.int(room.y, room.y + room.h - 1);
      const key = y * dungeon.width + x;
      if (occupied.has(key) || dungeon.get(x, y) !== TILE.FLOOR) continue;
      occupied.add(key);
      monsters.push(createMonster(pickType(depth, rng), x, y));
    }
  }
  return monsters;
}
