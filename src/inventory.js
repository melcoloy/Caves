// Inventaire du joueur : un sac limité et deux emplacements d'équipement.

export const INVENTORY_SIZE = 9;

export function createInventory() {
  return { items: [], weapon: null, armor: null };
}

export function isFull(inventory) {
  return inventory.items.length >= INVENTORY_SIZE;
}

/** Ajoute un objet au sac. Renvoie false si le sac est plein. */
export function addItem(inventory, item) {
  if (isFull(inventory)) return false;
  inventory.items.push(item);
  return true;
}

export function removeAt(inventory, index) {
  return inventory.items.splice(index, 1)[0];
}

/** Attaque et défense = valeurs de base + bonus de l'équipement porté. */
export function recomputeStats(player, inventory) {
  player.attack = player.baseAttack + (inventory.weapon?.bonus ?? 0);
  player.defense = player.baseDefense + (inventory.armor?.bonus ?? 0);
}

/**
 * Équipe l'arme ou l'armure en position `index` du sac.
 * L'objet précédemment porté retourne dans le sac.
 * @returns l'objet retiré, ou null
 */
export function equip(player, inventory, index) {
  const item = removeAt(inventory, index);
  const slot = item.kind === "weapon" ? "weapon" : "armor";
  const previous = inventory[slot];
  inventory[slot] = item;
  if (previous) inventory.items.push(previous);
  recomputeStats(player, inventory);
  return previous;
}
