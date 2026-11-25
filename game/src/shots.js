// Dapur Kilat — shots: deterministic staged scenes for the screenshots.
// Each one builds a fixed mid-service moment so the capture is the same
// every run: kitchen, order board, ingredients, a dish mid-assembly, a
// timer and a plate ready to serve. No randomness, no timers ticking.

import { createGame } from './kitchen.js';
import { RECIPES } from './config.js';

export const SHOT_NAMES = ['cover', 'chop', 'assembly', 'serve'];

function baseShot(overrides) {
  const state = createGame();
  state.mode = 'shot';
  state.time = 65;
  state.shiftLeft = 115;
  state.level = 2;
  state.score = 340;
  state.coins = 42;
  state.combo = 3;
  state.comboTimer = 12;
  state.bestCombo = 3;
  state.served = 3;
  state.lost = 0;
  state.spawnTimer = 6;
  Object.assign(state, overrides || {});
  return state;
}

// Orders are built inline in each scene so the recipe lists stay exact.
function order(id, dish, patience) {
  const maxPatience = 72;
  return {
    id,
    dish,
    needs: RECIPES[dish].needs.slice(),
    patience,
    maxPatience,
    born: 0,
  };
}

export function stageShot(name) {
  if (name === 'cover') {
    const state = baseShot({
      time: 65,
      shiftLeft: 115,
      level: 2,
      score: 340,
      coins: 42,
      combo: 3,
      served: 3,
      nextOrderId: 4,
      orders: [
        order(1, 'nasigoreng', 42),
        order(2, 'miegoreng', 24),
        order(3, 'sateayam', 58),
      ],
    });
    state.cook.x = 610;
    state.cook.y = 340;
    state.cook.dir = 1;
    state.carry = ['telurmatang'];
    state.board = { item: 'ayam', chops: 2 };
    state.woks = [
      { slot: { item: 'beras', progress: 0.6, done: false, burnt: false, burnTimer: 0, dinged: false } },
      { slot: { item: 'ayam', progress: 1, done: true, burnt: false, burnTimer: 1.5, dinged: true } },
    ];
    state.plates = [
      { items: ['nasi', 'telurmatang'] },
      { items: ['nasi', 'telurmatang', 'cabaicincang'] },
    ];
    state.floaters = [{ x: 1116, y: 540, text: '+120  x3', color: '#ffd94d', life: 1.2, maxLife: 1.4 }];
    return state;
  }

  if (name === 'chop') {
    const state = baseShot({
      time: 40,
      shiftLeft: 140,
      level: 1,
      score: 120,
      coins: 18,
      combo: 1,
      served: 1,
      nextOrderId: 3,
      orders: [
        order(1, 'miegoreng', 48),
        order(2, 'sateayam', 60),
      ],
    });
    state.cook.x = 375;
    state.cook.y = 316;
    state.cook.dir = 1;
    state.carry = ['cabai'];
    state.board = { item: 'ayam', chops: 1 };
    state.woks = [
      { slot: { item: 'mie', progress: 0.45, done: false, burnt: false, burnTimer: 0, dinged: false } },
      { slot: null },
    ];
    state.plates = [
      { items: ['miematang'] },
      { items: [] },
    ];
    return state;
  }

  if (name === 'assembly') {
    const state = baseShot({
      time: 92,
      shiftLeft: 88,
      level: 3,
      score: 260,
      coins: 33,
      combo: 2,
      served: 2,
      nextOrderId: 3,
      orders: [
        order(1, 'nasigoreng', 30),
        order(2, 'miegoreng', 52),
      ],
    });
    state.cook.x = 600;
    state.cook.y = 560;
    state.cook.dir = -1;
    state.carry = ['cabaicincang'];
    state.board = { item: null, chops: 0 };
    state.woks = [
      { slot: null },
      { slot: { item: 'telur', progress: 1, done: true, burnt: false, burnTimer: 2, dinged: true } },
    ];
    state.plates = [
      { items: ['nasi', 'telurmatang'] },
      { items: [] },
    ];
    return state;
  }

  if (name === 'serve') {
    const state = baseShot({
      time: 122,
      shiftLeft: 58,
      level: 3,
      score: 480,
      coins: 60,
      combo: 2,
      served: 4,
      nextOrderId: 4,
      orders: [
        order(1, 'nasigoreng', 8),
        order(2, 'miegoreng', 44),
        order(3, 'sateayam', 50),
      ],
    });
    state.cook.x = 1116;
    state.cook.y = 560;
    state.cook.dir = 1;
    state.carry = ['plate:nasigoreng'];
    state.board = { item: null, chops: 0 };
    state.woks = [
      { slot: { item: 'mie', progress: 0.8, done: false, burnt: false, burnTimer: 0, dinged: false } },
      { slot: null },
    ];
    state.plates = [
      { items: [] },
      { items: ['miematang', 'sayurcincang'] },
    ];
    state.floaters = [
      { x: 1116, y: 520, text: '+100  x2', color: '#ffd94d', life: 1.2, maxLife: 1.4 },
      { x: 640, y: 300, text: 'Sajikan sebelum hangus!', color: '#ffe9a8', life: 1.2, maxLife: 1.4 },
    ];
    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2;
      state.particles.push({
        x: 1116 + Math.cos(angle) * 30,
        y: 620 + Math.sin(angle) * 20,
        vx: Math.cos(angle) * 30,
        vy: Math.sin(angle) * 30 - 20,
        life: 0.7,
        maxLife: 0.9,
        color: '#ffd94d',
        size: 4,
      });
    }
    return state;
  }

  return baseShot();
}
