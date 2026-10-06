// pixel.js — primitivas de dibujo en píxeles (canvas 2D sin suavizado) y paleta. Las usan sprites.js (cartas, iconos, fondos) y chars.js (personajes).
export const PAL = {
  k0: '#050404', k1: '#0b0908', k2: '#14110f', c1: '#1e1a18', c2: '#2a2522', c3: '#3a3330', c4: '#4d4540',
  b1: '#2b1d14', b2: '#4a3526', b3: '#6b4a33', b4: '#8a6a4a',
  t1: '#8f8066', t2: '#b9a98a', t3: '#d6c8a8', t4: '#e8dcc0',
  r1: '#3a0c0c', r2: '#5c1515', r3: '#8a1c1c', r4: '#b12a2a',
  w1: '#9a968a', w2: '#cfcabd', w3: '#efe9d8', g1: '#b08a3a'
};
export const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
export const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; };
export const R = (g, x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
export const P = (g, x, y, col) => R(g, x, y, 1, 1, col);
export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// ---------------- Formas ----------------
export function ell(g, cx, cy, rx, ry, col) { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const dx = (x - cx) / rx, dy = (y - cy) / ry; if (dx * dx + dy * dy <= 1) P(g, x, y, col); } }
export function ring(g, cx, cy, rx, ry, col) { for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) { const dx = (x - cx) / rx, dy = (y - cy) / ry, d = dx * dx + dy * dy; if (d <= 1.35 && d >= 0.62) P(g, x, y, col); } }
export function poly(g, pts, col) {
  const ys = pts.map(p => p[1]); const y0 = Math.ceil(Math.min(...ys)), y1 = Math.floor(Math.max(...ys));
  for (let y = y0; y <= y1; y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1])); }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) R(g, Math.round(xs[i]), y, Math.round(xs[i + 1]) - Math.round(xs[i]) + 1, 1, col);
  }
}

// ---------------- Herramientas para dibujar con detalle ----------------
// Línea de 1 px (Bresenham).
export function line(g, x0, y0, x1, y1, col) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy;
  for (let n = 0; n < 400; n++) { P(g, x0, y0, col); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
}
// Varios píxeles de un color: dots(g, [[x, y], …], col).
export const dots = (g, pts, col) => { for (const [x, y] of pts) P(g, x, y, col); };
// Pinta SOLO encima de lo ya dibujado (texturas, brillos y sombras que no se salen de la figura) o SOLO detrás (fondos, agua).
export function over(g, fn) { g.save(); g.globalCompositeOperation = 'source-atop'; fn(); g.restore(); }
export function behind(g, fn) { g.save(); g.globalCompositeOperation = 'destination-over'; fn(); g.restore(); }
// Mini-sprite con paleta de caracteres: blitP(g, ['.ab.', 'abba'], x, y, { a: '#fff', b: '#000' }); '.' y ' ' son transparentes. flip = espejo horizontal.
export function blitP(g, rows, x, y, map, flip = false) {
  rows.forEach((r, j) => { const n = r.length; for (let i = 0; i < n; i++) { const ch = r[flip ? n - 1 - i : i], c = map[ch]; if (c) P(g, x + i, y + j, c); } });
}
// Relleno con degradado y trama ordenada (Bayer 4×4) dentro de un rectángulo: de la color a (arriba/izquierda) a la b (abajo/derecha). dir: 'v' | 'h' | 'd'.
export function dgrad(g, x, y, w, h, a, b, dir = 'v', bias = 0) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const t = dir === 'v' ? (j + 0.5) / h : dir === 'h' ? (i + 0.5) / w : ((i + 0.5) / w + (j + 0.5) / h) / 2;
    P(g, x + i, y + j, Math.min(1, Math.max(0, t + bias)) > BAYER[((y + j) & 3) * 4 + ((x + i) & 3)] / 16 ? b : a);
  }
}
// Mismo degradado pero dentro de un polígono (se pinta el polígono en un lienzo auxiliar y se usa como máscara).
export function dpoly(g, pts, a, b, dir = 'd', bias = 0) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), x0 = Math.floor(Math.min(...xs)), x1 = Math.ceil(Math.max(...xs)), y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
  const [m, mg] = mk(x1 - x0 + 2, y1 - y0 + 2); poly(mg, pts.map(p => [p[0] - x0, p[1] - y0]), '#fff'); const d = mg.getImageData(0, 0, m.width, m.height).data, w = x1 - x0 + 1, h = y1 - y0 + 1;
  for (let j = 0; j < m.height; j++) for (let i = 0; i < m.width; i++) {
    if (d[(j * m.width + i) * 4 + 3] < 128) continue;
    const t = dir === 'v' ? (j + 0.5) / h : dir === 'h' ? (i + 0.5) / w : ((i + 0.5) / w + (j + 0.5) / h) / 2;
    P(g, x0 + i, y0 + j, Math.min(1, Math.max(0, t + bias)) > BAYER[((y0 + j) & 3) * 4 + ((x0 + i) & 3)] / 16 ? b : a);
  }
}
// Grano: n píxeles repartidos al azar (con la función rnd) dentro de un rectángulo.
export function speckle(g, rnd, x, y, w, h, n, cols) { for (let i = 0; i < n; i++) P(g, x + Math.floor(rnd() * w), y + Math.floor(rnd() * h), Array.isArray(cols) ? cols[Math.floor(rnd() * cols.length)] : cols); }
// Algas / hebras / mechones: baja desde (x, y) `len` píxeles serpenteando; w = grosor. Sirve para pelo, algas, flecos y goteos.
export function strand(g, x, y, len, col, { amp = 1.2, freq = 0.55, phase = 0, w = 1, drift = 0 } = {}) {
  for (let i = 0; i < len; i++) R(g, Math.round(x + Math.sin(i * freq + phase) * amp + drift * i), y + i, w, 1, col);
}
// Mezcla de dos colores hex como [r,g,b] → hex (por si hace falta un tono intermedio exacto).
export const tone = (c, t, to = '#000000') => mix(c, to, t);
