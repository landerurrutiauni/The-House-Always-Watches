// deckview.js — «Ver mazo»: todas tus cartas (y, en una ronda, las que quedan por robar), con el orden que elijas, como en Balatro.
// Se abre con el botón de mazo del HUD (en cualquier pantalla de partida: mapa, recompensas, tienda…) y pulsando «Mazo» en la mesa.
import { gs, settings } from './state.js';
import { t, cardName } from './i18n.js';
import { h, act, modal, cardEl, cardDesc } from './ui.js';
import { saveSettings } from './save.js';
import { sortCards, SORT_MODES } from './sorting.js';

// Siempre se ve el mazo COMPLETO. No hay vista de «cartas por robar»: qué queda en el mazo de robo no se puede consultar (solo lo que revelan los Ojos).
export function openDeck() {
  let onlySp = false;
  const info = h('div', { class: 'deck-info', 'aria-live': 'polite' }, t('deck.hint'));
  const grid = h('div', { class: 'deck-grid', role: 'list' }), head = h('div', { class: 'deck-head' }), ctl = h('div', { class: 'deck-ctl' });
  const show = c => info.replaceChildren(h('b', null, cardName(c)), ' — ', cardDesc(c));
  const btnOf = (label, on, fn, extra = {}) => h('button', Object.assign({ type: 'button', class: 'btn small' + (on ? ' on' : ' ghost'), 'aria-pressed': on ? 'true' : 'false', onclick: fn }, extra), label);
  function draw() {
    const src = gs.deck.slice();
    const mode = SORT_MODES.includes(settings.deckSort) ? settings.deckSort : 'suit';
    let cards = sortCards(src, mode); if (onlySp) cards = cards.filter(c => c.sp);
    head.textContent = t('deck.count', { n: src.length, sp: src.filter(c => c.sp).length });
    // 13 columnas; ordenadas por palo, cada palo empieza fila nueva. El tamaño de la carta se ajusta para que quepa todo sin deslizar.
    let rows = 0, run = 0, cur = null;
    if (mode === 'suit') { for (const c of cards) { if (c.suit !== cur) { rows += Math.ceil(run / 13); cur = c.suit; run = 0; } run++; } rows += Math.ceil(run / 13); } else rows = Math.ceil(cards.length / 13);
    grid.style.setProperty('--cw', Math.max(30, Math.min(58, Math.floor((330 / Math.max(1, rows) - 6) / 1.4))) + 'px');
    let last = null;
    grid.replaceChildren(...(cards.length ? cards.map(c => {
      const el = cardEl(c, { static: true, noname: true }); el.setAttribute('role', 'listitem'); el.tabIndex = 0;
      if (mode === 'suit' && c.suit !== last) el.style.gridColumnStart = '1'; last = c.suit;
      if (c.sp) el.classList.add('is-sp');
      el.addEventListener('pointerenter', () => show(c)); el.addEventListener('focus', () => show(c)); el.addEventListener('click', () => show(c));
      return el;
    }) : [h('p', { class: 'muted' }, t('deck.empty'))]));
    ctl.replaceChildren(
      h('span', { class: 'deck-lbl' }, t('deck.sort')), ...SORT_MODES.map(m => btnOf(t('deck.sort.' + m), m === mode, () => { settings.deckSort = m; saveSettings(); draw(); }, { 'data-sort': m })),
      btnOf(t('deck.only_special'), onlySp, () => { onlySp = !onlySp; draw(); }, { 'data-only': 'sp' }));
  }
  draw();
  return modal(h('div', { class: 'deckview' }, head, ctl, grid, info), { title: t('deck.title'), cls: 'deck-modal' });
}
act.deck = () => openDeck();
