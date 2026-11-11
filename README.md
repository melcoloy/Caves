# 🐉 Les Caves du Doudou

Un roguelike au tour par tour jouable dans le navigateur. Descends dans les caves sous la Grand-Place de Mons, survis aux monstres et affronte le Dragon au plus profond du donjon.

Chaque partie génère des donjons différents à partir d'une **graine** (seed) : avec la même graine, tu retrouves exactement les mêmes niveaux.

## Jouer

| Action | Touches |
| --- | --- |
| Se déplacer | Flèches, `ZQSD` (AZERTY), `WASD` (QWERTY) ou pavé numérique |
| Descendre l'escalier `>` | `Entrée`, `Espace` ou `>` |
| Nouvelle partie | `R` |

Pour rejouer une graine précise : `index.html?seed=123456`.

## Lancer en local

Le jeu utilise des modules ES : il doit être servi par un serveur HTTP (ouvrir `index.html` directement ne marche pas).

- **VS Code** : extension *Live Server* → clic droit sur `index.html` → *Open with Live Server*
- **Terminal** : `npx serve .` ou `python -m http.server`

## Mettre en ligne

Settings → Pages → *Deploy from a branch* → `main` / `root`. Le jeu sera accessible sur `https://<pseudo>.github.io/caves-du-doudou/`.

## Feuille de route

- [x] **Itération 1 — Fondations** : donjon procédural (salles + couloirs), déplacement, escaliers, graine
- [ ] **Itération 2 — Vision** : champ de vision et brouillard de guerre
- [ ] **Itération 3 — Monstres** : ennemis, IA de poursuite, combat au tour par tour
- [ ] **Itération 4 — Objets** : potions, armes, armures, inventaire
- [ ] **Itération 5 — Progression** : XP, niveaux, difficulté selon la profondeur
- [ ] **Itération 6 — Le Dragon** : boss final
- [ ] **Itération 7 — Finitions** : sauvegarde, sons, écran de fin, scores

## Structure

```
index.html        page du jeu
style.css         thème visuel
src/
  rng.js          générateur aléatoire à graine
  dungeon.js      génération du donjon
  render.js       dessin sur le canvas
  input.js        gestion du clavier
  main.js         boucle de jeu et état
```
