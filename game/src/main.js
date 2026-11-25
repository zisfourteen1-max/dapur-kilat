// Dapur Kilat — main: boot, the game loop and the state machine.
// Title -> playing -> paused / over, plus the frozen ?shot= scenes used
// for screenshots. Keyboard, mouse and the HUD buttons all land here.

import { VIEW_W, VIEW_H, RECIPES } from './config.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import {
  createGame, startShift, updateGame, tryInteract, stationAtPoint, spawnOrder,
} from './kitchen.js';
import { drawGame, PAUSE_BTN, MUTE_BTN, RESTART_BTN, pointInRect } from './render.js';
import { stageShot, SHOT_NAMES } from './shots.js';

const canvas = document.getElementById('game');
const statusLine = document.getElementById('status');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const ctx = canvas.getContext('2d');

const input = createInput(canvas);
const audio = createAudio();
const params = new URLSearchParams(window.location.search);

let state;
const shotName = params.get('shot');
if (shotName && SHOT_NAMES.indexOf(shotName) !== -1) {
  state = stageShot(shotName);
} else {
  state = createGame();
}

// Playtest affordance: ?order=nasigoreng starts the shift at once with
// that dish as the first order, so the full loop can be driven by keys.
const testOrder = params.get('order');
if (testOrder && RECIPES[testOrder]) {
  startShift(state);
  state.orders = [];
  state.nextOrderId = 1;
  spawnOrder(state, testOrder);
}

window.__game = state;

function setStatus(text) {
  if (statusLine && statusLine.textContent !== text) statusLine.textContent = text;
}

function clickToLogical(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * VIEW_W,
    y: ((clientY - rect.top) / rect.height) * VIEW_H,
  };
}

function handleClick(point) {
  audio.ensure();
  if (state.mode === 'title') {
    startShift(state);
    audio.startMusic();
    return;
  }
  if (state.mode === 'over') {
    if (pointInRect(point.x, point.y, RESTART_BTN)) {
      startShift(state);
      audio.startMusic();
    }
    return;
  }
  if (pointInRect(point.x, point.y, PAUSE_BTN)) {
    state.mode = state.mode === 'paused' ? 'playing' : 'paused';
    return;
  }
  if (pointInRect(point.x, point.y, MUTE_BTN)) {
    audio.setMuted(!audio.muted);
    return;
  }
  if (state.mode === 'paused') return;
  if (state.mode !== 'playing') return;
  const station = stationAtPoint(point.x, point.y);
  if (station) {
    state.cook.target = { x: station.front[0], y: station.front[1] };
    state.cook.path = null;
    state.cook.pendingStation = station.id;
  } else {
    state.cook.target = { x: point.x, y: point.y };
    state.cook.path = null;
    state.cook.pendingStation = null;
  }
}

let lastStatusAt = 0;
function loop(nowMs) {
  const now = nowMs / 1000;
  const dt = Math.min(0.05, (nowMs - loop.last) / 1000 || 0.016);
  loop.last = nowMs;

  const pressed = input.pollPressed();
  const click = input.consumeClick();
  if (click) handleClick(click);

  if (pressed.has('confirm')) {
    audio.ensure();
    if (state.mode === 'title' || state.mode === 'over') {
      startShift(state);
      audio.startMusic();
    }
  }
  if (pressed.has('pause')) {
    if (state.mode === 'playing') state.mode = 'paused';
    else if (state.mode === 'paused') state.mode = 'playing';
  }
  if (pressed.has('mute')) {
    audio.ensure();
    audio.setMuted(!audio.muted);
  }
  if (pressed.has('restart')) {
    if (state.mode === 'playing' || state.mode === 'over' || state.mode === 'paused') {
      startShift(state);
      audio.startMusic();
    }
  }
  if (pressed.has('interact')) {
    audio.ensure();
    if (state.mode === 'playing') {
      input.clearMoveTarget();
      tryInteract(state, audio);
    }
  }

  if (state.mode === 'playing') {
    updateGame(state, input, audio, dt);
    audio.musicTick();
  }

  drawGame(ctx, state, audio.muted, now);

  if (now - lastStatusAt > 1) {
    lastStatusAt = now;
    if (state.mode === 'playing') {
      setStatus(
        'Dapur Kilat. Skor ' + state.score + ', koin ' + state.coins
        + ', pesanan aktif ' + state.orders.length
        + ', sisa shift ' + Math.ceil(state.shiftLeft) + ' detik.',
      );
    } else if (state.mode === 'title') {
      setStatus('Dapur Kilat. Tekan Enter untuk mulai memasak.');
    } else if (state.mode === 'over') {
      setStatus('Shift selesai. Skor akhir ' + state.score + '. Tekan R untuk main lagi.');
    }
  }

  requestAnimationFrame(loop);
}
loop.last = performance.now();
requestAnimationFrame(loop);
