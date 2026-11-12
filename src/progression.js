// Progression du joueur : expérience et montée de niveau.

const HP_PER_LEVEL = 5;

/** XP nécessaire pour passer du niveau `level` au suivant (croissance en level^1,4). */
export function xpToNextLevel(level) {
  return Math.round(12 * level ** 1.4);
}

/**
 * Ajoute de l'XP au joueur et applique les montées de niveau éventuelles.
 * À chaque niveau : +5 PV max, +1 attaque, +1 défense tous les 3 niveaux, et soin complet.
 * @returns la liste des gains obtenus (vide si aucun niveau gagné)
 */
export function gainXp(player, amount) {
  player.xp += amount;
  const gains = [];

  while (player.xp >= xpToNextLevel(player.level)) {
    player.xp -= xpToNextLevel(player.level);
    player.level++;

    const gain = {
      level: player.level,
      hp: HP_PER_LEVEL,
      attack: 1,
      defense: player.level % 3 === 0 ? 1 : 0,
    };
    player.maxHp += gain.hp;
    player.baseAttack += gain.attack;
    player.baseDefense += gain.defense;
    player.hp = player.maxHp;
    gains.push(gain);
  }
  return gains;
}
