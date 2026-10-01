// save.js — persistencia local (localStorage con reserva en memoria). [PROCESO A]
// La partida se guarda SOLO en puntos seguros (mapa, fin de nodo, muerte, final) para que recargar
// no permita repetir tiradas: el RNG sale de gs.run.seed + gs.run.step y el nodo en curso queda en run.pending.
import { CONFIG } from './config.js';
import { gs, settings, replaceState, defaultSettings } from './state.js';
import { hashStr } from './rng.js';

let _store = null;
function store() {
  if (_store) return _store;
  try {
    const s = window.localStorage; s.setItem('__thaw', '1'); s.removeItem('__thaw'); _store = s;
  } catch (e) {
    const m = new Map();
    _store = { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); }, memory: true };
  }
  return _store;
}
export const storageIsPersistent = () => !store().memory;

const sum = str => hashStr(str).toString(36);

export function hasSave() {
  try { return !!store().getItem(CONFIG.SAVE_KEY); } catch (e) { return false; }
}

export function saveGame() {
  try {
    const data = JSON.stringify(gs);
    store().setItem(CONFIG.SAVE_KEY, JSON.stringify({ v: 1, t: Date.now(), sum: sum(data), data }));
    return true;
  } catch (e) { console.warn('[save] no se pudo guardar', e); return false; }
}

// Devuelve true si se cargó una partida válida.
export function loadGame() {
  try {
    const raw = store().getItem(CONFIG.SAVE_KEY);
    if (!raw) return false;
    const env = JSON.parse(raw);
    if (!env || typeof env.data !== 'string') return false;
    if (env.sum !== sum(env.data)) { console.warn('[save] checksum incorrecto: se ignora la partida'); return false; }
    const data = JSON.parse(env.data);
    if (!data || typeof data !== 'object' || !data.player) return false;
    replaceState(data);
    return true;
  } catch (e) { console.warn('[save] partida ilegible', e); return false; }
}

// REINICIAR PROGRESO: borra la partida (los ajustes y el consentimiento se conservan).
export function resetProgress() {
  try { store().removeItem(CONFIG.SAVE_KEY); } catch (e) { /* nada */ }
  replaceState(null);
}
export function lastSaveTime() {
  try { const e = JSON.parse(store().getItem(CONFIG.SAVE_KEY) || 'null'); return e ? e.t : 0; } catch (e) { return 0; }
}

// ---------------- Ajustes ----------------
export function loadSettings() {
  try {
    const raw = store().getItem(CONFIG.SETTINGS_KEY);
    if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') Object.assign(settings, defaultSettings(), o); }
  } catch (e) { /* ajustes corruptos → valores por defecto */ }
  return settings;
}
export function saveSettings() {
  try { store().setItem(CONFIG.SETTINGS_KEY, JSON.stringify(settings)); return true; } catch (e) { return false; }
}
