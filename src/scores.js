// Tableau des meilleurs scores, conservé dans le navigateur.

const SCORES_KEY = "caves-du-doudou/scores";
const MAX_SCORES = 10;

/**
 * Score d'une partie :
 * 10 par monstre, 100 par étage descendu, 25 par niveau gagné,
 * et pour une victoire 1 000 points plus un bonus de rapidité (jusqu'à 1 500).
 */
export function computeScore({ depth, kills, level, won, turns }) {
  let score = kills * 10 + (depth - 1) * 100 + (level - 1) * 25;
  if (won) score += 1000 + Math.max(0, 1500 - turns);
  return score;
}

export function loadScores() {
  try {
    const scores = JSON.parse(localStorage.getItem(SCORES_KEY) ?? "[]");
    return Array.isArray(scores) ? scores : [];
  } catch {
    return [];
  }
}

/**
 * Enregistre une partie terminée.
 * @returns {{ scores: object[], rank: number | null }} le classement à jour et le rang obtenu (1 = meilleur), ou null hors du top
 */
export function recordScore(entry) {
  const scores = loadScores();
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score);
  const top = scores.slice(0, MAX_SCORES);
  try {
    localStorage.setItem(SCORES_KEY, JSON.stringify(top));
  } catch {
    // stockage indisponible : le classement ne sera pas conservé
  }
  const index = top.indexOf(entry);
  return { scores: top, rank: index === -1 ? null : index + 1 };
}
