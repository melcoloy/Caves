// Peuplement d'un niveau : monstres et objets, plus nombreux et plus puissants en profondeur.

import { MONSTER_TYPES, createMonster } from "./monsters.js";
import { createItem, randomItemType } from "./items.js";
import { TILE } from "./dungeon.js";

const ITEM_CHANCE_PER_ROOM = 0.4;

function maxPerRoom(depth) {
  return Math.min(4, 1 + Math.floor(depth / 2));
}

// Pas d'élites avant la profondeur 3, puis +4 % par étage (plafonné à 25 %).
function eliteChance(depth) {
  return depth < 3 ? 0 : Math.min(0.25, 0.04 * depth);
}

function randomFloorInRoom(dungeon, room, rng) {
  const x = rng.int(room.x, room.x + room.w - 1);
  const y = rng.int(room.y, room.y + room.h - 1);
  return dungeon.get(x, y) === TILE.FLOOR ? { x, y } : null;
}

/**
 * @param {{ exclude?: object[] }} options  salles à laisser vides (ex. l'antre du Dragon)
 */
export function spawnMonsters(dungeon, depth, rng, { exclude = [] } = {}) {
  const monsters = [];
  const occupied = new Set();
  const eligible = MONSTER_TYPES.filter((t) => t.minDepth <= depth);

  // La première salle (départ du joueur) reste sûre.
  for (const room of dungeon.rooms.slice(1)) {
    if (exclude.includes(room)) continue;
    const count = rng.int(0, maxPerRoom(depth));
    for (let i = 0; i < count; i++) {
      const pos = randomFloorInRoom(dungeon, room, rng);
      if (!pos) continue;
      const key = pos.y * dungeon.width + pos.x;
      if (occupied.has(key)) continue;
      occupied.add(key);
      // Les créatures les plus récemment débloquées sont un peu plus fréquentes.
      const type = rng.weighted(eligible, (t) => 1 + t.minDepth);
      const elite = rng.chance(eliteChance(depth));
      monsters.push(createMonster(type, pos.x, pos.y, { depth, elite }));
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
    // Jamais sous les pieds du joueur à son arrivée (il ne pourrait pas le ramasser).
    if (pos.x === dungeon.start.x && pos.y === dungeon.start.y) continue;
    items.push(createItem(randomItemType(depth, rng), pos.x, pos.y));
  }
  return items;
}

/**
 * Fait apparaître jusqu'à `count` monstres d'un type donné autour d'un point (renforts),
 * sur des cases libres à une distance de 1 ou 2. Les renforts sont immédiatement éveillés.
 */
export function spawnAround(center, typeId, count, depth, isFree) {
  const type = MONSTER_TYPES.find((t) => t.id === typeId);
  const spawned = [];
  for (let radius = 1; radius <= 2 && spawned.length < count; radius++) {
    for (let dy = -radius; dy <= radius && spawned.length < count; dy++) {
      for (let dx = -radius; dx <= radius && spawned.length < count; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        const x = center.x + dx;
        const y = center.y + dy;
        if (!isFree(x, y) || spawned.some((m) => m.x === x && m.y === y)) continue;
        const monster = createMonster(type, x, y, { depth });
        monster.awake = true;
        spawned.push(monster);
      }
    }
  }
  return spawned;
}
