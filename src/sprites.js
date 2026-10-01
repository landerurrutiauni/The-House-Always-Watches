// sprites.js — TODO el arte es procedural (canvas, sin imágenes externas). [capa B, escrita por A]
//   PAL                         paleta (negro, carbón, marrón, beige envejecido, rojo oscuro, blanco sucio)
//   pixelText(str, {scale,color,shadow}) → <canvas>   fuente bitmap 5×7
//   iconURL(name, scale, color) → dataURL              iconos 7–11 px (heart, flame, coin, ledger, blood, eye, tooth, key, node_*, skull, shield, cards…)
//   cardURL(card) / cardBackURL()                      caras de cartas 40×56 (base y especiales con sigilo por hash)
//   characterEl(id, {scale}) → <div.char>              personaje con respiración, parpadeo y ojos que siguen al cursor
//   backgroundCanvas(kind, w, h, seed) → <canvas>      fondos low-res adaptados al tamaño de pantalla
//   setCharactersActive(bool)                          activa/desactiva la animación (reducir efectos)
import { hashStr, mulberry32 } from './rng.js';

export const PAL = {
  k0: '#050404', k1: '#0b0908', k2: '#14110f', c1: '#1e1a18', c2: '#2a2522', c3: '#3a3330', c4: '#4d4540',
  b1: '#2b1d14', b2: '#4a3526', b3: '#6b4a33', b4: '#8a6a4a',
  t1: '#8f8066', t2: '#b9a98a', t3: '#d6c8a8', t4: '#e8dcc0',
  r1: '#3a0c0c', r2: '#5c1515', r3: '#8a1c1c', r4: '#b12a2a',
  w1: '#9a968a', w2: '#cfcabd', w3: '#efe9d8', g1: '#b08a3a'
};
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; };
const R = (g, x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const P = (g, x, y, col) => R(g, x, y, 1, 1, col);

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
  const rk = card.sp && (card.id === 'sombra' || card.id === 'la_mujer') ? '*' : String(card.rank);
  drawText(g, rk, 5, 6, ink, 1); blit(g, ICONS[card.suit], 5, 15, ink);
  // esquina inferior derecha (girada)
  g.save(); g.translate(CW, CH_); g.rotate(Math.PI); drawText(g, rk, 5, 6, ink, 1); blit(g, ICONS[card.suit], 5, 15, ink); g.restore();
  if (card.sp) {
    const s = sigil(card.id); blit(g, s, 11, 17, PAL.k1, 2); blit(g, s, 10, 16, cursed ? PAL.r3 : ink, 2);
    blit(g, ICONS[card.suit], 18, 25, paper); // hueco central con el palo
    blit(g, ICONS[card.suit], 17, 24, cursed ? PAL.r2 : ink);
  } else {
    const ic = ICONS[card.suit], w = ic[0].length, h = ic.length, sc = 2, ox = Math.round((CW - w * sc) / 2), oy = Math.round((CH_ - h * sc) / 2);
    blit(g, ic, ox + 1, oy + 1, mix(paper, '#000', 0.25), sc); blit(g, ic, ox, oy, ink, sc);
  }
  if (cursed) { for (let x = 4; x < CW - 4; x += 3 + Math.floor(rnd() * 3)) { const l = 2 + Math.floor(rnd() * 5); R(g, x, 4, 1, l, PAL.r3); } }
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

// ---------------- Formas y pasadas de acabado ----------------
function ell(g, cx, cy, rx, ry, col) { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const dx = (x - cx) / rx, dy = (y - cy) / ry; if (dx * dx + dy * dy <= 1) P(g, x, y, col); } }
function ring(g, cx, cy, rx, ry, col) { for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) { const dx = (x - cx) / rx, dy = (y - cy) / ry, d = dx * dx + dy * dy; if (d <= 1.35 && d >= 0.62) P(g, x, y, col); } }
function poly(g, pts, col) {
  const ys = pts.map(p => p[1]); const y0 = Math.ceil(Math.min(...ys)), y1 = Math.floor(Math.max(...ys));
  for (let y = y0; y <= y1; y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1])); }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) R(g, Math.round(xs[i]), y, Math.round(xs[i + 1]) - Math.round(xs[i]) + 1, 1, col);
  }
}
function finish(c, g, outline = PAL.k0) { // sombreado de borde (abajo/derecha) + contorno de 1 px
  const w = c.width, h = c.height, src = g.getImageData(0, 0, w, h), d = src.data, out = g.createImageData(w, h); out.data.set(d);
  const a = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[(y * w + x) * 4 + 3]); const [or, og, ob] = hex(outline);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (d[i + 3] > 0) { if (!a(x + 1, y) || !a(x, y + 1)) { out.data[i] = d[i] * 0.66; out.data[i + 1] = d[i + 1] * 0.66; out.data[i + 2] = d[i + 2] * 0.66; } }
    else if (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1)) { out.data[i] = or; out.data[i + 1] = og; out.data[i + 2] = ob; out.data[i + 3] = 255; }
  }
  g.putImageData(out, 0, 0);
}
const head = (g, cx, cy, rx, ry, base, shade) => { ell(g, cx, cy, rx, ry, shade); ell(g, cx - 1, cy - 1, rx - 1, ry - 1, base); };
const arms = (g, lc, rc, y0, y1, hand) => { R(g, 7, y0, 5, y1 - y0, lc); R(g, 36, y0, 5, y1 - y0, rc); R(g, 7, y1, 5, 4, hand); R(g, 36, y1, 5, 4, hand); };

// ---------------- Personajes (48×64) ----------------
const CHARS = {
  dealer: { eye: { y: 15, dx: 4, w: 3, h: 2, kind: 'pit' }, draw(g) {
    poly(g, [[12, 28], [36, 28], [42, 64], [6, 64]], PAL.c1); poly(g, [[27, 28], [36, 28], [42, 64], [31, 64]], PAL.k2);
    poly(g, [[19, 28], [29, 28], [24, 47]], PAL.w2); poly(g, [[23, 30], [25, 30], [26, 37], [24, 48], [22, 37]], PAL.r3);
    poly(g, [[16, 28], [20, 28], [24, 44], [19, 40]], PAL.k0); poly(g, [[32, 28], [28, 28], [24, 44], [29, 40]], PAL.k0);
    arms(g, PAL.c1, PAL.k2, 30, 57, PAL.w1); R(g, 21, 23, 6, 6, PAL.w1);
    head(g, 24, 15, 7, 8, PAL.w2, PAL.w1); R(g, 15, 9, 18, 3, PAL.r2); R(g, 14, 11, 20, 1, PAL.k0);
    R(g, 17, 20, 14, 1, PAL.k0); P(g, 16, 19, PAL.k0); P(g, 31, 19, PAL.k0); for (let x = 18; x < 31; x += 2) P(g, x, 21, PAL.w3); P(g, 24, 18, PAL.t1);
  } },
  girl: { eye: { y: 17, dx: 4, w: 3, h: 3, kind: 'white', skipL: true }, draw(g) {
    poly(g, [[14, 30], [34, 30], [40, 64], [8, 64]], PAL.w2); poly(g, [[27, 30], [34, 30], [40, 64], [30, 64]], PAL.w1);
    for (const [x, y] of [[15, 50], [22, 44], [30, 56], [18, 38]]) R(g, x, y, 3, 2, PAL.t1);
    arms(g, PAL.w2, PAL.w1, 32, 54, PAL.t3); R(g, 21, 25, 6, 5, PAL.t3);
    head(g, 24, 17, 7, 8, PAL.t3, PAL.t2); R(g, 14, 8, 20, 4, PAL.c1); R(g, 13, 10, 4, 28, PAL.c1); R(g, 31, 10, 4, 28, PAL.c2); R(g, 17, 9, 14, 3, PAL.k1);
    R(g, 19, 25, 10, 1, PAL.t2); for (const [x, y] of [[18, 16], [19, 17], [20, 18], [18, 18], [20, 16]]) P(g, x, y, PAL.r3); for (let y = 19; y < 52; y++) P(g, 19 + (y > 34 ? 1 : 0), y, PAL.r3);
    R(g, 21, 23, 6, 1, PAL.k1); P(g, 24, 21, PAL.t1); R(g, 21, 23, 5, 1, PAL.r2);
  } },
  chair: { eye: { y: 16, dx: 4, w: 3, h: 2, kind: 'white' }, draw(g) {
    R(g, 4, 14, 4, 50, PAL.b2); R(g, 40, 14, 4, 50, PAL.b2); R(g, 4, 12, 40, 4, PAL.b3); R(g, 6, 44, 36, 4, PAL.b3); R(g, 5, 48, 3, 16, PAL.b1); R(g, 40, 48, 3, 16, PAL.b1);
    poly(g, [[12, 28], [36, 28], [38, 52], [10, 52]], PAL.c2); poly(g, [[28, 28], [36, 28], [38, 52], [30, 52]], PAL.c1); R(g, 13, 50, 8, 10, PAL.c1); R(g, 27, 50, 8, 10, PAL.c1);
    arms(g, PAL.c2, PAL.c1, 30, 46, PAL.t2); R(g, 21, 23, 6, 6, PAL.t1);
    head(g, 24, 16, 7, 8, PAL.t2, PAL.t1); R(g, 16, 8, 16, 3, PAL.w1); R(g, 15, 10, 3, 6, PAL.w1); R(g, 30, 10, 3, 6, PAL.w1);
    R(g, 17, 21, 14, 6, PAL.w1); R(g, 19, 27, 10, 2, PAL.w1); R(g, 20, 21, 8, 1, PAL.c2); P(g, 24, 18, PAL.t1); R(g, 17, 14, 5, 1, PAL.w1); R(g, 26, 14, 5, 1, PAL.w1);
  } },
  child: { eye: { y: 25, dx: 4, w: 4, h: 3, kind: 'white' }, draw(g) {
    poly(g, [[15, 40], [33, 40], [38, 64], [10, 64]], PAL.t3); poly(g, [[27, 40], [33, 40], [38, 64], [29, 64]], PAL.t2);
    R(g, 20, 40, 8, 3, PAL.r3); R(g, 17, 41, 4, 4, PAL.r3); R(g, 27, 41, 4, 4, PAL.r3); R(g, 11, 42, 4, 16, PAL.t3); R(g, 33, 42, 4, 16, PAL.t2); R(g, 11, 58, 4, 4, PAL.w2); R(g, 33, 58, 4, 4, PAL.w1);
    head(g, 24, 27, 9, 10, PAL.w2, PAL.w1); R(g, 15, 18, 18, 4, PAL.b1); R(g, 15, 20, 3, 8, PAL.b1); R(g, 30, 20, 3, 8, PAL.b1);
    poly(g, [[17, 18], [31, 18], [26, 3], [22, 1]], PAL.t4); poly(g, [[20, 13], [29, 13], [27, 9], [22, 9]], PAL.r3); P(g, 22, 0, PAL.r4);
    R(g, 20, 34, 8, 1, PAL.k0); P(g, 19, 33, PAL.k0); P(g, 28, 33, PAL.k0); P(g, 24, 30, PAL.t1);
  } },
  merchant: { eye: { y: 19, dx: 4, w: 2, h: 2, kind: 'glow' }, draw(g) {
    poly(g, [[10, 26], [38, 26], [44, 64], [4, 64]], PAL.b1); poly(g, [[28, 26], [38, 26], [44, 64], [32, 64]], PAL.k2);
    poly(g, [[12, 28], [36, 28], [34, 10], [24, 3], [14, 10]], PAL.c1); poly(g, [[30, 10], [36, 28], [28, 28], [30, 14]], PAL.k1); ell(g, 24, 19, 7, 8, PAL.k0);
    R(g, 10, 44, 28, 3, PAL.b3); for (let i = 0; i < 4; i++) { R(g, 12 + i * 7, 47, 4, 7, PAL.t3); R(g, 13 + i * 7, 49, 2, 4, i % 2 ? PAL.r3 : PAL.t2); R(g, 12 + i * 7, 46, 4, 1, PAL.b4); }
    R(g, 6, 38, 6, 16, PAL.b1); R(g, 38, 38, 4, 16, PAL.k2); R(g, 37, 52, 7, 4, PAL.t1); R(g, 38, 56, 5, 6, PAL.b3); R(g, 39, 57, 3, 4, PAL.t4); R(g, 40, 52, 1, 4, PAL.t1);
  } },
  woman: { eye: { y: 17, dx: 4, w: 3, h: 2, kind: 'white' }, draw(g) {
    poly(g, [[14, 29], [34, 29], [41, 64], [7, 64]], PAL.r3); poly(g, [[27, 29], [34, 29], [41, 64], [29, 64]], PAL.r2); poly(g, [[19, 29], [29, 29], [24, 42]], PAL.t3);
    arms(g, PAL.r3, PAL.r2, 31, 50, PAL.t3); R(g, 12, 49, 7, 10, PAL.k0); R(g, 13, 50, 5, 8, PAL.r2); P(g, 15, 53, PAL.t2); R(g, 21, 23, 6, 6, PAL.t3);
    head(g, 24, 16, 7, 8, PAL.t4, PAL.t3); R(g, 14, 8, 20, 4, PAL.k1); R(g, 13, 9, 4, 34, PAL.k1); R(g, 31, 9, 4, 34, PAL.k0); R(g, 16, 9, 7, 3, PAL.k0);
    R(g, 21, 21, 6, 2, PAL.r4); P(g, 24, 18, PAL.t2);
  } },
  drowned: { eye: { y: 16, dx: 4, w: 3, h: 3, kind: 'white' }, draw(g) {
    poly(g, [[12, 28], [36, 28], [41, 64], [7, 64]], '#23302d'); poly(g, [[27, 28], [36, 28], [41, 64], [30, 64]], '#16201e');
    arms(g, '#23302d', '#16201e', 30, 54, '#8c9a94'); R(g, 21, 23, 6, 6, '#6f7e78');
    head(g, 24, 16, 7, 8, '#8c9a94', '#5f6e69'); R(g, 15, 8, 18, 5, '#1b2523'); R(g, 15, 10, 3, 14, '#1b2523'); R(g, 30, 10, 3, 14, '#141c1a');
    R(g, 21, 21, 6, 3, PAL.k0); P(g, 24, 18, '#5f6e69');
    for (const [x, y] of [[22, 25], [26, 27], [9, 56], [39, 57], [16, 62], [31, 61]]) R(g, x, y, 1, 2, '#9fb0aa'); for (let y = 30; y < 62; y += 2) P(g, 14 + ((y * 7) % 3), y, '#2f4a3f');
  } },
  archivist: { eye: { y: 16, dx: 4, w: 3, h: 2, kind: 'white' }, draw(g) {
    poly(g, [[13, 29], [35, 29], [40, 64], [8, 64]], PAL.b2); poly(g, [[27, 29], [35, 29], [40, 64], [30, 64]], PAL.b1); poly(g, [[20, 29], [28, 29], [24, 38]], PAL.t3);
    arms(g, PAL.b2, PAL.b1, 31, 52, PAL.t3); R(g, 11, 40, 26, 17, PAL.b3); R(g, 12, 41, 24, 15, PAL.t3); R(g, 11, 40, 3, 17, PAL.r2); for (let y = 44; y < 54; y += 3) R(g, 17, y, 14, 1, PAL.t1);
    R(g, 21, 23, 6, 6, PAL.t3); head(g, 24, 16, 7, 8, PAL.t3, PAL.t2); R(g, 16, 8, 16, 4, PAL.w1); ell(g, 24, 6, 4, 3, PAL.w1); R(g, 15, 10, 3, 7, PAL.w1); R(g, 31, 10, 3, 7, PAL.w1);
    ring(g, 20, 16.5, 3, 2.4, PAL.k0); ring(g, 28, 16.5, 3, 2.4, PAL.k0); R(g, 23, 16, 2, 1, PAL.k0); R(g, 21, 22, 6, 1, PAL.t1); P(g, 24, 19, PAL.t1); R(g, 34, 14, 1, 6, PAL.r3);
  } }
};
const _bodyCache = {};
function bodyURL(id) {
  if (_bodyCache[id]) return _bodyCache[id];
  const spec = CHARS[id] || CHARS.dealer, [c, g] = mk(48, 64); spec.draw(g);
  // cuencas oscuras donde irán los ojos
  const e = spec.eye; for (const s of [-1, 1]) { if ((s < 0 && e.skipL) || (s > 0 && e.skipR)) continue; R(g, Math.round(24 + s * e.dx - e.w / 2) - 1, e.y - 1, e.w + 2, e.h + 2, PAL.k1); }
  finish(c, g); return (_bodyCache[id] = c.toDataURL());
}
function drawEyes(cv, spec, st) {
  const g = cv.getContext('2d'); g.clearRect(0, 0, 48, 64);
  for (const s of [-1, 1]) {
    if ((s < 0 && spec.skipL) || (s > 0 && spec.skipR)) continue;
    const x0 = Math.round(24 + s * spec.dx - spec.w / 2), y = spec.y, w = spec.w, h = spec.h;
    if (st.blink) { R(g, x0, y + Math.floor(h / 2), w, 1, PAL.k0); continue; }
    R(g, x0, y, w, h, spec.kind === 'pit' ? PAL.k0 : spec.kind === 'glow' ? PAL.t4 : PAL.w3);
    if (spec.kind === 'glow') continue;
    const pw = spec.kind === 'pit' ? 1 : 2, ph = Math.min(spec.kind === 'pit' ? 1 : 2, h);
    const px = Math.max(x0, Math.min(x0 + w - pw, x0 + Math.round((w - pw) / 2) + st.lx)), py = Math.max(y, Math.min(y + h - ph, y + Math.round((h - ph) / 2) + st.ly));
    R(g, px, py, pw, ph, spec.kind === 'pit' ? PAL.w2 : PAL.k0);
  }
}

// ---- Vida de los personajes: respiración (CSS), parpadeo y mirada ----
const live = new Set(); let timer = null, enabled = true; const ptr = { x: -1, y: -1, t: 0 };
function tickChars() {
  const now = performance.now();
  for (const el of [...live]) {
    if (!el.isConnected) { live.delete(el); continue; }
    const st = el._st, spec = CHARS[el.dataset.char] || CHARS.dealer, r = el.getBoundingClientRect();
    if (!r.width) continue;
    let lx = 0, ly = 0;
    if (ptr.x >= 0 && now - ptr.t < 4000) { const dx = (ptr.x - (r.left + r.width / 2)) / 180, dy = (ptr.y - (r.top + r.height * 0.27)) / 180; lx = Math.round(Math.max(-1, Math.min(1, dx)) * 1.2); ly = Math.round(Math.max(-1, Math.min(1, dy)) * 0.8); }
    else if (now > st.drift) { st.dl = [Math.round(Math.random() * 2 - 1), Math.round(Math.random() - 0.5)]; st.drift = now + 900 + Math.random() * 2200; if (Math.random() < 0.5) st.dl = [0, 0]; lx = st.dl[0]; ly = st.dl[1]; } else { lx = st.dl ? st.dl[0] : 0; ly = st.dl ? st.dl[1] : 0; }
    let blink = st.blink;
    if (!blink && now > st.nextBlink) { blink = true; st.blinkEnd = now + 130; st.nextBlink = now + 2200 + Math.random() * 4200; }
    else if (blink && now > st.blinkEnd) blink = false;
    if (lx !== st.lx || ly !== st.ly || blink !== st.blink) { st.lx = lx; st.ly = ly; st.blink = blink; drawEyes(el._eyes, spec.eye, st); }
  }
  if (!live.size) { clearInterval(timer); timer = null; }
}
function ensureLoop() {
  if (timer || !enabled || !live.size || typeof window === 'undefined') return;
  if (!ensureLoop.bound) { ensureLoop.bound = true; const mv = e => { const t = e.touches ? e.touches[0] : e; if (t) { ptr.x = t.clientX; ptr.y = t.clientY; ptr.t = performance.now(); } }; window.addEventListener('pointermove', mv, { passive: true }); window.addEventListener('touchstart', mv, { passive: true }); }
  timer = setInterval(tickChars, 70);
}
export function setCharactersActive(v) { enabled = !!v; if (!enabled) { clearInterval(timer); timer = null; } else ensureLoop(); }
export function characterEl(id, { scale = 5 } = {}) {
  const spec = CHARS[id] || CHARS.dealer;
  const el = document.createElement('div'); el.className = 'char'; el.dataset.char = id; el.style.setProperty('--px', scale);
  el.innerHTML = '<div class="ch-in"><img class="ch-body" alt="" draggable="false"><canvas class="ch-eyes" width="48" height="64"></canvas></div>';
  el.querySelector('img').src = bodyURL(id); el._eyes = el.querySelector('canvas');
  el._st = { lx: 0, ly: 0, blink: false, nextBlink: performance.now() + 1200 + Math.random() * 2500, blinkEnd: 0, drift: 0, dl: [0, 0] };
  drawEyes(el._eyes, spec.eye, el._st); live.add(el); ensureLoop(); return el;
}
export const characterIds = () => Object.keys(CHARS);

// ---------------- Fondos (se generan al tamaño de la pantalla, ~1 píxel lógico = 4–5 px CSS) ----------------
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function vgrad(g, w, y0, y1, a, b) { for (let y = y0; y < y1; y++) { const t = (y - y0) / Math.max(1, y1 - y0 - 1); for (let x = 0; x < w; x++) { const th = BAYER[(y & 3) * 4 + (x & 3)] / 16; P(g, x, y, t > th * 0.9 + 0.05 ? b : a); } } }
function floorPersp(g, w, y0, h, ca, cb, fade) {
  for (let y = y0; y < h; y++) {
    const t = (y - y0 + 1) / (h - y0), z = 1 / (t * 0.92 + 0.08);
    for (let x = 0; x < w; x++) { const u = (x - w / 2) * z / (w * 0.055), v = z * 1.1; const col = ((Math.floor(u) + Math.floor(v)) & 1) ? ca : cb; P(g, x, y, t < fade && BAYER[(y & 3) * 4 + (x & 3)] / 16 > t / fade ? PAL.k1 : col); }
  }
}
function lights(g, w, h, list) { // luz aditiva con difuminado ordenado (se mantiene pixelada)
  const im = g.getImageData(0, 0, w, h), d = im.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let I = 0; for (const L of list) { const dx = (x - L.x) / (L.rx || L.r), dy = (y - L.y) / (L.ry || L.r), q = dx * dx + dy * dy; if (q < 1) I += Math.pow(1 - q, 1.4) * L.a; }
    if (I <= 0) continue; const q = Math.min(1, I) * 3, steps = Math.floor(q) + (q % 1 > BAYER[(y & 3) * 4 + (x & 3)] / 16 ? 1 : 0), i = (y * w + x) * 4, k = Math.min(1, steps * 0.22);
    d[i] = d[i] + (232 - d[i]) * k * 0.9; d[i + 1] = d[i + 1] + (190 - d[i + 1]) * k * 0.85; d[i + 2] = d[i + 2] + (120 - d[i + 2]) * k * 0.7;
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
SCENES.menu = SCENES.casino; SCENES.table = SCENES.casino;
export function backgroundCanvas(kind, w, h, seed = 1) {
  const [c, g] = mk(w, h), rnd = mulberry32(hashStr(kind + seed));
  (SCENES[kind] || SCENES.casino)(g, w, h, rnd); return c;
}
export const backgroundKinds = () => Object.keys(SCENES);

// Sigilos pequeños (objetos y herramientas): 9×9 simétricos generados por hash
const _sigCache = new Map();
export function sigilURL(id, scale = 2, color = PAL.t3) {
  const key = id + '|' + scale + '|' + color; if (_sigCache.has(key)) return _sigCache.get(key);
  const rows = sigil('ui:' + id), [c, g] = mk(11 * scale, 11 * scale);
  blit(g, rows, scale + scale, scale + scale, PAL.k0, scale); blit(g, rows, scale, scale, color, scale);
  const u = c.toDataURL(); _sigCache.set(key, u); return u;
}
