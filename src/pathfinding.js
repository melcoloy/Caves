// Carte de distances (« Dijkstra map ») calculée par parcours en largeur (BFS).
// Une seule carte depuis le joueur suffit pour guider tous les monstres :
// chacun descend simplement vers la case voisine de distance plus faible.

export const NEIGHBORS_8 = [
  [0, -1], [0, 1], [-1, 0], [1, 0],
  [-1, -1], [1, -1], [-1, 1], [1, 1],
];

/**
 * @returns {Float64Array} distance (en pas) de chaque case jusqu'à la cible, Infinity si hors d'atteinte
 */
export function distanceMap(dungeon, targetX, targetY, maxDistance = 30) {
  const { width, height } = dungeon;
  const dist = new Float64Array(width * height).fill(Infinity);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  dist[targetY * width + targetX] = 0;
  queue[tail++] = targetY * width + targetX;

  while (head < tail) {
    const current = queue[head++];
    const d = dist[current];
    if (d >= maxDistance) continue;

    const cx = current % width;
    const cy = (current - cx) / width;
    for (const [dx, dy] of NEIGHBORS_8) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!dungeon.isWalkable(nx, ny)) continue;
      const next = ny * width + nx;
      if (dist[next] !== Infinity) continue;
      dist[next] = d + 1;
      queue[tail++] = next;
    }
  }
  return dist;
}
