// screens/run.js — mapa, eventos, tienda, descanso, recompensas, resultados, jefes y final. [capa B, escrita por A]
import * as G from '../game.js';
import { gs, settings } from '../state.js';
import { t } from '../i18n.js';
import { h, btn, act, ico, sigil, typewriter, cardEl, outcomeEl, resChip, nameOf, announce, handStats, sc, jokerEl, jokerDesc, modal, guideTip } from '../ui.js';
import { rewardText, list as missionList } from '../missions.js';
import { WING_INFO } from '../content.js';
import { characterEl, iconURL, PAL } from '../sprites.js';
import { makeCard, SPECIALS } from '../cards.js';
import { fx } from '../fx.js';
import { audioManager as audio } from '../audio.js';

const oppName = (id, look) => (String(id).startsWith('gambler') ? t('opp.' + (id === 'gambler' ? (look || 'gambler_a') : id)) : t('char.' + id));
const ruleList = (rules, weak = []) => [].concat(rules || []).map(r => h('span', { class: 'tag red', title: t(`rule.${r}.desc`) }, t(`rule.${r}.name`)))
  .concat(weak.map(r => h('span', { class: 'tag good', title: t(`rule.${r}.desc`) }, t(`rule.${r}.name`) + ' · ' + t('boss.weakened'))));
const primary = (label, a, arg) => btn(label, a, arg, 'primary', { 'data-primary': '1' });
const hintBox = key => (key ? h('div', { class: 'panel hint' }, h('small', null, t('char.dealer')), t(key)) : null);   // pista de una sola vez

// ---------------- Mapa ----------------
const KIND_ICON = { game: 'node_game', event: 'node_event', merchant: 'node_merchant', rest: 'node_rest', shotgun: 'node_shotgun', secret: 'node_secret', boss: 'node_boss' };
let mapSel = null;
function nodeInfo(n) {
  if (!n) return h('p', { class: 'muted' }, t('map.pick'));
  const k = n.kind, box = h('div', null, h('b', null, ico(KIND_ICON[k]), ' ', t('node.' + k)));
  if (k === 'game') box.append(h('div', null, t('map.opp', { name: oppName(n.opp.id) })), h('div', { class: 'rules' }, ...ruleList(n.opp.rule)));
  else if (k === 'shotgun') box.append(h('div', null, t('map.opp', { name: oppName(n.opp.id, n.opp.look) })), h('div', { class: 'muted' }, t('map.shotgun')));
  else if (k === 'boss') box.append(h('div', null, t('map.opp', { name: t('char.' + n.opp.id) })), h('div', { class: 'rules' }, ...ruleList(G.bossRules(n.opp.id), G.bossWeakened(n.opp.id))));
  else box.append(h('div', { class: 'muted' }, t('map.info.' + k)));
  return box;
}
// Comodines en el mapa: descripción al pasar el ratón y ORDEN a elegir (arrastrar o ◀ ▶). Actúan de izquierda a derecha, así que el orden cambia el resultado.
function jokerRow() {
  if (!gs.jokers.length) return null;
  const row = h('div', { class: 'jokerbar map-jokers', role: 'group', 'aria-label': t('map.jokers_label') });
  const wrap = h('div', { class: 'map-jokers-wrap' }, h('div', { class: 'jk-label' }, gs.jokers.length > 1 ? t('map.jokers_hint') : t('map.jokers_label')), row);
  let dragFrom = -1;
  const move = (a, b, dir) => { if (!G.reorderJokers(a, b)) return; draw(); const nb = row.querySelector('.jslot[data-i="' + b + '"] .jmove button:' + (dir < 0 ? 'first-child' : 'last-child')); const ok = nb && !nb.disabled ? nb : row.querySelector('.jslot[data-i="' + b + '"] .jmove button:not(:disabled)'); if (ok) ok.focus(); };
  const arrow = (i, d, ch) => h('button', { type: 'button', class: 'btn tiny ghost', disabled: i + d < 0 || i + d >= gs.jokers.length, 'aria-label': t(d < 0 ? 'map.joker_left' : 'map.joker_right', { name: t(`joker.${gs.jokers[i]}.name`) }), 'data-dir': String(d), onclick: () => move(i, i + d, d) }, ch);
  function draw() {
    const multi = gs.jokers.length > 1;
    row.replaceChildren(...gs.jokers.map((id, i) => {
      const el = h('div', { class: 'jslot', draggable: multi ? 'true' : 'false', 'data-i': String(i) }, h('span', { class: 'jidx', 'aria-hidden': 'true' }, String(i + 1)), jokerEl(id, { static: true }), multi ? h('span', { class: 'jmove' }, arrow(i, -1, '◀'), arrow(i, 1, '▶')) : null);
      if (multi) {
        el.addEventListener('dragstart', e => { dragFrom = i; el.classList.add('drag'); try { e.dataTransfer.setData('text/plain', String(i)); e.dataTransfer.effectAllowed = 'move'; } catch (err) { /* sin dataTransfer */ } });
        el.addEventListener('dragend', () => { dragFrom = -1; row.querySelectorAll('.jslot').forEach(x => x.classList.remove('drag', 'over')); });
        el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('over'); });
        el.addEventListener('dragleave', () => el.classList.remove('over'));
        el.addEventListener('drop', e => { e.preventDefault(); const from = dragFrom >= 0 ? dragFrom : +(e.dataTransfer && e.dataTransfer.getData('text/plain')); if (G.reorderJokers(from, i)) draw(); });
      }
      return el;
    }));
  }
  draw(); return wrap;
}
function mapScreen(v) {
  mapSel = null;
  const rows = v.map.rows, N = rows.length, box = h('div', { class: 'map-box' }); const pos = {};
  rows.forEach((row, r) => { const vis = row.filter(n => !n.secret); vis.forEach((n, i) => { pos[n.id] = [(r + 0.5) / N, (i + 1) / (vis.length + 1)]; }); row.filter(n => n.secret).forEach(n => { pos[n.id] = [(r + 0.5) / N, 0.93]; }); });
  const svgNS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true');
  const info = h('div', { class: 'panel map-info' + (v.hintKey ? ' hint' : ''), 'aria-live': 'polite' }, v.hintKey ? [h('small', null, t('char.dealer')), t(v.hintKey)] : nodeInfo(null));
  const enter = btn(t('map.enter'), 'map_enter', null, 'primary', { disabled: true, 'data-primary': '1' });
  for (const row of rows) for (const n of row) {
    if (n.secret && !v.secretVisible) continue;
    for (const l of n.links) { if (!pos[l] || (l === 'secret' && !v.secretVisible)) continue; const ln = document.createElementNS(svgNS, 'line'); const a = pos[n.id], b = pos[l]; ln.setAttribute('x1', a[0] * 100); ln.setAttribute('y1', a[1] * 100); ln.setAttribute('x2', b[0] * 100); ln.setAttribute('y2', b[1] * 100); const used = v.visited.includes(n.id) && (v.visited.includes(l) || v.avail.includes(l)); ln.setAttribute('stroke', used ? '#b9a98a' : '#4d4540'); ln.setAttribute('stroke-width', used ? 3 : 2); ln.setAttribute('vector-effect', 'non-scaling-stroke'); ln.setAttribute('stroke-dasharray', n.secret || l === 'secret' ? '4 4' : ''); svg.appendChild(ln); }
  }
  box.appendChild(svg);
  for (const row of rows) for (const n of row) {
    if (n.secret && !v.secretVisible) continue;
    const avail = v.avail.includes(n.id), visited = v.visited.includes(n.id), here = v.pos === n.id;
    const b = h('button', { type: 'button', class: 'node ' + n.kind + (avail ? ' avail' : '') + (visited ? ' visited' : '') + (here ? ' here' : ''), style: `left:${pos[n.id][0] * 100}%;top:${pos[n.id][1] * 100}%`, disabled: !avail, 'data-act': 'map_sel', 'data-arg': n.id, 'aria-label': t('node.' + n.kind) + (avail ? '' : ' (' + t(visited ? 'map.visited' : 'map.locked') + ')'), title: t('node.' + n.kind) }, h('img', { src: iconURL(KIND_ICON[n.kind], 2, avail ? PAL.w3 : PAL.t1), alt: '' }));
    box.appendChild(b);
  }
  act.map_sel = id => {
    const n = rows.flat().find(x => x.id === id); if (!n) return;
    if (mapSel === id) { G.chooseNode(id); return; }
    mapSel = id; box.querySelectorAll('.node').forEach(b => b.classList.toggle('sel', b.dataset.arg === id)); info.replaceChildren(nodeInfo(n)); info.classList.remove('hint'); enter.disabled = false; announce(t('node.' + n.kind));
  };
  act.map_enter = () => { if (mapSel) G.chooseNode(mapSel); };
  const missLabel = () => { const l = missionList(); return t('mission.btn', { n: l.filter(m => m.done).length, m: l.length }); };
  act.map_missions = () => { const miss = missionList(); const b = document.querySelector('[data-act="map_missions"]'); if (b) b.textContent = missLabel(); modal(h('div', { class: 'miss-list' }, ...miss.map(m => h('div', { class: 'miss' + (m.done ? ' done' : ''), 'data-mission': m.id },
    h('b', null, (m.done ? '✓ ' : '') + t('mission.' + m.id)), h('span', { class: 'miss-n' }, t('mission.progress', { n: m.n, m: m.need })), h('div', { class: 'muted' }, t('mission.reward_label', { r: rewardText(m.reward) })))), h('p', { class: 'muted', style: 'font-size:.85em' }, t('mission.note'))), { title: t('mission.title', { wing: t(`wing.${v.wing}.name`) }) }); };
  const missBtn = (v.missions || []).length ? h('button', { type: 'button', class: 'btn ghost', 'data-act': 'map_missions' }, missLabel()) : null;
  return h('section', { class: 'scr mapscr' }, h('p', { class: 'muted center', style: 'margin:2px' }, t('map.title', { n: Math.max(0, v.row) + 1, total: N }) + ' · ' + t(`wing.${v.wing}.name`)), jokerRow(), box, info, h('div', { class: 'row center' }, missBtn, enter), G.guideActive() ? guideTip() : null);
}

// ---------------- Eventos ----------------
function eventScreen(v) {
  const who = v.who && v.who !== 'dealer_x' ? characterEl(v.who, { scale: sc(4, 3) }) : null;
  const text = h('p', { class: 'ev-text' }), title = h('h2', { class: 'ev-title' }, t(v.titleKey));
  const body = h('div', { class: 'ev-body panel' }, title, text);
  const card = h('div', { class: 'ev-card' + (who ? '' : ' nochar') }, who, body);
  const root = h('section', { class: 'scr evscr' }, v.phase === 'choose' ? hintBox(v.hintKey) : null, card);
  const raw = t(v.textKey), shown = fx.corrupt(raw);
  if (v.phase === 'choose') {
    const choices = h('div', { class: 'choices', style: 'opacity:0;pointer-events:none' });
    const opt = k => v.options.find(o => o.k === k);
    const mk = (k, cls, dir) => { const o = opt(k); return o ? h('button', { type: 'button', class: 'btn choice ' + cls, 'data-act': 'ev_choose', 'data-arg': k }, h('span', { class: 'dir' }, dir), h('span', { class: 'lbl' }, t(o.key))) : null; };
    choices.append(mk('b', 'reject', '← ' + t('ui.reject') + '  [A]'), mk('a', 'accept', t('ui.accept') + ' →  [D]'));
    const hid = opt('h'); if (hid) choices.append(h('button', { type: 'button', class: 'btn choice hid', 'data-act': 'ev_choose', 'data-arg': 'h' }, h('span', { class: 'dir' }, '☠ ' + t('ui.hidden') + '  [H]'), h('span', { class: 'lbl' }, t(hid.key))));
    const show = () => { choices.style.opacity = '1'; choices.style.pointerEvents = 'auto'; };
    const ctl = typewriter(text, shown, { speed: 12, voice: v.who || 'narrator', onDone: show });
    root.append(choices, h('p', { class: 'swipe-hint' }, t('ui.swipe_hint')));
    body.addEventListener('click', () => { if (!ctl.done) ctl.skip(); });
    // Deslizar (táctil): izquierda = rechazar, derecha = aceptar
    let x0 = null, dx = 0;
    card.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' || !ctl.done) return; x0 = e.clientX; dx = 0; });
    card.addEventListener('pointermove', e => { if (x0 == null) return; dx = e.clientX - x0; card.style.transform = `translateX(${dx * 0.6}px) rotate(${dx / 40}deg)`; card.style.opacity = String(1 - Math.min(0.5, Math.abs(dx) / 400)); });
    const end = () => { if (x0 == null) return; const d = dx; x0 = null; card.style.transform = ''; card.style.opacity = ''; if (Math.abs(d) > 90) { audio.playSFX('swipe'); G.eventChoose(d < 0 ? 'b' : 'a'); } };
    card.addEventListener('pointerup', end); card.addEventListener('pointercancel', end);
    card._choose = k => { if (!ctl.done) ctl.skip(); if (opt(k)) G.eventChoose(k); };
    root._key = k => card._choose(k);
  } else {
    typewriter(text, shown, { speed: 10, voice: v.who || 'narrator' });
    const res = h('div', { class: 'outcomes' }, ...v.outcomes.map(outcomeEl).filter(Boolean));
    body.append(res);
    const row = h('div', { class: 'row center' });
    for (const r of v.redo || []) row.append(btn(t('ui.redo.' + r.via), 'ev_redo', r.via, ''));
    row.append(primary(t('ui.continue'), 'ev_continue'));
    root.append(row);
  }
  return root;
}
act.ev_choose = k => G.eventChoose(k);
act.ev_redo = via => G.eventRedo(via);
act.ev_continue = () => G.eventContinue();

// ---------------- Tienda ----------------
function shopEntry(e) {
  if (e.kind === 'joker') return { name: t(`joker.${e.id}.name`), desc: jokerDesc(e.id), art: jokerEl(e.id, { static: true }) };
  if (e.kind === 'item') return { name: t(`item.${e.id}.name`), desc: t(`item.${e.id}.desc`), art: sigil(e.id, 'big') };
  if (e.kind === 'tool') return { name: t(`tool.${e.id}.name`), desc: t(`tool.${e.id}.desc`), art: sigil(e.id, 'big', PAL.g1) };
  if (e.kind === 'card') { const sp = SPECIALS[e.id]; const c = makeCard(e.id); return { name: t(`card.${e.id}.name`), desc: t(`card.${e.id}.desc`), art: cardEl(c, { static: true, noname: true }), sp }; }
  if (e.kind === 'loan') return { name: t('shop.loan.name'), desc: t('shop.loan.desc', { amount: e.amount, debt: e.debt }), art: ico('ledger', 'big') };
  return { name: t(`shop.${e.kind}.name`), desc: t(`shop.${e.kind}.desc`), art: ico(e.kind === 'heal' ? 'heart' : e.kind === 'level' ? 'cards' : 'x', 'big') };
}
function merchantScreen(v) {
  const list = v.stock.map(e => { const s = shopEntry(e); return h('div', { class: 'panel shop-item' }, s.art, h('div', { class: 'txt' }, h('b', null, s.name), h('small', null, s.desc)),
    e.sold ? h('span', { class: 'tag' }, t('shop.sold')) : btn(e.kind === 'loan' ? t('shop.take') : (e.kind === 'joker' && !e.can && v.hud.money >= e.price ? t('shop.joker.full') : t('shop.buy', { price: e.price })), 'shop_buy', e.index, e.kind === 'loan' ? 'danger small' : 'small', { disabled: !e.can })); });
  return h('section', { class: 'scr resscr', style: 'justify-content:flex-start' },
    h('div', { class: 'shop-top panel' }, characterEl('merchant', { scale: 2 }), h('div', null, h('h2', { class: 'ev-title' }, t('char.merchant')), h('p', { class: 'say', style: 'margin:0' }, t('shop.line')))),
    hintBox(v.hintKey),
    h('div', { class: 'shop-list' }, ...list), primary(t('shop.leave'), 'shop_leave'));
}
act.shop_buy = i => { const before = gs.player.money; G.buy(+i); };
act.shop_leave = () => G.leaveShop();

// ---------------- Descanso ----------------
function restScreen(v) {
  const icons = { heal: 'heart', calm: 'flame', pay: 'ledger', study: 'cards' };
  if (v.phase === 'done') {
    const d = v.done;
    return h('section', { class: 'scr resscr' }, h('h2', { class: 'bigtitle' }, t('rest.title')), h('p', { class: 'say' }, t('rest.done.' + d.k, { n: d.amount, hand: d.extra ? t('hand.' + d.extra) : '' })), primary(t('ui.continue'), 'rest_continue'));
  }
  return h('section', { class: 'scr resscr' }, h('h2', { class: 'bigtitle' }, t('rest.title')), h('p', { class: 'say' }, t('rest.sub')),
    hintBox(v.hintKey),
    h('div', { class: 'rest-opts' }, ...v.options.map(o => h('button', { type: 'button', class: 'btn', 'data-act': 'rest_pick', 'data-arg': o.k, disabled: !o.ok }, h('b', null, ico(icons[o.k]), ' ', t(`rest.${o.k}.name`)), h('span', { class: 'muted' }, t(`rest.${o.k}.desc`, { n: o.amount }))))),
    btn(t('rest.skip'), 'rest_continue', null, 'ghost'));
}
act.rest_pick = k => G.restChoose(k);
act.rest_continue = () => G.restContinue();

// ---------------- Recompensas ----------------
function rewardScreen(v) {
  const cards = v.choices.map((c, i) => {
    let art, name, desc;
    if (c.type === 'card') { const card = makeCard(c.id); art = cardEl(card, { static: true, noname: false }); name = t(`card.${c.id}.name`); desc = t(`card.${c.id}.desc`); }
    else if (c.type === 'level') { const s = handStats(c.hand); art = ico('cards', 'big'); name = t('reward.level', { hand: t('hand.' + c.hand) }); desc = t('reward.level_desc', { chips: s.chips + 8, mult: s.mult + 1 }); }
    else if (c.type === 'mod') { const base = gs.deck.find(x => x.uid === c.uid) || makeCard(c.card); art = cardEl(Object.assign({}, base, { mods: (base.mods || []).concat([c.mod]) }), { static: true }); name = t('reward.mod', { mod: t(`mod.${c.mod}.name`) }); desc = t(`mod.${c.mod}.desc`); }
    else if (c.type === 'joker') { art = jokerEl(c.id, { static: true }); name = t('reward.joker', { name: t(`joker.${c.id}.name`) }); desc = jokerDesc(c.id); }
    else { art = sigil(c.id, 'big'); name = t(`item.${c.id}.name`); desc = t(`item.${c.id}.desc`); }
    return h('button', { type: 'button', class: 'rcard', 'data-act': 'reward_pick', 'data-arg': i }, art, h('b', null, name), h('small', { class: 'muted' }, desc));
  });
  return h('section', { class: 'scr resscr' }, h('h2', { class: 'bigtitle win' }, t(v.boss ? 'reward.boss_title' : 'reward.title')), h('div', { class: 'rewards' }, ...cards), btn(t('reward.skip', { n: v.boss ? 30 : 8 }), 'reward_skip', null, 'ghost'));
}
act.reward_pick = i => G.rewardPick(+i);
act.reward_skip = () => G.rewardSkip();

// ---------------- Resultados ----------------
function resultScreen(v) {
  const won = v.won, chips = [];
  if (won && v.rewards) { if (v.rewards.money) chips.push(resChip('money', v.rewards.money)); if (v.rewards.sanity) chips.push(resChip('sanity', v.rewards.sanity)); }
  if (!won && v.costs) { if (v.costs.health) chips.push(resChip('health', -v.costs.health)); if (v.costs.sanity) chips.push(resChip('sanity', -v.costs.sanity)); if (v.costs.debt) chips.push(resChip('debt', v.costs.debt)); }
  const who = v.bossId ? characterEl(v.bossId, { scale: sc(4, 3) }) : null;
  setTimeout(() => { if (!won) { fx.flash(); fx.shake(); fx.vibrate([60, 40, 80]); } }, 50);
  return h('section', { class: 'scr resscr' }, who, h('h2', { class: 'bigtitle ' + (won ? 'win' : 'lose') }, t(won ? 'result.win' : 'result.lose')),
    h('p', { class: 'say' }, t(v.lineKey)), h('p', { class: 'muted' }, t('result.score', { score: v.score, target: v.target })),
    chips.length ? h('div', { class: 'outcomes' }, ...chips) : null, primary(t('ui.continue'), 'result_continue'));
}
function duelResultScreen(v) {
  const d = v.deltas || {}, chips = [];
  for (const k of ['money', 'sanity', 'debt', 'health']) if (d[k]) chips.push(resChip(k, d[k]));
  if (d.card) chips.push(h('span', { class: 'out pos' }, ico('cards'), t('ui.out.card', { name: t(`card.${d.card}.name`) })));
  setTimeout(() => { if (!v.won) { fx.flash(); fx.shake(); } }, 50);
  return h('section', { class: 'scr resscr' }, h('h2', { class: 'bigtitle ' + (v.won ? 'win' : 'lose') }, t(v.won ? 'result.duel_win' : 'result.duel_lose')), h('p', { class: 'say' }, t(v.lineKey)), chips.length ? h('div', { class: 'outcomes' }, ...chips) : null, primary(t('ui.continue'), 'result_continue'));
}
act.result_continue = () => G.resultContinue();

// ---------------- Jefe / final ----------------
function bossScreen(v) {
  const line = h('p', { class: 'say' });
  typewriter(line, t(v.lineKey), { speed: 22, voice: v.boss });
  if (v.secret) setTimeout(() => fx.glitch(), 300);
  return h('section', { class: 'scr resscr bossscr' }, h('p', { class: 'muted' }, t('boss.title')), characterEl(v.boss, { scale: 3 }), h('h2', { class: 'bigtitle' }, t('char.' + v.boss)), line,
    h('div', { class: 'panel' }, h('b', null, t('boss.rules')), h('div', { class: 'rules', style: 'justify-content:center' }, ...(ruleList(v.rules, v.weakened).length ? ruleList(v.rules, v.weakened) : [h('span', { class: 'muted' }, t('boss.no_rules'))]))), hintBox(v.hintKey), primary(t('boss.fight'), 'boss_start'));
}
act.boss_start = () => G.bossStart();
function finaleScreen(v) {
  let i = 0, ctl = null; const line = h('p', { class: 'say', style: 'min-height:4em' });
  const cont = primary(t('ui.continue'), 'finale_next'); cont.style.visibility = 'hidden';
  const show = () => { ctl = typewriter(line, t(v.lineKeys[i]), { speed: 28, voice: 'dealer', onDone: () => { if (i >= v.lineKeys.length - 1) cont.style.visibility = 'visible'; } }); };
  const root = h('section', { class: 'scr resscr', tabindex: 0 }, h('p', { class: 'muted' }, t('finale.stage' + v.stage)), characterEl('dealer', { scale: sc(6, 3) }), line, h('p', { class: 'muted', style: 'font-size:.8em' }, t('ui.tap')), cont);
  root.addEventListener('click', e => { if (e.target.closest('[data-act]')) return; if (ctl && !ctl.done) { ctl.skip(); return; } if (i < v.lineKeys.length - 1) { i++; show(); } });
  show(); return root;
}
act.finale_next = () => G.finaleContinue();

export function register(S) {
  S.map = { render: mapScreen, hud: true, bgFrom: v => (WING_INFO[v.wing] ? WING_INFO[v.wing].bg : 'casino') };
  S.event = { render: eventScreen, hud: true, bgFrom: v => v.bg };
  S.merchant = { render: merchantScreen, hud: true, bg: 'shop' };
  S.rest = { render: restScreen, hud: true, bg: 'rest' };
  S.reward = { render: rewardScreen, hud: true, bg: 'casino' };
  S.round_result = { render: resultScreen, hud: true, bg: 'casino' };
  S.duel_result = { render: duelResultScreen, hud: true, bg: 'casino' };
  S.boss_intro = { render: bossScreen, hud: true, bgFrom: v => v.bg || 'casino' };
  S.finale = { render: finaleScreen, hud: true, bg: 'casino' };
}
