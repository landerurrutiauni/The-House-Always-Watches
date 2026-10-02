// ui.js — utilidades de interfaz: DOM, acciones por delegación, HUD, cartas, modales, toasts, máquina de escribir. [capa B, escrita por A]
import { t, cardName } from './i18n.js';
import { gs, bus, settings } from './state.js';
import { iconURL, cardURL, cardBackURL, sigilURL, backgroundCanvas, pixelText, jokerURL, PAL } from './sprites.js';
import { JOKERS, jokerSellPrice } from './jokers.js';
import { HANDS, HAND_ORDER } from './cards.js';
import { ITEMS, TOOLS } from './content.js';
import { fx } from './fx.js';
import { fsSupported, isFullscreen } from './fullscreen.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v; else if (k === 'style') el.style.cssText = v; else if (k === 'html') el.innerHTML = v;
    else if (k === 'data') Object.assign(el.dataset, v); else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) { if (c == null || c === false) continue; el.append(c.nodeType ? c : document.createTextNode(String(c))); }
  return el;
}
export const ico = (name, cls = '', color) => h('img', { class: 'ico ' + cls, src: iconURL(name, 2, color || PAL.t3), alt: '', 'aria-hidden': 'true', draggable: 'false' });
export const sigil = (id, cls = '', color) => h('img', { class: 'ico ' + cls, src: sigilURL(id, 2, color || PAL.t3), alt: '', 'aria-hidden': 'true' });
export const fill = (el, ...kids) => { el.replaceChildren(...kids.flat(Infinity).filter(k => k != null && k !== false)); return el; };
export const sc = (big, small) => (window.innerWidth < 500 || window.innerHeight < 780 ? small : (window.innerWidth >= 1500 && window.innerHeight >= 980 ? big + 1 : big));
export const announce = txt => { const l = $('#live'); if (l) l.textContent = txt; };

// ---------- Acciones (data-act) ----------
export const act = {};
export function btn(label, actName, arg, cls = '', extra = {}) {
  return h('button', Object.assign({ type: 'button', class: 'btn ' + cls, 'data-act': actName, 'data-arg': arg == null ? null : String(arg) }, extra), label);
}
export function installActions() {
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    const fn = act[el.dataset.act]; if (!fn) { console.warn('[ui] acción sin handler:', el.dataset.act); return; }
    bus.emit('sfx', { name: 'click' });
    fn(el.dataset.arg, el, e);
  });
}

// ---------- Fondo ----------
const bgCache = new Map(); let bgKind = 'casino', bgKey = '';
export function setBackground(kind) {
  if (kind) bgKind = kind;
  const vw = window.innerWidth || 800, vh = window.innerHeight || 600, S = Math.max(3, Math.min(6, Math.round(Math.min(vw, vh) / 130)));
  const w = Math.ceil(vw / S), hh = Math.ceil(vh / S), key = bgKind + ':' + w + 'x' + hh; if (key === bgKey) return; bgKey = key;
  let c = bgCache.get(key); if (!c) { c = backgroundCanvas(bgKind, w, hh, 7); if (bgCache.size > 9) bgCache.delete(bgCache.keys().next().value); bgCache.set(key, c); }
  $('#bg').replaceChildren(c);
}
let rz = null; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => setBackground(), 250); });

// ---------- Toasts / modales ----------
export function toast(text, kind = 'info') {
  const d = h('div', { class: 'toast ' + kind }, text); $('#toasts').appendChild(d); announce(text);
  setTimeout(() => d.remove(), 3500);
}
let modalStack = [];
export function modal(content, { title, onClose, cls = '' } = {}) {
  const back = h('div', { class: 'modal-back', role: 'dialog', 'aria-modal': 'true', 'aria-label': title || '' });
  const close = () => { back.remove(); modalStack = modalStack.filter(m => m !== api); if (onClose) onClose(); };
  const box = h('div', { class: 'modal panel ' + cls }, h('div', { class: 'mhead' }, h('h2', null, title || ''), h('button', { class: 'btn small', type: 'button', 'aria-label': t('ui.close'), onclick: close }, '✕')), content);
  back.appendChild(box); back.addEventListener('mousedown', e => { if (e.target === back) close(); });
  $('#modal-root').appendChild(back); const api = { close, el: back }; modalStack.push(api);
  const f = box.querySelector('button, input, [tabindex]'); if (f) f.focus();
  return api;
}
export const closeTopModal = () => { const m = modalStack[modalStack.length - 1]; if (m) { m.close(); return true; } return false; };
export const hasModal = () => modalStack.length > 0;

// ---------- Máquina de escribir ----------
// Texto «a máquina». `voice`: id de personaje → un balbuceo (blip) cada dos letras. La velocidad depende de settings.textSpeed.
export const textSpeedMul = () => (settings.textSpeed === 'instant' ? 0 : settings.textSpeed === 'fast' ? 0.35 : 1);
export function typewriter(el, text, { speed = 16, onDone, voice } = {}) {
  el.setAttribute('aria-label', text);
  const mul = textSpeedMul();
  if (settings.reduceEffects || !mul || speed <= 0) { el.textContent = text; if (onDone) onDone(); return { skip() {}, done: true }; }
  let i = 0, stop = false, k = 0; const ctl = { done: false, skip() { if (ctl.done) return; stop = true; el.textContent = text; ctl.done = true; if (onDone) onDone(); } };
  const tick = () => {
    if (stop) return;
    const prev = i; i += 1 + (text[i] === ' ' ? 1 : 0); el.textContent = text.slice(0, i);
    if (voice && /[\p{L}\p{N}]/u.test(text[prev] || '') && (k++ % 2 === 0)) bus.emit('blip', { voice });
    if (i >= text.length) { ctl.done = true; if (onDone) onDone(); } else setTimeout(tick, speed * mul);
  };
  el.textContent = ''; tick(); return ctl;
}

// ---------- Cartas ----------
export function cardDesc(card) {
  const base = card.sp ? t(`card.${card.id}.desc`) : t(`suit.${card.suit}.fx`);
  const mods = (card.mods || []).map(m => t(`mod.${m}.name`) + ': ' + t(`mod.${m}.desc`));
  return [base, ...mods].join(' · ');
}
export function cardEl(card, o = {}) {
  const tag = o.static ? 'div' : 'button';
  const name = o.hidden ? t('table.hidden_card') : cardName(card);
  const el = h(tag, { class: 'card' + (o.sel ? ' sel' : '') + (o.hidden ? ' back' : ''), data: { uid: card.uid || '' }, title: o.hidden ? name : name + ' — ' + cardDesc(card), 'aria-label': name + (o.hidden ? '' : '. ' + cardDesc(card)) });
  if (!o.static) { el.type = 'button'; el.setAttribute('aria-pressed', o.sel ? 'true' : 'false'); }
  el.appendChild(h('img', { src: o.hidden ? cardBackURL() : cardURL(card), alt: '', draggable: 'false' }));
  if (!o.hidden && card.sp && !o.noname) el.appendChild(h('span', { class: 'cname' }, t(`card.${card.id}.name`)));
  if (!o.hidden && card.grow) el.appendChild(h('span', { class: 'grow' }, '+' + card.grow));
  return el;
}

// ---------- Recursos ----------
export const RES = { health: ['heart', 'ui.res.health'], sanity: ['flame', 'ui.res.sanity'], money: ['coin', 'ui.res.money'], debt: ['ledger', 'ui.res.debt'], shield: ['shield', 'ui.res.shield'] };
export function resChip(k, v, signed = true) {
  const [icon, key] = RES[k] || ['q', k]; const neg = v < 0, good = (k === 'debt') ? neg : !neg;
  return h('span', { class: 'out ' + (good ? 'pos' : 'neg') }, ico(icon), (signed && v > 0 ? '+' : '') + v + ' ', h('span', { class: 'muted' }, t(key)));
}
export function nameOf(kind, id) {
  return kind === 'item' ? t(`item.${id}.name`) : kind === 'tool' ? t(`tool.${id}.name`) : kind === 'card' ? t(`card.${id}.name`) : kind === 'hand' ? t('hand.' + id) : kind === 'char' ? t('char.' + id) : kind === 'know' ? t(`know.${id}.name`) : kind === 'mod' ? t(`mod.${id}.name`) : id;
}
export function outcomeEl(o) {
  switch (o.k) {
    case 'money': case 'sanity': case 'health': case 'debt': return resChip(o.k, o.v);
    case 'card': return h('span', { class: 'out pos' }, ico('cards'), t('ui.out.card', { name: nameOf('card', o.id) }));
    case 'item': return h('span', { class: 'out pos' }, sigil(o.id), t('ui.out.item', { name: nameOf('item', o.id) }));
    case 'joker': return h('span', { class: 'out ' + (o.ok === false ? 'neg' : 'pos') }, ico('cards'), o.ok === false ? t('ui.out.joker_full') : t('ui.out.joker', { name: t('joker.' + o.id + '.name') }));
    case 'tool': return h('span', { class: 'out ' + (o.ok === false ? 'neg' : 'pos') }, sigil(o.id), o.ok === false ? t('ui.out.tool_full') : t('ui.out.tool', { name: nameOf('tool', o.id) }));
    case 'level': return h('span', { class: 'out pos' }, ico('cards'), t('ui.out.level', { name: nameOf('hand', o.id) }));
    case 'mod': { const c = gs.deck.find(x => x.uid === o.uid); return h('span', { class: 'out pos' }, ico('cards'), t('ui.out.mod', { card: c ? cardName(c) : '', mod: nameOf('mod', o.id) })); }
    case 'remove': return h('span', { class: 'out neg' }, ico('x'), t('ui.out.remove', { name: o.id && /^(blood|eye|tooth|key)_/.test(o.id) ? cardName({ id: o.id, suit: o.id.split('_')[0], rank: +o.id.split('_')[1], sp: false }) : o.id }));
    case 'know': return h('span', { class: 'out ' + (o.isNew ? 'pos' : '') }, ico('eye'), o.isNew ? t('ui.out.know', { name: nameOf('know', o.id) }) : t('ui.out.know_old', { name: nameOf('know', o.id) }), o.isNew ? h('span', { class: 'tag new' }, t('ui.new')) : null);
    case 'gamble': return h('span', { class: 'out ' + (o.won ? 'pos' : 'neg') }, ico('coin'), t(o.won ? 'ui.out.gamble_won' : 'ui.out.gamble_lost'));
    case 'boss': return h('span', { class: 'out neg' }, ico('skull'), t('ui.out.boss', { name: t('char.' + o.id) }));
    default: return null;
  }
}

// ---------- HUD ----------
let prevHud = null;
export function renderHud(hud) {
  const el = $('#hud'); if (!hud) { el.hidden = true; return; }
  el.hidden = false;
  const st = (k, icon, key, val, extra = '', bar) => h('span', { class: 'stat ' + k + extra, 'data-k': k, title: t(key) + ': ' + val, 'aria-label': t(key) + ': ' + val }, ico(icon), h('span', { class: 'lbl' }, t(key)), h('span', { class: 'v' }, val), bar != null ? h('span', { class: 'bar', 'aria-hidden': 'true' }, h('i', { style: 'width:' + Math.max(0, Math.min(100, bar)) + '%' })) : null);
  const inv = h('button', { type: 'button', class: 'hud-inv btn small ghost', 'data-act': 'inventory', 'aria-label': t('hud.inventory') }, ico('pocket'), ' ' + (hud.items.length + hud.tools.length + (hud.jokers ? hud.jokers.length : 0)));
  fill(el,
    st('health', 'heart', 'hud.health', hud.health + '/' + hud.maxHealth, '', hud.health / hud.maxHealth * 100),
    st('sanity', 'flame', 'hud.sanity', hud.sanity, '', hud.sanity),
    st('money', 'coin', 'hud.money', hud.money),
    st('debt', 'ledger', 'hud.debt', hud.debt),
    hud.lives > 0 ? st('lives', 'candle', 'hud.lives', '×' + hud.lives) : null,
    h('span', { class: 'hud-inv' }, ...hud.tools.map(id => h('span', { class: 'chip tool', title: t(`tool.${id}.name`) + ': ' + t(`tool.${id}.desc`) }, sigil(id, '', PAL.g1))), inv),
    h('button', { type: 'button', class: 'btn small ghost', 'data-act': 'howto', 'aria-label': t('hud.howto'), title: t('hud.howto') }, ico('help')),
    fsButton('icon', 'small ghost'),
    h('button', { type: 'button', class: 'btn small ghost', 'data-act': 'settings', 'aria-label': t('hud.settings'), title: t('hud.settings') }, ico('gear'))
  );
  if (prevHud) for (const k of ['health', 'sanity', 'money', 'debt']) if (prevHud[k] !== hud[k]) { const s = $('.stat.' + k, el); if (s) { s.classList.add('pop'); const d = hud[k] - prevHud[k]; fx.float(s, (d > 0 ? '+' : '') + d, (k === 'debt' ? d > 0 : d < 0) ? 'neg' : 'pos'); } }
  prevHud = Object.assign({}, hud);
}
export const resetHudMemory = () => { prevHud = null; };

export function openInventory() {
  const hud = gs; const lv = Object.entries(gs.handLevels || {}).filter(([, v]) => v > 0);
  const body = h('div', null,
    h('h3', null, t('hud.items')), gs.inventory.length ? h('ul', { class: 'memlist' }, ...gs.inventory.map(id => h('li', null, sigil(id), ' ', h('b', null, t(`item.${id}.name`)), h('small', null, t(`item.${id}.desc`))))) : h('p', { class: 'muted' }, t('hud.no_items')),
    h('h3', null, t('hud.tools')), gs.tools.length ? h('ul', { class: 'memlist' }, ...gs.tools.map(id => h('li', null, sigil(id, '', PAL.g1), ' ', h('b', null, t(`tool.${id}.name`)), h('small', null, t(`tool.${id}.desc`))))) : h('p', { class: 'muted' }, t('hud.no_items')),
    h('h3', null, t('hud.jokers') + ' ' + t('ui.slots', { n: gs.jokers.length, max: 5 })), gs.jokers.length ? h('ul', { class: 'memlist jklist' }, ...gs.jokers.map((id, i) => h('li', { class: 'jk-row' }, jokerEl(id, { static: true }), h('span', { class: 'txt' }, h('b', null, t(`joker.${id}.name`)), h('small', null, jokerDesc(id))), h('button', { type: 'button', class: 'btn small', 'data-act': 'sell_joker', 'data-arg': String(i) }, t('ui.sell', { n: jokerSellPrice(id) }))))) : h('p', { class: 'muted' }, t('hud.no_items')),
    h('h3', null, t('hud.levels')), lv.length ? h('p', null, lv.map(([k, v]) => t('hand.' + k) + ' +' + v).join(' · ')) : h('p', { class: 'muted' }, t('hud.no_items')),
    h('p', { class: 'muted' }, t('hud.deck') + ': ' + gs.deck.length));
  modal(body, { title: t('hud.inventory') });
}
export const handStats = (type, levels = gs.handLevels || {}) => { const H = HANDS[type], l = levels[type] || 0; return { chips: H.chips + l * 8, mult: H.mult + l, lvl: l }; };
export { HAND_ORDER, HANDS, pixelText, iconURL };

// ---------- Pantalla completa: botón (icono o texto) y sincronización de su estado ----------
export function fsButton(kind = 'icon', cls = '') {
  if (!fsSupported()) return null;
  const on = isFullscreen(), label = t(on ? 'ui.fullscreen_exit' : 'ui.fullscreen');
  return h('button', { type: 'button', class: 'btn ' + cls, 'data-act': 'fullscreen', 'data-fs': kind, 'aria-pressed': on ? 'true' : 'false', 'aria-label': label, title: label }, kind === 'icon' ? ico(on ? 'shrink' : 'expand') : label);
}
export function syncFullscreenButtons() {
  const on = isFullscreen(), label = t(on ? 'ui.fullscreen_exit' : 'ui.fullscreen');
  for (const b of $$('[data-fs]')) { b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.setAttribute('aria-label', label); b.title = label; if (b.dataset.fs === 'icon') b.replaceChildren(ico(on ? 'shrink' : 'expand')); else b.textContent = label; }
}

// ---------- Jokers ----------
export function jokerDesc(id) { let s = t(`joker.${id}.desc`); if (id === 'abaco') s += ' (+' + ((gs.jokerData && gs.jokerData.abaco) || 0) + ')'; return s; }
export function jokerEl(id, o = {}) {
  const J = JOKERS[id] || { rarity: 'common' }, name = t(`joker.${id}.name`), desc = jokerDesc(id), tag = o.static ? 'div' : 'button';
  const el = h(tag, { class: 'joker r-' + J.rarity + (o.cls ? ' ' + o.cls : ''), title: name + ' — ' + desc, 'aria-label': name + '. ' + desc, data: { joker: id } }, h('img', { src: jokerURL(id, J.rarity), alt: '', draggable: 'false' }));
  if (!o.static) el.type = 'button';
  return el;
}
