# 🐉 Les Caves du Doudou

Un roguelike au tour par tour jouable dans le navigateur. Descends dans les caves sous la Grand-Place de Mons, survis aux rats, gobelins, hommes de feuilles et diables et affronte le Dragon au plus profond du donjon.

Le joueur ne voit que ce qui est éclairé autour de lui ; les zones déjà explorées restent en mémoire, plus sombres.

Chaque partie génère des donjons différents à partir d'une **graine** (seed) : avec la même graine, tu retrouves exactement les mêmes niveaux.

## Jouer

| Action | Touches |
| --- | --- |
| Se déplacer / attaquer | Flèches, `ZQSD` (AZERTY), `WASD` (QWERTY) ou pavé numérique — foncer sur un monstre l'attaque |
| Utiliser / équiper un objet du sac | `1` à `9` (rangée du haut, sans Maj) |
| Attendre un tour | `X`, `.` ou `5` (pavé numérique) |
| Descendre l'escalier `>` | `Entrée`, `Espace` ou `>` |
| Nouvelle partie | `R` |

Pour rejouer une graine précise : `index.html?seed=123456`.

## Bestiaire

| Glyphe | Créature | PV | Attaque | Défense | Dès la profondeur |
| --- | --- | --- | --- | --- | --- |
| `r` | Rat d'égout | 4 | 2 | 0 | 1 |
| `b` | Chauve-souris | 3 | 2 | 0 | 1 |
| `g` | Gobelin | 7 | 3 | 1 | 2 |
| `s` | Squelette | 10 | 4 | 1 | 3 |
| `h` | Homme de feuilles | 14 | 5 | 2 | 4 |
| `d` | Diable | 18 | 6 | 3 | 5 |

Les monstres dorment jusqu'à ce que tu entres dans leur champ de vision, puis te poursuivent. Leur trajet suit une **carte de distances** calculée par parcours en largeur (BFS) depuis ta position : chaque monstre avance vers la case voisine la plus proche de toi. Tu récupères 1 PV tous les 8 tours.

## Objets

Les objets se ramassent automatiquement en marchant dessus et rejoignent le sac (9 places). Les monstres ont 20 % de chances de lâcher un objet en mourant.

| Glyphe | Objet | Effet | Dès la profondeur |
| --- | --- | --- | --- |
| `!` | Potion de soin | +10 PV | 1 |
| `!` | Grande potion de soin | +25 PV | 3 |
| `?` | Parchemin de clairvoyance | révèle tout l'étage | 1 |
| `?` | Parchemin de téléportation | téléporte au hasard dans l'étage | 2 |
| `)` | Dague / Épée courte / Lance de Saint-Georges | +1 / +2 / +4 attaque | 1 / 2 / 4 |
| `[` | Gambison / Cotte de mailles / Armure de chevalier | +1 / +2 / +3 défense | 1 / 3 / 5 |

## Lancer en local

Le jeu utilise des modules ES : il doit être servi par un serveur HTTP (ouvrir `index.html` directement ne marche pas).

- **VS Code** : extension *Live Server* → clic droit sur `index.html` → *Open with Live Server*
- **Terminal** : `npx serve .` ou `python -m http.server`

## Mettre en ligne

Settings → Pages → *Deploy from a branch* → `main` / `root`. Le jeu sera accessible sur **https://melcoloy.github.io/Caves/**.

## Feuille de route

- [x] **Itération 1 — Fondations** : donjon procédural (salles + couloirs), déplacement, escaliers, graine
- [x] **Itération 2 — Vision** : champ de vision (shadowcasting), brouillard de guerre, % d'exploration
- [x] **Itération 3 — Monstres** : bestiaire, IA de poursuite (carte de distances BFS), combat au tour par tour, écran de fin
- [x] **Itération 4 — Objets** : potions, parchemins, armes, armures, inventaire de 9 places, butin des monstres
- [ ] **Itération 5 — Progression** : XP, niveaux, difficulté selon la profondeur
- [ ] **Itération 6 — Le Dragon** : boss final
- [ ] **Itération 7 — Finitions** : sauvegarde, sons, écran de fin, scores

## Structure

```
index.html        page du jeu
style.css         thème visuel
src/
  rng.js          générateur aléatoire à graine
  fov.js          champ de vision (shadowcasting)
  monsters.js     bestiaire
  spawn.js        apparition des monstres
  pathfinding.js  carte de distances (BFS)
  ai.js           comportement des monstres
  combat.js       résolution des attaques
  items.js        catalogue des objets
  inventory.js    sac et équipement
  dungeon.js      génération du donjon
  render.js       dessin sur le canvas
  input.js        gestion du clavier
  main.js         boucle de jeu et état
```
