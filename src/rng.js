// Générateur pseudo-aléatoire à graine (mulberry32).
// Même graine → même suite de nombres → mêmes donjons.

export function createRng(seed) {
  let state = seed >>> 0;

  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    /** Entier aléatoire entre min et max inclus. */
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    /** Élément aléatoire d'un tableau. */
    pick(array) {
      return array[Math.floor(next() * array.length)];
    },
    /** Vrai avec une probabilité p. */
    chance(p) {
      return next() < p;
    },
  };
}

export function randomSeed() {
  return Math.floor(Math.random() * 2 ** 32);
}