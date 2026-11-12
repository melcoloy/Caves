// Peuplement d'un niveau : monstres et objets, plus nombreux et plus puissants en profondeur.

import { MONSTER_TYPES, createMonster } from "./monsters.js";
import { createItem, randomItemType } from "./items.js";
import { TILE } from "./dungeon.js";

const ITEM_CHANCE_PER_ROOM = 0.4;

function maxPerRoom(depth) {
  return Math.min(4, 1 + Math.floor(depth / 2));
}

function randomFloorInRoom(dungeon, room, rng) {
  const x = rng.int(room.x, room.x + room.w - 1);
  const y = rng.int(room.y, room.y + room.h - 1);
  return dungeon.get(x, y) === TILE.FLOOR ? { x, y } : null;
}

export function spawnMonsters(dungeon, depth, rng) {
  const monsters = [];
  const occupied = new Set();
  const eligible = MONSTER_TYPES.filter((t) => t.minDepth <= depth);

  // La première salle (départ du joueur) reste sûre.
  for (const room of dungeon.rooms.slice(1)) {
    const count = rng.int(0, maxPerRoom(depth));
    for (let i = 0; i < count; i++) {
      const pos = randomFloorInRoom(dungeon, room, rng);
      if (!pos) continue;
      const key = pos.y * dungeon.width + pos.x;
      if (occupied.has(key)) continue;
      occupied.add(key);
      // Les créatures les plus récemment débloquées sont un peu plus fréquentes.
      const type = rng.weighted(eligible, (t) => 1 + t.minDepth);
      monsters.push(createMonster(type, pos.x, pos.y));
    }
  }
  return monsters;
}

export function spawnItems(dungeon, depth, rng) {
  const items = [];
  for (const room of dungeon.rooms) {
    if (!rng.chance(ITEM_CHANCE_PER_ROOM)) continue;
    const pos = randomFloorInRoom(dungeon, room, rng);
    if (!pos || items.some((i) => i.x === pos.x && i.y === pos.y)) continue;
    items.push(createItem(randomItemType(depth, rng), pos.x, pos.y));
  }
  return items;
}
