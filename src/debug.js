// debug.js — modo depuración OCULTO. Se activa con ?debug (o #debug), escribiendo "debug" en cualquier momento,
// o pulsando 7 veces seguidas la versión del menú. Expone window.HOUSE_DEBUG y un panel flotante. [capa B, escrita por A]
import { CONFIG } from './config.js';
import { gs, settings, addMoney, bus } from './state.js';
import * as G from './game.js';
import * as FX from './effects.js';
import { setLang, t } from './i18n.js';
import { clearConsent, showBanner } from './cookies.js';
import { audioManager as audio } from './audio.js';
import { saveSettings, saveGame } from './save.js';
import { EVENTS, CHARACTERS, ENDING_ORDER, ITEMS } from './content.js';
import { SPECIAL_IDS } from './cards.js';
import { h, $, toast } from './ui.js';
import { fx } from './fx.js';

let enabled = false, panel = null;
const refresh = () => { if (G.getView()) bus.emit('stats', {}); };
export const api = {
  addMoney: (n = 100) => { addMoney(+n); return gs.player.money; },
  addCard: (id = 'la_mujer') => { if (!SPECIAL_IDS.includes(id) && !/^(blood|eye|tooth|key)_\d+$/.test(id)) return null; const c = FX.addToDeck(id); return c.uid; },
  addItem: (id = 'llave_hueso') => { if (!ITEMS.includes(id)) return false; if (!gs.inventory.includes(id)) gs.inventory.push(id); refresh(); return true; },
  setSanity: n => { const p = gs.player; p.sanity = Math.max(0, Math.min(100, +n)); refresh(); return p.sanity; },
  setDebt: n => { gs.player.debt = Math.max(0, +n); refresh(); return gs.player.debt; },
  setDestiny: n => { gs.destiny = Math.max(-10, Math.min(10, +n)); return gs.destiny; },
  unlockCharacter: id => { if (!CHARACTERS.includes(id)) return false; if (!gs.discoveredCharacters.includes(id)) gs.discoveredCharacters.push(id); saveGame(); return true; },
  unlockEnding: id => { if (!ENDING_ORDER.includes(id)) return false; if (!gs.meta.endings.includes(id)) gs.meta.endings.push(id); saveGame(); return true; },
  triggerEvent: id => { if (!EVENTS[id]) return false; G.debugEvent(id); return true; },
  killPlayer: () => { gs.player.health = 0; gs.pendingDeath = true; G.checkDeath(); return true; },
  setLanguage: async l => { await setLang(l); saveSettings(); return l; },
  clearCookieConsent: () => { clearConsent(); showBanner('banner'); return true; },
  toggleMusic: () => { settings.muteMusic = !settings.muteMusic; saveSettings(); audio.applySettings(settings); return !settings.muteMusic; }
};
const FIELDS = { addMoney: '100', addCard: 'la_mujer', addItem: 'llave_hueso', setSanity: '50', setDebt: '200', setDestiny: '5', unlockCharacter: 'girl', unlockEnding: 'puerta', triggerEvent: 'first_chip', setLanguage: 'en' };

function buildPanel() {
  if (panel) { panel.remove(); panel = null; return; }
  const rows = Object.keys(api).map(name => {
    const hasArg = name in FIELDS, inp = hasArg ? h('input', { type: 'text', value: FIELDS[name], 'aria-label': name, style: 'width:7.5em;background:#000;color:#d6c8a8;border:2px solid #4d4540;font:inherit' }) : null;
    const b = h('button', { type: 'button', class: 'btn small', onclick: async () => { try { const r = await api[name](inp ? inp.value : undefined); toast(name + ' → ' + JSON.stringify(r === undefined ? true : r), 'info'); } catch (e) { toast(name + ': ' + e.message, 'bad'); } } }, name);
    return h('div', { class: 'row' }, b, inp);
  });
  panel = h('div', { id: 'debug', class: 'panel' }, h('div', { class: 'row' }, h('b', null, t('debug.title')), h('button', { class: 'btn small', type: 'button', onclick: () => buildPanel() }, '✕')), ...rows);
  document.body.appendChild(panel);
}
export function enableDebug() { if (enabled) return; enabled = true; window.HOUSE_DEBUG = api; buildPanel(); }
export function initDebug() {
  if (/[?&]debug(=1|=true)?(&|$)/.test(location.search) || location.hash === '#debug' || CONFIG.DEBUG) enableDebug();
  let buf = ''; window.addEventListener('keydown', e => { if (e.target && /input|textarea/i.test(e.target.tagName)) return; buf = (buf + (e.key || '')).slice(-5).toLowerCase(); if (buf === 'debug') { if (!enabled) enableDebug(); else buildPanel(); buf = ''; } });
  let taps = 0, tm = null; document.addEventListener('click', e => { if (e.target.closest && e.target.closest('.ver')) { taps++; clearTimeout(tm); tm = setTimeout(() => { taps = 0; }, 1500); if (taps >= 7) { taps = 0; enableDebug(); } } });
}
