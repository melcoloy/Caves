// Bestiaire : les créatures des caves, inspirées du Lumeçon (combat du Doudou à Mons).

export const MONSTER_TYPES = [
  { id: "rat", name: "rat d'égout", article: "le", glyph: "r", color: "#b08d6e",
    hp: 4, attack: 2, defense: 0, xp: 2, verb: "te mord", minDepth: 1 },
  { id: "bat", name: "chauve-souris", article: "la", glyph: "b", color: "#9a8fb8",
    hp: 3, attack: 2, defense: 0, xp: 2, verb: "te griffe", minDepth: 1 },
  { id: "goblin", name: "gobelin", article: "le", glyph: "g", color: "#7fbf6a",
    hp: 7, attack: 3, defense: 1, xp: 5, verb: "te frappe", minDepth: 2 },
  { id: "skeleton", name: "squelette", article: "le", glyph: "s", color: "#e6e1d3",
    hp: 10, attack: 4, defense: 1, xp: 8, verb: "te cogne", minDepth: 3 },
  { id: "leafman", name: "homme de feuilles", article: "l'", glyph: "h", color: "#5fa55a",
    hp: 14, attack: 5, defense: 2, xp: 12, verb: "te fouette", minDepth: 4 },
  { id: "devil", name: "diable", article: "le", glyph: "d", color: "#e0524f",
    hp: 18, attack: 6, defense: 3, xp: 18, verb: "te brûle", minDepth: 5 },
];

/**
 * Crée un monstre dont la puissance dépend de la profondeur :
 * chaque étage au-delà de son étage d'apparition le renforce un peu.
 * Une élite (glyphe en majuscule) a 50 % de PV en plus, +2 ATQ, +1 DÉF et rapporte le double d'XP.
 */
export function createMonster(type, x, y, { depth = type.minDepth, elite = false } = {}) {
  const extra = Math.max(0, depth - type.minDepth);
  let maxHp = type.hp + Math.floor(type.hp * 0.2 * extra);
  let attack = type.attack + Math.floor(extra * 0.75);
  let defense = type.defense + Math.floor(extra / 3);
  let xp = type.xp + extra;

  if (elite) {
    maxHp = Math.round(maxHp * 1.5);
    attack += 2;
    defense += 1;
    xp *= 2;
  }

  return {
    ...type,
    type: type.id,
    glyph: elite ? type.glyph.toUpperCase() : type.glyph,
    x,
    y,
    maxHp,
    hp: maxHp,
    attack,
    defense,
    xp,
    elite,
    awake: false,
  };
}

/** « le rat d'égout », « l'homme de feuilles d'élite » (avec majuscule si demandé). */
export function nameOf(monster, capitalize = false) {
  const { article, name } = monster;
  let text = article.endsWith("'") ? `${article}${name}` : `${article} ${name}`;
  if (monster.elite) text += " d'élite";
  return capitalize ? text[0].toUpperCase() + text.slice(1) : text;
}
