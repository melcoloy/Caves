// Rendu de la carte sur un <canvas>, façon roguelike classique (glyphes ASCII).

import { TILE } from "./dungeon.js";

export const TILE_SIZE = 16;

const COLORS = {
  background: "#0d0b12",
  wall: "#2a2438",
  wallGlyph: "#6b5f8a",
  floor: "#15121e",
  floorGlyph: "#3a3350",
  stairs: "#f2c14e",
  player: "#7fdbca",
};

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

  function draw(dungeon, player) {
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < dungeon.height; y++) {
      for (let x = 0; x < dungeon.width; x++) {
        switch (dungeon.get(x, y)) {
          case TILE.WALL:
            if (isVisibleWall(dungeon, x, y)) {
              cell(x, y, COLORS.wall);
              glyph("#", x, y, COLORS.wallGlyph);
            }
            break;
          case TILE.FLOOR:
            cell(x, y, COLORS.floor);
            glyph("·", x, y, COLORS.floorGlyph);
            break;
          case TILE.STAIRS:
            cell(x, y, COLORS.floor);
            glyph(">", x, y, COLORS.stairs);
            break;
        }
      }
    }

    glyph("@", player.x, player.y, COLORS.player);
  }

  return { resize, draw };
}