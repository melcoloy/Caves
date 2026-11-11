// Champ de vision par « shadowcasting » récursif (8 octants).
// Principe : on balaie chaque octant ligne par ligne en suivant des pentes ;
// chaque mur rencontré projette une ombre qui réduit l'intervalle de pentes encore visible.

// Matrices de transformation qui ramènent chacun des 8 octants au premier.
const OCTANTS = [
  [1, 0, 0, 1],
  [0, 1, 1, 0],
  [0, -1, 1, 0],
  [-1, 0, 0, 1],
  [-1, 0, 0, -1],
  [0, -1, -1, 0],
  [0, 1, -1, 0],
  [1, 0, 0, -1],
];

/**
 * @param {number} ox, oy   position de l'observateur
 * @param {number} radius   portée de la vision
 * @param {(x:number, y:number) => boolean} isOpaque
 * @param {(x:number, y:number) => void} reveal  appelée pour chaque case vue
 */
export function computeFov(ox, oy, radius, isOpaque, reveal) {
  reveal(ox, oy);
  const radius2 = radius * radius;

  function castLight(row, start, end, xx, xy, yx, yy) {
    if (start < end) return;
    let nextStart = start;

    for (let j = row; j <= radius; j++) {
      let blocked = false;
      const dy = -j;

      for (let dx = -j; dx <= 0; dx++) {
        const x = ox + dx * xx + dy * xy;
        const y = oy + dx * yx + dy * yy;
        const leftSlope = (dx - 0.5) / (dy + 0.5);
        const rightSlope = (dx + 0.5) / (dy - 0.5);

        if (start < rightSlope) continue;
        if (end > leftSlope) break;

        if (dx * dx + dy * dy <= radius2) reveal(x, y);

        if (blocked) {
          if (isOpaque(x, y)) {
            nextStart = rightSlope;
          } else {
            blocked = false;
            start = nextStart;
          }
        } else if (isOpaque(x, y) && j < radius) {
          // Début d'un mur : on explore récursivement la partie encore éclairée.
          blocked = true;
          castLight(j + 1, start, leftSlope, xx, xy, yx, yy);
          nextStart = rightSlope;
        }
      }
      if (blocked) break;
    }
  }

  for (const [xx, xy, yx, yy] of OCTANTS) {
    castLight(1, 1.0, 0.0, xx, xy, yx, yy);
  }
}
