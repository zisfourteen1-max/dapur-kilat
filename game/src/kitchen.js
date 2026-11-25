// Dapur Kilat — kitchen: the whole game state and its rules.
// Orders spawn, the cook walks between stations, ingredients are chopped
// and cooked, plates are assembled and served before patience runs out.

import {
  VIEW_W, VIEW_H, SHIFT_SECONDS, MAX_CARRY, COOK_SECONDS, BURN_AFTER_SECONDS,
  CHOPS_NEEDED, COMBO_WINDOW_SECONDS, INGREDIENTS, RECIPES, RECIPE_IDS,
  STATIONS, stationById, levelFor, spawnIntervalFor, patienceFor, KITCHEN_TOP,
} from './config.js';

const COOK_SPEED = 280;
const COOK_RADIUS = 20;

export function isPlateItem(id) {
  return typeof id === 'string' && id.indexOf('plate:') === 0;
}
export function plateDishOf(id) {
  return isPlateItem(id) ? id.slice(6) : null;
}
export function isRawItem(id) {
  return Object.prototype.hasOwnProperty.call(INGREDIENTS, id);
}
export function isComponentItem(id) {
  return id === 'es' || id === 'teh' || id === 'nasi' || id === 'miematang'
    || id === 'ayammatang' || id === 'telurmatang' || id === 'cabaicincang'
    || id === 'sayurcincang' || id === 'gosong';
}

export function createGame() {
  return {
    mode: 'title', // title | playing | paused | over | shot
    time: 0,
    shiftLeft: SHIFT_SECONDS,
    score: 0,
    coins: 0,
    combo: 0,
    comboTimer: 0,
    bestCombo: 0,
    served: 0,
    lost: 0,
    level: 1,
    spawnTimer: 12,
    nextOrderId: 1,
    orders: [],
    cook: { x: 640, y: 480, dir: 1, moving: false, bob: 0, target: null, pendingStation: null, path: null, pathIndex: 0 },
    carry: [],
    board: { item: null, chops: 0 },
    woks: [
      { slot: null },
      { slot: null },
    ],
    plates: [{ items: [] }, { items: [] }],
    floaters: [],
    particles: [],
    toast: null,
    toastTimer: 0,
    interactCooldown: 0,
    newBest: false,
  };
}

export function startShift(state) {
  const fresh = createGame();
  fresh.mode = 'playing';
  Object.assign(state, fresh);
  spawnOrder(state, 'nasigoreng');
  spawnOrder(state, 'miegoreng');
}

function pickDish(level) {
  const available = RECIPE_IDS.filter((id) => RECIPES[id].minLevel <= level);
  let total = 0;
  for (const id of available) total += RECIPES[id].weight;
  let roll = Math.random() * total;
  for (const id of available) {
    roll -= RECIPES[id].weight;
    if (roll <= 0) return id;
  }
  return available[0];
}

export function spawnOrder(state, dishId) {
  if (state.orders.length >= 4) return null;
  const dish = dishId || pickDish(state.level);
  const patience = patienceFor(state.level);
  const order = {
    id: state.nextOrderId,
    dish,
    needs: RECIPES[dish].needs.slice(),
    patience,
    maxPatience: patience,
    born: state.time,
  };
  state.nextOrderId += 1;
  state.orders.push(order);
  return order;
}

export function dishScoreFor(dish, combo) {
  const mult = 1 + 0.1 * combo;
  return Math.round(RECIPES[dish].score * mult);
}

// The plate matches an order when its items are exactly that dish's needs.
export function plateDishFor(plate, orders) {
  if (plate.items.length === 0) return null;
  const have = plate.items.slice().sort().join(',');
  for (const order of orders) {
    if (order.needs.slice().sort().join(',') === have) return order.dish;
  }
  return null;
}

// A hint: the first pending order this plate could still become.
export function plateHintFor(plate, orders) {
  if (plate.items.length === 0) return null;
  for (const order of orders) {
    const needs = order.needs;
    if (plate.items.length < needs.length && plate.items.every((it) => needs.indexOf(it) !== -1)) {
      return order.dish;
    }
  }
  return null;
}

function addFloater(state, x, y, text, color) {
  state.floaters.push({ x, y, text, color: color || '#ffffff', life: 1.4, maxLife: 1.4 });
}

function addToast(state, text) {
  state.toast = text;
  state.toastTimer = 1.6;
}

function burst(state, x, y, color, count) {
  for (let i = 0; i < (count || 10); i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 90;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40,
      life: 0.5 + Math.random() * 0.4,
      maxLife: 0.9,
      color,
      size: 3 + Math.random() * 4,
    });
  }
}

function stationRects() {
  return STATIONS;
}

export function stationAtPoint(x, y) {
  for (const s of STATIONS) {
    if (x >= s.x - 12 && x <= s.x + s.w + 12 && y >= s.y - 12 && y <= s.y + s.h + 12) return s;
  }
  return null;
}

export function nearestStation(state) {
  const { x, y } = state.cook;
  let best = null;
  let bestDist = 95;
  for (const s of STATIONS) {
    const d = Math.hypot(s.front[0] - x, s.front[1] - y);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return best;
}

function carryFull(state) {
  return state.carry.length >= MAX_CARRY;
}

function takeFromCarry(state, id) {
  const i = state.carry.indexOf(id);
  if (i === -1) return false;
  state.carry.splice(i, 1);
  return true;
}

// One interaction with a station. Returns true when something happened.
export function interactWith(state, station, audio) {
  if (!station) return false;
  const cook = state.cook;

  if (station.kind === 'crate' || station.kind === 'dispenser') {
    if (carryFull(state)) {
      addToast(state, 'Tangan penuh! Sajikan atau buang dulu.');
      if (audio) audio.error();
      return false;
    }
    state.carry.push(station.item);
    if (audio) audio.pickup();
    addFloater(state, cook.x, cook.y - 46, '+' + INGREDIENTS[station.item].short, '#ffe9a8');
    return true;
  }

  if (station.kind === 'board') {
    const board = state.board;
    if (!board.item) {
      const idx = state.carry.findIndex((id) => isRawItem(id) && INGREDIENTS[id].needsChop);
      if (idx === -1) {
        addToast(state, 'Bawa ayam, cabai, atau sayur ke talenan.');
        if (audio) audio.error();
        return false;
      }
      board.item = state.carry[idx];
      board.chops = 0;
      state.carry.splice(idx, 1);
      if (audio) audio.place();
      return true;
    }
    if (board.chops < CHOPS_NEEDED) {
      board.chops += 1;
      if (audio) audio.chop();
      burst(state, station.x + station.w / 2, station.y + station.h / 2, '#bfe8a8', 5);
      if (board.chops >= CHOPS_NEEDED) {
        board.item = INGREDIENTS[board.item].cookedAs;
        if (audio) audio.cookDone();
        addFloater(state, station.x + station.w / 2, station.y - 8, 'Siap dicincang!', '#bfe8a8');
      }
      return true;
    }
    if (carryFull(state)) {
      addToast(state, 'Tangan penuh!');
      if (audio) audio.error();
      return false;
    }
    state.carry.push(board.item);
    board.item = null;
    board.chops = 0;
    if (audio) audio.pickup();
    return true;
  }

  if (station.kind === 'wok') {
    const wokIndex = station.id === 'wok2' ? 1 : 0;
    const wok = state.woks[wokIndex];
    if (!wok.slot) {
      const idx = state.carry.findIndex((id) => isRawItem(id) && INGREDIENTS[id].needsCook);
      if (idx === -1) {
        addToast(state, 'Bawa beras, mie, ayam, atau telur ke wok.');
        if (audio) audio.error();
        return false;
      }
      wok.slot = { item: state.carry[idx], progress: 0, done: false, burnt: false, burnTimer: 0, dinged: false };
      state.carry.splice(idx, 1);
      if (audio) audio.place();
      return true;
    }
    const slot = wok.slot;
    if (!slot.done) {
      addToast(state, 'Masih dimasak... sabar ya!');
      return false;
    }
    if (carryFull(state)) {
      addToast(state, 'Tangan penuh!');
      if (audio) audio.error();
      return false;
    }
    if (slot.burnt) {
      state.carry.push('gosong');
      addToast(state, 'Gosong! Buang ke tempat sampah.');
    } else {
      state.carry.push(INGREDIENTS[slot.item].cookedAs);
      addFloater(state, cook.x, cook.y - 46, 'Matang!', '#ffe9a8');
    }
    wok.slot = null;
    if (audio) audio.pickup();
    return true;
  }

  if (station.kind === 'plating') {
    // Pick up a finished plate first.
    for (let p = 0; p < state.plates.length; p += 1) {
      const plate = state.plates[p];
      const dish = plateDishFor(plate, state.orders);
      if (dish && !carryFull(state)) {
        state.carry.push('plate:' + dish);
        plate.items = [];
        if (audio) audio.pickup();
        addFloater(state, cook.x, cook.y - 46, RECIPES[dish].short + ' siap!', '#ffd94d');
        return true;
      }
    }
    // Add a carried component to a plate.
    const idx = state.carry.findIndex((id) => isComponentItem(id) && id !== 'gosong');
    if (idx === -1) {
      // Nothing to plate: take the last item back off a plate instead.
      for (let p = state.plates.length - 1; p >= 0; p -= 1) {
        const plate = state.plates[p];
        if (plate.items.length > 0 && !carryFull(state)) {
          state.carry.push(plate.items.pop());
          if (audio) audio.pickup();
          return true;
        }
      }
      addToast(state, 'Bawa bahan matang ke meja plating.');
      if (audio) audio.error();
      return false;
    }
    const item = state.carry[idx];
    const wanted = state.orders.some((o) => o.needs.indexOf(item) !== -1);
    if (!wanted) {
      addToast(state, 'Tidak ada pesanan yang butuh bahan ini.');
      if (audio) audio.error();
      return false;
    }
    let target = null;
    for (const plate of state.plates) {
      if (plate.items.length < 3 && plate.items.indexOf(item) === -1) {
        target = plate;
        break;
      }
    }
    if (!target) {
      addToast(state, 'Piring penuh / bahan sudah ada di piring.');
      if (audio) audio.error();
      return false;
    }
    target.items.push(item);
    state.carry.splice(idx, 1);
    if (audio) audio.place();
    const dish = plateDishFor(target, state.orders);
    if (dish) {
      addFloater(state, station.x + station.w / 2, station.y - 10, RECIPES[dish].short + ' SIAP!', '#ffd94d');
      if (audio) audio.cookDone();
    }
    return true;
  }

  if (station.kind === 'serving') {
    const idx = state.carry.findIndex((id) => isPlateItem(id));
    if (idx === -1) {
      addToast(state, 'Bawa piring yang sudah lengkap ke sini.');
      if (audio) audio.error();
      return false;
    }
    const dish = plateDishOf(state.carry[idx]);
    const orderIndex = state.orders.findIndex((o) => o.dish === dish);
    if (orderIndex === -1) {
      addToast(state, 'Pesanan itu sudah tidak ada.');
      if (audio) audio.error();
      return false;
    }
    const gained = dishScoreFor(dish, state.combo);
    state.orders.splice(orderIndex, 1);
    state.carry.splice(idx, 1);
    state.score += gained;
    state.coins += Math.max(5, Math.round(gained / 10));
    state.combo += 1;
    state.comboTimer = COMBO_WINDOW_SECONDS;
    if (state.combo > state.bestCombo) state.bestCombo = state.combo;
    state.served += 1;
    burst(state, station.x + station.w / 2, station.y + station.h / 2, '#ffd94d', 18);
    addFloater(state, station.x + station.w / 2, station.y - 12, '+' + gained + '  x' + state.combo, '#ffd94d');
    if (audio) {
      audio.serve();
      audio.coin();
    }
    return true;
  }

  if (station.kind === 'trash') {
    if (state.carry.length === 0) {
      addToast(state, 'Tidak ada yang dibuang.');
      return false;
    }
    const removed = state.carry.pop();
    if (audio) audio.place();
    addFloater(state, cook.x, cook.y - 46, 'Buang: ' + (isPlateItem(removed) ? 'piring' : removed), '#ff9a8a');
    return true;
  }

  return false;
}

export function tryInteract(state, audio) {
  if (state.interactCooldown > 0) return;
  const station = nearestStation(state);
  if (!station) return;
  state.interactCooldown = 0.18;
  interactWith(state, station, audio);
}

function collideWithStations(state) {
  const cook = state.cook;
  const r = COOK_RADIUS;
  for (const s of stationRects()) {
    if (s.kind === 'prep') {
      // The prep counter is solid.
    }
    const nearestX = Math.max(s.x, Math.min(cook.x, s.x + s.w));
    const nearestY = Math.max(s.y, Math.min(cook.y, s.y + s.h));
    const dx = cook.x - nearestX;
    const dy = cook.y - nearestY;
    const distSq = dx * dx + dy * dy;
    if (distSq < r * r) {
      if (distSq === 0) {
        cook.y = s.y + s.h + r;
      } else {
        const dist = Math.sqrt(distSq);
        cook.x = nearestX + (dx / dist) * r;
        cook.y = nearestY + (dy / dist) * r;
      }
    }
  }
  cook.x = Math.max(30, Math.min(VIEW_W - 30, cook.x));
  cook.y = Math.max(KITCHEN_TOP + 24, Math.min(VIEW_H - 24, cook.y));
}

// Click-to-move pathfinding: a coarse A* grid over the kitchen floor.
// Station rectangles are inflated by just under the cook's radius, so a
// path never leads the cook into a counter. Diagonals never cut a blocked
// corner. Cells are 20px so the thin lane below the counters stays open.
const GRID_COLS = 64;
const GRID_ROWS = 27;
const CELL = 20;

function cellBlocked(c, r) {
  const cx = c * CELL + CELL / 2;
  const cy = KITCHEN_TOP + r * CELL + CELL / 2;
  if (cx < 24 || cx > VIEW_W - 24 || cy < KITCHEN_TOP + 20 || cy > VIEW_H - 20) return true;
  for (const s of STATIONS) {
    if (cx >= s.x - 18 && cx <= s.x + s.w + 18 && cy >= s.y - 18 && cy <= s.y + s.h + 18) return true;
  }
  return false;
}

function cellOf(x, y) {
  return {
    c: Math.max(0, Math.min(GRID_COLS - 1, Math.floor(x / CELL))),
    r: Math.max(0, Math.min(GRID_ROWS - 1, Math.floor((y - KITCHEN_TOP) / CELL))),
  };
}

function findPath(fromX, fromY, toX, toY) {
  const start = cellOf(fromX, fromY);
  let goal = cellOf(toX, toY);
  if (cellBlocked(goal.c, goal.r)) {
    let best = null;
    let bestD = Infinity;
    for (let r = 0; r < GRID_ROWS; r += 1) {
      for (let c = 0; c < GRID_COLS; c += 1) {
        if (cellBlocked(c, r)) continue;
        const d = (c - goal.c) * (c - goal.c) + (r - goal.r) * (r - goal.r);
        if (d < bestD) {
          bestD = d;
          best = { c, r };
        }
      }
    }
    if (!best) return null;
    goal = best;
  }
  const key = (c, r) => r * GRID_COLS + c;
  const heuristic = (c, r) => Math.hypot(c - goal.c, r - goal.r);
  const open = [{ c: start.c, r: start.r, g: 0, f: heuristic(start.c, start.r), parent: null }];
  const gScore = new Map([[key(start.c, start.r), 0]]);
  const closed = new Set();
  const DIRS = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414],
  ];
  while (open.length > 0) {
    let bi = 0;
    for (let i = 1; i < open.length; i += 1) {
      if (open[i].f < open[bi].f) bi = i;
    }
    const cur = open.splice(bi, 1)[0];
    const ck = key(cur.c, cur.r);
    if (closed.has(ck)) continue;
    closed.add(ck);
    if (cur.c === goal.c && cur.r === goal.r) {
      const cells = [];
      let node = cur;
      while (node) {
        cells.push(node);
        node = node.parent;
      }
      cells.reverse();
      const pts = cells.slice(1).map((n) => ({
        x: n.c * CELL + CELL / 2,
        y: KITCHEN_TOP + n.r * CELL + CELL / 2,
      }));
      pts.push({ x: toX, y: toY });
      return pts;
    }
    for (const [dc, dr, cost] of DIRS) {
      const nc = cur.c + dc;
      const nr = cur.r + dr;
      if (nc < 0 || nr < 0 || nc >= GRID_COLS || nr >= GRID_ROWS) continue;
      if (cellBlocked(nc, nr)) continue;
      if (dc !== 0 && dr !== 0 && (cellBlocked(cur.c + dc, cur.r) || cellBlocked(cur.c, cur.r + dr))) continue;
      const nk = key(nc, nr);
      if (closed.has(nk)) continue;
      const ng = cur.g + cost;
      if (ng < (gScore.get(nk) === undefined ? Infinity : gScore.get(nk))) {
        gScore.set(nk, ng);
        open.push({ c: nc, r: nr, g: ng, f: ng + heuristic(nc, nr), parent: cur });
      }
    }
  }
  return null;
}

function moveCook(state, dt, input, audio) {
  const cook = state.cook;
  const vec = input.moveVector();
  let tx = 0;
  let ty = 0;
  if (vec.x !== 0 || vec.y !== 0) {
    tx = vec.x;
    ty = vec.y;
    cook.target = null;
    cook.path = null;
    cook.pendingStation = null;
  } else if (cook.target) {
    if (!cook.path) {
      cook.path = findPath(cook.x, cook.y, cook.target.x, cook.target.y);
      cook.pathIndex = 0;
      if (!cook.path) {
        cook.target = null;
        cook.pendingStation = null;
      }
    }
    if (cook.path) {
      if (cook.pathIndex >= cook.path.length) {
        cook.target = null;
        cook.path = null;
        const pending = cook.pendingStation;
        cook.pendingStation = null;
        if (pending) {
          const station = stationById(pending);
          if (station) interactWith(state, station, audio);
        }
      } else {
        const wp = cook.path[cook.pathIndex];
        const dx = wp.x - cook.x;
        const dy = wp.y - cook.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 12) {
          cook.pathIndex += 1;
        } else {
          tx = dx / dist;
          ty = dy / dist;
        }
      }
    }
  }
  if (tx !== 0 || ty !== 0) {
    cook.x += tx * COOK_SPEED * dt;
    cook.y += ty * COOK_SPEED * dt;
    cook.dir = tx < 0 ? -1 : tx > 0 ? 1 : cook.dir;
    cook.moving = true;
    cook.bob += dt * 12;
  } else {
    cook.moving = false;
  }
  collideWithStations(state);
}

export function updateGame(state, input, audio, dt) {
  if (state.mode !== 'playing') return;
  if (dt > 0.05) dt = 0.05;

  state.time += dt;
  state.shiftLeft = Math.max(0, SHIFT_SECONDS - state.time);
  state.level = levelFor(state.time);
  if (state.interactCooldown > 0) state.interactCooldown -= dt;
  if (state.toastTimer > 0) {
    state.toastTimer -= dt;
    if (state.toastTimer <= 0) state.toast = null;
  }
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.combo = 0;
  }

  // New orders arrive on a timer.
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnOrder(state);
    state.spawnTimer = spawnIntervalFor(state.level);
  }

  // Patience drains; an expired order is lost.
  for (let i = state.orders.length - 1; i >= 0; i -= 1) {
    const order = state.orders[i];
    order.patience -= dt;
    if (order.patience <= 0) {
      state.orders.splice(i, 1);
      state.lost += 1;
      state.combo = 0;
      state.comboTimer = 0;
      state.score = Math.max(0, state.score - 50);
      addToast(state, 'Pesanan ' + RECIPES[order.dish].short + ' hangus! -50');
      if (audio) audio.lost();
    }
  }

  // Woks cook; done food burns if left too long.
  let anyCooking = false;
  for (const wok of state.woks) {
    const slot = wok.slot;
    if (!slot) continue;
    if (!slot.done) {
      anyCooking = true;
      slot.progress += dt / COOK_SECONDS;
      if (slot.progress >= 1) {
        slot.progress = 1;
        slot.done = true;
        slot.burnTimer = 0;
        if (!slot.dinged) {
          slot.dinged = true;
          if (audio) audio.cookDone();
        }
      }
    } else if (!slot.burnt) {
      slot.burnTimer += dt;
      if (slot.burnTimer > BURN_AFTER_SECONDS) {
        slot.burnt = true;
        addToast(state, 'Ada masakan gosong di wok!');
      }
    }
  }
  if (audio) {
    if (anyCooking) audio.startSizzle();
    else audio.stopSizzle();
  }

  // Steam wisps above hot woks.
  if (Math.random() < dt * 6) {
    for (const wok of state.woks) {
      if (wok.slot) {
        const s = STATIONS.find((st) => st.id === (state.woks[0] === wok ? 'wok1' : 'wok2'));
        state.particles.push({
          x: s.x + s.w / 2 + (Math.random() - 0.5) * 60,
          y: s.y + 20,
          vx: (Math.random() - 0.5) * 12,
          vy: -30 - Math.random() * 20,
          life: 0.9,
          maxLife: 0.9,
          color: 'rgba(255,255,255,0.55)',
          size: 5 + Math.random() * 5,
        });
      }
    }
  }

  moveCook(state, dt, input, audio);

  for (let i = state.floaters.length - 1; i >= 0; i -= 1) {
    const f = state.floaters[i];
    f.life -= dt;
    f.y -= 34 * dt;
    if (f.life <= 0) state.floaters.splice(i, 1);
  }
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy -= 12 * dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }

  if (state.shiftLeft <= 0) {
    state.mode = 'over';
    if (audio) audio.stopSizzle();
  }
}
