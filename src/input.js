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

export function bindInput(target, { onMove, onAction, onRestart }) {
  target.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const key = event.key.toLowerCase();
    const dir = BY_CODE[event.code] ?? BY_KEY[key];

    if (dir) {
      event.preventDefault();
      onMove(dir[0], dir[1]);
    } else if (ACTION_KEYS.has(event.key)) {
      event.preventDefault();
      onAction();
    } else if (key === "r") {
      onRestart();
    }
  });
}