// Effets visuels éphémères (affichés pendant un seul tour), comme le souffle du Dragon.

/** Cases traversées par un segment de (x0, y0) à (x1, y1) — algorithme de Bresenham. */
export function lineBetween(x0, y0, x1, y1) {
  const cells = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;

  for (;;) {
    cells.push({ x, y });
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
  return cells;
}

const FLAME_COLORS = ["#ffd166", "#ff9f1c", "#ff5d3a"];

/** Traînée de flammes entre la source et la cible (source exclue). */
export function flameTrail(from, to) {
  return lineBetween(from.x, from.y, to.x, to.y)
    .slice(1)
    .map((cell, i) => ({ ...cell, glyph: "~", color: FLAME_COLORS[i % FLAME_COLORS.length] }));
}
