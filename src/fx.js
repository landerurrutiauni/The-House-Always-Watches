// fx.js — efectos de pantalla: sacudida, destello, números flotantes, glitch, distorsión por Cordura, susurros, vibración,
// y aplicación de los ajustes visuales (tamaño de texto, alto contraste, reducir efectos, calidad). [capa B, escrita por A]
import { settings } from './state.js';
import { t } from './i18n.js';
import { setCharactersActive } from './sprites.js';

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
  flash(color = '#8a1c1c') { const d = document.createElement('div'); d.className = 'flash'; d.style.background = color; if (reduced()) d.style.animationDuration = '.12s'; document.body.appendChild(d); setTimeout(() => d.remove(), 350); },
  glitch(el, ms = 500) { if (reduced()) return; el = el || $('#view'); if (!el) return; el.classList.add('glitch'); setTimeout(() => el.classList.remove('glitch'), ms); },
  float(target, text, cls = '') {
    const r = target && target.getBoundingClientRect ? target.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    const s = document.createElement('span'); s.className = 'float ' + cls; s.textContent = text;
    s.style.left = Math.round(r.left + r.width / 2) + 'px'; s.style.top = Math.round(r.top + r.height / 2) + 'px';
    document.body.appendChild(s); setTimeout(() => s.remove(), 1250);
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
