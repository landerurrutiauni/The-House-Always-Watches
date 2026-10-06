// i18n.js — traducciones es/en/fr/de con cambio en caliente. [PROCESO A]
// API:
//   t(key, vars?)          → texto traducido ({var} se sustituye). Si falta la clave: inglés y, si no, la propia clave.
//   has(key)               → ¿existe la clave en el idioma activo o en inglés?
//   getLang() / setLang(l) → idioma activo (setLang carga el JSON si hace falta, emite bus 'lang' y guarda el ajuste)
//   initLang()             → async: detecta idioma (ajuste guardado → navegador → DEFAULT_LANG) y lo carga
//   onLang(fn)             → suscripción al cambio de idioma (devuelve función de baja)
//   takeLoadNotice()       → aviso pendiente si el idioma elegido no se pudo cargar en el arranque (main.js lo muestra una vez)
//   cardName(card)         → nombre de carta (especial o "{rank} de {palo}")
//   missingKeys()          → claves pedidas que no existen (útil en DEBUG / tests)
//   usedKeys()             → todas las claves pedidas hasta ahora (cobertura en tests)
// Fuente de datos (por este orden): inglés = módulo ../locales/en.js importado de forma estática (SIEMPRE disponible, es el idioma de reserva de todos);
// build de un solo archivo = window.__LOCALES__; resto de idiomas = import() de ../locales/<l>.js y, si falla, fetch de ../locales/<l>.json.
// Cada carga se reintenta (3 intentos con espera) y un fallo NUNCA se guarda como «idioma vacío»: se vuelve a intentar la próxima vez que se pida
// y, mientras tanto, se usa el inglés con un aviso. Así no puede salir el nombre de una clave por un fallo de red puntual.
import EN from '../locales/en.js';
import { CONFIG } from './config.js';
import { gs, settings, bus } from './state.js';

const cache = { en: EN };  // { es:{...}, en:{...} }
const missing = new Set(), used = new Set(), failed = {}, pending = {};
let lang = 'en';

const embedded = () => (typeof window !== 'undefined' && window.__LOCALES__) || (typeof globalThis !== 'undefined' && globalThis.__LOCALES__) || null;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const isDict = d => !!d && typeof d === 'object' && Object.keys(d).length > 50;   // un idioma de verdad tiene cientos de claves: algo vacío o raro es un fallo de carga

// Un intento: primero como módulo, después como JSON. Devuelve el diccionario o lanza el último error.
async function fetchLocale(l, attempt) {
  // ?v= invalida cachés de versiones anteriores; &r= en los reintentos evita que el navegador recuerde el fallo del import() anterior
  const q = '?v=' + encodeURIComponent(CONFIG.VERSION) + (attempt ? '&r=' + attempt : '');
  let err = null;
  try { const m = await import(/* @vite-ignore */ new URL('../locales/' + l + '.js', import.meta.url).href + q); if (isDict(m && m.default)) return m.default; err = new Error('módulo vacío'); } catch (e) { err = e; }
  try {
    const r = await fetch(new URL('../locales/' + l + '.json', import.meta.url).href + q, attempt ? { cache: 'reload' } : undefined);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json(); if (isDict(d)) return d; err = new Error('JSON vacío');
  } catch (e) { err = e; }
  throw err;
}
export async function loadLocale(l) {
  if (cache[l]) return cache[l];
  const emb = embedded();
  if (emb && isDict(emb[l])) { cache[l] = emb[l]; return cache[l]; }
  if (!pending[l]) {
    pending[l] = (async () => {
      let last = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt) await sleep(attempt === 1 ? 250 : 900);
        try { return await fetchLocale(l, attempt); } catch (e) { last = e; failed[l] = (failed[l] || 0) + 1; }
      }
      console.warn('[i18n] no se pudo cargar', l, last); return null;
    })().then(d => { if (d) { cache[l] = d; delete failed[l]; } return d; }).finally(() => { delete pending[l]; });
  }
  return pending[l];   // null si no se pudo: NO se guarda nada, se volverá a intentar
}
// Para tests en Node: inyecta diccionarios ya cargados.
export function primeLocales(obj) { for (const k of Object.keys(obj)) cache[k] = obj[k]; }
export const localeState = () => ({ lang, loaded: Object.keys(cache), failed: Object.assign({}, failed) });

export const getLang = () => lang;
export function detectLang() {
  if (settings.lang && CONFIG.LANGS.includes(settings.lang)) return settings.lang;
  const nav = (typeof navigator !== 'undefined' && (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language])) || [];
  for (const n of nav) { const p = String(n || '').slice(0, 2).toLowerCase(); if (CONFIG.LANGS.includes(p)) return p; }
  return CONFIG.DEFAULT_LANG;
}
export async function initLang() {
  const l = detectLang();
  await setLang(l, { silent: true });
  return lang;
}
// Cambia de idioma. `settings.lang` guarda lo que la persona ELIGIÓ; `lang` es el idioma que de verdad se muestra: si el archivo del idioma
// elegido no se puede cargar (red caída, navegador que bloquea archivos locales…), se muestra inglés, se avisa, y se reintentará la próxima vez.
export async function setLang(l, opts = {}) {
  if (!CONFIG.LANGS.includes(l)) l = CONFIG.DEFAULT_LANG;
  const dict = await loadLocale(l);
  const shown = dict ? l : 'en';
  lang = shown; settings.lang = l; gs.language = shown;
  if (typeof document !== 'undefined') document.documentElement.lang = shown;
  if (!dict) {
    const n = { key: 'i18n.load_error', vars: { lang: CONFIG.LANG_NAMES[l] || l }, kind: 'bad' };
    if (opts.silent) notice = n; else bus.emit('toast', n);   // en el arranque aún no hay quien escuche los avisos: main.js lo recoge con takeLoadNotice()
  }
  if (!opts.silent) bus.emit('lang', shown);
  return shown;
}
let notice = null;
export const takeLoadNotice = () => { const n = notice; notice = null; return n; };
export const onLang = fn => bus.on('lang', fn);

function raw(key) {
  const a = cache[lang] && cache[lang][key];
  if (a !== undefined) return a;
  const b = cache.en && cache.en[key];
  return b;
}
export const has = key => raw(key) !== undefined;
export function t(key, vars) {
  let s = raw(key); used.add(key);
  if (s === undefined) { missing.add(key); return key; }
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
  return s;
}
export const missingKeys = () => [...missing];
export const usedKeys = () => [...used];        // para las pruebas: qué claves se han pedido (cobertura del auditor de idiomas)
export const rankName = r => (r === 1 || r >= 11 ? t('rank.' + r) : String(r));   // As, Jota, Reina, Rey (o el número)
export function cardName(c) {
  if (!c) return '';
  if (c.sp) return t('card.' + c.id + '.name');
  return t('card.base', { rank: rankName(c.rank), suit: t('suit.' + c.suit) });
}
