// Bestiaire : les créatures des caves, inspirées du Lumeçon (combat du Doudou à Mons).

export const MONSTER_TYPES = [
  { id: "rat", name: "rat d'égout", article: "le", glyph: "r", color: "#b08d6e",
    hp: 4, attack: 2, defense: 0, verb: "te mord", minDepth: 1 },
  { id: "bat", name: "chauve-souris", article: "la", glyph: "b", color: "#9a8fb8",
    hp: 3, attack: 2, defense: 0, verb: "te griffe", minDepth: 1 },
  { id: "goblin", name: "gobelin", article: "le", glyph: "g", color: "#7fbf6a",
    hp: 7, attack: 3, defense: 1, verb: "te frappe", minDepth: 2 },
  { id: "skeleton", name: "squelette", article: "le", glyph: "s", color: "#e6e1d3",
    hp: 10, attack: 4, defense: 1, verb: "te cogne", minDepth: 3 },
  { id: "leafman", name: "homme de feuilles", article: "l'", glyph: "h", color: "#5fa55a",
    hp: 14, attack: 5, defense: 2, verb: "te fouette", minDepth: 4 },
  { id: "devil", name: "diable", article: "le", glyph: "d", color: "#e0524f",
    hp: 18, attack: 6, defense: 3, verb: "te brûle", minDepth: 5 },
];

export function createMonster(type, x, y) {
  return {
    ...type,
    type: type.id,
    x,
    y,
    maxHp: type.hp,
    hp: type.hp,
    awake: false,
  };
}

/** « le rat d'égout », « l'homme de feuilles » (avec majuscule si demandé). */
export function nameOf(monster, capitalize = false) {
  const { article, name } = monster;
  const text = article.endsWith("'") ? `${article}${name}` : `${article} ${name}`;
  return capitalize ? text[0].toUpperCase() + text.slice(1) : text;
}
