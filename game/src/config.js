// Dapur Kilat — config: all the data that defines the warung.
// Recipes, ingredients, station layout, shift length and difficulty.
// Nothing here runs; kitchen.js reads it to build the game state.

export const VIEW_W = 1280;
export const VIEW_H = 720;

export const SHIFT_SECONDS = 180;
export const MAX_CARRY = 3;
export const COOK_SECONDS = 4;
export const BURN_AFTER_SECONDS = 7;
export const CHOPS_NEEDED = 3;
export const COMBO_WINDOW_SECONDS = 20;

// One ingredient: where it comes from, what it needs, what it becomes.
export const INGREDIENTS = {
  beras:  { name: 'Beras',   short: 'Beras',  color: '#f5f0dc', edge: '#cbbf9a', station: 'crate', needsChop: false, needsCook: true,  cookedAs: 'nasi',   icon: 'rice' },
  mie:    { name: 'Mie',     short: 'Mie',    color: '#f7d774', edge: '#c9a13b', station: 'crate', needsChop: false, needsCook: true,  cookedAs: 'miematang', icon: 'noodle' },
  ayam:   { name: 'Ayam',    short: 'Ayam',   color: '#f2b8a0', edge: '#c97a5e', station: 'crate', needsChop: true,  needsCook: true,  cookedAs: 'ayammatang', icon: 'drumstick' },
  telur:  { name: 'Telur',   short: 'Telur',  color: '#fff3c4', edge: '#d9b45b', station: 'crate', needsChop: false, needsCook: true,  cookedAs: 'telurmatang', icon: 'egg' },
  cabai:  { name: 'Cabai',   short: 'Cabai',  color: '#e23b2e', edge: '#9c1f16', station: 'crate', needsChop: true,  needsCook: false, cookedAs: 'cabaicincang', icon: 'chilli' },
  sayur:  { name: 'Sayur',   short: 'Sayur',  color: '#58b368', edge: '#2f7d3d', station: 'crate', needsChop: true,  needsCook: false, cookedAs: 'sayurcincang', icon: 'veg' },
  es:     { name: 'Es Batu', short: 'Es',     color: '#bfe8ff', edge: '#5aa7d6', station: 'crate', needsChop: false, needsCook: false, cookedAs: 'es', icon: 'ice' },
  teh:    { name: 'Teh',     short: 'Teh',    color: '#c98a4b', edge: '#8a5a24', station: 'dispenser', needsChop: false, needsCook: false, cookedAs: 'teh', icon: 'cup' },
};

// A cooked / ready component is just an ingredient id too, with its own look.
export const COMPONENTS = {
  nasi:        { name: 'Nasi Matang',    color: '#fffdf2', edge: '#cfc39a', icon: 'rice' },
  miematang:   { name: 'Mie Matang',     color: '#f7d774', edge: '#c9a13b', icon: 'noodle' },
  ayammatang:  { name: 'Ayam Goreng',    color: '#e8915a', edge: '#a85a28', icon: 'drumstick' },
  telurmatang: { name: 'Telur Goreng',   color: '#ffd94d', edge: '#c79a1e', icon: 'egg' },
  cabaicincang:{ name: 'Cabai Cincang',  color: '#e23b2e', edge: '#9c1f16', icon: 'chilli' },
  sayurcincang:{ name: 'Sayur Cincang',  color: '#58b368', edge: '#2f7d3d', icon: 'veg' },
  es:          { name: 'Es Batu',        color: '#bfe8ff', edge: '#5aa7d6', icon: 'ice' },
  teh:         { name: 'Teh Manis',      color: '#c98a4b', edge: '#8a5a24', icon: 'cup' },
  gosong:      { name: 'Gosong!',        color: '#2b2b2b', edge: '#000000', icon: 'burnt' },
};

export function componentLook(id) {
  return COMPONENTS[id] || INGREDIENTS[id] || { name: id, color: '#cccccc', edge: '#888888', icon: 'dot' };
}

// A dish: the components a plate must hold, its base score and its colour.
export const RECIPES = {
  nasigoreng: {
    name: 'Nasi Goreng', short: 'Nasi Goreng', needs: ['nasi', 'telurmatang', 'cabaicincang'],
    score: 100, color: '#e8915a', minLevel: 1, weight: 35,
    blurb: 'Nasi + telur + cabai',
  },
  miegoreng: {
    name: 'Mie Goreng', short: 'Mie Goreng', needs: ['miematang', 'ayammatang', 'sayurcincang'],
    score: 120, color: '#f7d774', minLevel: 1, weight: 30,
    blurb: 'Mie + ayam + sayur',
  },
  sateayam: {
    name: 'Sate Ayam', short: 'Sate Ayam', needs: ['ayammatang', 'cabaicincang', 'nasi'],
    score: 140, color: '#d96a4f', minLevel: 2, weight: 20,
    blurb: 'Ayam + cabai + nasi',
  },
  esteh: {
    name: 'Es Teh', short: 'Es Teh', needs: ['teh', 'es'],
    score: 60, color: '#c98a4b', minLevel: 3, weight: 15,
    blurb: 'Teh + es batu',
  },
};

export const RECIPE_IDS = Object.keys(RECIPES);

// Difficulty: one level every 45 seconds of the shift.
export function levelFor(elapsedSeconds) {
  return Math.min(4, 1 + Math.floor(elapsedSeconds / 45));
}
export function spawnIntervalFor(level) {
  return Math.max(9, 15 - level);
}
export function patienceFor(level) {
  return Math.max(50, 78 - level * 6);
}

// Station rectangles on the 1280x720 floor. x, y, w, h in logical pixels.
// front: where the cook stands to use it. label: the painted sign.
export const STATIONS = [
  { id: 'crate-beras', kind: 'crate', item: 'beras', label: 'BERAS',  x: 8, y: 180, w: 110, h: 72, front: [142, 216] },
  { id: 'crate-mie',   kind: 'crate', item: 'mie',   label: 'MIE',    x: 8, y: 256, w: 110, h: 72, front: [142, 292] },
  { id: 'crate-ayam',  kind: 'crate', item: 'ayam',  label: 'AYAM',   x: 8, y: 332, w: 110, h: 72, front: [142, 368] },
  { id: 'crate-telur', kind: 'crate', item: 'telur', label: 'TELUR',  x: 8, y: 408, w: 110, h: 72, front: [142, 444] },
  { id: 'crate-cabai', kind: 'crate', item: 'cabai', label: 'CABAI',  x: 8, y: 484, w: 110, h: 72, front: [142, 520] },
  { id: 'crate-sayur', kind: 'crate', item: 'sayur', label: 'SAYUR',  x: 8, y: 560, w: 110, h: 72, front: [142, 596] },
  { id: 'crate-es',    kind: 'crate', item: 'es',    label: 'ES BATU',x: 8, y: 636, w: 110, h: 72, front: [142, 672] },
  { id: 'board',       kind: 'board', label: 'TALENAN', x: 280, y: 190, w: 190, h: 90, front: [375, 296] },
  { id: 'wok1',        kind: 'wok', label: 'WOK 1',  x: 520, y: 190, w: 180, h: 110, front: [610, 316] },
  { id: 'wok2',        kind: 'wok', label: 'WOK 2',  x: 730, y: 190, w: 180, h: 110, front: [820, 316] },
  { id: 'dispenser',   kind: 'dispenser', item: 'teh', label: 'TEH PANAS', x: 1000, y: 190, w: 170, h: 90, front: [1085, 296] },
  { id: 'prep',        kind: 'prep', label: 'MEJA RACIK', x: 1180, y: 300, w: 92, h: 260, front: [1160, 430] },
  { id: 'plating',     kind: 'plating', label: 'PLATING', x: 300, y: 580, w: 600, h: 100, front: [600, 696] },
  { id: 'serving',     kind: 'serving', label: 'SAJIKAN', x: 960, y: 580, w: 312, h: 100, front: [1116, 696] },
  { id: 'trash',       kind: 'trash', label: 'SAMPAH', x: 140, y: 620, w: 110, h: 80, front: [195, 598] },
];

export function stationById(id) {
  return STATIONS.find((s) => s.id === id);
}

// Walkable floor is everything inside the kitchen minus station rectangles.
export const KITCHEN_TOP = 170;
export const ORDER_BOARD_TOP = 70;
export const ORDER_BOARD_H = 94;
export const HUD_H = 64;
