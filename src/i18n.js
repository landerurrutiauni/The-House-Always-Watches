// i18n.js — traducciones es/en/fr/de con cambio en caliente. [PROCESO A]
// API:
//   t(key, vars?)          → texto traducido ({var} se sustituye). Si falta la clave: inglés y, si no, la propia clave.
//   has(key)               → ¿existe la clave en el idioma activo o en inglés?
//   getLang() / setLang(l) → idioma activo (setLang carga el JSON si hace falta, emite bus 'lang' y guarda el ajuste)
//   initLang()             → async: detecta idioma (ajuste guardado → navegador → DEFAULT_LANG) y lo carga
//   onLang(fn)             → suscripción al cambio de idioma (devuelve función de baja)
//   cardName(card)         → nombre de carta (especial o "{rank} de {palo}")
//   missingKeys()          → claves pedidas que no existen (útil en DEBUG / tests)
// Fuente de datos: window.__LOCALES__ (build single-file) o fetch de ../locales/<lang>.json.
import { CONFIG } from './config.js';
import { gs, settings, bus } from './state.js';

const cache = {};          // { es:{...}, en:{...} }
const missing = new Set();
let lang = 'en';

const embedded = () => (typeof window !== 'undefined' && window.__LOCALES__) || (typeof globalThis !== 'undefined' && globalThis.__LOCALES__) || null;

export async function loadLocale(l) {
  if (cache[l]) return cache[l];
  const emb = embedded();
  if (emb && emb[l]) { cache[l] = emb[l]; return cache[l]; }
  try {
    const url = new URL('../locales/' + l + '.json', import.meta.url);
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    cache[l] = await r.json();
  } catch (e) {
    console.warn('[i18n] no se pudo cargar', l, e);
    cache[l] = {};
  }
  return cache[l];
}
// Para tests en Node: inyecta diccionarios ya cargados.
export function primeLocales(obj) { for (const k of Object.keys(obj)) cache[k] = obj[k]; }

export const getLang = () => lang;
export function detectLang() {
  if (settings.lang && CONFIG.LANGS.includes(settings.lang)) return settings.lang;
  const nav = (typeof navigator !== 'undefined' && (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language])) || [];
  for (const n of nav) { const p = String(n || '').slice(0, 2).toLowerCase(); if (CONFIG.LANGS.includes(p)) return p; }
  return CONFIG.DEFAULT_LANG;
}
export async function initLang() {
  const l = detectLang();
  await loadLocale('en');
  await setLang(l, { silent: true });
  return lang;
}
export async function setLang(l, opts = {}) {
  if (!CONFIG.LANGS.includes(l)) l = CONFIG.DEFAULT_LANG;
  await loadLocale(l);
  if (l !== 'en') await loadLocale('en');
  lang = l; settings.lang = l; gs.language = l;
  if (typeof document !== 'undefined') document.documentElement.lang = l;
  if (!opts.silent) bus.emit('lang', l);
  return l;
}
export const onLang = fn => bus.on('lang', fn);

function raw(key) {
  const a = cache[lang] && cache[lang][key];
  if (a !== undefined) return a;
  const b = cache.en && cache.en[key];
  return b;
}
export const has = key => raw(key) !== undefined;
export function t(key, vars) {
  let s = raw(key);
  if (s === undefined) { missing.add(key); return key; }
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
  return s;
}
export const missingKeys = () => [...missing];
export const rankName = r => (r === 1 || r >= 11 ? t('rank.' + r) : String(r));   // As, Jota, Reina, Rey (o el número)
export function cardName(c) {
  if (!c) return '';
  if (c.sp) return t('card.' + c.id + '.name');
  return t('card.base', { rank: rankName(c.rank), suit: t('suit.' + c.suit) });
}
