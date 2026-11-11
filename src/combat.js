// Combat au corps à corps : chance de toucher, puis dégâts = attaque ± 1 − défense (minimum 1).

const HIT_CHANCE = 0.9;

/**
 * Résout une attaque et applique les dégâts au défenseur.
 * @returns {{ hit: boolean, damage: number, killed: boolean }}
 */
export function attack(attacker, defender, rng) {
  if (!rng.chance(HIT_CHANCE)) {
    return { hit: false, damage: 0, killed: false };
  }
  const roll = attacker.attack + rng.int(-1, 1);
  const damage = Math.max(1, roll - defender.defense);
  defender.hp = Math.max(0, defender.hp - damage);
  return { hit: true, damage, killed: defender.hp === 0 };
}
