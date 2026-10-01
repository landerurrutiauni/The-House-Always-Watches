// cookies.js — consentimiento para servicios OPCIONALES de terceros (banner propio). [capa B, escrita por A]
// Ahora mismo el juego NO usa ningún servicio de terceros (ni anuncios ni analítica): CONFIG.OPTIONAL_CATEGORIES está vacío y
// NO se muestra ningún banner. Si añades un servicio opcional: declara su categoría en CONFIG.OPTIONAL_CATEGORIES y cárgalo
// siempre con loadThirdParty() de privacy.js. Con categorías declaradas aparece el banner (ACEPTAR TODAS / RECHAZAR OPCIONALES /
// CONFIGURAR) y los botones «Cookies» del menú y de ajustes.
import { CONFIG } from './config.js';
import { bus } from './state.js';
import { t } from './i18n.js';

const cats = () => (CONFIG.OPTIONAL_CATEGORIES || []).map(String).filter(k => /^[a-z]+$/.test(k));
export const hasOptionalServices = () => cats().length > 0;
const DEF = () => { const o = { v: CONFIG.CONSENT_VERSION, necessary: true, decided: false, ts: 0 }; for (const k of cats()) o[k] = false; return o; };
let C = DEF(); let loaded = false;
function storage() { try { return window.localStorage; } catch (e) { return null; } }
function load() {
  if (loaded) return; loaded = true;
  try { const raw = storage() && storage().getItem(CONFIG.CONSENT_KEY); if (raw) { const o = JSON.parse(raw); if (o && o.v === CONFIG.CONSENT_VERSION) C = Object.assign(DEF(), o, { necessary: true }); } } catch (e) { /* ignorar */ }
}
export const getConsent = () => { load(); return C; };
export function setConsent(part) {
  load(); C = Object.assign(C, part, { necessary: true, decided: true, v: CONFIG.CONSENT_VERSION, ts: Date.now() });
  try { storage() && storage().setItem(CONFIG.CONSENT_KEY, JSON.stringify(C)); } catch (e) { /* ignorar */ }
  bus.emit('consent', C); closeBanner(); return C;
}
export function clearConsent() {
  load(); try { storage() && storage().removeItem(CONFIG.CONSENT_KEY); } catch (e) { /* ignorar */ }
  C = DEF(); bus.emit('consent', C); return C;
}

// ---------------- UI del banner ----------------
let root = null;
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
function closeBanner() { if (root) { root.remove(); root = null; } }
export function showBanner(mode = 'banner') {
  if (typeof document === 'undefined' || !hasOptionalServices()) return;   // sin servicios opcionales no hay nada que preguntar
  closeBanner(); load();
  root = el('div', 'cookie-layer ' + (mode === 'config' ? 'is-config' : 'is-banner'));
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', mode === 'config' ? 'true' : 'false'); root.setAttribute('aria-label', t('cookies.title'));
  const box = el('div', 'cookie-box'); root.appendChild(box);
  box.appendChild(el('h2', 'cookie-title', t('cookies.title')));
  const p = el('p', 'cookie-text', t('cookies.text') + ' '); const a = el('a', null, t('cookies.more')); a.href = 'legal/cookies.html'; a.target = '_blank'; a.rel = 'noopener'; p.appendChild(a); box.appendChild(p);
  const bar = el('div', 'cookie-btns'), mk = (cls, label, ck) => { const b = el('button', 'btn ' + cls, label); b.type = 'button'; b.dataset.ck = ck; return b; };
  if (mode === 'config') {
    const list = el('div', 'cookie-cats');
    for (const k of ['necessary', ...cats()]) {
      const locked = k === 'necessary', row = el('label', 'cookie-cat'), cb = el('input'); cb.type = 'checkbox'; cb.checked = locked ? true : !!C[k]; cb.disabled = locked; cb.dataset.cat = k; cb.id = 'ck-' + k;
      const txt = el('span', 'cookie-cat-txt'), b = el('b', null, t('cookies.' + k + '.name') + (locked ? ' · ' + t('cookies.always') : '')), s = el('small', null, t('cookies.' + k + '.desc')); txt.append(b, s);
      row.append(cb, txt); list.appendChild(row);
    }
    box.appendChild(list);
    bar.append(mk('primary', t('cookies.save'), 'save'), mk('', t('cookies.accept'), 'all'), mk('', t('cookies.reject'), 'none'));
    if (C.decided) bar.append(mk('ghost', t('ui.close'), 'close'));
  } else bar.append(mk('primary', t('cookies.accept'), 'all'), mk('', t('cookies.reject'), 'none'), mk('ghost', t('cookies.config'), 'config'));
  box.appendChild(bar);
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-ck]'); if (!b) return; const act = b.dataset.ck, all = v => Object.fromEntries(cats().map(k => [k, v]));
    if (act === 'all') setConsent(all(true)); else if (act === 'none') setConsent(all(false)); else if (act === 'config') showBanner('config'); else if (act === 'close') closeBanner();
    else if (act === 'save') setConsent(Object.fromEntries(cats().map(k => [k, !!root.querySelector('[data-cat="' + k + '"]').checked])));
    bus.emit('sfx', { name: 'click' });
  });
  document.body.appendChild(root);
  const first = root.querySelector('button'); if (first && mode === 'config') first.focus();
}
export function initCookies() { load(); if (hasOptionalServices() && !C.decided) showBanner('banner'); }
export const canOpenPreferences = () => hasOptionalServices();
export const openPreferences = () => showBanner('config');
// Escape: cierra el panel de configuración si ya hay una decisión guardada (sin decisión hay que elegir).
export function dismissConfig() { if (root && root.classList.contains('is-config') && C.decided) { closeBanner(); return true; } return false; }
export function refreshBanner() { if (root) showBanner(root.classList.contains('is-config') ? 'config' : 'banner'); }
