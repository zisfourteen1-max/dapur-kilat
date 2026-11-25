// Dapur Kilat — input: keyboard state and mouse clicks, translated into
// the logical 1280x720 view. The game loop polls this, never the DOM.

import { VIEW_W, VIEW_H } from './config.js';

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    pressed: new Set(), // keys pressed since the last poll (edge-triggered)
    moveTarget: null, // {x, y} in logical pixels, or null
    click: null, // {x, y, stationId} of the latest click, consumed by poll
    clickTargetStation: null,
  };

  const KEYMAP = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    KeyE: 'interact', Space: 'interact',
    KeyP: 'pause', Escape: 'pause',
    KeyM: 'mute', KeyR: 'restart', Enter: 'confirm',
  };

  function toLogical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * VIEW_W,
      y: ((clientY - rect.top) / rect.height) * VIEW_H,
    };
  }

  window.addEventListener('keydown', (event) => {
    const action = KEYMAP[event.code];
    if (!action) return;
    if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault();
    if (!event.repeat) {
      input.keys.add(action);
      input.pressed.add(action);
    }
  });
  window.addEventListener('keyup', (event) => {
    const action = KEYMAP[event.code];
    if (action) input.keys.delete(action);
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
  });

  canvas.addEventListener('pointerdown', (event) => {
    const p = toLogical(event.clientX, event.clientY);
    input.click = p;
    input.moveTarget = p;
  });

  // Poll once per frame: returns the edge-triggered presses and clears them.
  input.pollPressed = function pollPressed() {
    const out = new Set(input.pressed);
    input.pressed.clear();
    return out;
  };

  input.consumeClick = function consumeClick() {
    const c = input.click;
    input.click = null;
    return c;
  };

  input.clearMoveTarget = function clearMoveTarget() {
    input.moveTarget = null;
  };

  input.moveVector = function moveVector() {
    let x = 0;
    let y = 0;
    if (input.keys.has('left')) x -= 1;
    if (input.keys.has('right')) x += 1;
    if (input.keys.has('up')) y -= 1;
    if (input.keys.has('down')) y += 1;
    if (x !== 0 && y !== 0) {
      const len = Math.hypot(x, y);
      x /= len;
      y /= len;
    }
    return { x, y };
  };

  return input;
}
