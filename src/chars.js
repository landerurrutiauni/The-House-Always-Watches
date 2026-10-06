// chars.js — personajes pixel art (48×64): dibujo procedural por personaje, iluminación por regiones, ojos que siguen al cursor y parpadean, respiración.
import { PAL, hex, mix, mk, R, P, BAYER } from './pixel.js';
import { CHARS } from './chars-art.js';

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
// ---------------- Volumen: iluminación por regiones ----------------
// Pasada común a todos los personajes. Cada mancha de color plano (región de píxeles contiguos del mismo color) recibe luz desde arriba a la izquierda:
// un reborde claro en sus lados superior e izquierdo, uno oscuro en el inferior y derecho, y un degradado con trama ordenada por dentro.
// Así las figuras dejan de ser siluetas planas y tienen volumen sin perder el aspecto de píxel. (Las regiones diminutas y las líneas de 1 px no se tocan.)
const lumOf = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const toward = (c, t, k) => [c[0] + (t[0] - c[0]) * k, c[1] + (t[1] - c[1]) * k, c[2] + (t[2] - c[2]) * k];
function relight(c, g, { rim = 0.22, grad = 0.2, minGrad = 46 } = {}) {
  const W = c.width, H = c.height, im = g.getImageData(0, 0, W, H), d = im.data, out = new Uint8ClampedArray(d);
  const colorAt = (x, y) => { const i = (y * W + x) * 4; return d[i + 3] > 200 ? (d[i] << 16) | (d[i + 1] << 8) | d[i + 2] : -1; };
  const lab = new Int32Array(W * H).fill(-1), regs = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = colorAt(x, y); if (k < 0 || lab[y * W + x] >= 0) continue;
    const id = regs.length, st = [x, y], px = []; lab[y * W + x] = id;
    while (st.length) { const cy = st.pop(), cx = st.pop(); px.push(cx, cy); for (let n = 0; n < 4; n++) { const nx = cx + (n === 0) - (n === 1), ny = cy + (n === 2) - (n === 3); if (nx < 0 || ny < 0 || nx >= W || ny >= H || lab[ny * W + nx] >= 0 || colorAt(nx, ny) !== k) continue; lab[ny * W + nx] = id; st.push(nx, ny); } }
    let x0 = W, x1 = 0, y0 = H, y1 = 0; for (let i = 0; i < px.length; i += 2) { x0 = Math.min(x0, px[i]); x1 = Math.max(x1, px[i]); y0 = Math.min(y0, px[i + 1]); y1 = Math.max(y1, px[i + 1]); }
    regs.push({ k, px, n: px.length / 2, x0, x1, y0, y1 });
  }
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? -2 : lab[y * W + x]);
  const WARM = [255, 236, 200], COOL = [14, 10, 26];
  for (let id = 0; id < regs.length; id++) {
    const r = regs[id]; if (r.n < 7) continue;
    const base = [(r.k >> 16) & 255, (r.k >> 8) & 255, r.k & 255], L = lumOf(...base), dark = L < 38;
    const hi = toward(base, dark ? [96, 104, 132] : WARM, dark ? rim * 1.5 : rim), lo = toward(base, COOL, rim * 1.1);
    const gh = toward(base, dark ? [70, 76, 100] : WARM, grad * (dark ? 1.4 : 1)), gl = toward(base, COOL, grad);
    const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2, rx = Math.max(2, (r.x1 - r.x0) / 2), ry = Math.max(2, (r.y1 - r.y0) / 2), big = r.n >= minGrad;
    for (let i = 0; i < r.px.length; i += 2) {
      const x = r.px[i], y = r.px[i + 1], o = (y * W + x) * 4; let col = null;
      const up = at(x, y - 1) !== id, left = at(x - 1, y) !== id, down = at(x, y + 1) !== id, right = at(x + 1, y) !== id;
      if ((up || left) && !(down || right)) col = hi; else if ((down || right) && !(up || left)) col = lo;
      else if (big) {   // interior: de la luz (arriba-izquierda) a la sombra (abajo-derecha), con trama
        const t = 0.5 + 0.5 * (((x - cx) / rx) * 0.62 + ((y - cy) / ry) * 0.38), th = BAYER[(y & 3) * 4 + (x & 3)] / 16;
        if (t < 0.34 && th > t * 2.2) col = gh; else if (t > 0.66 && th < (t - 0.66) * 2.6) col = gl;
      }
      if (col) { out[o] = col[0]; out[o + 1] = col[1]; out[o + 2] = col[2]; }
    }
  }
  im.data.set(out); g.putImageData(im, 0, 0);
}

const _bodyCache = {};
function bodyURL(id) {
  if (_bodyCache[id]) return _bodyCache[id];
  const spec = CHARS[id] || CHARS.dealer, [c, g] = mk(48, 64); spec.draw(g); if (!spec.lit) relight(c, g);   // lit: el dibujo ya trae su propio sombreado
  // cuencas donde irán los ojos: la piel de alrededor muy oscurecida (en vez de un marco negro igual para todos, que hacía parecer máscaras las caras)
  const e = spec.eye; for (const s of [-1, 1]) {
    if ((s < 0 && e.skipL) || (s > 0 && e.skipR)) continue;
    const x0 = Math.round(24 + s * e.dx - e.w / 2), pad = e.pad === undefined ? 1 : e.pad, col = socketColor(g, x0 + (e.w >> 1), e, spec);
    // cuenca en cruz (sin las esquinas): se ve como un párpado hundido, no como un recuadro
    R(g, x0, e.y - pad, e.w, e.h + 2 * pad, col); R(g, x0 - pad, e.y, e.w + 2 * pad, e.h, col);
  }
  finish(c, g); return (_bodyCache[id] = c.toDataURL());
}
function socketColor(g, x, e, spec) {
  if (spec.socket) return spec.socket;
  if (e.kind === 'pit' || e.kind === 'glow') return PAL.k1;
  for (const y of [e.y + e.h + 1, e.y - 2]) {
    const d = g.getImageData(x, y, 1, 1).data;
    if (d[3] > 200) return mix('#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join(''), '#060404', 0.64);
  }
  return PAL.k1;
}
function drawEyes(cv, spec, st) {
  const g = cv.getContext('2d'); g.clearRect(0, 0, 48, 64);
  for (const s of [-1, 1]) {
    if ((s < 0 && spec.skipL) || (s > 0 && spec.skipR)) continue;
    const x0 = Math.round(24 + s * spec.dx - spec.w / 2), y = spec.y, w = spec.w, h = spec.h;
    if (st.blink) { R(g, x0, y + Math.floor(h / 2), w, 1, PAL.k0); continue; }
    R(g, x0, y, w, h, spec.kind === 'pit' ? PAL.k0 : spec.kind === 'glow' ? PAL.t4 : (spec.white || PAL.w3));
    if (spec.kind === 'glow') continue;
    const pw = spec.kind === 'pit' ? 1 : 2, ph = Math.min(spec.kind === 'pit' ? 1 : 2, h);
    const px = Math.max(x0, Math.min(x0 + w - pw, x0 + Math.round((w - pw) / 2) + st.lx)), py = Math.max(y, Math.min(y + h - ph, y + Math.round((h - ph) / 2) + st.ly));
    R(g, px, py, pw, ph, spec.kind === 'pit' ? PAL.w2 : (spec.iris || PAL.k0));
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

