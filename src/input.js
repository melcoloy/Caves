// Clavier : flèches, ZQSD (AZERTY), WASD (QWERTY) et pavé numérique (diagonales comprises).

const BY_CODE = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  Numpad8: [0, -1],
  Numpad2: [0, 1],
  Numpad4: [-1, 0],
  Numpad6: [1, 0],
  Numpad7: [-1, -1],
  Numpad9: [1, -1],
  Numpad1: [-1, 1],
  Numpad3: [1, 1],
};

// e.key dépend de la disposition du clavier : « z » en AZERTY, « w » en QWERTY.
const BY_KEY = {
  z: [0, -1],
  w: [0, -1],
  s: [0, 1],
  q: [-1, 0],
  a: [-1, 0],
  d: [1, 0],
};

const ACTION_KEYS = new Set(["Enter", " ", ">"]);
const WAIT_KEYS = new Set(["x", "."]);

// Rangée de chiffres du clavier (pas le pavé numérique, réservé aux déplacements).
// On lit event.code pour que « 1 » marche aussi en AZERTY sans Maj (touche « & »).
function inventorySlot(code) {
  const match = /^Digit([1-9])$/.exec(code);
  return match ? Number(match[1]) - 1 : null;
}

export function bindInput(target, { onMove, onAction, onWait, onUseItem, onRestart }) {
  target.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const key = event.key.toLowerCase();
    const dir = BY_CODE[event.code] ?? BY_KEY[key];
    const slot = inventorySlot(event.code);

    if (slot !== null) {
      event.preventDefault();
      onUseItem(slot);
    } else if (dir) {
      event.preventDefault();
      onMove(dir[0], dir[1]);
    } else if (ACTION_KEYS.has(event.key)) {
      event.preventDefault();
      onAction();
    } else if (WAIT_KEYS.has(key) || event.code === "Numpad5") {
      event.preventDefault();
      onWait();
    } else if (key === "r") {
      onRestart();
    }
  });
}
