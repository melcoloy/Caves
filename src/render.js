// Rendu de la carte sur un <canvas>, façon roguelike classique (glyphes ASCII).
// Trois états par case : visible (couleurs vives), explorée (couleurs ternes), inconnue (noir).

import { TILE } from "./dungeon.js";

export const TILE_SIZE = 16;

const BACKGROUND = "#0d0b12";

const PALETTE = {
  visible: {
    wall: "#2f2842",
    wallGlyph: "#8a7db0",
    floor: "#1c1828",
    floorGlyph: "#4a4266",
    stairs: "#f2c14e",
  },
  remembered: {
    wall: "#17141f",
    wallGlyph: "#4a4266",
    floor: "#110f18",
    floorGlyph: "#2e2840",
    stairs: "#7a6430",
  },
};

const PLAYER_COLOR = "#7fdbca";
const DEAD_PLAYER_COLOR = "#e0524f";
const REMEMBERED_ITEM_COLOR = "#4a4266";

// Un mur n'est dessiné que s'il touche du sol : le reste de la roche reste noir.
function isVisibleWall(dungeon, x, y) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if ((dx || dy) && dungeon.get(x + dx, y + dy) !== TILE.WALL) return true;
    }
  }
  return false;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext("2d");

  function resize(cols, rows) {
    canvas.width = cols * TILE_SIZE;
    canvas.height = rows * TILE_SIZE;
    // Changer la taille du canvas réinitialise le contexte : on remet la police.
    ctx.font = `bold ${TILE_SIZE}px "JetBrains Mono", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
  }

  function cell(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  }

  function glyph(char, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillText(char, x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2 + 1);
  }

  function drawTile(dungeon, x, y, colors) {
    switch (dungeon.get(x, y)) {
      case TILE.WALL:
        if (isVisibleWall(dungeon, x, y)) {
          cell(x, y, colors.wall);
          glyph("#", x, y, colors.wallGlyph);
        }
        break;
      case TILE.FLOOR:
        cell(x, y, colors.floor);
        glyph("·", x, y, colors.floorGlyph);
        break;
      case TILE.STAIRS:
        cell(x, y, colors.floor);
        glyph(">", x, y, colors.stairs);
        break;
    }
  }

  function draw(dungeon, player, monsters = [], items = [], dead = false) {
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < dungeon.height; y++) {
      for (let x = 0; x < dungeon.width; x++) {
        if (dungeon.isVisible(x, y)) {
          drawTile(dungeon, x, y, PALETTE.visible);
        } else if (dungeon.isExplored(x, y)) {
          drawTile(dungeon, x, y, PALETTE.remembered);
        }
      }
    }

    // Objets au sol : couleur vive s'ils sont visibles, grisés s'ils sont seulement mémorisés.
    for (const item of items) {
      if (dungeon.isVisible(item.x, item.y)) {
        glyph(item.glyph, item.x, item.y, item.color);
      } else if (dungeon.isExplored(item.x, item.y)) {
        glyph(item.glyph, item.x, item.y, REMEMBERED_ITEM_COLOR);
      }
    }

    // Les monstres ne sont affichés que s'ils sont dans le champ de vision.
    for (const monster of monsters) {
      if (dungeon.isVisible(monster.x, monster.y)) {
        glyph(monster.glyph, monster.x, monster.y, monster.color);
      }
    }

    glyph("@", player.x, player.y, dead ? DEAD_PLAYER_COLOR : PLAYER_COLOR);
  }

  return { resize, draw };
}
