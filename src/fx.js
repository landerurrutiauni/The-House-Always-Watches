// fx.js — efectos de pantalla: sacudida, destello, números flotantes, glitch, distorsión por Cordura, susurros, vibración,
// y aplicación de los ajustes visuales (tamaño de texto, alto contraste, reducir efectos, calidad). [capa B, escrita por A]
import { settings } from './state.js';
import { t } from './i18n.js';
import { setCharactersActive } from './sprites.js';
import { toStage, STAGE } from './stage.js';
const floatSlots = new WeakMap();

const reduced = () => !!settings.reduceEffects;
const $ = s => document.querySelector(s);
let tier = 0, whisperTimer = null, whisperOn = false;

export const fx = {
  applyDisplay() {
    const b = document.body, d = document.documentElement;
    d.style.setProperty('--ts', String(settings.textSize || 1));
    b.classList.toggle('hc', !!settings.contrast); b.classList.toggle('reduce', !!settings.reduceEffects);
    for (const q of ['high', 'medium', 'low']) b.classList.toggle('q-' + q, settings.quality === q);
    setCharactersActive(!settings.reduceEffects && settings.quality !== 'low');
    fx.setTier(tier, true);
  },
  shake() { if (reduced()) return; const a = $('#view'); if (!a) return; a.classList.remove('shake'); void a.offsetWidth; a.classList.add('shake'); setTimeout(() => a.classList.remove('shake'), 400); },
  // Destello de pantalla. Con «reducir efectos» no se muestra (accesibilidad: sin destellos). `a` = opacidad inicial.
  flash(color = '#8a1c1c', a = 0.6) { if (reduced()) return; const d = document.createElement('div'); d.className = 'flash'; d.style.background = color; d.style.setProperty('--fa', String(a)); document.body.appendChild(d); setTimeout(() => d.remove(), 350); },
  glitch(el, ms = 500) { if (reduced()) return; el = el || $('#view'); if (!el) return; el.classList.add('glitch'); setTimeout(() => el.classList.remove('glitch'), ms); },
  float(target, text, cls = '') {
    const r = target && target.getBoundingClientRect ? target.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    const [x, y0] = toStage(r.left + r.width / 2, r.top + r.height / 2), now = performance.now();
    // varios números sobre el mismo elemento en poco tiempo: cada uno sube un escalón para no taparse
    const prev = floatSlots.get(target), n = prev && now - prev.t < 700 ? Math.min(prev.n + 1, 4) : 0; if (target && target.getBoundingClientRect) floatSlots.set(target, { t: now, n });
    const s = document.createElement('span'); s.className = 'float ' + cls; s.textContent = text;
    s.style.left = Math.round(x) + 'px'; s.style.top = Math.round(y0 - n * 26) + 'px';
    (document.getElementById('stage') || document.body).appendChild(s); setTimeout(() => s.remove(), 1250);
  },
  // Texto grande de jugada potente / combo (decorativo). tier 1..3.
  banner(text, tier = 1) {
    // Los banners se apilan en una columna central: si dos coinciden, uno queda encima del otro (máx. 3 visibles)
    const box = document.getElementById('banners') || document.body;
    const b = document.createElement('div'); b.className = 'fxbanner t' + tier; b.textContent = text; b.setAttribute('aria-hidden', 'true'); box.appendChild(b);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => b.remove(), 1450); return b;
  },
  // Brasas que suben desde un elemento (jugadas muy potentes).
  embers(target, n = 14) {
    if (reduced() || typeof document === 'undefined') return;
    const r = target && target.getBoundingClientRect ? target.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    const [bx, by] = toStage(r.left, r.top), k = STAGE.k || 1;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span'); s.className = 'ember'; s.style.left = Math.round(bx + Math.random() * r.width / k) + 'px'; s.style.top = Math.round(by + r.height / k * (0.4 + Math.random() * 0.5)) + 'px';
      s.style.setProperty('--dx', Math.round(Math.random() * 120 - 60) + 'px'); s.style.setProperty('--dy', Math.round(-(60 + Math.random() * 140)) + 'px'); s.style.animationDelay = (Math.random() * 0.25).toFixed(2) + 's';
      (document.getElementById('stage') || document.body).appendChild(s); setTimeout(() => s.remove(), 1700);
    }
  },
  vibrate(p = 40) { try { if (settings.vibration && navigator.vibrate) navigator.vibrate(p); } catch (e) { /* no soportado */ } },
  setTier(n, force) {
    if (n === tier && !force) return; tier = n;
    const b = document.body; for (let i = 0; i <= 4; i++) b.classList.toggle('tier-' + i, i === n);
    fx.whispers(n >= 2);
  },
  get tier() { return tier; },
  // Susurros: textos tenues que aparecen a Cordura baja (puramente decorativos, aria-hidden)
  whispers(on) {
    whisperOn = on; clearTimeout(whisperTimer); whisperTimer = null;
    if (!on || typeof document === 'undefined') return;
    const go = () => {
      if (!whisperOn) return;
      if (!reduced() && !document.hidden) {
        const w = document.createElement('div'); w.className = 'whisper'; w.textContent = t('whisper.' + (1 + Math.floor(Math.random() * 8)));
        w.style.left = Math.round(Math.random() * 55 + 4) + '%'; w.style.top = Math.round(Math.random() * 70 + 12) + '%'; w.style.fontSize = (0.9 + Math.random() * 0.9) + 'em';
        $('#whispers').appendChild(w); setTimeout(() => w.remove(), 5200);
      }
      whisperTimer = setTimeout(go, 9000 + Math.random() * 14000);
    };
    whisperTimer = setTimeout(go, 3500 + Math.random() * 4000);
  },
  // Texto que se "corrompe" un poco con la Cordura baja (se mantiene legible)
  corrupt(str, n = tier) {
    if (n < 3 || reduced()) return str;
    const p = n === 3 ? 0.012 : 0.03, sub = { a: 'ã', e: 'ë', o: 'ø', i: 'ï', u: 'ü', s: 'ƨ', t: '†' };
    return [...str].map((c, i) => (Math.random() < p && sub[c] ? sub[c] : c)).join('');
  }
};
