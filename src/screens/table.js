// screens/table.js — ronda de cartas: mano, selección, vista previa en vivo, apuesta, puntuación animada y guía. [capa B, escrita por A]
import * as G from '../game.js';
import * as C from '../combat.js';
import { gs, settings } from '../state.js';
import { t, cardName } from '../i18n.js';
import { h, btn, act, ico, sigil, cardEl, cardDesc, resChip, modal, handStats, HAND_ORDER, HANDS, announce, typewriter, fill, sc, jokerEl, guideTip } from '../ui.js';
import { MAX_JOKERS } from '../jokers.js';
import { characterEl, iconURL, PAL } from '../sprites.js';
import { audioManager as audio } from '../audio.js';
import { fx } from '../fx.js';
import { SPECIALS, SUITS } from '../cards.js';
import { sortCards } from '../sorting.js';
import { saveSettings } from '../save.js';

const STAKE_ORDER = ['none', 'blood', 'sanity', 'debt', 'money'];
let UI = null; // estado de la pantalla actual

const oppName = id => (String(id).startsWith('gambler') ? t('opp.' + (id === 'gambler' ? 'gambler_a' : id)) : t('char.' + id));
const sleep = ms => new Promise(r => setTimeout(r, settings.reduceEffects ? 0 : ms));

export function openHelp() {
  const lv = gs.handLevels || {};
  const hands = h('dl', { class: 'help-grid' }, ...HAND_ORDER.flatMap(k => { const s = handStats(k, lv); return [h('dt', null, t('hand.' + k)), h('dd', null, s.chips + ' × ' + s.mult + (s.lvl ? ' (+' + s.lvl + ')' : ''))]; }));
  const suits = h('dl', { class: 'help-grid' }, ...SUITS.flatMap(s => [h('dt', null, ico(s === 'blood' ? 'blood' : s), ' ', t('suit.' + s)), h('dd', null, t(`suit.${s}.fx`))]));
  const combos = h('dl', { class: 'help-grid' }, ...['mirada', 'ritual', 'deuda', 'puertas', 'cerradura', 'arcoiris'].flatMap(c => [h('dt', null, t(`combo.${c}.name`)), h('dd', null, t(`combo.${c}.desc`))]));
  modal(h('div', null, h('p', null, t('help.goal')), h('p', null, t('help.score')), h('h3', null, t('help.hands')), hands, h('h3', null, t('help.suits')), suits, h('h3', null, t('help.combos')), combos, h('h3', null, t('help.stakes_title')), h('p', null, t('help.stakes')), h('h3', null, t('help.tips_title')), h('p', null, t('help.tips'))), { title: t('help.title') });
}
act.help = () => openHelp();

// ---- Panel de manos: nivel (+N) y fichas × mult de cada mano. A la izquierda en pantallas anchas; botón «MANOS» en el resto. ----
// Frases que explican el ESCUDO de una jugada (vista previa y resultado)
function shieldLines(sh) {
  if (!sh) return [];
  const out = [];
  if (sh.gain > 0) out.push(t('shield.gain', { n: sh.gain }));
  if (sh.cost > 0 && sh.absorbed > 0) out.push(sh.absorbed >= sh.cost ? t('shield.all', { n: sh.cost }) : t('shield.part', { a: sh.absorbed, n: sh.lost }));   // si no hay escudo no se dice nada: el chip de Salud ya muestra la pérdida
  return out;
}
function handsPanel() {
  const lv = gs.handLevels || {};
  return h('aside', { class: 'hands-panel', 'aria-label': t('table.hands_title') }, h('h3', null, t('table.hands_title')),
    ...HAND_ORDER.map(k => { const s = handStats(k, lv); return h('div', { class: 'hrow' + (s.lvl ? ' up' : ''), 'data-hand': k, title: t('table.hands_hint') }, h('span', { class: 'hn' }, t('hand.' + k)), h('span', { class: 'hl' }, s.lvl ? '+' + s.lvl : ''), h('span', { class: 'hv' }, s.chips + '×' + s.mult)); }));
}
act.tb_hands = () => modal(handsPanel(), { title: t('table.hands_title') });

const fmtMult = (mult, xmult) => (Math.round(mult * 100) / 100) + (xmult !== 1 ? '×' + (Math.round(xmult * 100) / 100) : '');
const pulse = (el, k = 1) => { if (!el) return; el.style.setProperty('--k', String(k)); el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); };
// Fuerza de la jugada: 0 normal · 1 buena · 2 grande · 3 devastadora (según multiplicador final y peso sobre el objetivo)
export function playTier(res, R) { const pw = res.mult * res.xmult, ratio = res.total / Math.max(1, R.target); return (ratio >= 0.6 || pw >= 60) ? 3 : (ratio >= 0.3 || pw >= 30) ? 2 : pw >= 14 ? 1 : 0; }

function tableScreen(v) {
  const R = v.R, st = { sel: [], stake: 'none', busy: false, info: null };
  UI = st;
  const find = uid => R.hand.find(c => c.uid === uid) || R.pocket.find(c => c.uid === uid);
  const root = h('section', { class: 'scr tbl' }), main = h('div', { class: 'tbl-main' }), side = handsPanel();
  root.append(side, main);
  // ---- zona rival ----
  const ruleDescs = [...R.rule.map(r => [r, false]), ...(v.weakened || []).map(r => [r, true])];
  const pct = Math.max(0, Math.min(100, R.score / R.target * 100));
  const scorebar = h('div', { class: 'scorebar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': R.target, 'aria-valuenow': R.score, 'aria-label': t('table.score') }, h('i', { style: 'width:' + pct + '%' }), h('span', null, R.score + ' / ' + R.target));
  const shieldChip = h('span', { class: 'shieldchip' + (R.shield > 0 ? ' on' : ''), title: t('shield.tip'), tabindex: '0', 'aria-label': t('shield.tip') }, ico('shield'), ' ' + t('ui.res.shield') + ' ', h('b', null, R.shield));
  const setShield = n => { shieldChip.querySelector('b').textContent = n; shieldChip.classList.toggle('on', n > 0); };
  const descs = ruleDescs.filter(x => !x[1]).map(([r]) => t(`rule.${r}.name`) + ': ' + t(`rule.${r}.desc`));
  const opp = h('div', { class: 'panel opp' }, characterEl(v.opp.id, { scale: sc(1, 1) }), h('div', { class: 'opp-info' },
    h('div', { class: 'opp-head' }, h('span', { class: 'opp-name' }, oppName(v.opp.id)), v.kind !== 'game' ? h('span', { class: 'tag red' }, t(v.kind === 'final' ? 'table.final' : 'table.boss')) : null,
      ...(ruleDescs.length ? ruleDescs.map(([r, weak]) => h('span', { class: 'tag ' + (weak ? 'good' : 'red'), title: t(`rule.${r}.desc`) }, t(`rule.${r}.name`) + (weak ? ' · ' + t('boss.weakened') : ''))) : [h('span', { class: 'muted', style: 'font-size:.8em' }, t('table.no_rule'))])),
    descs.length ? h('div', { class: 'muted ruledesc' }, descs.join(' · ')) : null,
    scorebar,
    h('div', { class: 'counts' }, h('span', null, ico('cards'), ' ' + t('table.plays') + ' ', h('b', null, R.playsLeft)), h('span', null, ico('x'), ' ' + t('table.discards') + ' ', h('b', null, R.discardsLeft)), shieldChip, h('button', { type: 'button', class: 'deckbtn', 'data-act': 'deck_round', title: t('deck.view.left') }, t('table.deck', { n: R.drawPile.length })),
      v.odds != null && !v.tutorial ? h('span', { class: 'muted' }, t('table.odds', { p: Math.round(v.odds * 100) })) : null)));
  main.append(opp);
  if (v.hintKey) main.append(h('div', { class: 'panel hint' }, h('small', null, t('char.dealer')), t(v.hintKey)));
  // ---- jokers (solo si tienes alguno) ----
  const jokerbar = h('div', { class: 'jokerbar', role: 'group', 'aria-label': t('ui.jokers') });
  for (let i = 0; i < MAX_JOKERS; i++) { const id = gs.jokers[i]; jokerbar.append(id ? jokerEl(id, { static: true }) : h('div', { class: 'joker empty', title: t('table.jokers_empty'), 'aria-hidden': 'true' })); }
  if (gs.jokers.length) main.append(jokerbar);
  const jokEls = {}; jokerbar.querySelectorAll('.joker[data-joker]').forEach(e => { jokEls[e.dataset.joker] = e; });
  // ---- mesa ----
  const played = h('div', { class: 'played', 'aria-hidden': 'true' });
  const ticker = h('div', { class: 'ticker', 'aria-live': 'off' });
  const costs = h('div', { class: 'preview-costs' });
  const peek = h('div', { class: 'peek' });
  const felt = h('div', { class: 'panel felt' }, played, ticker, costs, peek, (v.tutorial || G.guideActive()) ? guideTip() : null);
  main.append(felt);
  const info = h('div', { class: 'cardinfo', 'aria-live': 'polite' });
  const pocket = h('div', { class: 'pocketbar' });
  const hand = h('div', { class: 'hand', role: 'group', 'aria-label': t('table.hand_label') });
  const sortBox = h('span', { class: 'sortbtns', role: 'group', 'aria-label': t('table.sort_hint'), title: t('table.sort_hint') });
  const drawSort = () => sortBox.replaceChildren(h('span', { class: 'muted' }, t('deck.sort')), ...['rank', 'suit'].map(k => h('button', { type: 'button', class: 'btn small' + (settings.handSort === k ? ' on' : ' ghost'), 'aria-pressed': settings.handSort === k ? 'true' : 'false', 'data-act': 'tb_sort', 'data-arg': k }, t('deck.sort.' + k))));
  drawSort();
  act.tb_sort = k => { settings.handSort = settings.handSort === k ? null : k; saveSettings(); drawHand(); drawSort(); };
  main.append(h('div', { class: 'infobar' }, info, pocket, sortBox, btn(t('table.hands_btn'), 'tb_hands', null, 'ghost small hands-btn')));
  // ---- controles ----
  const playB = btn(t('table.play'), 'tb_play', null, 'primary play', { 'data-primary': '1' });
  const discB = btn(t('table.discard'), 'tb_discard', null, '');
  const stashB = btn(t('table.stash'), 'tb_stash', null, '');
  const stakeB = h('button', { type: 'button', class: 'btn stakebtn', 'data-act': 'tb_stake' });
  const saltB = gs.tools.includes('sal') && R.rule.length ? btn(t('table.salt'), 'tb_salt', null, '') : null;
  const ctrl = h('div', { class: 'ctrl' }, playB, discB, stashB, stakeB, saltB, btn('? ' + t('table.help'), 'help', null, 'ghost' + (v.tutorial ? ' pulse' : '')));
  main.append(h('div', { class: 'dock' }, hand, ctrl));

  const selCards = () => st.sel.map(find).filter(Boolean);
  const markHand = type => side.querySelectorAll('.hrow').forEach(r => r.classList.toggle('cur', !!type && r.dataset.hand === type));
  function updatePreview() {
    const cards = selCards(); let curHand = null;
    ticker.replaceChildren(); costs.replaceChildren();
    if (!cards.length) { ticker.append(h('span', { class: 'muted' }, t('table.preview_none'))); }
    else {
      const res = G.roundPreview(st.sel, st.stake);
      if (res) {
        curHand = res.hand;
        ticker.append(h('span', { class: 'tag' }, t('hand.' + res.hand)), h('span', { class: 'box chips', title: t('table.chips') }, res.chips), '×', h('span', { class: 'box mult', title: t('table.mult') }, fmtMult(res.mult, res.xmult)), '=', h('span', { class: 'box total' }, res.total));
        for (const c of res.combos) costs.append(h('span', { class: 'tag new' }, t(`combo.${c}.name`)));
        for (const s of res.steps) if (s.j && !costs.querySelector('[data-j="' + s.j + '"]')) costs.append(h('span', { class: 'tag gold', 'data-j': s.j, title: t(`joker.${s.j}.name`) }, '★ ' + t(`joker.${s.j}.name`)));
        const d = res.delta; for (const k of ['health', 'sanity', 'debt', 'money']) if (d[k]) costs.append(resChip(k, d[k]));
        const sl = shieldLines(res.shield); if (sl.length) costs.append(h('div', { class: 'shieldnote' }, ico('shield'), ' ' + sl.join(' · ')));
        if (res.notes.length) for (const n of res.notes) costs.append(h('span', { class: 'tag red', title: t(`rule.${n}.desc`) }, t(`rule.${n}.name`)));
        if (res.total + R.score >= R.target) costs.append(h('span', { class: 'tag good' }, t('table.enough')));
      }
    }
    markHand(curHand);
    const n = st.sel.length;
    playB.disabled = st.busy || !n || R.playsLeft <= 0; discB.disabled = st.busy || !n || R.discardsLeft <= 0;
    stashB.disabled = st.busy || n !== 1 || R.rule.includes('watched') || R.pocket.length >= R.mods.pocket || R.hidden.has(st.sel[0]);
    playB.textContent = t('table.play') + (n ? ' (' + n + '/5)' : '');
    const label = t(`stake.${st.stake}.name`);
    stakeB.replaceChildren(h('span', null, label), h('small', null, st.stake === 'none' ? t('stake.none.desc') : t(`stake.${st.stake}.desc`)));
    stakeB.disabled = st.busy || R.rule.includes('watched');
    if (saltB) saltB.disabled = st.busy;
  }
  function drawHand() {
    hand.style.setProperty('--n', String(Math.max(5, R.hand.length)));
    hand.replaceChildren(...(settings.handSort ? sortCards(R.hand, settings.handSort) : R.hand).map(c => { const el = cardEl(c, { sel: st.sel.includes(c.uid), hidden: R.hidden.has(c.uid) }); el.dataset.act = 'tb_card'; el.dataset.arg = c.uid; return el; }));
    fill(pocket, h('span', null, ico('pocket'), ' ' + t('table.pocket') + ' ' + R.pocket.length + '/' + R.mods.pocket), ...R.pocket.map(c => { const el = cardEl(c, { sel: st.sel.includes(c.uid) }); el.dataset.act = 'tb_card'; el.dataset.arg = c.uid; return el; }), R.pocket.length ? h('button', { type: 'button', class: 'btn small ghost', 'data-act': 'tb_unstash' }, t('table.unstash')) : null);
    peek.replaceChildren(); if (R.peekN > 0) { peek.append(h('span', null, ico('eye'), ' ' + t('table.peek'))); R.drawPile.slice(-R.peekN).reverse().forEach(c => peek.append(cardEl(c, { static: true, noname: true }))); }
    info.replaceChildren(st.info ? h('span', null, h('b', null, st.info.name), ' — ', st.info.desc) : h('span', { class: 'muted' }, t('table.tap_info')));
  }
  function refresh() { drawHand(); updatePreview(); }

  act.tb_card = uid => {
    if (st.busy) return; const c = find(uid); if (!c) return;
    const hid = R.hidden.has(uid), i = st.sel.indexOf(uid);
    st.info = hid ? { name: t('table.hidden_card'), desc: t('table.hidden_desc') } : { name: cardName(c), desc: cardDesc(c) };
    if (i >= 0) st.sel.splice(i, 1); else if (st.sel.length < 5) st.sel.push(uid); else { audio.playSFX('deny'); return; }
    audio.playSFX('card_flip', { vol: 0.6 }); refresh();
  };
  act.tb_stake = () => { let k = STAKE_ORDER.indexOf(st.stake); for (let n = 0; n < STAKE_ORDER.length; n++) { k = (k + 1) % STAKE_ORDER.length; if (C.stakeAllowed(R, STAKE_ORDER[k])) break; } st.stake = STAKE_ORDER[k]; audio.playSFX('bet', { vol: 0.5 }); updatePreview(); };
  act.tb_stash = () => { if (st.busy || st.sel.length !== 1) return; if (G.roundStash(st.sel[0])) { st.sel = []; G.roundView(); } };
  act.tb_unstash = () => { const uid = st.sel.find(u => R.pocket.some(c => c.uid === u)) || (R.pocket[0] && R.pocket[0].uid); if (uid && G.roundUnstash(uid)) { st.sel = st.sel.filter(u => u !== uid); G.roundView(); } };
  act.tb_salt = () => { if (st.busy) return; if (G.roundSalt()) G.roundView(); };
  act.tb_discard = () => { if (st.busy || !st.sel.length) return; const uids = st.sel.slice(); if (G.roundDiscard(uids)) { st.sel = []; if (R.over) G.roundFinish(); else G.roundView(); } };
  act.tb_play = async () => {
    if (st.busy || !st.sel.length) return; const uids = st.sel.slice(), cards = selCards();
    const stake = C.stakeAllowed(R, st.stake) ? st.stake : 'none';
    st.busy = true; const res = G.roundPlay(uids, stake); if (!res) { st.busy = false; return; }
    st.sel = []; ctrl.querySelectorAll('button').forEach(b => { b.disabled = true; });
    hand.querySelectorAll('.card').forEach(c => { if (uids.includes(c.dataset.uid)) c.style.visibility = 'hidden'; });
    played.replaceChildren(...cards.map(c => cardEl(c, { static: true, noname: false }))); costs.replaceChildren(); ticker.replaceChildren(); markHand(res.hand);
    const chipsB = h('span', { class: 'box chips' }, '0'), multB = h('span', { class: 'box mult' }, '0'), totB = h('span', { class: 'box total' }, '');
    const handTag = h('span', { class: 'tag' }, t('hand.' + res.hand)); ticker.append(handTag, chipsB, '×', multB, '=', totB);
    const shieldNote = shieldLines(res.shield); if (shieldNote.length) costs.append(h('div', { class: 'shieldnote' }, ico('shield'), ' ' + shieldNote.join(' · ')));
    const skip = () => { st.skip = true; }; felt.addEventListener('click', skip, { once: true });
    const dly = res.steps.length > 14 ? 50 : 95; let n = 0;
    for (const s of res.steps) {
      chipsB.textContent = s.chips; multB.textContent = fmtMult(s.mult, s.xmult);
      const heat = s.mult * s.xmult; multB.classList.toggle('hot', heat >= 14); multB.classList.toggle('inferno', heat >= 30);
      const card = s.i >= 0 ? played.children[s.i] : null; played.querySelectorAll('.hit').forEach(x => x.classList.remove('hit')); if (card) card.classList.add('hit');
      if (s.t === 'chips' || s.t === 'mult' || s.t === 'xmult') audio.playSFX('chip', { vol: 0.35, rate: 1 + Math.min(n, 12) * 0.04 });
      if (s.t === 'chips') pulse(chipsB, 1); if (s.t === 'mult') pulse(multB, 1.2); if (s.t === 'xmult') { pulse(multB, 2.2); fx.float(multB, '×' + (Math.round(s.v * 100) / 100), 'big'); }
      if (s.j && jokEls[s.j]) { const je = jokEls[s.j]; je.classList.remove('fire'); void je.offsetWidth; je.classList.add('fire'); fx.float(je, s.t === 'xmult' ? '×' + (Math.round(s.v * 100) / 100) : s.t === 'cost' ? '+' + Math.abs(s.v) : '+' + s.v, 'big'); }
      if (s.t === 'cost' && s.k === 'shield') { shieldChip.classList.add('on', 'gain'); setTimeout(() => shieldChip.classList.remove('gain'), 500); fx.float(shieldChip, '+' + s.v + ' ' + t('ui.res.shield'), 'pos'); }
      let extra = 0;
      if (s.t === 'combo') { fx.banner(t(`combo.${s.id}.name`), 1); audio.playSFX('sting', { vol: 0.5 }); fx.shake(); extra = 260; }
      else if (s.j) extra = 90;
      n++; if (!st.skip) await sleep(dly + extra);
    }
    played.querySelectorAll('.hit').forEach(x => x.classList.remove('hit'));
    totB.textContent = res.total; fx.float(totB, '+' + res.total, 'big'); scorebar.firstChild.style.width = Math.min(100, R.score / R.target * 100) + '%'; scorebar.lastChild.textContent = R.score + ' / ' + R.target;
    // Juego visual según la fuerza de la jugada
    const tier = res.hand === 'royal' ? 3 : playTier(res, R);   // la escalera real siempre se celebra a lo grande, con su propio nombre
    if (tier >= 1) { totB.classList.add('big'); }
    if (tier >= 2) { fx.banner(res.hand === 'royal' ? t('hand.royal') : t(tier >= 3 ? 'fxbanner.huge' : 'fxbanner.big'), tier); fx.embers(multB, tier >= 3 ? 26 : 14); fx.flash(tier >= 3 ? '#ffd24a' : '#b08a3a', tier >= 3 ? 0.28 : 0.2); fx.vibrate(tier >= 3 ? [40, 30, 90] : 40); audio.playSFX(tier >= 3 ? 'slam' : 'level_up', { vol: 0.6 }); }
    if (tier >= 3) fx.shake();
    else if (R.score >= R.target) { fx.banner(t('fxbanner.target'), 2); audio.playSFX('level_up', { vol: 0.5 }); }
    setShield(R.shield);
    if (res.interest) { fx.float(scorebar, t('table.interest_up', { n: res.interest.to }), 'neg'); announce(t('table.interest_up', { n: res.interest.to })); }   // el objetivo solo sube si NO llegaste
    if (res.shield && res.shield.absorbed > 0) { fx.banner(t('shield.absorbed', { n: res.shield.absorbed }), 1); fx.float(shieldChip, '−' + res.shield.absorbed, 'neg'); announce(t('shield.absorbed', { n: res.shield.absorbed })); audio.playSFX('chip', { vol: 0.5 }); }
    if ((res.broken || []).length) { audio.playSFX('glitch'); announce(t('table.glass_broke')); }
    if (res.delta.health < 0) { fx.flash(); fx.shake(); fx.vibrate(50); }
    announce(t('hand.' + res.hand) + ' ' + res.total);
    await sleep(st.skip ? 250 : (tier >= 2 ? 1100 : 650));
    if (R.over) G.roundFinish(); else G.roundView();
  };
  refresh();
  root._keys = e => {
    if (st.busy) return false;
    if (/^[1-9]$/.test(e.key)) { const c = R.hand[+e.key - 1]; if (c) act.tb_card(c.uid); return true; }
    if (e.key === 'Enter') { act.tb_play(); return true; }
    if (e.key === 'Backspace' || e.key === 'Delete') { act.tb_discard(); return true; }
    return false;
  };
  return root;
}
export function register(S) { S.round = { render: tableScreen, hud: true, bgFrom: v => v.bg || 'casino', sameKeep: true }; }
