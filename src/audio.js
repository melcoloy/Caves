// Effets sonores synthétisés avec la Web Audio API : aucun fichier audio à télécharger.
// Le contexte audio n'est créé qu'au premier son, déclenché par une touche
// (les navigateurs interdisent le son avant une interaction de l'utilisateur).

const MUTE_KEY = "caves-du-doudou/muted";

let ctx = null;
let muted = readMuted();

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function audioContext() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

/** Note simple avec glissando de `freq` vers `to` et extinction exponentielle. */
function tone({ freq, to = freq, duration = 0.1, type = "square", volume = 0.06, delay = 0 }) {
  const c = audioContext();
  if (!c) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + duration);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

/** Bruit blanc filtré (souffle, rugissement). */
function noise({ duration = 0.4, volume = 0.12, from = 3000, to = 200, delay = 0 }) {
  const c = audioContext();
  if (!c) return;
  const t = c.currentTime + delay;
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * duration), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const source = c.createBufferSource();
  const filter = c.createBiquadFilter();
  const gain = c.createGain();
  source.buffer = buffer;
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + duration);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  source.connect(filter).connect(gain).connect(c.destination);
  source.start(t);
}

function arpeggio(notes, { step = 0.09, type = "square", volume = 0.05, duration = 0.12 } = {}) {
  notes.forEach((freq, i) => tone({ freq, duration, type, volume, delay: i * step }));
}

const SOUNDS = {
  hit: () => tone({ freq: 220, to: 110, duration: 0.08 }),
  miss: () => tone({ freq: 300, to: 260, duration: 0.05, type: "triangle", volume: 0.03 }),
  hurt: () => tone({ freq: 150, to: 70, duration: 0.16, type: "sawtooth", volume: 0.06 }),
  kill: () => arpeggio([330, 660], { step: 0.06 }),
  pickup: () => arpeggio([660, 990], { step: 0.06, type: "triangle" }),
  heal: () => arpeggio([392, 523, 659], { step: 0.07, type: "sine", volume: 0.07 }),
  magic: () => tone({ freq: 400, to: 1600, duration: 0.35, type: "sine", volume: 0.05 }),
  levelup: () => arpeggio([523, 659, 784, 1047], { step: 0.08 }),
  stairs: () => arpeggio([392, 330, 262], { step: 0.12, type: "triangle", volume: 0.06 }),
  roar: () => {
    tone({ freq: 110, to: 40, duration: 0.9, type: "sawtooth", volume: 0.08 });
    noise({ duration: 0.9, volume: 0.08, from: 800, to: 100 });
  },
  charge: () => tone({ freq: 90, to: 320, duration: 0.6, type: "sine", volume: 0.07 }),
  breath: () => noise({ duration: 0.7, volume: 0.15, from: 4000, to: 300 }),
  victory: () => arpeggio([523, 659, 784, 1047, 784, 1047], { step: 0.13, duration: 0.18 }),
  death: () => arpeggio([392, 330, 262, 196], { step: 0.22, type: "sawtooth", duration: 0.3 }),
};

export function play(name) {
  if (muted) return;
  try {
    SOUNDS[name]?.();
  } catch {
    // le son est un bonus : une erreur audio ne doit jamais casser le jeu
  }
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    // préférence non conservée
  }
  return muted;
}
