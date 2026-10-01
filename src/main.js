// main.js — arranque: ajustes → idioma → audio → cookies → menú; enrutado de vistas, HUD, música dinámica, teclado. [capa B, escrita por A]
import { CONFIG } from './config.js';
import { gs, bus, settings, sanityTier } from './state.js';
import { loadSettings, saveSettings } from './save.js';
import { initLang, t, getLang } from './i18n.js';
import * as G from './game.js';
import { audioManager as audio } from './audio.js';
import { fx } from './fx.js';
import { initCookies, refreshBanner, dismissConfig } from './cookies.js';
import { toggleFullscreen, onFullscreenChange } from './fullscreen.js';
import { $, installActions, renderHud, setBackground, toast, act, openInventory, closeTopModal, hasModal, syncFullscreenButtons } from './ui.js';
import { register as regMenu } from './screens/menu.js';
import { register as regRun } from './screens/run.js';
import { register as regTable } from './screens/table.js';
import { register as regDuel } from './screens/duel.js';
import { initDebug } from './debug.js';
import * as COMBAT from './combat.js';
import * as SHOT from './shotgun.js';
import * as STATE from './state.js';

const SCREENS = {}; regMenu(SCREENS); regRun(SCREENS); regTable(SCREENS); regDuel(SCREENS);
let prevType = null, current = null;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function intensityFor(v) {
  if (v.type === 'round') { const R = v.R, total = R.mods.plays; return clamp(0.25 + 0.75 * Math.max(R.score / R.target, 1 - R.playsLeft / total) * (v.kind === 'game' ? 0.9 : 1), 0.2, 1); }
  if (v.type === 'duel') { const D = v.D; return clamp(0.4 + 0.6 * (1 - Math.min(D.marks.p / D.maxMarks.p, D.marks.f / D.maxMarks.f)), 0.4, 1); }
  return v.type === 'boss_intro' || v.type === 'finale' ? 0.7 : 0.3;
}
function render(v) {
  const S = SCREENS[v.type];
  if (!S) { console.error('[main] vista sin pantalla:', v.type); return; }
  setBackground(S.bgFrom ? S.bgFrom(v) : S.bg);
  renderHud(S.hud ? v.hud : null);
  const same = prevType === v.type && S.sameKeep;
  const el = S.render(v);
  if (same) el.classList.add('same');
  const view = $('#view'); view.replaceChildren(el); if (!same) view.scrollTop = 0;
  current = { S, el, v }; prevType = v.type;
  if (v.hud) fx.setTier(v.hud.tier);
  if (v.music) audio.playMusic(v.music);
  audio.setIntensity(intensityFor(v));
  document.body.dataset.view = v.type;
}
function isTypingTarget(el) { const n = (el.tagName || '').toLowerCase(); return n === 'input' || n === 'textarea' || n === 'select'; }

async function boot() {
  loadSettings(); fx.applyDisplay();
  await initLang();
  installActions(); audio.installListeners(); audio.applySettings(settings); audio.bindGame(bus, gs);
  act.inventory = () => openInventory();
  act.fullscreen = () => toggleFullscreen();
  onFullscreenChange(syncFullscreenButtons);
  bus.on('view', render);
  bus.on('lang', () => { const v = G.getView(); if (v) render(v); refreshBanner(); });
  bus.on('toast', e => toast(t(e.key, e.vars), e.kind));
  bus.on('memory', e => toast(t('ui.memory_new', { name: t('mem.' + e.id + '.name') }), 'memory'));
  bus.on('stats', () => { if (!$('#hud').hidden) renderHud(G.hud()); fx.setTier(sanityTier()); });
  window.addEventListener('keydown', e => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Escape') { if (dismissConfig() || closeTopModal()) e.preventDefault(); return; }
    if (hasModal() || isTypingTarget(e.target)) return;
    const v = G.getView(); if (!v || !current) return; const el = current.el, k = e.key.toLowerCase();
    if (v.type === 'event' && v.phase === 'choose' && el._key) { const map = { a: 'b', arrowleft: 'b', d: 'a', arrowright: 'a', h: 'h' }; if (map[k]) { e.preventDefault(); el._key(map[k]); return; } }
    if (el._keys && el._keys(e)) { e.preventDefault(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && !['button', 'a'].includes((e.target.tagName || '').toLowerCase())) { const p = $('#view [data-primary]:not([disabled])'); if (p) { e.preventDefault(); p.click(); } }
  });
  initCookies();
  initDebug();
  G.toMenu();
  window.__HOUSE = { version: CONFIG.VERSION, getView: G.getView, lang: getLang };
  // Solo para pruebas automáticas: index.html?test expone los módulos (no altera nada por sí mismo)
  if (/[?&]test(=1)?(&|$)/.test(location.search)) window.__HOUSE_TEST = { G, C: COMBAT, S: SHOT, st: STATE };
  document.body.dataset.ready = '1';
}
boot().catch(e => { console.error('[boot]', e); document.body.dataset.error = String(e && e.message || e); });
