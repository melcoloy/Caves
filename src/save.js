// Sauvegarde automatique dans le navigateur (localStorage), après chaque tour.
// Roguelike oblige, la sauvegarde est effacée à la mort ou à la victoire : pas de seconde chance.

const SAVE_KEY = "caves-du-doudou/save";
const SAVE_VERSION = 1;

export function saveGame(state) {
  const data = {
    version: SAVE_VERSION,
    seed: state.seed,
    depth: state.depth,
    turns: state.turns,
    kills: state.kills,
    levelRng: state.levelRng.getState(),
    combatRng: state.combatRng.getState(),
    dungeon: state.dungeon.serialize(),
    monsters: state.monsters,
    items: state.items,
    player: state.player,
    inventory: state.inventory,
    messages: state.messages,
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Stockage indisponible (navigation privée, quota…) : on joue sans sauvegarde.
  }
}

/** @returns les données sauvegardées, ou null s'il n'y en a pas (ou si elles sont d'une autre version). */
export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data.version === SAVE_VERSION ? data : null;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // rien à faire
  }
}
