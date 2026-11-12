// Génération de donjon : salles rectangulaires reliées par des couloirs en L.

export const TILE = Object.freeze({
  WALL: 0,
  FLOOR: 1,
  STAIRS: 2,
});

const DEFAULTS = {
  maxRooms: 14,
  minRoomSize: 4,
  maxRoomSize: 10,
  withStairs: true, // false pour le dernier étage (antre du Dragon)
};

function center(room) {
  return {
    x: Math.floor(room.x + room.w / 2),
    y: Math.floor(room.y + room.h / 2),
  };
}

// Deux salles se chevauchent (avec une marge de `gap` cases entre elles) ?
function intersects(a, b, gap = 1) {
  return (
    a.x - gap < b.x + b.w &&
    a.x + a.w + gap > b.x &&
    a.y - gap < b.y + b.h &&
    a.y + a.h + gap > b.y
  );
}

function tryGenerate(width, height, rng, opts) {
  const tiles = new Uint8Array(width * height).fill(TILE.WALL);
  const rooms = [];
  const set = (x, y, t) => (tiles[y * width + x] = t);

  const carveRoom = (r) => {
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) set(x, y, TILE.FLOOR);
    }
  };
  const carveH = (x1, x2, y) => {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) set(x, y, TILE.FLOOR);
  };
  const carveV = (y1, y2, x) => {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) set(x, y, TILE.FLOOR);
  };

  const attempts = opts.maxRooms * 5;
  for (let i = 0; i < attempts && rooms.length < opts.maxRooms; i++) {
    const w = rng.int(opts.minRoomSize, opts.maxRoomSize);
    const h = rng.int(opts.minRoomSize, Math.max(opts.minRoomSize, opts.maxRoomSize - 3));
    // On garde toujours une bordure de murs autour de la carte.
    const room = {
      x: rng.int(1, width - w - 2),
      y: rng.int(1, height - h - 2),
      w,
      h,
    };
    if (rooms.some((other) => intersects(room, other))) continue;

    carveRoom(room);

    // Relie la nouvelle salle à la précédente par un couloir en L.
    if (rooms.length > 0) {
      const a = center(rooms[rooms.length - 1]);
      const b = center(room);
      if (rng.chance(0.5)) {
        carveH(a.x, b.x, a.y);
        carveV(a.y, b.y, b.x);
      } else {
        carveV(a.y, b.y, a.x);
        carveH(a.x, b.x, b.y);
      }
    }
    rooms.push(room);
  }

  return { tiles, rooms };
}

export function generateDungeon(width, height, rng, options = {}) {
  const opts = { ...DEFAULTS, ...options };

  let result;
  do {
    result = tryGenerate(width, height, rng, opts);
  } while (result.rooms.length < 2);

  const { tiles, rooms } = result;
  const start = center(rooms[0]);

  // La salle la plus éloignée du départ accueille l'escalier (ou l'antre du boss).
  let exitRoom = rooms[1];
  let best = -1;
  for (const room of rooms.slice(1)) {
    const c = center(room);
    const dist = Math.abs(c.x - start.x) + Math.abs(c.y - start.y);
    if (dist > best) {
      best = dist;
      exitRoom = room;
    }
  }
  const stairs = center(exitRoom);
  if (opts.withStairs) tiles[stairs.y * width + stairs.x] = TILE.STAIRS;

  return buildDungeon({
    width,
    height,
    tiles,
    rooms,
    start,
    stairs,
    exitRoom,
    explored: new Uint8Array(width * height),
  });
}

/** Recrée un donjon à partir des données produites par `serialize()`. */
export function restoreDungeon(data) {
  const toBytes = (text) => Uint8Array.from(text, Number);
  return buildDungeon({
    width: data.width,
    height: data.height,
    tiles: toBytes(data.tiles),
    rooms: data.rooms,
    start: data.start,
    stairs: data.stairs,
    exitRoom: data.rooms[data.exitRoomIndex],
    explored: toBytes(data.explored),
  });
}

function buildDungeon({ width, height, tiles, rooms, start, stairs, exitRoom, explored }) {
  // Vision : `visible` = vu ce tour-ci, `explored` = déjà vu au moins une fois.
  const visible = new Uint8Array(width * height);
  const walkableCount = tiles.reduce((n, t) => n + (t !== TILE.WALL ? 1 : 0), 0);

  return {
    width,
    height,
    tiles,
    rooms,
    start,
    stairs,
    exitRoom,
    inBounds(x, y) {
      return x >= 0 && y >= 0 && x < width && y < height;
    },
    get(x, y) {
      return this.inBounds(x, y) ? tiles[y * width + x] : TILE.WALL;
    },
    isWalkable(x, y) {
      return this.get(x, y) !== TILE.WALL;
    },
    isOpaque(x, y) {
      return this.get(x, y) === TILE.WALL;
    },
    isVisible(x, y) {
      return this.inBounds(x, y) && visible[y * width + x] === 1;
    },
    isExplored(x, y) {
      return this.inBounds(x, y) && explored[y * width + x] === 1;
    },
    clearVisible() {
      visible.fill(0);
    },
    reveal(x, y) {
      if (!this.inBounds(x, y)) return;
      visible[y * width + x] = 1;
      explored[y * width + x] = 1;
    },
    /** Marque tout le niveau comme exploré (parchemin de clairvoyance). */
    exploreAll() {
      explored.fill(1);
    },
    /** Part des cases praticables déjà découvertes (entre 0 et 1). */
    explorationRatio() {
      let seen = 0;
      for (let i = 0; i < tiles.length; i++) {
        if (tiles[i] !== TILE.WALL && explored[i]) seen++;
      }
      return seen / walkableCount;
    },
    /** Données compactes (chaînes de chiffres) pour la sauvegarde. */
    serialize() {
      return {
        width,
        height,
        tiles: tiles.join(""),
        rooms,
        start,
        stairs,
        exitRoomIndex: rooms.indexOf(exitRoom),
        explored: explored.join(""),
      };
    },
  };
}
