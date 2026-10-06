// sprites.js — TODO el arte es procedural (canvas, sin imágenes externas). [capa B, escrita por A]
//   PAL                         paleta (negro, carbón, marrón, beige envejecido, rojo oscuro, blanco sucio)
//   pixelText(str, {scale,color,shadow}) → <canvas>   fuente bitmap 5×7
//   iconURL(name, scale, color) → dataURL              iconos 7–11 px (heart, flame, coin, ledger, blood, eye, tooth, key, node_*, skull, shield, cards…)
//   cardURL(card) / cardBackURL()                      caras de cartas 40×56 (base y especiales con sigilo por hash)
//   characterEl(id, {scale}) → <div.char>              personaje con respiración, parpadeo y ojos que siguen al cursor
//   backgroundCanvas(kind, w, h, seed) → <canvas>      fondos low-res adaptados al tamaño de pantalla
//   setCharactersActive(bool)                          activa/desactiva la animación (reducir efectos)
import { hashStr, mulberry32 } from './rng.js';
import { rankLabel, isWildSuit, isWildRank } from './cards.js';

import { PAL, hex, mix, mk, R, P, ell, ring, poly, BAYER } from './pixel.js';
export { PAL };
export { characterEl, characterIds, setCharactersActive } from './chars.js';

// ---------------- Fuente bitmap 5×7 ----------------
const FONT = {};
(('A:.###./#...#/#...#/#####/#...#/#...#/#...#;B:####./#...#/#...#/####./#...#/#...#/####.;C:.###./#...#/#..../#..../#..../#...#/.###.;D:####./#...#/#...#/#...#/#...#/#...#/####.;E:#####/#..../#..../####./#..../#..../#####;F:#####/#..../#..../####./#..../#..../#....;G:.###./#...#/#..../#.###/#...#/#...#/.###.;H:#...#/#...#/#...#/#####/#...#/#...#/#...#;I:.###./..#../..#../..#../..#../..#../.###.;J:..###/...#./...#./...#./...#./#..#./.##..;K:#...#/#..#./#.#../##.../#.#../#..#./#...#;L:#..../#..../#..../#..../#..../#..../#####;M:#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#;N:#...#/##..#/#.#.#/#..##/#...#/#...#/#...#;O:.###./#...#/#...#/#...#/#...#/#...#/.###.;P:####./#...#/#...#/####./#..../#..../#....;Q:.###./#...#/#...#/#...#/#.#.#/#..#./.##.#;R:####./#...#/#...#/####./#.#../#..#./#...#;S:.####/#..../#..../.###./....#/....#/####.;T:#####/..#../..#../..#../..#../..#../..#..;U:#...#/#...#/#...#/#...#/#...#/#...#/.###.;V:#...#/#...#/#...#/#...#/#...#/.#.#./..#..;W:#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#;X:#...#/#...#/.#.#./..#../.#.#./#...#/#...#;Y:#...#/#...#/.#.#./..#../..#../..#../..#..;Z:#####/....#/...#./..#../.#.../#..../#####;' +
  '0:.###./#...#/#..##/#.#.#/##..#/#...#/.###.;1:..#../.##../..#../..#../..#../..#../.###.;2:.###./#...#/....#/...#./..#../.#.../#####;3:#####/...#./..#../...#./....#/#...#/.###.;4:...#./..##./.#.#./#..#./#####/...#./...#.;5:#####/#..../####./....#/....#/#...#/.###.;6:..##./.#.../#..../####./#...#/#...#/.###.;7:#####/....#/...#./..#../.#.../.#.../.#...;8:.###./#...#/#...#/.###./#...#/#...#/.###.;9:.###./#...#/#...#/.####/....#/...#./.##..;' +
  '-:...../...../...../#####/...../...../.....;+:...../..#../..#../#####/..#../..#../.....;x:...../#...#/.#.#./..#../.#.#./#...#/.....;.:...../...../...../...../...../.##../.##..;,:...../...../...../...../.##../..#../.#...;:::...../.##../.##../...../.##../.##../.....;!:..#../..#../..#../..#../..#../...../..#..;?:.###./#...#/....#/...#./..#../...../..#..;/:....#/....#/...#./..#../.#.../#..../#....;$:..#../.####/#.#../.###./..#.#/####./..#..;%:##..#/##..#/...#./..#../.#.../#..##/#..##;*:...../.#.#./..#../#####/..#../.#.#./.....;<:...#./..#../.#.../#..../.#.../..#../...#.;>:.#.../..#../...#./....#/...#./..#../.#...').split(';')).forEach(e => { if (e.length < 3) return; FONT[e[0]] = e.slice(2).split('/'); });
FONT[' '] = Array(7).fill('.....');
export function drawText(g, str, x, y, color, scale = 1, gap = 1) {
  let cx = x; g.fillStyle = color;
  for (const ch of String(str).toUpperCase()) {
    const gl = FONT[ch] || FONT['?'];
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (gl[r][c] === '#') g.fillRect(cx + c * scale, y + r * scale, scale, scale);
    cx += (5 + gap) * scale;
  }
  return cx - x - gap * scale;
}
export const textWidth = (str, scale = 1, gap = 1) => String(str).length * (5 + gap) * scale - gap * scale;
export function pixelText(str, { scale = 2, color = PAL.t4, shadow = PAL.k0, gap = 1 } = {}) {
  const w = textWidth(str, scale, gap) + scale * 2, [c, g] = mk(w, 9 * scale);
  if (shadow) drawText(g, str, scale * 1.0 + scale, scale * 1.0 + scale * 1, shadow, scale, gap);
  drawText(g, str, scale * 0, scale * 0, color, scale, gap);
  return c;
}

// ---------------- Iconos ----------------
const ICONS = {
  heart: ['.##.##.', '#######', '#######', '#######', '.#####.', '..###..', '...#...'],
  flame: ['...#...', '...##..', '..###..', '.#####.', '.#####.', '#######', '#######', '.#####.', '..###..'],
  coin: ['..###..', '.#####.', '##.#.##', '#######', '##.#.##', '.#####.', '..###..'],
  ledger: ['.#######.', '#.......#', '#.#####.#', '#.......#', '#.####..#', '#.......#', '#.##.##.#', '.#######.'],
  blood: ['...#...', '...#...', '..###..', '..###..', '.#####.', '.#####.', '#######', '.#####.', '..###..'],
  eye: ['...###...', '.##...##.', '#..###..#', '#.#####.#', '#..###..#', '.##...##.', '...###...'],
  tooth: ['.##.##.', '#######', '#######', '#######', '#######', '.#####.', '.##.##.', '.##.##.', '.#...#.'],
  key: ['..###....', '.#...#...', '.#...#...', '..###....', '...#.....', '...#.....', '...##....', '...#.....', '...##....'],
  // Asterisco: va en el hueco del palo de las cartas con PALO comodín (Dado Trucado, La Mujer): vale como cualquier palo
  wild: ['#..#..#', '.#.#.#.', '..###..', '#######', '..###..', '.#.#.#.', '#..#..#'],
  skull: ['.#####.', '#######', '#.#.#.#', '#######', '.#####.', '..#.#..', '.#####.'],
  shield: ['#######', '#.....#', '#.....#', '#.....#', '.#...#.', '..#.#..', '...#...'],
  cards: ['.####....', '##..##.##', '#.##.#.##', '#.##.###.', '.####.##.', '...###...'],
  q: ['.####.', '#....#', '....#.', '...#..', '...#..', '......', '...#..'],
  door: ['.#####.', '#.....#', '#.....#', '#....##', '#.....#', '#.....#', '#######'],
  gun: ['##########', '##########', '..####....', '..#.#.....', '..###.....'],
  candle: ['...#...', '..###..', '...#...', '..###..', '..###..', '..###..', '..###..', '.#####.'],
  pocket: ['#######', '#.....#', '#.###.#', '#.#.#.#', '#.###.#', '#.....#', '#######'],
  check: ['.....#', '....##', '#..##.', '###...', '.#....'],
  lock: ['..###..', '.#...#.', '.#...#.', '#######', '##.#.##', '#######', '#######'],
  gear: ['...#...', '.#.#.#.', '..###..', '###.###', '..###..', '.#.#.#.', '...#...'],
  expand: ['##...##', '#.....#', '.......', '.......', '.......', '#.....#', '##...##'],
  shrink: ['.......', '.##.##.', '.#...#.', '.......', '.#...#.', '.##.##.', '.......'],
  help: ['..###..', '.#...#.', '.....#.', '....#..', '...#...', '.......', '...#...'],
  ear: ['..###..', '.#...#.', '.#.#.#.', '.#..#..', '..#.#..', '...##..'],
  chamber: ['.#####.', '#.....#', '#.###.#', '#.###.#', '#.###.#', '#.....#', '.#####.'],
  x: ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  node_game: ['.####....', '##..##.##', '#.##.#.##', '#.##.###.', '.####.##.', '...###...'],
  node_event: ['..###..', '.#...#.', '.....#.', '....#..', '...#...', '.......', '...#...'],
  node_merchant: ['..###..', '.#####.', '##.#.##', '#######', '##.#.##', '.#####.', '..###..'],
  node_rest: ['...#...', '..###..', '...#...', '..###..', '..###..', '..###..', '.#####.'],
  node_shotgun: ['##########', '##########', '..####....', '..#.#.....', '..###.....'],
  node_secret: ['...###...', '.##...##.', '#..###..#', '#.#####.#', '#..###..#', '.##...##.', '...###...'],
  node_boss: ['.#####.', '#######', '#.#.#.#', '#######', '.#####.', '..#.#..', '.#####.']
};
const _iconCache = new Map();
export function iconURL(name, scale = 2, color = PAL.t3) {
  const key = name + '|' + scale + '|' + color; if (_iconCache.has(key)) return _iconCache.get(key);
  const rows = ICONS[name] || ICONS.q, w = rows[0].length, h = rows.length, pad = 1;
  const [c, g] = mk((w + pad * 2) * scale, (h + pad * 2) * scale);
  g.fillStyle = PAL.k0;
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '#') for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.fillRect((x + pad + dx) * scale, (y + pad + dy) * scale, scale, scale); }));
  g.fillStyle = color;
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '#') g.fillRect((x + pad) * scale, (y + pad) * scale, scale, scale); }));
  const u = c.toDataURL(); _iconCache.set(key, u); return u;
}
export const SUIT_COLOR = { blood: PAL.r4, eye: PAL.w2, tooth: PAL.t3, key: PAL.g1 };

// ---------------- Cartas (40×56) ----------------
const CW = 40, CH_ = 56;
const SUIT_INK = { blood: PAL.r3, eye: PAL.c2, tooth: PAL.b3, key: PAL.c3 };
function blit(g, rows, x, y, color, scale = 1) { g.fillStyle = color; rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === '#') g.fillRect(x + i * scale, y + j * scale, scale, scale); })); }
function sigil(id) {
  const rnd = mulberry32(hashStr('sigil:' + id)), n = 9, cells = [];
  for (let y = 0; y < n; y++) { const row = []; for (let x = 0; x < 5; x++) row.push(rnd() < (x === 4 ? 0.7 : 0.48) ? 1 : 0); for (let x = 3; x >= 0; x--) row.push(row[x]); cells.push(row); }
  cells[4][4] = 1; return cells.map(r => r.map(v => (v ? '#' : '.')).join(''));
}
// Adornos de las figuras (J = sombrero con pluma, Q = corona de tres puntas, K = corona grande)
const COURT = { 11: ['..#####..', '.#######.', '....#....'], 12: ['.#..#..#.', '.##.#.##.', '#########', '.#######.'], 13: ['#...#...#', '##.###.##', '#########', '#########'] };
const _cardCache = new Map();
export function cardURL(card) {
  const key = card.id + '|' + (card.mods || []).join(',') + (card.sp ? '' : '');
  if (_cardCache.has(key)) return _cardCache.get(key);
  const [c, g] = mk(CW, CH_), ink = SUIT_INK[card.suit] || PAL.c2, mods = card.mods || [];
  const cursed = card.sp && ['la_mujer', 'el_ahogado', 'la_septima', 'la_deuda', 'el_hambre'].includes(card.id);
  const paper = cursed ? '#c9b79a' : PAL.t3;
  R(g, 0, 0, CW, CH_, PAL.k0); R(g, 1, 1, CW - 2, CH_ - 2, paper); R(g, 1, 1, CW - 2, 1, PAL.t4); R(g, 1, CH_ - 2, CW - 2, 1, PAL.t2);
  const rnd = mulberry32(hashStr(card.id)); for (let i = 0; i < 26; i++) P(g, 2 + Math.floor(rnd() * (CW - 4)), 2 + Math.floor(rnd() * (CH_ - 4)), rnd() < 0.5 ? PAL.t2 : PAL.t4);
  R(g, 3, 3, CW - 6, CH_ - 6, mix(paper, '#000000', 0.0)); // marco interior
  g.fillStyle = cursed ? PAL.r3 : PAL.t1; g.fillRect(3, 3, CW - 6, 1); g.fillRect(3, CH_ - 4, CW - 6, 1); g.fillRect(3, 3, 1, CH_ - 6); g.fillRect(CW - 4, 3, 1, CH_ - 6);
  // Comodines: el RANGO comodín (Sombra, La Mujer) lleva «*» donde va el número; el PALO comodín (Dado Trucado, La Mujer) lleva un asterisco donde va el palo
  const rk = card.sp && isWildRank(card) ? '*' : rankLabel(card.rank);
  const suitIcon = card.sp && isWildSuit(card) ? ICONS.wild : ICONS[card.suit];
  if (card.sp) {
    const s = sigil(card.id); blit(g, s, 11, 17, PAL.k1, 2); blit(g, s, 10, 16, cursed ? PAL.r3 : ink, 2);
    blit(g, suitIcon, 18, 25, paper); // hueco central con el palo (o con el asterisco, si el palo es comodín)
    blit(g, suitIcon, 17, 24, cursed ? PAL.r2 : ink);
  } else {
    const ic = ICONS[card.suit], w = ic[0].length, h = ic.length, sc = 2, ox = Math.round((CW - w * sc) / 2), oy = Math.round((CH_ - h * sc) / 2);
    blit(g, ic, ox + 1, oy + 1, mix(paper, '#000', 0.25), sc); blit(g, ic, ox, oy, ink, sc);
    // Figuras: corona o sombrero sobre el palo. As: filetes arriba y abajo.
    const cr = COURT[card.rank];
    if (cr) { const cx = Math.round((CW - cr[0].length) / 2), cy = oy - cr.length - 2; blit(g, cr, cx + 1, cy + 1, mix(paper, '#000', 0.25)); blit(g, cr, cx, cy, ink); }
    if (card.rank === 1) { R(g, 15, oy - 4, 10, 1, ink); R(g, 15, oy + h * sc + 3, 10, 1, ink); R(g, 17, oy - 6, 6, 1, ink); R(g, 17, oy + h * sc + 5, 6, 1, ink); }
  }
  if (cursed) { for (let x = 4; x < CW - 4; x += 3 + Math.floor(rnd() * 3)) { const l = 2 + Math.floor(rnd() * 5); R(g, x, 4, 1, l, PAL.r3); } }
  // Índices de las esquinas (número y palo), encima de todo lo demás; en las especiales con un halo de papel para que se lean sobre el sigilo y los goteos
  const index = gg => {
    if (card.sp) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { drawText(gg, rk, 5 + dx, 6 + dy, paper, 1); blit(gg, suitIcon, 5 + dx, 15 + dy, paper); }
    drawText(gg, rk, 5, 6, ink, 1); blit(gg, suitIcon, 5, 15, ink);
  };
  index(g); g.save(); g.translate(CW, CH_); g.rotate(Math.PI); index(g); g.restore();   // la esquina inferior derecha va girada 180°
  if (mods.includes('edge')) { g.strokeStyle = PAL.w3; g.lineWidth = 1; g.strokeRect(0.5, 0.5, CW - 1, CH_ - 1); R(g, 0, 0, CW, 1, PAL.w3); R(g, 0, 0, 1, CH_, PAL.w2); }
  if (mods.includes('gold')) { for (const [x, y, w, h] of [[0, 0, CW, 2], [0, CH_ - 2, CW, 2], [0, 0, 2, CH_], [CW - 2, 0, 2, CH_]]) R(g, x, y, w, h, PAL.g1); }
  if (mods.includes('red')) { R(g, 16, 41, 8, 8, PAL.k0); R(g, 17, 42, 6, 6, PAL.r4); R(g, 18, 43, 4, 4, PAL.r3); P(g, 19, 44, PAL.r2); }
  if (mods.includes('glass')) { g.fillStyle = 'rgba(207,202,189,.28)'; g.fillRect(2, 2, CW - 4, CH_ - 4); g.fillStyle = PAL.w3; for (let i = 0; i < 9; i++) P(g, 4 + i * 3, 4 + ((i * 7) % 40), PAL.w3); g.strokeStyle = PAL.w2; g.beginPath(); g.moveTo(6, 10); g.lineTo(16, 22); g.lineTo(11, 30); g.stroke(); }
  if (mods.includes('hex')) { blit(g, ['.#.#.', '#####', '.###.', '..#..', '..#..'], 28, 4, PAL.r3); }
  const u = c.toDataURL(); _cardCache.set(key, u); return u;
}
let _back = null;
export function cardBackURL() {
  if (_back) return _back;
  const [c, g] = mk(CW, CH_); R(g, 0, 0, CW, CH_, PAL.k0); R(g, 1, 1, CW - 2, CH_ - 2, PAL.r2); R(g, 3, 3, CW - 6, CH_ - 6, PAL.r1);
  for (let y = 4; y < CH_ - 4; y += 2) for (let x = 4 + (y % 4 ? 0 : 1); x < CW - 4; x += 2) P(g, x, y, PAL.r2);
  blit(g, ICONS.eye, 15, 24, PAL.k0, 1); blit(g, ICONS.eye, 15, 23, PAL.t2, 1);
  return (_back = c.toDataURL());
}

// ---------------- Fondos (se generan al tamaño de la pantalla, ~1 píxel lógico = 4–5 px CSS) ----------------
function vgrad(g, w, y0, y1, a, b) { for (let y = y0; y < y1; y++) { const t = (y - y0) / Math.max(1, y1 - y0 - 1); for (let x = 0; x < w; x++) { const th = BAYER[(y & 3) * 4 + (x & 3)] / 16; P(g, x, y, t > th * 0.9 + 0.05 ? b : a); } } }
function floorPersp(g, w, y0, h, ca, cb, fade) {
  for (let y = y0; y < h; y++) {
    const t = (y - y0 + 1) / (h - y0), z = 1 / (t * 0.92 + 0.08);
    for (let x = 0; x < w; x++) { const u = (x - w / 2) * z / (w * 0.055), v = z * 1.1; const col = ((Math.floor(u) + Math.floor(v)) & 1) ? ca : cb; P(g, x, y, t < fade && BAYER[(y & 3) * 4 + (x & 3)] / 16 > t / fade ? PAL.k1 : col); }
  }
}
function lights(g, w, h, list, tint = [232, 190, 120]) { // luz aditiva con difuminado ordenado (se mantiene pixelada)
  const im = g.getImageData(0, 0, w, h), d = im.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let I = 0; for (const L of list) { const dx = (x - L.x) / (L.rx || L.r), dy = (y - L.y) / (L.ry || L.r), q = dx * dx + dy * dy; if (q < 1) I += Math.pow(1 - q, 1.4) * L.a; }
    if (I <= 0) continue; const q = Math.min(1, I) * 3, steps = Math.floor(q) + (q % 1 > BAYER[(y & 3) * 4 + (x & 3)] / 16 ? 1 : 0), i = (y * w + x) * 4, k = Math.min(1, steps * 0.22);
    d[i] = d[i] + (tint[0] - d[i]) * k * 0.9; d[i + 1] = d[i + 1] + (tint[1] - d[i + 1]) * k * 0.85; d[i + 2] = d[i + 2] + (tint[2] - d[i + 2]) * k * 0.7;
  }
  g.putImageData(im, 0, 0);
}
function specks(g, w, h, rnd, n, col) { for (let i = 0; i < n; i++) P(g, Math.floor(rnd() * w), Math.floor(rnd() * h), col); }
function drawNum(g, n, cx, cy, col) { const s = String(n); drawText(g, s, Math.round(cx - textWidth(s) / 2), Math.round(cy - 3), col, 1, 1); }

const SCENES = {
  casino(g, w, h, rnd) {
    const fy = Math.round(h * 0.58); vgrad(g, w, 0, fy, PAL.k2, PAL.b1);
    for (let x = 0; x < w; x += 7) R(g, x, 0, 2, fy, PAL.r1);
    floorPersp(g, w, fy, h, PAL.c2, PAL.k2, 0.25); R(g, 0, fy - 1, w, 2, PAL.b2);
    const cw = Math.round(w * 0.13); for (const s of [0, 1]) for (let x = 0; x < cw; x++) { const xx = s ? w - 1 - x : x, sh = 0.5 + 0.5 * Math.sin(x * 0.9); R(g, xx, 0, 1, fy + 4, mix(PAL.r1, PAL.r3, sh * 0.6)); }
    R(g, 0, 0, w, 3, PAL.k0);
    const tables = [[0.3, 0.72, 0.13], [0.72, 0.8, 0.17], [0.52, 0.66, 0.075]], L = [];
    for (const [tx, ty, tr] of tables) {
      const cx = Math.round(w * tx), cy = Math.round(h * ty), rx = Math.round(w * tr), ry = Math.round(rx * 0.32);
      R(g, cx - 2, cy + ry, 4, Math.round(h * 0.12), PAL.b1); ell(g, cx, cy + 2, rx + 1, ry + 1, PAL.k0); ell(g, cx, cy, rx, ry, PAL.b3); ell(g, cx, cy, rx - 2, ry - 1, PAL.r1); ell(g, cx, cy + 1, rx - 5, ry - 3, PAL.r2);
      for (let i = 0; i < 3; i++) { R(g, cx - rx * 0.4 + i * 5, cy - 2, 4, 3, PAL.t3); P(g, cx - rx * 0.4 + i * 5 + 1, cy - 1, PAL.k1); } for (let i = 0; i < 4; i++) R(g, cx + rx * 0.3, cy - 1 - i, 3, 1, i % 2 ? PAL.w2 : PAL.r4);
      R(g, cx, 0, 1, Math.round(h * 0.26), PAL.k0); poly(g, [[cx - 6, Math.round(h * 0.26)], [cx + 6, Math.round(h * 0.26)], [cx + 3, Math.round(h * 0.22)], [cx - 3, Math.round(h * 0.22)]], PAL.b2);
      L.push({ x: cx, y: Math.round(h * 0.27), r: h * 0.12, a: 0.55 }, { x: cx, y: cy, rx: rx * 1.15, ry: ry * 2.2, a: 0.6 });
    }
    for (const s of [0.22, 0.78]) { const x = Math.round(w * s), y = fy - Math.round(h * 0.2); R(g, x - 5, y, 11, Math.round(h * 0.2), PAL.k0); R(g, x - 4, y + 2, 9, 5, PAL.c3); for (let i = 0; i < 3; i++) R(g, x - 3 + i * 3, y + 3, 2, 3, PAL.r4); }
    lights(g, w, h, L); specks(g, w, h, rnd, Math.round(w * h / 500), PAL.t2);
  },
  corridor(g, w, h, rnd) {
    const vx = w / 2, vy = h * 0.46, iw = w * 0.1, ih = h * 0.15; R(g, 0, 0, w, h, PAL.k1);
    poly(g, [[0, 0], [w, 0], [vx + iw, vy - ih], [vx - iw, vy - ih]], PAL.k2);
    poly(g, [[0, h], [w, h], [vx + iw, vy + ih], [vx - iw, vy + ih]], PAL.c1);
    const wall = side => {
      const xo = side < 0 ? 0 : w, xi = side < 0 ? vx - iw : vx + iw;
      poly(g, [[xo, 0], [xi, vy - ih], [xi, vy + ih], [xo, h]], side < 0 ? PAL.b1 : PAL.c1);
      let u0 = 0, k = 0; const r = 0.74;
      for (let n = 0; n < 9; n++) {
        const u1 = 1 - Math.pow(r, n + 1), xa = xo + (xi - xo) * u0, xb = xo + (xi - xo) * u1, ta = vy - ih * u0 - (1 - u0) * vy, tb = vy - ih * u1 - (1 - u1) * vy;
        const topA = (1 - u0) * 0 + u0 * (vy - ih), topB = (1 - u1) * 0 + u1 * (vy - ih), botA = (1 - u0) * h + u0 * (vy + ih), botB = (1 - u1) * h + u1 * (vy + ih);
        if (n % 2 === 0) { const pad = 0.18, ua = u0 + (u1 - u0) * pad, ub = u1 - (u1 - u0) * pad, xa2 = xo + (xi - xo) * ua, xb2 = xo + (xi - xo) * ub;
          const tA = ua * (vy - ih), tB = ub * (vy - ih), bA = (1 - ua) * h + ua * (vy + ih), bB = (1 - ub) * h + ub * (vy + ih), hA = bA - tA, hB = bB - tB;
          poly(g, [[xa2, tA + hA * 0.2], [xb2, tB + hB * 0.2], [xb2, bB - hB * 0.03], [xa2, bA - hA * 0.03]], PAL.b2);
          poly(g, [[xa2 + (xb2 - xa2) * 0.12, tA + hA * 0.27], [xb2 - (xb2 - xa2) * 0.12, tB + hB * 0.27], [xb2 - (xb2 - xa2) * 0.12, bB - hB * 0.1], [xa2 + (xb2 - xa2) * 0.12, bA - hA * 0.1]], PAL.b1);
          if (hB > 22) drawNum(g, [13, 7, 4, 9, 2][k % 5] + (side > 0 ? 1 : 0), (xa2 + xb2) / 2, tA * 0.5 + tB * 0.5 + (hA + hB) * 0.11, PAL.t2); k++; }
        else { for (let q = 0; q < 6; q++) { const f = q / 6, x = xa + (xb - xa) * f, t0 = topA + (topB - topA) * f, b0 = botA + (botB - botA) * f; R(g, x, t0, 1, b0 - t0, q % 2 ? PAL.r1 : PAL.b1); } }
        u0 = u1;
      }
    };
    wall(-1); wall(1);
    R(g, vx - iw, vy - ih, iw * 2, ih * 2, PAL.k0); R(g, vx - iw + 2, vy - ih + 2, iw * 2 - 4, ih * 2 - 4, PAL.t1); R(g, vx - iw + 3, vy - ih + 3, iw * 2 - 6, ih * 2 - 6, PAL.w1);
    poly(g, [[vx - iw * 0.5, vy - ih + 3], [vx, vy - ih + 3], [vx - iw * 0.3, vy + ih - 3], [vx - iw * 0.8, vy + ih - 3]], PAL.w2); ell(g, vx, vy + ih * 0.35, iw * 0.25, ih * 0.5, PAL.k2);
    lights(g, w, h, [{ x: vx, y: vy * 0.35, rx: w * 0.3, ry: h * 0.3, a: 0.5 }, { x: vx, y: vy, r: Math.min(w, h) * 0.3, a: 0.35 }]); specks(g, w, h, rnd, Math.round(w * h / 600), PAL.t1);
  },
  basement(g, w, h, rnd) {
    const wy = Math.round(h * 0.66); R(g, 0, 0, w, wy, PAL.c1);
    for (let y = 0, r = 0; y < wy; y += 7, r++) for (let x = -(r % 2) * 9; x < w; x += 18) { R(g, x, y, 17, 6, r % 3 ? PAL.c2 : PAL.c3); R(g, x, y + 5, 17, 1, PAL.k1); R(g, x + 16, y, 1, 6, PAL.k1); }
    for (const py of [0.14, 0.3]) { const y = Math.round(h * py); R(g, 0, y, w, 4, PAL.b2); R(g, 0, y, w, 1, PAL.b4); R(g, 0, y + 3, w, 1, PAL.k0); for (let x = 12; x < w; x += 46) R(g, x, y - 1, 3, 6, PAL.b1); }
    const dx = Math.round(w * 0.63), dy = Math.round(h * 0.3) + 4; R(g, dx, dy, 2, 3, '#7d8a86'); R(g, dx, dy + 12, 2, 2, '#9fb0aa');
    vgrad(g, w, wy, h, '#16201e', '#0c1312'); for (let y = wy + 3; y < h; y += 4) R(g, (y * 13) % 20, y, Math.round(w * (0.3 + 0.4 * rnd())), 1, '#243733');
    R(g, 0, wy, w, 2, PAL.k0); ell(g, w * 0.63, wy + 14, 12, 3, '#3b5550');
    lights(g, w, h, [{ x: w * 0.5, y: h * 0.1, r: h * 0.6, a: 0.5 }]); specks(g, w, h, rnd, Math.round(w * h / 700), '#9fb0aa');
  },
  shop(g, w, h, rnd) {
    const cy = Math.round(h * 0.72); vgrad(g, w, 0, cy, PAL.k2, PAL.b1);
    for (let s = 0; s < 3; s++) { const y = Math.round(h * (0.16 + s * 0.17)); R(g, 0, y, w, 3, PAL.b3); R(g, 0, y + 3, w, 1, PAL.k0);
      for (let x = 6; x < w - 8; x += 12 + Math.floor(rnd() * 6)) { const jh = 8 + Math.floor(rnd() * 6), col = [PAL.r3, PAL.t3, PAL.t2, PAL.w1, PAL.b4][Math.floor(rnd() * 5)]; R(g, x, y - jh, 7, jh, PAL.c3); R(g, x + 1, y - jh + 2, 5, jh - 3, col); R(g, x + 1, y - jh, 5, 1, PAL.b3); P(g, x + 1, y - jh + 3, PAL.w3); } }
    R(g, 0, cy, w, h - cy, PAL.b2); R(g, 0, cy, w, 3, PAL.b4); R(g, 0, cy + 3, w, 1, PAL.k0); for (let x = 0; x < w; x += 9) R(g, x, cy + 6, 1, h - cy, PAL.b1);
    const lx = Math.round(w * 0.3); R(g, lx - 3, cy - 10, 7, 10, PAL.c3); R(g, lx - 2, cy - 9, 5, 7, PAL.t4); R(g, lx - 1, cy - 12, 3, 2, PAL.c3);
    for (let i = 0; i < 6; i++) ell(g, w * 0.62 + i * 6, cy - 2, 2.5, 1.2, PAL.g1);
    lights(g, w, h, [{ x: lx, y: cy - 6, r: h * 0.6, a: 0.75 }]); specks(g, w, h, rnd, Math.round(w * h / 800), PAL.t3);
  },
  rest(g, w, h, rnd) {
    const fy = Math.round(h * 0.64); vgrad(g, w, 0, fy, PAL.k1, PAL.b1); for (let x = 0; x < w; x += 10) R(g, x, 0, 1, fy, PAL.k0);
    R(g, 0, fy, w, h - fy, PAL.b1); for (let x = 0; x < w; x += 14) R(g, x, fy, 1, h - fy, PAL.k1); R(g, 0, fy, w, 2, PAL.k0);
    const wx = Math.round(w * 0.68), wy = Math.round(h * 0.12); R(g, wx, wy, 26, 30, PAL.b3); R(g, wx + 2, wy + 2, 22, 26, PAL.k0); ell(g, wx + 17, wy + 10, 5, 5, PAL.w2); ell(g, wx + 19, wy + 9, 4, 4, PAL.k0); R(g, wx + 12, wy + 2, 2, 26, PAL.b3); R(g, wx + 2, wy + 14, 22, 2, PAL.b3);
    const bx = Math.round(w * 0.1); R(g, bx, fy - 10, Math.round(w * 0.36), 14, PAL.b2); R(g, bx, fy - 14, Math.round(w * 0.36), 6, PAL.t2); R(g, bx, fy - 14, 10, 6, PAL.w2); R(g, bx + Math.round(w * 0.34), fy - 18, 3, 22, PAL.b3);
    const tx = Math.round(w * 0.5); R(g, tx, fy - 14, 14, 3, PAL.b3); R(g, tx + 1, fy - 11, 2, 12, PAL.b2); R(g, tx + 11, fy - 11, 2, 12, PAL.b2); R(g, tx + 6, fy - 22, 3, 8, PAL.t4); R(g, tx + 7, fy - 25, 1, 3, PAL.r4);
    lights(g, w, h, [{ x: tx + 7, y: fy - 22, r: h * 0.55, a: 0.95 }]); specks(g, w, h, rnd, Math.round(w * h / 900), PAL.t3);
  },
  secret(g, w, h, rnd) {
    R(g, 0, 0, w, h, PAL.k0); const cx = w / 2, cy = h * 0.42, s = Math.max(2, Math.floor(Math.min(w, h) / 28));
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; for (let d = 6 * s; d < Math.max(w, h); d += 2) P(g, Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d * 0.7), d % 6 < 2 ? PAL.r1 : PAL.k0); }
    const eye = ICONS.eye; blit(g, eye, Math.round(cx - 4.5 * s), Math.round(cy - 3.5 * s), PAL.r3, s); blit(g, ['...', '.#.', '...'], Math.round(cx - 1.5 * s), Math.round(cy - 1.5 * s), PAL.k0, s);
    floorPersp(g, w, Math.round(h * 0.75), h, PAL.k2, PAL.k0, 0.6); specks(g, w, h, rnd, Math.round(w * h / 400), PAL.c4);
  },
  door(g, w, h, rnd) {
    vgrad(g, w, 0, h, PAL.k2, PAL.k0); for (let x = 0; x < w; x += 8) R(g, x, 0, 2, h, PAL.c1);
    const dw = Math.round(Math.min(w * 0.42, h * 0.42)), dh = Math.round(dw * 1.75), dx = Math.round(w / 2 - dw / 2), dy = Math.round(h * 0.5 - dh / 2);
    R(g, dx - 4, dy - 4, dw + 8, dh + 4, PAL.b3); R(g, dx, dy, dw, dh, PAL.b2);
    for (const [px, py, pw, ph] of [[0.12, 0.08, 0.34, 0.4], [0.54, 0.08, 0.34, 0.4], [0.12, 0.55, 0.34, 0.38], [0.54, 0.55, 0.34, 0.38]]) { R(g, dx + dw * px, dy + dh * py, dw * pw, dh * ph, PAL.b1); R(g, dx + dw * px, dy + dh * py, dw * pw, 1, PAL.b3); }
    ell(g, dx + dw * 0.86, dy + dh * 0.52, 2.5, 2.5, PAL.g1); R(g, dx + dw * 0.85, dy + dh * 0.55, 2, 4, PAL.k0);
    R(g, dx, dy + dh - 1, dw, 2, PAL.t4); lights(g, w, h, [{ x: w / 2, y: dy + dh, rx: dw * 1.2, ry: dh * 0.5, a: 0.9 }]); specks(g, w, h, rnd, Math.round(w * h / 600), PAL.t2);
  }
};

SCENES.chapel = function (g, w, h, rnd) {
  const fy = Math.round(h * 0.6), gx = Math.round(w / 2), rx = Math.max(6, Math.round(w * 0.085)), gy = Math.round(h * 0.05), gh = Math.round(h * 0.46);
  vgrad(g, w, 0, fy, '#0c0f15', '#1c222d');
  for (let y = 0, r = 0; y < fy; y += 8, r++) for (let x = -(r % 2) * 10; x < w; x += 20) { R(g, x, y + 7, 20, 1, '#080a0f'); R(g, x + 19, y, 1, 8, '#080a0f'); if ((x * 7 + y * 3) % 5 === 0) R(g, x + 2, y + 2, 4, 2, '#222a36'); }
  const cy0 = gy + rx, inArch = (x, y) => (y >= cy0 ? Math.abs(x - gx) <= rx && y <= gy + gh : ((x - gx) / rx) ** 2 + ((y - cy0) / rx) ** 2 <= 1);
  const cols = ['#8a1c1c', '#b08a3a', '#3a6a8a', '#4a7a4a', '#6a3a7a', '#a8431f'];
  for (let y = gy - 2; y <= gy + gh + 1; y++) for (let x = gx - rx - 3; x <= gx + rx + 3; x++) {
    if (inArch(x, y)) { const cx = Math.floor((x - gx + rx) / 5), cyy = Math.floor((y - gy) / 6); P(g, x, y, ((x - gx + rx) % 5 === 0 || (y - gy) % 6 === 0 || Math.abs(x - gx) <= 0) ? '#0a0c11' : cols[(cx * 3 + cyy * 2) % cols.length]); }
    else if (inArch(x - 2, y) || inArch(x + 2, y) || inArch(x, y - 2)) P(g, x, y, '#06070a');
  }
  const aL = (i) => Math.round(w * (0.075 + i * 0.05));
  g.globalAlpha = 0.1; poly(g, [[gx - rx, gy + gh], [gx + rx, gy + gh], [gx + rx * 2.6, h], [gx - rx * 2.6, h]], '#8fb0d8'); g.globalAlpha = 1;
  floorPersp(g, w, fy, h, '#232833', '#171a22', 0.25); R(g, 0, fy - 1, w, 2, '#06070a');
  poly(g, [[gx - w * 0.035, fy], [gx + w * 0.035, fy], [gx + w * 0.17, h], [gx - w * 0.17, h]], PAL.r2); poly(g, [[gx - w * 0.01, fy], [gx + w * 0.01, fy], [gx + w * 0.03, h], [gx - w * 0.03, h]], PAL.r3);
  for (let i = 0; i < 4; i++) {
    const y = fy + 4 + Math.round(i * (h - fy) / 4.2), th = 4 + i * 3, ah = Math.round(w * (0.05 + i * 0.045)), lw = gx - ah;
    R(g, 0, y, lw, th, PAL.b2); R(g, 0, y, lw, 2, PAL.b3); R(g, 0, y + th, lw, 2, PAL.k0); R(g, gx + ah, y, w - gx - ah, th, PAL.b2); R(g, gx + ah, y, w - gx - ah, 2, PAL.b3); R(g, gx + ah, y + th, w - gx - ah, 2, PAL.k0);
    R(g, 0, y - th - 3, lw, 3, PAL.b1); R(g, gx + ah, y - th - 3, w - gx - ah, 3, PAL.b1);
  }
  const ay = fy - Math.round(h * 0.07), aw = Math.round(w * 0.2);
  R(g, gx - aw / 2, ay, aw, Math.round(h * 0.07), PAL.w2); R(g, gx - aw / 2, ay, aw, 2, PAL.w3); R(g, gx - aw / 2, ay + Math.round(h * 0.07) - 1, aw, 1, PAL.w1); R(g, gx - 1, ay + 2, 2, Math.round(h * 0.07) - 3, PAL.r3);
  const L = [{ x: gx, y: gy + gh * 0.45, r: h * 0.5, a: 0.5 }];
  for (const s of [-1, 1]) { const cx = Math.round(gx + s * w * 0.15); R(g, cx, ay - Math.round(h * 0.1), 2, Math.round(h * 0.1) + Math.round(h * 0.07), PAL.t3); R(g, cx - 1, ay - Math.round(h * 0.1) - 1, 4, 1, PAL.t2); P(g, cx, ay - Math.round(h * 0.1) - 3, PAL.g1); P(g, cx + 1, ay - Math.round(h * 0.1) - 2, '#ff9a3a'); P(g, cx, ay - Math.round(h * 0.1) - 2, '#ffd24a'); L.push({ x: cx, y: ay - Math.round(h * 0.1), r: h * 0.22, a: 0.8 }); }
  lights(g, w, h, L); specks(g, w, h, rnd, Math.round(w * h / 700), '#9fb0c8');
};
SCENES.kitchen = function (g, w, h, rnd) {
  const fy = Math.round(h * 0.64), sx = Math.round(w * 0.52), sw = Math.round(w * 0.32), sh = Math.round(h * 0.22);
  R(g, 0, 0, w, fy, '#18211f');
  for (let y = 0, r = 0; y < fy; y += 6, r++) for (let x = (r % 2) * 4; x < w; x += 8) R(g, x, y, 7, 5, ((x * 3 + y * 5) % 11 === 0) ? '#34463f' : (r % 3 ? '#27342f' : '#2c3b36'));
  R(g, 0, Math.round(h * 0.34), w, 2, PAL.k0); R(g, 0, Math.round(h * 0.34) + 2, w, 1, '#3d554c');
  for (let i = 0; i < 6; i++) { const x = Math.round(w * (0.05 + i * 0.075)), L = Math.round(h * (0.1 + (i % 3) * 0.05)); R(g, x, 0, 1, L, PAL.c4); ell(g, x, L + 5, 3, 6, i % 2 ? PAL.r3 : PAL.r2); R(g, x - 1, L - 1, 3, 2, PAL.c4); }
  for (let i = 0; i < 4; i++) { const x = Math.round(w * (0.5 + i * 0.1)), y = Math.round(h * 0.12 + (i % 2) * 5); R(g, x, 0, 1, y, PAL.c4); ell(g, x, y + 5, 6, 5, PAL.c3); ell(g, x, y + 5, 4, 3, PAL.k1); R(g, x + 5, y + 3, 5, 1, PAL.c4); }
  floorPersp(g, w, fy, h, PAL.w1, PAL.c3, 0.2); R(g, 0, fy - 1, w, 2, PAL.k0);
  R(g, sx, fy - sh, sw, sh, PAL.c3); R(g, sx, fy - sh, sw, 2, PAL.c4); R(g, sx, fy - sh + 2, sw, 1, PAL.k0); R(g, sx + 3, fy - sh + 6, sw - 6, sh - 10, PAL.c2); R(g, sx + 5, fy - sh + 8, sw - 10, sh - 14, PAL.k1);
  R(g, sx - 2, fy - sh - Math.round(h * 0.12), sw + 4, 4, PAL.c4); poly(g, [[sx, fy - sh - Math.round(h * 0.12) + 4], [sx + sw, fy - sh - Math.round(h * 0.12) + 4], [sx + sw - 4, fy - sh - 2], [sx + 4, fy - sh - 2]], PAL.c2);
  for (let i = 0; i < 3; i++) { const bx = sx + sw * (0.2 + i * 0.3), by = fy - sh - 3; ell(g, bx, by + 1, 6, 2, PAL.k0); for (let f = 0; f < 7; f++) P(g, bx - 4 + f * 1.3, by - (f % 3), f % 2 ? '#ffb04a' : '#e0583a'); }
  const px = Math.round(sx + sw * 0.5), py = fy - sh - 8; R(g, px - 7, py, 14, 8, PAL.c3); R(g, px - 8, py - 1, 16, 2, PAL.c4); R(g, px - 6, py - 3, 12, 2, '#6e4a2a'); for (let k = 0; k < 6; k++) P(g, px - 4 + k * 2 + (k % 2), py - 7 - (k % 3) * 2, k % 2 ? '#8a948f' : '#5f6e69');
  const tx = Math.round(w * 0.08), tw = Math.round(w * 0.3); R(g, tx, fy - Math.round(h * 0.09), tw, 4, PAL.c4); R(g, tx + 2, fy - Math.round(h * 0.09) + 4, 3, Math.round(h * 0.09), PAL.c3); R(g, tx + tw - 5, fy - Math.round(h * 0.09) + 4, 3, Math.round(h * 0.09), PAL.c3);
  for (let i = 0; i < 4; i++) { const kx = tx + 6 + i * Math.round(tw / 5); poly(g, [[kx, fy - Math.round(h * 0.09) - 1], [kx + 7, fy - Math.round(h * 0.09) - 1], [kx + 7, fy - Math.round(h * 0.09) - 4], [kx + 1, fy - Math.round(h * 0.09) - 7]], PAL.w1); R(g, kx + 7, fy - Math.round(h * 0.09) - 4, 3, 3, PAL.b2); }
  lights(g, w, h, [{ x: sx + sw / 2, y: fy - sh * 0.9, r: h * 0.55, a: 0.95 }, { x: w * 0.2, y: h * 0.08, r: h * 0.4, a: 0.45 }]); specks(g, w, h, rnd, Math.round(w * h / 800), '#aab6b0');
};
SCENES.infirmary = function (g, w, h, rnd) {
  const fy = Math.round(h * 0.64);
  vgrad(g, w, 0, fy, '#1b2623', '#2b3a36'); R(g, 0, Math.round(h * 0.42), w, fy - Math.round(h * 0.42), '#34453f'); R(g, 0, Math.round(h * 0.42), w, 2, '#51675e'); R(g, 0, Math.round(h * 0.42) + 2, w, 1, PAL.k0);
  for (let x = 0; x < w; x += 12) R(g, x, Math.round(h * 0.42) + 3, 1, fy - Math.round(h * 0.42), '#2a3833');
  const wx = Math.round(w * 0.7), wy = Math.round(h * 0.08), ww = Math.round(w * 0.17), wh = Math.round(h * 0.3);
  R(g, wx - 2, wy - 2, ww + 4, wh + 4, PAL.k0); R(g, wx, wy, ww, wh, '#0f1a24'); ell(g, wx + ww * 0.68, wy + wh * 0.32, 5, 5, '#cfd8dc'); ell(g, wx + ww * 0.74, wy + wh * 0.28, 4, 4, '#0f1a24'); R(g, wx + ww / 2, wy, 1, wh, PAL.k0); R(g, wx, wy + wh / 2, ww, 1, PAL.k0);
  g.globalAlpha = 0.09; poly(g, [[wx, wy + wh], [wx + ww, wy + wh], [wx + ww * 0.6, h], [wx - ww * 1.2, h]], '#cfd8dc'); g.globalAlpha = 1;
  const cx = Math.round(w * 0.22), cyy = Math.round(h * 0.2); R(g, cx - 2, cyy - 7, 5, 15, PAL.r3); R(g, cx - 7, cyy - 2, 15, 5, PAL.r3); R(g, cx - 2, cyy - 7, 5, 1, PAL.r4);
  floorPersp(g, w, fy, h, '#2a3330', '#1d2523', 0.2); R(g, 0, fy - 1, w, 2, PAL.k0);
  for (let i = 0; i < 3; i++) {
    const bx = Math.round(w * (0.04 + i * 0.3)), bw = Math.round(w * 0.24), by = fy - Math.round(h * 0.07), bh = Math.round(h * 0.13);
    R(g, bx, by + bh - 4, 3, Math.round(h * 0.05), PAL.c4); R(g, bx + bw - 3, by + bh - 4, 3, Math.round(h * 0.05), PAL.c4);
    R(g, bx, by, bw, bh - 4, PAL.w2); R(g, bx, by, bw, 3, PAL.w3); R(g, bx, by, Math.round(bw * 0.22), bh - 4, PAL.w3); R(g, bx + 2, by + 6, bw - 4, 1, PAL.w1); R(g, bx, by + bh - 6, bw, 2, PAL.w1);
    if (i === 1) { poly(g, [[bx + bw * 0.3, by], [bx + bw * 0.9, by], [bx + bw * 0.92, by - 5], [bx + bw * 0.4, by - 7]], PAL.w1); R(g, bx + bw * 0.5, by - 3, 3, 3, PAL.r3); }
    R(g, bx - 1, Math.round(h * 0.2) - 6, bw + 2, 2, PAL.c4);
    for (let k = 0; k < Math.round(bw / 4); k++) R(g, bx + k * 4, Math.round(h * 0.2) - 4, 3, Math.round(h * 0.2) + (k % 2) * 3, k % 2 ? '#9aa8a2' : '#7f8d87');
  }
  const ix = Math.round(w * 0.64); R(g, ix, fy - Math.round(h * 0.26), 1, Math.round(h * 0.26), PAL.c4); R(g, ix - 4, fy - Math.round(h * 0.26), 9, 1, PAL.c4); R(g, ix - 3, fy - Math.round(h * 0.26) + 1, 3, 6, '#b8c8c4'); R(g, ix - 2, fy - Math.round(h * 0.26) + 7, 1, Math.round(h * 0.1), '#b8c8c4'); R(g, ix - 3, fy - 2, 7, 2, PAL.c4);
  lights(g, w, h, [{ x: w * 0.5, y: h * 0.06, r: h * 0.7, a: 0.6 }], [190, 215, 205]); specks(g, w, h, rnd, Math.round(w * h / 700), '#b8c8c4');
};

SCENES.theatre = function (g, w, h, rnd) {
  const fy = Math.round(h * 0.6), cx = Math.round(w / 2), top = Math.round(h * 0.1), cw = Math.round(w * 0.2);
  vgrad(g, w, 0, fy, '#14080a', '#2a1012');
  for (let y = 0; y < fy; y += 10) R(g, 0, y, w, 1, '#1c0b0d');
  for (const side of [0, 1]) {
    const x0 = side ? w - cw : 0;
    for (let x = 0; x < cw; x++) { const f = Math.sin((x + side * 2) * 0.85) * 0.5 + 0.5; R(g, x0 + x, 0, 1, fy + 3, f > 0.66 ? PAL.r4 : f > 0.33 ? PAL.r3 : PAL.r2); }
    R(g, side ? x0 : x0 + cw - 2, 0, 2, fy + 3, PAL.r1);
  }
  R(g, 0, 0, w, top, PAL.r2); for (let x = 0; x < w; x += 8) ell(g, x + 4, top, 5, 4, PAL.r3); R(g, 0, top + 3, w, 1, PAL.g1);
  floorPersp(g, w, fy, h, PAL.b3, PAL.b1, 0.3); R(g, 0, fy - 1, w, 2, PAL.k0); R(g, 0, fy + 1, w, 1, PAL.g1);
  g.globalAlpha = 0.17; poly(g, [[cx - w * 0.03, top], [cx + w * 0.03, top], [cx + w * 0.2, fy + (h - fy) * 0.55], [cx - w * 0.2, fy + (h - fy) * 0.55]], '#ffe9a8'); g.globalAlpha = 1;
  g.globalAlpha = 0.5; ell(g, cx, fy + (h - fy) * 0.5, Math.round(w * 0.19), Math.max(2, Math.round((h - fy) * 0.15)), '#8a6a3a'); g.globalAlpha = 1;
  const sy = h - Math.round(h * 0.11), n = 9;
  for (let i = 0; i < n; i++) { const x = Math.round(i * w / (n - 1)) - 8, bw = Math.round(w / (n - 1)) + 6; R(g, x, sy + 4, bw, h - sy, PAL.k0); ell(g, x + bw / 2, sy + 4, bw / 2, Math.max(4, Math.round(h * 0.035)), PAL.k0); R(g, x + 3, sy + 2, bw - 6, 1, PAL.r1); }
  lights(g, w, h, [{ x: cx, y: fy * 0.85, r: h * 0.75, a: 0.75 }, { x: cw * 0.5, y: fy * 0.5, r: h * 0.3, a: 0.25 }, { x: w - cw * 0.5, y: fy * 0.5, r: h * 0.3, a: 0.25 }]); specks(g, w, h, rnd, Math.round(w * h / 800), '#d8b888');
};
SCENES.security = function (g, w, h, rnd) {
  const fy = Math.round(h * 0.74), cols = 6, rows = 3, mw = Math.floor(w / (cols + 1)), mh = Math.max(6, Math.floor(h * 0.17)), x0 = Math.round((w - cols * mw) / 2), y0 = Math.round(h * 0.05);
  R(g, 0, 0, w, h, '#06100f'); vgrad(g, w, 0, fy, '#07120f', '#0d1d1a');
  const tints = [['#1f4f46', '#7dd6c0'], ['#243a5c', '#8fb0e8'], ['#3a4a40', '#aac4b0']];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = x0 + c * mw + 1, y = y0 + r * (mh + 4), T = tints[(c + r * 2) % 3];
    R(g, x - 1, y - 1, mw - 1, mh + 2, PAL.k0); R(g, x, y, mw - 3, mh, '#0a1816');
    for (let yy = 0; yy < mh; yy += 2) R(g, x, y + yy, mw - 3, 1, ((yy + c * 2 + r) % 6 === 0) ? T[0] : '#102a26');
    R(g, x + 2, y + mh - 4, 5, 3, T[1]); R(g, x + 9, y + mh - 3, Math.max(3, mw - 15), 2, T[1]); if (rnd() < 0.35) R(g, x + 2, y + 2, mw - 7, 1, T[1]);
  }
  R(g, 0, fy, w, h - fy, '#080d0c'); R(g, 0, fy, w, 4, PAL.c3); R(g, 0, fy + 4, w, 2, PAL.k0);
  const kx = Math.round(w * 0.3), kw = Math.round(w * 0.4); R(g, kx, fy - 3, kw, 4, PAL.c2); for (let x = kx + 2; x < kx + kw - 2; x += 3) R(g, x, fy - 2, 2, 1, PAL.c4);
  ell(g, cx0(w), fy + 14 > h ? h - 4 : fy + 14, Math.round(w * 0.1), Math.round(h * 0.08), PAL.k0); R(g, Math.round(w / 2) - 2, fy + 6, 4, Math.round(h * 0.2), PAL.k0);
  lights(g, w, h, [{ x: w * 0.5, y: h * 0.18, r: h * 0.95, a: 0.7 }], [90, 215, 190]); specks(g, w, h, rnd, Math.round(w * h / 900), '#7dd6c0');
};
const cx0 = w => Math.round(w / 2);
SCENES.menu = SCENES.casino; SCENES.table = SCENES.casino;
export function backgroundCanvas(kind, w, h, seed = 1) {
  const [c, g] = mk(w, h), rnd = mulberry32(hashStr(kind + seed));
  (SCENES[kind] || SCENES.casino)(g, w, h, rnd); return c;
}
export const backgroundKinds = () => Object.keys(SCENES);

// ---------------- Jokers (40×56): marco según rareza, gorro de bufón, sigilo propio y puntos de rareza ----------------
const _jokerCache = new Map();
export function jokerURL(id, rarity = 'common') {
  if (_jokerCache.has(id)) return _jokerCache.get(id);
  const [c, g] = mk(CW, CH_), rnd = mulberry32(hashStr('joker:' + id));
  const frame = rarity === 'rare' ? PAL.r4 : rarity === 'uncommon' ? PAL.w2 : PAL.g1;
  R(g, 0, 0, CW, CH_, PAL.k0); R(g, 1, 1, CW - 2, CH_ - 2, frame); R(g, 2, 2, CW - 4, CH_ - 4, PAL.k2);
  for (let i = 0; i < 44; i++) P(g, 3 + Math.floor(rnd() * (CW - 6)), 3 + Math.floor(rnd() * (CH_ - 6)), rnd() < 0.5 ? PAL.c1 : PAL.c2);
  R(g, 4, 4, CW - 8, 1, frame); R(g, 4, CH_ - 5, CW - 8, 1, frame);
  drawText(g, 'JOKER', 5, 7, frame, 1);
  blit(g, ['#.....#', '##...##', '###.###', '#######'], 16, 16, PAL.r3); P(g, 15, 15, frame); P(g, 23, 15, frame);   // gorro con dos cascabeles
  const s = sigil('joker:' + id); blit(g, s, 12, 25, PAL.k0, 2); blit(g, s, 11, 24, PAL.t4, 2);
  const pips = rarity === 'rare' ? 3 : rarity === 'uncommon' ? 2 : 1;
  for (let i = 0; i < pips; i++) R(g, 20 - pips * 2 + i * 4 + 1, 48, 3, 3, frame);
  const u = c.toDataURL(); _jokerCache.set(id, u); return u;
}

// Sigilos pequeños (objetos y herramientas): 9×9 simétricos generados por hash
const _sigCache = new Map();
export function sigilURL(id, scale = 2, color = PAL.t3) {
  const key = id + '|' + scale + '|' + color; if (_sigCache.has(key)) return _sigCache.get(key);
  const rows = sigil('ui:' + id), [c, g] = mk(11 * scale, 11 * scale);
  blit(g, rows, scale + scale, scale + scale, PAL.k0, scale); blit(g, rows, scale, scale, color, scale);
  const u = c.toDataURL(); _sigCache.set(key, u); return u;
}
