// Le Dragon du Doudou : boss final, tapi au fond du dernier étage.
// Comme lors du Lumeçon, Saint-Georges (toi) doit le terrasser.
//
// Comportement :
// - il se réveille avec un rugissement dès que tu l'aperçois ;
// - il est lent : il ne se déplace qu'un tour sur deux (mais attaque à chaque tour au contact) ;
// - souffle de feu : il prend d'abord une inspiration (un tour d'avertissement), puis crache
//   ses flammes le tour suivant si tu es toujours en vue et à portée — cache-toi derrière un mur !
// - sous 50 % de PV, il entre en rage (+3 ATQ) et appelle des hommes de feuilles à l'aide.

import { decideAction } from "./ai.js";

export const FINAL_DEPTH = 10;

const BREATH_RANGE = 6;
const BREATH_COOLDOWN = 5;

export function createDragon(x, y) {
  return {
    id: "dragon",
    type: "dragon",
    name: "Dragon",
    article: "le",
    glyph: "D",
    color: "#ff9f1c",
    x,
    y,
    hp: 95,
    maxHp: 95,
    attack: 9,
    defense: 4,
    xp: 150,
    verb: "te lacère de ses griffes",
    boss: true,
    elite: false,
    awake: false,
    enraged: false,
    charging: false,
    breathCooldown: 2,
    restless: false,
  };
}

function distance(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

/**
 * @returns {{ type: "wait" | "roar" | "charge" | "breath" | "fizzle" | "attack" } | { type: "move", x, y }}
 */
export function decideBossAction(dragon, context) {
  const { dungeon, player } = context;
  const inSight = dungeon.isVisible(dragon.x, dragon.y);
  const dist = distance(dragon, player);

  if (!dragon.awake) {
    if (!inSight) return { type: "wait" };
    dragon.awake = true;
    return { type: "roar" };
  }

  // Le tour qui suit l'inspiration : le souffle part, ou se perd si tu t'es mis à l'abri.
  if (dragon.charging) {
    dragon.charging = false;
    dragon.breathCooldown = BREATH_COOLDOWN;
    return inSight && dist <= BREATH_RANGE ? { type: "breath" } : { type: "fizzle" };
  }

  if (dragon.breathCooldown > 0) dragon.breathCooldown--;
  if (dragon.breathCooldown === 0 && inSight && dist >= 2 && dist <= BREATH_RANGE) {
    dragon.charging = true;
    return { type: "charge" };
  }

  if (dist === 1) return { type: "attack" };

  // Lenteur : un tour sur deux, il reprend son souffle au lieu d'avancer.
  dragon.restless = !dragon.restless;
  if (!dragon.restless) return { type: "wait" };
  return decideAction(dragon, context);
}

/** Les flammes ignorent la moitié de la défense. */
export function breathDamage(player, rng) {
  return Math.max(1, rng.int(8, 12) - Math.floor(player.defense / 2));
}

export function shouldEnrage(dragon) {
  return !dragon.enraged && dragon.hp > 0 && dragon.hp <= dragon.maxHp / 2;
}

export function enrage(dragon) {
  dragon.enraged = true;
  dragon.attack += 3;
  dragon.color = "#ff3b3b";
}
