// Catalogue des objets : consommables (potions, parchemins) et équipement (armes, armures).

export const ITEM_TYPES = [
  // Consommables
  { id: "potion", kind: "consumable", effect: "heal", amount: 10,
    name: "potion de soin", article: "une", glyph: "!", color: "#e0524f", minDepth: 1, weight: 6 },
  { id: "big-potion", kind: "consumable", effect: "heal", amount: 25,
    name: "grande potion de soin", article: "une", glyph: "!", color: "#ff8fa3", minDepth: 3, weight: 3 },
  { id: "scroll-sight", kind: "consumable", effect: "reveal",
    name: "parchemin de clairvoyance", article: "un", glyph: "?", color: "#8ecae6", minDepth: 1, weight: 2 },
  { id: "scroll-teleport", kind: "consumable", effect: "teleport",
    name: "parchemin de téléportation", article: "un", glyph: "?", color: "#c77dff", minDepth: 2, weight: 2 },

  // Armes : bonus d'attaque
  { id: "dagger", kind: "weapon", bonus: 1,
    name: "dague", article: "une", glyph: ")", color: "#cfd8dc", minDepth: 1, weight: 2 },
  { id: "sword", kind: "weapon", bonus: 2,
    name: "épée courte", article: "une", glyph: ")", color: "#b0c4de", minDepth: 2, weight: 2 },
  { id: "lance", kind: "weapon", bonus: 4,
    name: "lance de Saint-Georges", article: "la", glyph: ")", color: "#f2c14e", minDepth: 4, weight: 1 },

  // Armures : bonus de défense
  { id: "gambeson", kind: "armor", bonus: 1,
    name: "gambison", article: "un", glyph: "[", color: "#c8a27a", minDepth: 1, weight: 2 },
  { id: "chainmail", kind: "armor", bonus: 2,
    name: "cotte de mailles", article: "une", glyph: "[", color: "#a8b5c0", minDepth: 3, weight: 2 },
  { id: "plate", kind: "armor", bonus: 3,
    name: "armure de chevalier", article: "une", glyph: "[", color: "#e6e1d3", minDepth: 5, weight: 1 },
];

export function createItem(type, x, y) {
  return { ...type, type: type.id, x, y };
}

/** Type d'objet aléatoire parmi ceux disponibles à cette profondeur. */
export function randomItemType(depth, rng) {
  const eligible = ITEM_TYPES.filter((t) => t.minDepth <= depth);
  return rng.weighted(eligible, (t) => t.weight);
}

/** « une potion de soin », « la lance de Saint-Georges ». */
export function itemLabel(item) {
  return item.article.endsWith("'") ? `${item.article}${item.name}` : `${item.article} ${item.name}`;
}

/** Effet résumé en quelques caractères, pour l'inventaire. */
export function itemSummary(item) {
  switch (item.kind) {
    case "weapon":
      return `+${item.bonus} ATQ`;
    case "armor":
      return `+${item.bonus} DÉF`;
    default:
      if (item.effect === "heal") return `+${item.amount} PV`;
      if (item.effect === "reveal") return "révèle la carte";
      if (item.effect === "teleport") return "téléportation";
      return "";
  }
}
