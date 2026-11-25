// Dapur Kilat — render: every pixel of the game is drawn here on one
// canvas. Warm warung colours, readable stations, a busy order board.

import {
  VIEW_W, VIEW_H, HUD_H, ORDER_BOARD_TOP, ORDER_BOARD_H, KITCHEN_TOP,
  INGREDIENTS, RECIPES, STATIONS, componentLook,
} from './config.js';
import {
  isPlateItem, plateDishOf, isComponentItem, plateDishFor, plateHintFor, nearestStation,
} from './kitchen.js';

export const PAUSE_BTN = { x: 1096, y: 12, w: 40, h: 40 };
export const MUTE_BTN = { x: 1148, y: 12, w: 40, h: 40 };
export const RESTART_BTN = { x: 540, y: 520, w: 200, h: 56 };

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align, weight) {
  ctx.fillStyle = color;
  ctx.font = (weight || 'bold') + ' ' + size + 'px Arial, Helvetica, sans-serif';
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

function fmtTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

// Small vector food icons, drawn with shapes so they read without any font.
export function drawFoodIcon(ctx, icon, cx, cy, size, color, edge) {
  const s = size / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineWidth = Math.max(1.5, size * 0.06);
  ctx.strokeStyle = edge || '#7a5a2a';
  if (icon === 'rice') {
    ctx.fillStyle = color || '#fffdf2';
    ctx.beginPath();
    ctx.arc(0, s * 0.25, s * 0.85, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e8dfc0';
    ctx.beginPath();
    ctx.arc(-s * 0.35, -s * 0.15, s * 0.16, 0, Math.PI * 2);
    ctx.arc(s * 0.3, -s * 0.25, s * 0.16, 0, Math.PI * 2);
    ctx.fill();
  } else if (icon === 'noodle') {
    ctx.strokeStyle = color || '#f7d774';
    ctx.lineWidth = size * 0.12;
    ctx.beginPath();
    for (let i = -1; i <= 1; i += 1) {
      ctx.moveTo(-s * 0.8, i * s * 0.45);
      ctx.bezierCurveTo(-s * 0.3, i * s * 0.45 - s * 0.4, s * 0.3, i * s * 0.45 + s * 0.4, s * 0.8, i * s * 0.45);
    }
    ctx.stroke();
  } else if (icon === 'drumstick') {
    ctx.fillStyle = color || '#e8915a';
    ctx.beginPath();
    ctx.ellipse(-s * 0.1, -s * 0.15, s * 0.75, s * 0.55, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#f5f0dc';
    ctx.lineWidth = size * 0.12;
    ctx.beginPath();
    ctx.moveTo(s * 0.45, s * 0.35);
    ctx.lineTo(s * 0.85, s * 0.8);
    ctx.stroke();
    ctx.fillStyle = '#f5f0dc';
    ctx.beginPath();
    ctx.arc(s * 0.9, s * 0.85, s * 0.18, 0, Math.PI * 2);
    ctx.fill();
  } else if (icon === 'egg') {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.85, s * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color || '#ffd94d';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.38, 0, Math.PI * 2);
    ctx.fill();
  } else if (icon === 'chilli') {
    ctx.fillStyle = color || '#e23b2e';
    ctx.beginPath();
    ctx.moveTo(-s * 0.7, -s * 0.5);
    ctx.quadraticCurveTo(s * 0.2, -s * 0.9, s * 0.75, -s * 0.1);
    ctx.quadraticCurveTo(s * 0.3, s * 0.7, -s * 0.5, s * 0.55);
    ctx.quadraticCurveTo(-s * 0.9, s * 0.1, -s * 0.7, -s * 0.5);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#2f7d3d';
    ctx.lineWidth = size * 0.09;
    ctx.beginPath();
    ctx.moveTo(s * 0.7, -s * 0.15);
    ctx.quadraticCurveTo(s * 1.0, -s * 0.5, s * 0.8, -s * 0.75);
    ctx.stroke();
  } else if (icon === 'veg') {
    ctx.fillStyle = color || '#58b368';
    for (let i = 0; i < 3; i += 1) {
      ctx.save();
      ctx.rotate((i - 1) * 0.7);
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.35, s * 0.32, s * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  } else if (icon === 'ice') {
    ctx.fillStyle = color || '#bfe8ff';
    ctx.beginPath();
    ctx.moveTo(-s * 0.7, -s * 0.3);
    ctx.lineTo(0, -s * 0.85);
    ctx.lineTo(s * 0.7, -s * 0.3);
    ctx.lineTo(s * 0.7, s * 0.4);
    ctx.lineTo(0, s * 0.85);
    ctx.lineTo(-s * 0.7, s * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.moveTo(-s * 0.4, -s * 0.2);
    ctx.lineTo(0, -s * 0.55);
    ctx.stroke();
  } else if (icon === 'cup') {
    ctx.fillStyle = color || '#c98a4b';
    ctx.beginPath();
    ctx.moveTo(-s * 0.6, -s * 0.4);
    ctx.lineTo(s * 0.6, -s * 0.4);
    ctx.lineTo(s * 0.45, s * 0.7);
    ctx.lineTo(-s * 0.45, s * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#8a5a24';
    ctx.beginPath();
    ctx.arc(s * 0.65, s * 0.05, s * 0.3, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, -s * 0.6);
    ctx.quadraticCurveTo(-s * 0.4, -s * 0.9, -s * 0.1, -s * 1.0);
    ctx.stroke();
  } else if (icon === 'burnt') {
    ctx.fillStyle = '#1c1c1c';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#555555';
    ctx.beginPath();
    ctx.arc(-s * 0.25, -s * 0.2, s * 0.18, 0, Math.PI * 2);
    ctx.arc(s * 0.3, s * 0.15, s * 0.14, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = color || '#cccccc';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawIngredientChip(ctx, id, cx, cy, size) {
  const look = componentLook(id);
  ctx.fillStyle = look.color;
  ctx.strokeStyle = look.edge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2 + 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  drawFoodIcon(ctx, look.icon, cx, cy, size * 0.85, look.color, look.edge);
}

function stationPrompt(state, station) {
  if (!station) return null;
  if (station.kind === 'crate') return 'E · Ambil ' + INGREDIENTS[station.item].short;
  if (station.kind === 'dispenser') return 'E · Ambil Teh';
  if (station.kind === 'board') {
    if (!state.board.item) return 'E · Taruh bahan di talenan';
    if (state.board.chops < 3) return 'E · Cincang! (' + state.board.chops + '/3)';
    return 'E · Ambil ' + componentLook(state.board.item).name;
  }
  if (station.kind === 'wok') {
    const wok = state.woks[station.id === 'wok2' ? 1 : 0];
    if (!wok.slot) return 'E · Masak di wok';
    if (!wok.slot.done) return 'Memasak...';
    if (wok.slot.burnt) return 'E · Ambil gosong';
    return 'E · Ambil masakan matang';
  }
  if (station.kind === 'plating') return 'E · Rakit / ambil piring';
  if (station.kind === 'serving') return 'E · Sajikan!';
  if (station.kind === 'trash') return 'E · Buang barang';
  return null;
}

function drawHud(ctx, state, muted) {
  ctx.fillStyle = '#2b1f14';
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = '#ffd94d';
  ctx.fillRect(0, HUD_H - 4, VIEW_W, 4);
  drawFoodIcon(ctx, 'drumstick', 34, 32, 34, '#e8915a', '#a85a28');
  text(ctx, 'DAPUR KILAT', 58, 40, 26, '#ffd94d', 'left');
  text(ctx, 'WARUNG MASAK KILAT', 58, 58, 11, '#d8c49a', 'left');

  // Shift timer, big in the middle.
  const urgent = state.shiftLeft <= 30 && state.mode === 'playing';
  ctx.fillStyle = urgent ? '#ff5a4a' : '#fff7e0';
  rr(ctx, 520, 8, 240, 48, 10);
  ctx.fill();
  text(ctx, 'SHIFT', 640, 24, 11, '#8a5a24', 'center');
  text(ctx, fmtTime(state.shiftLeft), 640, 50, 26, urgent ? '#d92b1f' : '#2b1f14', 'center');
  text(ctx, 'LV ' + state.level, 776, 40, 18, '#ffd94d', 'left');

  text(ctx, 'SKOR  ' + state.score.toLocaleString('id-ID'), 1080, 28, 18, '#fff7e0', 'right');
  ctx.fillStyle = '#ffd94d';
  ctx.beginPath();
  ctx.arc(1008, 46, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#a87c1e';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, 'Rp', 1008, 50, 10, '#8a5a24', 'center');
  text(ctx, state.coins.toLocaleString('id-ID'), 1024, 50, 16, '#ffd94d', 'left');
  if (state.combo >= 2) {
    ctx.fillStyle = '#ff7a3d';
    rr(ctx, 880, 36, 120, 22, 11);
    ctx.fill();
    text(ctx, 'KOMBO x' + state.combo, 940, 52, 14, '#ffffff', 'center');
  }

  // Pause and mute buttons.
  for (const btn of [PAUSE_BTN, MUTE_BTN]) {
    ctx.fillStyle = '#4a3624';
    rr(ctx, btn.x, btn.y, btn.w, btn.h, 8);
    ctx.fill();
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.fillStyle = '#ffd94d';
  if (state.mode === 'paused') {
    ctx.beginPath();
    ctx.moveTo(PAUSE_BTN.x + 14, PAUSE_BTN.y + 10);
    ctx.lineTo(PAUSE_BTN.x + 14, PAUSE_BTN.y + 30);
    ctx.lineTo(PAUSE_BTN.x + 30, PAUSE_BTN.y + 20);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillRect(PAUSE_BTN.x + 14, PAUSE_BTN.y + 11, 5, 18);
    ctx.fillRect(PAUSE_BTN.x + 23, PAUSE_BTN.y + 11, 5, 18);
  }
  // Speaker icon.
  ctx.beginPath();
  ctx.moveTo(MUTE_BTN.x + 10, MUTE_BTN.y + 18);
  ctx.lineTo(MUTE_BTN.x + 16, MUTE_BTN.y + 18);
  ctx.lineTo(MUTE_BTN.x + 22, MUTE_BTN.y + 11);
  ctx.lineTo(MUTE_BTN.x + 22, MUTE_BTN.y + 29);
  ctx.lineTo(MUTE_BTN.x + 16, MUTE_BTN.y + 22);
  ctx.lineTo(MUTE_BTN.x + 10, MUTE_BTN.y + 22);
  ctx.closePath();
  ctx.fill();
  if (muted) {
    ctx.strokeStyle = '#ff5a4a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(MUTE_BTN.x + 25, MUTE_BTN.y + 13);
    ctx.lineTo(MUTE_BTN.x + 33, MUTE_BTN.y + 27);
    ctx.moveTo(MUTE_BTN.x + 33, MUTE_BTN.y + 13);
    ctx.lineTo(MUTE_BTN.x + 25, MUTE_BTN.y + 27);
    ctx.stroke();
  } else {
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(MUTE_BTN.x + 24, MUTE_BTN.y + 20, 6, -0.9, 0.9);
    ctx.stroke();
  }
}

function drawOrderTicket(ctx, order, x, y, w, h, now) {
  const recipe = RECIPES[order.dish];
  const frac = Math.max(0, order.patience / order.maxPatience);
  const urgent = order.patience < 12;
  const bg = urgent && Math.floor(now * 3) % 2 === 0 ? '#ffe3de' : '#fff7e0';
  ctx.fillStyle = bg;
  rr(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = urgent ? '#d92b1f' : '#c9a25e';
  ctx.lineWidth = urgent ? 3 : 2;
  ctx.stroke();

  // Customer face: mood follows patience.
  const faceX = x + w - 30;
  const faceY = y + 28;
  ctx.fillStyle = frac > 0.55 ? '#ffe0b3' : frac > 0.25 ? '#ffd27a' : '#ff9a8a';
  ctx.beginPath();
  ctx.arc(faceX, faceY, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8a5a24';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#2b1f14';
  ctx.beginPath();
  ctx.arc(faceX - 6, faceY - 3, 2.2, 0, Math.PI * 2);
  ctx.arc(faceX + 6, faceY - 3, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2b1f14';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (frac > 0.55) ctx.arc(faceX, faceY + 2, 7, 0.15 * Math.PI, 0.85 * Math.PI);
  else if (frac > 0.25) ctx.moveTo(faceX - 6, faceY + 9), ctx.lineTo(faceX + 6, faceY + 9);
  else ctx.arc(faceX, faceY + 12, 6, 1.15 * Math.PI, 1.85 * Math.PI);
  ctx.stroke();

  text(ctx, '#' + order.id + '  ' + recipe.short, x + 12, y + 24, 17, '#2b1f14', 'left');
  text(ctx, recipe.blurb, x + 12, y + 44, 12, '#8a6a3a', 'left');
  let ix = x + 12;
  for (const need of recipe.needs) {
    drawIngredientChip(ctx, need, ix + 13, y + 66, 22);
    ix += 30;
  }
  // Patience bar.
  ctx.fillStyle = '#e8dcc0';
  rr(ctx, x + 12, y + h - 12, w - 24, 7, 3);
  ctx.fill();
  ctx.fillStyle = frac > 0.5 ? '#58b368' : frac > 0.25 ? '#f0a13a' : '#d92b1f';
  rr(ctx, x + 12, y + h - 12, (w - 24) * frac, 7, 3);
  ctx.fill();
}

function drawOrderBoard(ctx, state, now) {
  ctx.fillStyle = '#8a5a33';
  ctx.fillRect(0, ORDER_BOARD_TOP, VIEW_W, ORDER_BOARD_H);
  ctx.fillStyle = '#6e4525';
  ctx.fillRect(0, ORDER_BOARD_TOP + ORDER_BOARD_H - 6, VIEW_W, 6);
  text(ctx, 'PESANAN', 14, ORDER_BOARD_TOP + 22, 13, '#ffd94d', 'left');
  if (state.orders.length === 0) {
    text(ctx, 'Belum ada pesanan — tunggu pelanggan datang...', 120, ORDER_BOARD_TOP + 52, 16, '#ffe9c4', 'left');
  }
  state.orders.forEach((order, i) => {
    drawOrderTicket(ctx, order, 8 + i * 304, ORDER_BOARD_TOP + 6, 296, ORDER_BOARD_H - 18, now);
  });
}

function drawFloor(ctx) {
  for (let ty = 0; ty < 9; ty += 1) {
    for (let tx = 0; tx < 20; tx += 1) {
      ctx.fillStyle = (tx + ty) % 2 === 0 ? '#f2e3c6' : '#e9d6ab';
      ctx.fillRect(tx * 64, KITCHEN_TOP + ty * 64, 64, 64);
    }
  }
  ctx.fillStyle = '#b5502e';
  ctx.fillRect(0, KITCHEN_TOP - 6, VIEW_W, 6);
}

function drawCrate(ctx, station) {
  const { x, y, w, h } = station;
  ctx.fillStyle = '#a4713a';
  rr(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = '#6e4525';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(110,69,37,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 6, y + h / 2);
  ctx.lineTo(x + w - 6, y + h / 2);
  ctx.stroke();
  const look = INGREDIENTS[station.item];
  drawFoodIcon(ctx, look.icon, x + w / 2, y + h / 2 - 8, 34, look.color, look.edge);
  ctx.fillStyle = '#2b1f14';
  rr(ctx, x + 8, y + h - 22, w - 16, 18, 4);
  ctx.fill();
  text(ctx, station.label, x + w / 2, y + h - 9, 12, '#ffd94d', 'center');
}

function drawBoard(ctx, state) {
  const s = STATIONS.find((st) => st.id === 'board');
  const { x, y, w, h } = s;
  ctx.fillStyle = '#d9b380';
  rr(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = '#8a5a24';
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, 'TALENAN', x + w / 2, y + 20, 13, '#6e4525', 'center');
  if (state.board.item) {
    const look = componentLook(state.board.item);
    drawFoodIcon(ctx, look.icon, x + w / 2, y + 52, 40, look.color, look.edge);
    if (state.board.chops < 3) {
      ctx.fillStyle = '#e8dcc0';
      rr(ctx, x + 20, y + h - 16, w - 40, 8, 4);
      ctx.fill();
      ctx.fillStyle = '#58b368';
      rr(ctx, x + 20, y + h - 16, (w - 40) * (state.board.chops / 3), 8, 4);
      ctx.fill();
      // Knife.
      ctx.strokeStyle = '#c0c8d0';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x + w - 34, y + 26);
      ctx.lineTo(x + w - 14, y + 52);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#2f7d3d';
      ctx.beginPath();
      ctx.arc(x + w - 20, y + h - 18, 10, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, '✓', x + w - 20, y + h - 14, 13, '#ffffff', 'center');
    }
  } else {
    ctx.strokeStyle = '#b99a68';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 52, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    text(ctx, 'kosong', x + w / 2, y + 56, 12, '#8a6a3a', 'center');
  }
}

function drawWok(ctx, state, wokIndex) {
  const s = STATIONS.find((st) => st.id === (wokIndex === 0 ? 'wok1' : 'wok2'));
  const wok = state.woks[wokIndex];
  const { x, y, w, h } = s;
  ctx.fillStyle = '#3a3a40';
  rr(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = '#1c1c20';
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, s.label, x + w / 2, y + 20, 13, '#ffd94d', 'center');
  // Flame under the pan.
  if (wok.slot && !wok.slot.done) {
    ctx.fillStyle = '#ff7a3d';
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(x + w / 2 + i * 34 - 12, y + h - 12);
      ctx.lineTo(x + w / 2 + i * 34, y + h - 34 - Math.random() * 6);
      ctx.lineTo(x + w / 2 + i * 34 + 12, y + h - 12);
      ctx.closePath();
      ctx.fill();
    }
  }
  // Pan.
  ctx.fillStyle = '#222226';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + 62, 62, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#55555c';
  ctx.lineWidth = 3;
  ctx.stroke();
  if (wok.slot) {
    const slot = wok.slot;
    if (slot.burnt) {
      drawFoodIcon(ctx, 'burnt', x + w / 2, y + 60, 40, '#1c1c1c', '#000000');
      text(ctx, 'GOSONG!', x + w / 2, y + h - 4, 13, '#ff5a4a', 'center');
    } else {
      const look = INGREDIENTS[slot.item];
      drawFoodIcon(ctx, look.icon, x + w / 2, y + 60, 38, look.color, look.edge);
      if (slot.done) {
        ctx.fillStyle = 'rgba(255,217,77,0.25)';
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + 62, 70, 36, 0, 0, Math.PI * 2);
        ctx.fill();
        text(ctx, 'MATANG!', x + w / 2, y + h - 4, 13, '#ffd94d', 'center');
      } else {
        ctx.fillStyle = '#e8dcc0';
        rr(ctx, x + 20, y + h - 14, w - 40, 8, 4);
        ctx.fill();
        ctx.fillStyle = '#ff7a3d';
        rr(ctx, x + 20, y + h - 14, (w - 40) * slot.progress, 8, 4);
        ctx.fill();
      }
    }
  } else {
    text(ctx, 'wok kosong', x + w / 2, y + 66, 12, '#88888f', 'center');
  }
}

function drawDispenser(ctx) {
  const s = STATIONS.find((st) => st.id === 'dispenser');
  const { x, y, w, h } = s;
  ctx.fillStyle = '#7a6a55';
  rr(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = '#4a3d2c';
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, 'TEH PANAS', x + w / 2, y + 20, 13, '#ffe9c4', 'center');
  ctx.fillStyle = '#c98a4b';
  rr(ctx, x + 30, y + 28, w - 60, 34, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  rr(ctx, x + 36, y + 32, w - 72, 10, 5);
  ctx.fill();
  drawFoodIcon(ctx, 'cup', x + w / 2, y + h - 18, 26, '#f5f0dc', '#8a5a24');
}

function drawPrepCounter(ctx) {
  const s = STATIONS.find((st) => st.id === 'prep');
  const { x, y, w, h } = s;
  ctx.fillStyle = '#8a5a33';
  rr(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = '#6e4525';
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, 'RACIK', x + w / 2, y + 20, 12, '#ffd94d', 'center');
  const bowls = ['cabaicincang', 'sayurcincang', 'nasi', 'miematang', 'ayammatang'];
  bowls.forEach((id, i) => {
    const bx = x + w / 2;
    const by = y + 48 + i * 42;
    ctx.fillStyle = '#fff7e0';
    ctx.beginPath();
    ctx.ellipse(bx, by, 30, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c9a25e';
    ctx.lineWidth = 2;
    ctx.stroke();
    const look = componentLook(id);
    drawFoodIcon(ctx, look.icon, bx, by - 3, 20, look.color, look.edge);
  });
}

function drawPlating(ctx, state) {
  const s = STATIONS.find((st) => st.id === 'plating');
  const { x, y, w, h } = s;
  ctx.fillStyle = '#f5f0dc';
  rr(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = '#c9a25e';
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, 'PLATING — RAKIT PESANAN DI SINI', x + w / 2, y + 20, 13, '#8a5a24', 'center');
  state.plates.forEach((plate, p) => {
    const px = x + 150 + p * 300;
    const py = y + 62;
    const dish = plateDishFor(plate, state.orders);
    if (dish) {
      ctx.fillStyle = 'rgba(255,217,77,0.5)';
      ctx.beginPath();
      ctx.arc(px, py, 46, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(px, py, 42, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = dish ? '#ffd94d' : '#b9a06a';
    ctx.lineWidth = dish ? 4 : 2;
    ctx.stroke();
    if (plate.items.length === 0) {
      text(ctx, 'piring ' + (p + 1), px, py + 4, 12, '#b9a06a', 'center');
    } else {
      plate.items.forEach((item, i) => {
        const look = componentLook(item);
        drawFoodIcon(ctx, look.icon, px - 24 + i * 24, py - 2, 24, look.color, look.edge);
      });
    }
    if (dish) {
      text(ctx, RECIPES[dish].short + ' SIAP!', px, y + h - 6, 13, '#a85a00', 'center');
    } else {
      const hint = plateHintFor(plate, state.orders);
      if (hint) text(ctx, '→ ' + RECIPES[hint].short, px, y + h - 6, 12, '#8a6a3a', 'center');
    }
  });
}

function drawServing(ctx, state) {
  const s = STATIONS.find((st) => st.id === 'serving');
  const { x, y, w, h } = s;
  ctx.fillStyle = '#fff7e0';
  rr(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = '#c9a25e';
  ctx.lineWidth = 3;
  ctx.stroke();
  // Red-white awning.
  for (let i = 0; i < 8; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? '#d92b1f' : '#fff7e0';
    ctx.fillRect(x + i * (w / 8), y, w / 8, 18);
  }
  text(ctx, 'SAJIKAN', x + w / 2, y + 40, 16, '#2b1f14', 'center');
  // Service bell.
  ctx.fillStyle = '#ffd94d';
  ctx.beginPath();
  ctx.arc(x + w / 2, y + 66, 16, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#a87c1e';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#a87c1e';
  ctx.fillRect(x + w / 2 - 20, y + 64, 40, 4);
  const carryingPlate = state.carry.some((id) => isPlateItem(id));
  if (carryingPlate) {
    ctx.fillStyle = '#d92b1f';
    const pulse = 1 + 0.15 * Math.sin(Date.now() / 120);
    ctx.font = 'bold ' + Math.round(15 * pulse) + 'px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('ANTAR KE SINI!', x + w / 2, y + h - 6);
  } else {
    text(ctx, 'antar piring lengkap', x + w / 2, y + h - 6, 12, '#8a6a3a', 'center');
  }
}

function drawTrash(ctx) {
  const s = STATIONS.find((st) => st.id === 'trash');
  const { x, y, w, h } = s;
  ctx.fillStyle = '#3d6b4f';
  rr(ctx, x + 14, y + 8, w - 28, h - 8, 8);
  ctx.fill();
  ctx.strokeStyle = '#24402f';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#2f5a40';
  rr(ctx, x + 6, y, w - 12, 16, 6);
  ctx.fill();
  text(ctx, 'SAMPAH', x + w / 2, y + h - 10, 12, '#cfe8d4', 'center');
}

function drawCook(ctx, state, now) {
  const cook = state.cook;
  const bob = cook.moving ? Math.sin(cook.bob) * 3 : Math.sin(now * 2) * 1.5;
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(cook.x, cook.y + 20, 24, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body: white chef coat.
  ctx.fillStyle = '#f8f8f8';
  ctx.beginPath();
  ctx.arc(cook.x, cook.y + 4 + bob * 0.3, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9c9c9';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Red neckerchief.
  ctx.fillStyle = '#d92b1f';
  ctx.beginPath();
  ctx.moveTo(cook.x - 8, cook.y - 8 + bob * 0.3);
  ctx.lineTo(cook.x + 8, cook.y - 8 + bob * 0.3);
  ctx.lineTo(cook.x, cook.y + 2 + bob * 0.3);
  ctx.closePath();
  ctx.fill();
  // Head.
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath();
  ctx.arc(cook.x, cook.y - 16 + bob * 0.3, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d9a06a';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Chef hat.
  ctx.fillStyle = '#ffffff';
  rr(ctx, cook.x - 12, cook.y - 36 + bob * 0.3, 24, 10, 4);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cook.x - 7, cook.y - 36 + bob * 0.3, 7, 0, Math.PI * 2);
  ctx.arc(cook.x, cook.y - 39 + bob * 0.3, 8, 0, Math.PI * 2);
  ctx.arc(cook.x + 7, cook.y - 36 + bob * 0.3, 7, 0, Math.PI * 2);
  ctx.fill();
  // Face.
  ctx.fillStyle = '#2b1f14';
  const lookX = cook.dir * 2;
  ctx.beginPath();
  ctx.arc(cook.x - 5 + lookX, cook.y - 17 + bob * 0.3, 1.8, 0, Math.PI * 2);
  ctx.arc(cook.x + 5 + lookX, cook.y - 17 + bob * 0.3, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2b1f14';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cook.x + lookX, cook.y - 12 + bob * 0.3, 4, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  // Carried items above the head.
  if (state.carry.length > 0) {
    const totalW = state.carry.length * 30;
    ctx.fillStyle = 'rgba(43,31,20,0.85)';
    rr(ctx, cook.x - totalW / 2 - 6, cook.y - 78 + bob * 0.3, totalW + 12, 32, 8);
    ctx.fill();
    state.carry.forEach((id, i) => {
      const cx = cook.x - totalW / 2 + 15 + i * 30;
      const cy = cook.y - 62 + bob * 0.3;
      if (isPlateItem(id)) {
        const dish = plateDishOf(id);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 12, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffd94d';
        ctx.lineWidth = 2;
        ctx.stroke();
        text(ctx, RECIPES[dish].short.charAt(0), cx, cy + 4, 11, '#2b1f14', 'center');
      } else {
        drawIngredientChip(ctx, id, cx, cy, 20);
      }
    });
  }
}

function drawFloaters(ctx, state) {
  for (const f of state.floaters) {
    ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
    text(ctx, f.text, f.x, f.y, 20, f.color, 'center');
    ctx.globalAlpha = 1;
  }
}

function drawParticles(ctx, state) {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawToast(ctx, state) {
  if (!state.toast) return;
  ctx.fillStyle = 'rgba(43,31,20,0.92)';
  const w = ctx.measureText(state.toast).width + 40;
  rr(ctx, VIEW_W / 2 - w / 2, 176, w, 34, 17);
  ctx.fill();
  text(ctx, state.toast, VIEW_W / 2, 199, 16, '#ffd94d', 'center');
}

function drawPrompt(ctx, state) {
  if (state.mode !== 'playing') return;
  const station = nearestStation(state);
  const prompt = stationPrompt(state, station);
  if (!prompt) return;
  ctx.fillStyle = 'rgba(255,247,224,0.95)';
  const w = ctx.measureText(prompt).width + 28;
  rr(ctx, state.cook.x - w / 2, state.cook.y + 30, w, 28, 14);
  ctx.fill();
  ctx.strokeStyle = '#c9a25e';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, prompt, state.cook.x, state.cook.y + 49, 14, '#2b1f14', 'center');
}

function drawTitle(ctx, state, now) {
  ctx.fillStyle = 'rgba(20,12,6,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#fff7e0';
  rr(ctx, 290, 110, 700, 500, 18);
  ctx.fill();
  ctx.strokeStyle = '#d92b1f';
  ctx.lineWidth = 4;
  ctx.stroke();
  drawFoodIcon(ctx, 'drumstick', 640, 170, 64, '#e8915a', '#a85a28');
  text(ctx, 'DAPUR KILAT', 640, 240, 56, '#d92b1f', 'center');
  text(ctx, 'Warung Masak Kilat — masak cepat, sajikan tepat waktu!', 640, 272, 18, '#8a5a24', 'center');
  const lines = [
    'WASD / Panah — gerakkan koki    •    Klik — jalan ke sana',
    'E / Spasi — ambil, cincang, masak, rakit, sajikan',
    'Ambil bahan di peti → cincang di talenan → masak di wok',
    'Rakit piring di meja plating → antar ke jendela SAJIKAN',
    'Jangan sampai masakan gosong atau pesanan hangus!',
    'P — jeda      M — suara      R — ulang shift',
  ];
  lines.forEach((line, i) => {
    text(ctx, line, 640, 320 + i * 30, 16, '#2b1f14', 'center');
  });
  const blink = Math.floor(now * 1.6) % 2 === 0;
  if (blink) text(ctx, 'TEKAN ENTER ATAU KLIK UNTUK MULAI', 640, 540, 20, '#d92b1f', 'center');
  text(ctx, 'Shift 3 menit • Pesanan makin ramai • Kombo = skor berlipat', 640, 580, 14, '#8a6a3a', 'center');
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(20,12,6,0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  text(ctx, 'JEDA', 640, 340, 64, '#ffd94d', 'center');
  text(ctx, 'Tekan P atau klik tombol jeda untuk lanjut', 640, 390, 18, '#fff7e0', 'center');
}

function drawOver(ctx, state) {
  ctx.fillStyle = 'rgba(20,12,6,0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#fff7e0';
  rr(ctx, 340, 90, 600, 480, 18);
  ctx.fill();
  ctx.strokeStyle = '#d92b1f';
  ctx.lineWidth = 4;
  ctx.stroke();
  text(ctx, 'SHIFT SELESAI!', 640, 160, 44, '#d92b1f', 'center');
  text(ctx, 'Warung tutup — waktunya hitung hasil masakanmu.', 640, 192, 16, '#8a5a24', 'center');
  const rows = [
    ['Skor akhir', state.score.toLocaleString('id-ID')],
    ['Koin (Rp)', state.coins.toLocaleString('id-ID')],
    ['Pesanan disajikan', String(state.served)],
    ['Pesanan hangus', String(state.lost)],
    ['Kombo terbaik', 'x' + state.bestCombo],
    ['Level tercapai', 'LV ' + state.level],
  ];
  rows.forEach((row, i) => {
    const y = 240 + i * 38;
    text(ctx, row[0], 420, y, 18, '#2b1f14', 'left');
    text(ctx, row[1], 860, y, 18, '#2b1f14', 'right');
    ctx.strokeStyle = '#e8dcc0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(420, y + 10);
    ctx.lineTo(860, y + 10);
    ctx.stroke();
  });
  const verdict = state.served >= 8 ? 'Koki andalan warung! Pelanggan pulang kenyang.'
    : state.served >= 4 ? 'Lumayan! Dapur mulai panas di shift berikutnya.'
    : 'Shift pertama memang berat — coba lagi, rutenya dihafal!';
  text(ctx, verdict, 640, 490, 16, '#8a5a24', 'center');
  ctx.fillStyle = '#d92b1f';
  rr(ctx, RESTART_BTN.x, RESTART_BTN.y, RESTART_BTN.w, RESTART_BTN.h, 12);
  ctx.fill();
  text(ctx, 'MAIN LAGI  (R)', 640, RESTART_BTN.y + 36, 20, '#ffffff', 'center');
}

export function drawGame(ctx, state, muted, now) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#241a12';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawHud(ctx, state, muted);
  drawOrderBoard(ctx, state, now);
  drawFloor(ctx);
  for (const station of STATIONS) {
    if (station.kind === 'crate') drawCrate(ctx, station);
  }
  drawBoard(ctx, state);
  drawWok(ctx, state, 0);
  drawWok(ctx, state, 1);
  drawDispenser(ctx);
  drawPrepCounter(ctx);
  drawPlating(ctx, state);
  drawServing(ctx, state);
  drawTrash(ctx);
  drawCook(ctx, state, now);
  drawParticles(ctx, state);
  drawFloaters(ctx, state);
  drawToast(ctx, state);
  drawPrompt(ctx, state);
  if (state.mode === 'title') drawTitle(ctx, state, now);
  else if (state.mode === 'paused') drawPaused(ctx);
  else if (state.mode === 'over') drawOver(ctx, state);
}

export function pointInRect(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}
