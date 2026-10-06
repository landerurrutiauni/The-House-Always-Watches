// chars-kit.js — herramientas para dibujar personajes con volumen y detalle (48×64): rampas de color, formas con sombreado por trama,
// cabezas con rasgos (cejas, nariz, boca, orejas, arrugas), manos con dedos y mangas con pliegues. Las usa chars-art.js.
import { mix, mk, R, P, BAYER, poly, line } from './pixel.js';

// ---------------- Color ----------------
// Rampa de 6 tonos a partir de un color base: lite (brillo), hi, base, mid, lo, deep (sombra profunda).
export const ramp = (base, light = '#fff3dc', dark = '#0c0710') => ({
  lite: mix(base, light, 0.5), hi: mix(base, light, 0.26), base, mid: mix(base, dark, 0.24), lo: mix(base, dark, 0.46), deep: mix(base, dark, 0.7)
});
const bay = (x, y) => BAYER[(y & 3) * 4 + (x & 3)] / 16;
// Tono según t (0 = plena luz … 1 = sombra), con trama ordenada entre tonos contiguos.
function pick(rp, t, x, y) {
  const th = bay(x, y);
  if (t < 0.12) return rp.hi;
  if (t < 0.3) return th < (0.3 - t) / 0.18 ? rp.hi : rp.base;
  if (t < 0.58) return rp.base;
  if (t < 0.74) return th < (t - 0.58) / 0.16 ? rp.mid : rp.base;
  if (t < 0.9) return th < (t - 0.74) / 0.16 ? rp.lo : rp.mid;
  return rp.lo;
}

// ---------------- Máscaras y sombreado ----------------
// Una máscara es { x0, y0, W, H, has(x, y) }. Se rellena con shadeMask: luz desde arriba a la izquierda, sombra abajo a la derecha, borde más oscuro por el lado de la sombra.
function maskOf(x0, y0, W, H, test) {
  const a = new Uint8Array(W * H); for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) a[j * W + i] = test(x0 + i, y0 + j) ? 1 : 0;
  return { x0, y0, W, H, has: (x, y) => { const i = x - x0, j = y - y0; return i >= 0 && j >= 0 && i < W && j < H && a[j * W + i] === 1; } };
}
export function polyMask(pts) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), x0 = Math.floor(Math.min(...xs)), x1 = Math.ceil(Math.max(...xs)), y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
  const [cv, cg] = mk(x1 - x0 + 2, y1 - y0 + 2); poly(cg, pts.map(p => [p[0] - x0, p[1] - y0]), '#fff'); const d = cg.getImageData(0, 0, cv.width, cv.height).data, w = cv.width;
  return maskOf(x0, y0, x1 - x0 + 2, y1 - y0 + 2, (x, y) => d[((y - y0) * w + (x - x0)) * 4 + 3] > 128);
}
export const ellMask = (cx, cy, rx, ry) => maskOf(Math.floor(cx - rx) - 1, Math.floor(cy - ry) - 1, Math.ceil(rx * 2) + 3, Math.ceil(ry * 2) + 3, (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1);
export function shadeMask(g, m, rp, { bias = 0, ax = 0.9, ay = 0.35, edge = 1 } = {}) {
  let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
  for (let j = 0; j < m.H; j++) for (let i = 0; i < m.W; i++) if (m.has(m.x0 + i, m.y0 + j)) { x0 = Math.min(x0, i); x1 = Math.max(x1, i); y0 = Math.min(y0, j); y1 = Math.max(y1, j); }
  if (x1 < 0) return;
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
    const x = m.x0 + i, y = m.y0 + j; if (!m.has(x, y)) continue;
    let t = 0.5 + ((i - x0 + 0.5) / w - 0.5) * ax + ((j - y0 + 0.5) / h - 0.5) * ay + bias;
    if (edge) { if (!m.has(x - 1, y)) t -= 0.16 * edge; if (!m.has(x + 1, y)) t += 0.22 * edge; if (!m.has(x, y - 1)) t -= 0.1 * edge; if (!m.has(x, y + 1)) t += 0.16 * edge; }
    P(g, x, y, pick(rp, t, x, y));
  }
}
export const shade = (g, pts, rp, o) => shadeMask(g, polyMask(pts), rp, o);
// Igual, pero con un contorno oscuro de 1 px alrededor (para que una forma clara se despegue de otra clara: manos sobre la camisa, un objeto sobre la ropa).
export function shadeOut(g, pts, rp, outline, o) {
  const m = polyMask(pts), ring = { x0: m.x0 - 1, y0: m.y0 - 1, W: m.W + 2, H: m.H + 2, has: (x, y) => m.has(x, y) || m.has(x - 1, y) || m.has(x + 1, y) || m.has(x, y - 1) || m.has(x, y + 1) };
  for (let j = ring.y0; j < ring.y0 + ring.H; j++) for (let i = ring.x0; i < ring.x0 + ring.W; i++) if (ring.has(i, j) && !m.has(i, j)) P(g, i, j, outline);
  shadeMask(g, m, rp, o);
}
export const shadeEll = (g, cx, cy, rx, ry, rp, o) => shadeMask(g, ellMask(cx, cy, rx, ry), rp, o);
export const shadeRect = (g, x, y, w, h, rp, o) => shadeMask(g, maskOf(x, y, w, h, () => true), rp, o);

// ---------------- Cabeza ----------------
// Cráneo con mandíbula que se estrecha: top = fila de la coronilla, w = ancho (impar → eje en el píxel cx), h = alto, jaw = ancho del mentón respecto al de la cabeza.
export function headMask(cx, top, w, h, jaw = 0.7) {
  const hw = w / 2, rows = [];
  for (let j = 0; j < h; j++) {
    const u = (j + 0.5) / h; let r;
    if (u < 0.45) r = hw * Math.sqrt(Math.max(0, 1 - ((0.45 - u) / 0.45) ** 2.1));
    else { const q = (u - 0.45) / 0.55; r = hw * (1 - (1 - jaw) * q ** 1.55); }
    r = Math.max(r, 1.6); rows.push([Math.round(cx - r + 0.5), Math.round(cx + r - 0.5)]);
  }
  return maskOf(cx - Math.ceil(hw) - 1, top - 1, Math.ceil(hw) * 2 + 3, h + 2, (x, y) => { const j = y - top; return j >= 0 && j < h && x >= rows[j][0] && x <= rows[j][1]; });
}
export function skull(g, { cx = 24, top = 8, w = 15, h = 18, jaw = 0.7, sk, bias = 0, ears = false, earRamp }) {
  const m = headMask(cx, top, w, h, jaw);
  if (ears) { const er = earRamp || sk, ey = top + Math.round(h * 0.38); for (const s of [-1, 1]) { const x = cx + s * (Math.ceil(w / 2)); R(g, s < 0 ? x - 1 : x, ey, 2, 4, er.base); P(g, s < 0 ? x : x - 1 + 1, ey + 1, er.lo); P(g, s < 0 ? x - 1 : x + 1, ey + 3, er.mid); } }
  shadeMask(g, m, sk, { bias, ax: 0.95, ay: 0.3 }); return m;
}
// Cuello con sombra bajo la barbilla.
export function neck(g, { cx = 24, y0 = 23, y1 = 30, w = 7, sk }) {
  const x = cx - (w >> 1); shadeRect(g, x, y0, w, y1 - y0, sk, { ax: 1.1, ay: 0.1 });
  R(g, x, y0, w, 2, sk.lo); R(g, x + 1, y0 + 2, w - 2, 1, sk.mid);
}

// ---------------- Rasgos ----------------
// Cejas (par simétrico respecto al eje 24). tilt > 0: extremo interior más bajo (ceño); tilt < 0: interior más alto (triste). thick = grosor.
export function brows(g, { ey, dx = 4, ew = 3, col, tilt = 0, thick = 1, gap = 2, len }) {
  const bw = len || ew + 3;
  for (const s of [-1, 1]) for (let i = 0; i < bw; i++) {
    const inner = s < 0 ? bw - 1 - i : i; // 0 = exterior … bw-1 = interior (respecto a la cara)
    const x = s < 0 ? 24 - dx - Math.floor(bw / 2) + i : 24 + dx - Math.floor(bw / 2) + i, k = Math.round(tilt * inner / Math.max(1, bw - 1));
    for (let t = 0; t < thick; t++) P(g, x, ey - gap - 1 + k - t + (thick > 1 ? 1 : 0), col);
  }
}
// Nariz: 'small' (botón), 'long', 'hook' (aguileña), 'flat' (casi nada).
export function nose(g, { y0, len = 4, sk, style = 'small', cx = 24 }) {
  const e = y0 + len;
  if (style === 'flat') { P(g, cx, e, sk.mid); P(g, cx - 1, e, sk.lo); P(g, cx + 1, e, sk.lo); return; }
  for (let y = y0; y < e; y++) { P(g, cx + 1, y, sk.mid); P(g, cx, y, y < y0 + 2 ? sk.hi : sk.base); }
  P(g, cx - 1, y0 + 1, sk.hi);
  if (style === 'hook') { P(g, cx + 1, e, sk.lo); P(g, cx, e, sk.mid); P(g, cx + 2, e - 1, sk.lo); P(g, cx - 1, e + 1, sk.lo); P(g, cx, e + 1, sk.deep); P(g, cx + 1, e + 1, sk.deep); return; }
  if (style === 'long') { P(g, cx - 1, e, sk.mid); P(g, cx, e, sk.mid); P(g, cx + 1, e, sk.lo); P(g, cx - 1, e + 1, sk.lo); P(g, cx + 1, e + 1, sk.lo); P(g, cx, e + 1, sk.deep); return; }
  P(g, cx - 1, e, sk.mid); P(g, cx, e, sk.lo); P(g, cx + 1, e, sk.lo); P(g, cx, e + 1, sk.mid);
}
// Boca. style: line | smile | frown | open | grin | stitch | pout | none. w impar.
export function mouth(g, { y, w = 7, style = 'line', sk, col, lip, teeth = '#e6dfc9', tongue = '#5a1e1e', cx = 24 }) {
  const x0 = cx - (w >> 1), x1 = x0 + w - 1, dark = col || sk.deep, lp = lip || sk.lo;
  if (style === 'none') return;
  if (style === 'line') { R(g, x0, y, w, 1, dark); P(g, x0 - 1, y - 1, sk.mid); P(g, x1 + 1, y - 1, sk.mid); R(g, x0 + 1, y + 1, w - 2, 1, sk.mid); return; }
  if (style === 'pout') { R(g, x0 + 1, y - 1, w - 2, 1, lp); R(g, x0, y, w, 1, dark); R(g, x0 + 1, y + 1, w - 2, 2, lp); R(g, x0 + 2, y + 3, w - 4, 1, sk.mid); return; }
  if (style === 'smile' || style === 'frown') {
    const up = style === 'smile' ? -1 : 1; R(g, x0 + 1, y, w - 2, 1, dark); P(g, x0, y + up, dark); P(g, x1, y + up, dark); R(g, x0 + 2, y + 1, w - 4, 1, sk.mid); return;
  }
  if (style === 'open') { R(g, x0, y, w, 3, '#07090a'); R(g, x0, y, w, 1, teeth); R(g, x0 + 1, y + 2, w - 2, 1, tongue); R(g, x0 - 1, y - 1, w + 2, 1, lp); R(g, x0, y + 3, w, 1, lp); return; }
  if (style === 'grin') {
    R(g, x0 - 1, y - 1, w + 2, 1, dark); R(g, x0, y, w, 3, '#120606'); R(g, x0, y, w, 2, teeth); for (let x = x0 + 1; x < x1; x += 2) P(g, x, y, '#bdb59f'); R(g, x0, y + 1, w, 1, '#d6cfb8'); P(g, x0 - 2, y - 2, dark); P(g, x1 + 2, y - 2, dark); return;
  }
  if (style === 'stitch') { R(g, x0, y, w, 1, dark); for (let x = x0; x <= x1; x += 2) { P(g, x, y - 1, '#2b0a0a'); P(g, x, y + 1, '#2b0a0a'); } return; }
}
// Arrugas / ojeras / pliegues: trazos cortos con el color de sombra de la piel.
export const wrinkle = (g, x, y, len, col, dir = 'h') => { for (let i = 0; i < len; i++) P(g, dir === 'h' ? x + i : x, dir === 'h' ? y : y + i, col); };
// Ojeras bajo las cuencas (par simétrico).
export function bags(g, { ey, eh = 2, dx = 4, ew = 3, col }) { for (const s of [-1, 1]) { const x0 = Math.round(24 + s * dx - ew / 2); R(g, x0, ey + eh + 1, ew, 1, col); } }
// Rubor / mejillas.
export const cheeks = (g, y, col, dx = 6) => { R(g, 24 - dx - 1, y, 3, 2, col); R(g, 24 + dx - 1, y, 3, 2, col); };

// ---------------- Manos ----------------
const HANDS = {
  hang: ['ssshH', 'shhhH', 'hhhhH', 'hhhHd', 'hHhHd', 'h.h.d'],
  fist: ['.hhhh.', 'shhhhH', 'hhhhhH', 'hHhHhd', 'hhhhHd', '.hHHd.'],
  open: ['h.h.h.h', 'hhhhhhH', 'hhhhhhH', '.hhhhHd', '..hhHd.', '..hHd..'],
  claw: ['h.h.h', 'hhhhH', 'hhhhH', '.hHHd', '..Hd.'],
  point: ['.h...', '.h...', 'hhhhH', 'hhhhH', '.hHHd', '..Hd.']
};
export function hand(g, x, y, sk, pose = 'hang', flip = false) {
  const rows = HANDS[pose], map = { s: sk.lite, h: sk.base, H: sk.mid, d: sk.lo };
  rows.forEach((r, j) => { const n = r.length; for (let i = 0; i < n; i++) { const c = map[r[flip ? n - 1 - i : i]]; if (c) P(g, x + i, y + j, c); } });
}
// Brazo con manga: polígono de hombro a puño, con cierto grosor y un pliegue en el codo; el puño es una banda de otro color.
export function sleeve(g, { sx, sy, ex, ey, w = 6, rp, cuff, cuffH = 2, bend = 0 }) {
  const mx = (sx + ex) / 2 + bend, my = (sy + ey) / 2, h = w / 2;
  const pts = [[sx - h, sy], [sx + h, sy], [mx + h + 0.5, my], [ex + h - 0.5, ey], [ex - h + 0.5, ey], [mx - h - 0.5, my]];
  shade(g, pts, rp, { ax: 1.2, ay: 0.2 });
  const kx = Math.round(mx), ky = Math.round(my); line(g, kx - h, ky, kx + h - 1, ky + 1, rp.lo); line(g, kx - h + 1, ky + 2, kx + h - 2, ky + 2, rp.mid);
  if (cuff) { R(g, ex - h + 0.5, ey - cuffH, w, cuffH, cuff.base); R(g, ex - h + 0.5, ey - cuffH, w, 1, cuff.hi); R(g, ex - h + 0.5, ey - 1, w, 1, cuff.lo); }
}
// Trazos con el color dado, solo dentro de lo ya dibujado (pliegues, costuras, manchas).
export function strokes(g, lines, col) { g.save(); g.globalCompositeOperation = 'source-atop'; for (const [a, b, c, d] of lines) line(g, a, b, c, d, col); g.restore(); }

// Busto: hombros redondeados que bajan hasta el borde inferior. y0 = base del cuello, sw = medio ancho a la altura de los hombros, bw = medio ancho abajo. Devuelve los puntos.
export function bust(g, { y0 = 28, sw = 17, bw = 22, rp, o, cx = 24 }) {
  const pts = [[cx - 4, y0], [cx + 4, y0], [cx + sw - 4, y0 + 1], [cx + sw, y0 + 5], [cx + bw, 64], [cx - bw, 64], [cx - sw, y0 + 5], [cx - sw + 4, y0 + 1]];
  shade(g, pts, rp, o); return pts;
}
