// Motor de rondas de cartas. Sin DOM. La puntuación es una función PURA (resolvePlay) para poder
// previsualizar sin efectos, y `play` aplica el resultado al estado.
import { HANDS, SPECIALS, evaluate, isWildSuit, makeCard, rankChips } from './cards.js';
import { RNG, rngFor } from './rng.js';
import { gs, addHealth, addSanity, addMoney, addDebt, bus } from './state.js';
import { muteBus } from './state.js';
import { JOKERS } from './jokers.js';
import { eqRow } from './scale.js';

export const OPP_RULES = ['blind_eyes', 'no_repeat', 'cold_blood', 'drown', 'watched', 'interest', 'remember', 'tax', 'mist', 'greedy'];

export const STAKES = {
  none: { x: 1 },
  blood: { x: 1.25, cost: { health: 8 } },
  sanity: { x: 1.25, cost: { sanity: 6 } },
  debt: { x: 1.4, cost: { debt: 35 } },
  money: { x: 1.2, cost: { money: 12 } }
};

// Modificadores derivados de los objetos del inventario.
export function deriveMods(inv = [], perks = {}) {
  const has = id => inv.includes(id);
  return {
    handSize: 7 + (has('ojo_vidrio') ? 1 : 0),
    plays: 4 + (has('guante_crupier') ? 1 : 0) + (perks.plays || 0),
    discards: 3 + (has('campanilla') ? 1 : 0) + (perks.discards || 0),
    pocket: 2,
    flatMult: has('espejo_roto') ? 2 : 0,
    flatChips: has('ceniza') ? 15 : 0,
    shield0: has('llave_hueso') ? 4 : 0,
    targetMul: has('reloj_parado') ? 0.92 : 1,
    stakeBonus: has('ficha_negra') ? 0.15 : 0,
    toothGrow: has('diente_leche') ? 1 : 0,
    bloodMult: has('cuchilla_oxidada') ? 1 : 0,
    goldBonus: has('moneda_mordida') ? 2 : 0,
    winMoney: has('moneda_mordida') ? 5 : 0,
    startSanity: has('espejo_roto') ? -2 : 0,
    noFog: has('ojo_vidrio')
  };
}

export const TARGET = { base: 100, growth: 1.53 };   // reajustado para 16 salas y la baraja de 52 cartas (guardián ≈ 50 % con el bot voraz y sin jokers)
export function targetFor(row, kind = 'game', oppMul = 1, pity = 0, mods = { targetMul: 1 }) {
  const base = TARGET.base * Math.pow(TARGET.growth, eqRow(row));
  const k = kind === 'boss' ? 1.45 : kind === 'final' ? 1.7 : 1;
  return Math.max(30, Math.round(base * k * oppMul * (1 - pity) * mods.targetMul / 5) * 5);
}

const uniq = a => [...new Set(a)];

// ---------------- Puntuación pura ----------------
export function resolvePlay(R, cards, stakeId = 'none') {
  const ev = evaluate(cards);
  const H = HANDS[ev.type];
  const lvl = (R.levels && R.levels[ev.type]) || 0;
  const M = R.mods;
  const rules = [].concat(R.rule || []);
  const rl = x => rules.includes(x);
  let chips = H.chips + lvl * 8, mult = H.mult + lvl, xmult = 1;
  const steps = [{ t: 'hand', hand: ev.type, chips, mult, xmult }];
  const d = { hpLoss: 0, heal: 0, stakeHp: 0, sanity: 0, debt: 0, money: 0, shield: 0, peek: 0 };
  const grow = [], glass = [], combos = [];
  const push = (t, v, i, extra) => steps.push(Object.assign({ t, v, i, chips, mult, xmult }, extra));
  const addChips = (v, i) => { chips += v; push('chips', v, i); };
  const addMult = (v, i) => { mult += v; push('mult', v, i); };
  const addX = (v, i) => { xmult *= v; push('xmult', v, i); };
  const cost = (k, v, i) => { d[k] += v; push('cost', v, i, { k }); };
  const scoring = ev.idx.map(i => ({ c: cards[i], i, suit: ev.suits[i], rank: ev.ranks[i] }));

  const cardFx = (s, retrig) => {
    const c = s.c, i = s.i;
    if (!retrig) addChips(rankChips(s.rank), i);
    if (c.sp) {
      switch (c.id) {
        case 'la_mujer': addX(4, i); cost('debt', 25, i); cost('sanity', -6, i); break;
        case 'el_ahogado': addChips(R.player.sanity < 40 ? 80 : 40, i); cost('sanity', -4, i); break;
        case 'la_septima': addChips(7, i); { const k = 1 + 0.5 * Math.min(R.deaths || 0, 8); if (k > 1) addX(k, i); } break;
        case 'la_deuda': addChips(Math.min(90, Math.floor((R.player.debt + d.debt) / 6)), i); cost('debt', 10, i); break;
        case 'el_hambre': addMult(6, i); cost('hpLoss', 3, i); break;
        case 'sangre_pacto': if (!rl('cold_blood')) addMult(3, i); cost('hpLoss', 2, i); break;
        case 'ojo_vigia': if (!rl('blind_eyes')) { addChips(12, i); d.peek += 3; } break;
        case 'colmillo': addChips(8 + c.grow, i); grow.push({ uid: c.uid, by: 2 + M.toothGrow, cap: 40 }); break;
        case 'llave_maestra': addChips(10, i); cost('shield', 4, i); break;
        case 'dado_trucado': addChips(6, i); break;
        case 'moneda_gemela': addChips(4, i); cost('money', 4, i); break;
        case 'corazon': addMult(2, i); cost('heal', 2, i); break;
        case 'hueso_liso': addChips(20, i); break;
        case 'sombra': addChips(5, i); cost('shield', 1, i); break;
        default: break;
      }
    } else if (s.suit === 'blood') {
      if (!rl('cold_blood')) addMult(1.5 + M.bloodMult, i);
      cost('hpLoss', 1 + M.bloodMult, i);
    } else if (s.suit === 'eye') {
      if (!rl('blind_eyes')) { addChips(6 + (R.player.sanity < 40 ? 3 : 0), i); d.peek += 1; }
    } else if (s.suit === 'tooth') {
      addChips(3 + c.grow, i); grow.push({ uid: c.uid, by: 1 + M.toothGrow, cap: 30 });
    } else if (s.suit === 'key') {
      addChips(4, i); cost('shield', 2, i);
    }
    // modificadores
    for (const m of c.mods || []) {
      if (m === 'edge') addChips(10, i);
      else if (m === 'red') addMult(4, i);
      else if (m === 'gold') cost('money', 3 + M.goldBonus, i);
      else if (m === 'glass') { addX(2, i); glass.push(c.uid); }
      else if (m === 'hex') { addChips(30, i); cost('sanity', -2, i); }
    }
  };
  let prev = null;
  for (const s of scoring) {
    if (s.c.sp && s.c.id === 'carta_doble') { if (prev) cardFx(prev, true); }
    else cardFx(s, false);
    if (!(s.c.sp && s.c.id === 'carta_doble')) prev = s;
  }
  if (M.flatChips) addChips(M.flatChips, -1);
  if (M.flatMult) addMult(M.flatMult, -1);

  // Jokers (de izquierda a derecha). Sus pasos llevan j:id para animar el joker que puntúa.
  const jokS = { scoring, cards, hand: ev.type, R, stake: stakeId, played: cards.length };
  for (const id of R.jokers || []) {
    const jk = JOKERS[id]; if (!jk) continue;
    const J = {
      addChips: v => { chips += v; push('chips', v, -3, { j: id }); },
      addMult: v => { mult += v; push('mult', v, -3, { j: id }); },
      addX: v => { xmult *= v; push('xmult', v, -3, { j: id }); },
      cost: (k, v) => { d[k] += v; push('cost', v, -3, { k, j: id }); }
    };
    jk.fx(jokS, J, R.jokerData || {});
  }

  // Combos propios (aditivos)
  const cnt = { blood: 0, eye: 0, tooth: 0, key: 0 };
  for (const s of scoring) for (const su of Object.keys(cnt)) if (s.c.suit === su || isWildSuit(s.c) || s.suit === su) cnt[su]++;
  const natural = uniq(scoring.map(s => s.c.suit));
  const puertas = scoring.length === 5 && scoring.reduce((a, s) => a + s.rank, 0) % 7 === 0;
  const combo = (id, fn) => { combos.push(id); steps.push({ t: 'combo', id, i: -1, chips, mult, xmult }); fn(); };
  if (cnt.eye >= 3) combo('mirada', () => { addChips(30, -1); d.peek += 3; });
  if (puertas) combo('puertas', () => { addChips(30, -1); addMult(7, -1); });
  else if (cnt.blood >= 3) combo('ritual', () => { addMult(6, -1); cost('hpLoss', 3, -1); });
  if (cnt.tooth >= 3) combo('deuda', () => { addMult(4 + Math.min(6, Math.floor((R.player.debt + d.debt) / 60)), -1); cost('debt', 15, -1); });
  if (cnt.key >= 3) combo('cerradura', () => { addChips(20, -1); cost('shield', 4, -1); });
  if (natural.length === 4) combo('arcoiris', () => { addMult(8, -1); cost('money', 5, -1); });

  // Apuesta
  const st = STAKES[stakeId] || STAKES.none;
  if (stakeId !== 'none') {
    addX(st.x + M.stakeBonus, -2);
    for (const [k, v] of Object.entries(st.cost)) { if (k === 'health') d.stakeHp += v; else if (k === 'sanity') d.sanity -= v; else if (k === 'debt') d.debt += v; else if (k === 'money') d.money -= v; }
  }
  // Reglas de oponente sobre el total
  let total = Math.floor(chips * mult * xmult);
  const notes = [];
  const hist = R.history || [];
  if (rl('no_repeat') && hist.length && hist[hist.length - 1] === ev.type) { total = Math.floor(total * 0.5); notes.push('no_repeat'); }
  if (rl('remember') && hist.includes(ev.type)) { total = Math.floor(total * 0.7); notes.push('remember'); }
  if (rl('drown')) { d.sanity -= 3; notes.push('drown'); }
  if (rl('tax')) { const pay = Math.min(5, R.player.money); d.money -= pay; d.debt += 5 - pay; notes.push('tax'); }
  // Fusionar costes
  // ESCUDO: lo que ya tenías + lo que ganan las cartas de esta jugada absorbe la Salud que cuestan TUS CARTAS (Sangre, Hambre…); el resto se pierde.
  // No absorbe el coste de las apuestas ni los efectos de los rivales.
  const shieldBefore = R.shield || 0, shieldTotal = shieldBefore + d.shield;
  const absorbed = Math.min(d.hpLoss, shieldTotal), hpNet = d.hpLoss - absorbed;
  const out = {
    shield: { before: shieldBefore, gain: d.shield, cost: d.hpLoss, absorbed, lost: hpNet, after: shieldTotal - absorbed },
    hand: ev.type, idx: ev.idx, total, chips, mult, xmult, steps, combos, notes, grow, glass,
    delta: {
      health: -(hpNet + d.stakeHp) + d.heal, sanity: d.sanity, debt: d.debt, money: d.money,
      shield: Math.max(0, shieldTotal - d.hpLoss) - (R.shield || 0), peek: d.peek
    }
  };
  return out;
}

// ---------------- Ronda ----------------
export function startRound(o) {
  const mods = o.mods || deriveMods(gs.inventory, o.perks);
  const rng = o.rng || rngFor(gs.run ? gs.run.seed : 1, 'round', o.key || 'x');
  const deck = gs.deck.slice();
  const draw = rng.shuffle(deck);
  const R = {
    key: o.key, rng, opp: o.opp || { id: 'gambler', rule: null }, rule: o.opp ? [].concat(o.opp.rule || []) : [], mods,
    levels: gs.handLevels, target: o.target, baseTarget: o.target, score: 0,
    playsLeft: mods.plays, discardsLeft: mods.discards, handSize: mods.handSize,
    drawPile: draw, hand: [], pocket: [], used: [], discard: [], history: [], shield: mods.shield0,
    peekN: 0, over: null, tutorial: !!o.tutorial, deaths: gs.deaths, hidden: new Set(), toolUsed: false,
    player: { health: gs.player.health, sanity: gs.player.sanity, money: gs.player.money, debt: gs.player.debt }
  };
  if (R.rule.includes('greedy')) R.target = Math.round(R.target * 1.2 / 5) * 5;
  if (o.rigged) { // tutorial: mano inicial amable (par de Ojos + cartas altas)
    const want = o.rigged.map(id => R.drawPile.findIndex(c => c.id === id)).filter(i => i >= 0);
    for (const i of want.sort((a, b) => b - a)) { const [c] = R.drawPile.splice(i, 1); R.drawPile.push(c); }
  }
  refill(R);
  return R;
}

function refill(R) {
  while (R.hand.length < R.handSize && R.drawPile.length) R.hand.push(R.drawPile.pop());
  R.hidden.clear();
  if (R.rule.includes('mist') && !R.mods.noFog) R.hand.slice(-2).forEach(c => R.hidden.add(c.uid));
  R.peekN = Math.min(R.peekN, R.drawPile.length);
}

const ctx = R => ({ levels: R.levels, mods: R.mods, rule: R.rule, history: R.history, shield: R.shield, deaths: R.deaths, playsLeft: R.playsLeft, jokers: gs.jokers.slice(), jokerData: gs.jokerData, player: { health: gs.player.health, maxHealth: gs.player.maxHealth, sanity: gs.player.sanity, money: gs.player.money, debt: gs.player.debt } });
const find = (R, uids) => uids.map(u => R.hand.find(c => c.uid === u) || R.pocket.find(c => c.uid === u)).filter(Boolean);

export function stakeAllowed(R, stakeId) {
  if (stakeId === 'none') return true;
  if (R.rule.includes('watched')) return false;
  const c = STAKES[stakeId].cost;
  if (c.health && gs.player.health <= c.health + 1) return false;
  if (c.sanity && gs.player.sanity <= c.sanity) return false;
  if (c.money && gs.player.money < c.money) return false;
  return true;
}

export function preview(R, uids, stakeId = 'none') {
  const cards = find(R, uids);
  if (!cards.length || cards.length > 5) return null;
  return resolvePlay(ctx(R), cards, stakeId);
}

export function play(R, uids, stakeId = 'none') {
  if (R.over || R.playsLeft <= 0) return null;
  const cards = find(R, uids);
  if (!cards.length || cards.length > 5) return null;
  if (!stakeAllowed(R, stakeId)) stakeId = 'none';
  const res = resolvePlay(ctx(R), cards, stakeId);
  res.stake = stakeId; if (stakeId !== 'none') R.stakeUsed = (R.stakeUsed || 0) + 1;
  // aplicar
  R.score += res.total; R.playsLeft--; R.history.push(res.hand);
  R.shield = Math.max(0, R.shield + res.delta.shield);
  R.peekN = Math.min(3, R.peekN + res.delta.peek);
  const p = gs.player;
  if (res.delta.health) addHealth(res.delta.health);
  if (res.delta.sanity) addSanity(res.delta.sanity);
  if (res.delta.debt) addDebt(res.delta.debt);
  if (res.delta.money > 0) addMoney(res.delta.money); else if (res.delta.money < 0) addMoney(res.delta.money);
  for (const g of res.grow) { const c = gs.deck.find(x => x.uid === g.uid) || cards.find(x => x.uid === g.uid); if (c) c.grow = Math.min(g.cap, c.grow + g.by); }
  res.broken = [];
  for (const u of res.glass) if (R.rng.chance(0.25)) { res.broken.push(u); const k = gs.deck.findIndex(c => c.uid === u); if (k >= 0) gs.deck.splice(k, 1); }
  if (R.rule.includes('interest')) R.target = Math.round(R.target * 1.08 / 5) * 5;
  // mover cartas
  for (const c of cards) {
    let k = R.hand.findIndex(x => x.uid === c.uid);
    if (k >= 0) R.hand.splice(k, 1); else { k = R.pocket.findIndex(x => x.uid === c.uid); if (k >= 0) R.pocket.splice(k, 1); }
    R.used.push(c);
  }
  refill(R);
  bus.emit('stats', {});
  if (R.score >= R.target) R.over = 'win';
  else if (R.playsLeft <= 0 || gs.player.health <= 0 || (!R.hand.length && !R.pocket.length)) R.over = 'lose';
  res.over = R.over;
  return res;
}

export function discard(R, uids) {
  if (R.over || R.discardsLeft <= 0) return false;
  const cards = find(R, uids);
  if (!cards.length || cards.length > 5) return false;
  for (const c of cards) {
    let k = R.hand.findIndex(x => x.uid === c.uid);
    if (k >= 0) R.hand.splice(k, 1); else { k = R.pocket.findIndex(x => x.uid === c.uid); if (k >= 0) R.pocket.splice(k, 1); }
    R.discard.push(c);
  }
  R.discardsLeft--; R.discardsMade = (R.discardsMade || 0) + 1;
  refill(R);
  if (!R.hand.length && !R.pocket.length) R.over = 'lose';
  return true;
}

export function stash(R, uid) {
  if (R.over || R.rule.includes('watched') || R.pocket.length >= R.mods.pocket) return false;
  const k = R.hand.findIndex(c => c.uid === uid);
  if (k < 0 || R.hidden.has(uid)) return false;
  R.pocket.push(R.hand.splice(k, 1)[0]);
  refill(R);
  return true;
}
export function unstash(R, uid) {
  const k = R.pocket.findIndex(c => c.uid === uid);
  if (k < 0 || R.hand.length >= R.handSize + R.mods.pocket) return false;
  R.hand.push(R.pocket.splice(k, 1)[0]);
  return true;
}

// Herramienta "sal": anula la regla del oponente durante la ronda.
export function useSalt(R) {
  if (!R.rule.length || R.over) return false;
  R.rule = []; R.hidden.clear(); R.target = R.baseTarget; return true;
}

// ---------------- Estimación de victoria (bot voraz) ----------------
export function bestPlay(R) {
  const pool = R.hand.concat(R.pocket).filter(c => !R.hidden.has(c.uid));
  let best = null;
  const n = pool.length, x = ctx(R);
  const pick = [];
  const rec = (start) => {
    if (pick.length) {
      const r = resolvePlay(x, pick.map(i => pool[i]), 'none');
      // El bot penaliza costes de vida ligeramente para no suicidarse
      const val = r.total + r.delta.health * 3 + r.delta.sanity * 2;
      if (!best || val > best.val) best = { val, total: r.total, uids: pick.map(i => pool[i].uid), hand: r.hand };
    }
    if (pick.length >= 5) return;
    for (let i = start; i < n; i++) { pick.push(i); rec(i + 1); pick.pop(); }
  };
  rec(0);
  return best;
}

function cloneRound(R, seed) {
  const cl = c => Object.assign({}, c, { mods: c.mods.slice() });
  const C = Object.assign({}, R, {
    rng: new RNG(seed), drawPile: R.drawPile.map(cl), hand: R.hand.map(cl), pocket: R.pocket.map(cl),
    used: [], discard: [], history: R.history.slice(), hidden: new Set(), over: null
  });
  return C;
}

export function estimateWin(R, n = 40) {
  const saved = { h: gs.player.health, s: gs.player.sanity, m: gs.player.money, d: gs.player.debt, deck: gs.deck, hist: gs.handLevels, pd: gs.pendingDeath };
  let wins = 0;
  muteBus(true);
  try {
    for (let k = 0; k < n; k++) {
      const C = cloneRound(R, 1000 + k * 7919);
      gs.deck = C.drawPile.concat(C.hand, C.pocket);
      gs.player.health = saved.h; gs.player.sanity = saved.s; gs.player.money = saved.m; gs.player.debt = saved.d;
      C.rng.shuffle(C.drawPile);
      C.hand = []; C.drawPile = C.rng.shuffle(C.drawPile.concat(R.hand.map(c => Object.assign({}, c)), R.pocket.map(c => Object.assign({}, c))));
      C.pocket = []; C.score = R.score; C.playsLeft = R.playsLeft; refill(C);
      let guard = 0;
      while (!C.over && guard++ < 12) {
        const b = bestPlay(C);
        if (!b) break;
        play(C, b.uids, 'none');
      }
      if (C.over === 'win') wins++;
    }
  } finally {
    gs.player.health = saved.h; gs.player.sanity = saved.s; gs.player.money = saved.m; gs.player.debt = saved.d; gs.deck = saved.deck; gs.handLevels = saved.hist; gs.pendingDeath = saved.pd;
    muteBus(false);
    bus.emit('stats', {});
  }
  return wins / n;
}

// Resultado final de una ronda ganada / perdida (los aplica game.js)
export function roundRewards(R, row) {
  const left = Math.max(0, R.playsLeft);
  let money = 12 + eqRow(row) * 3 + left * 2 + R.mods.winMoney;
  if (R.rule.includes('greedy')) money = Math.round(money * 1.5);
  return { money };
}
export function failCost(row, kind) {
  const k = kind === 'boss' || kind === 'final' ? 1.5 : 1;
  return { health: Math.round((10 + eqRow(row) * 2.5) * k), sanity: kind === 'boss' ? 10 : 6, debt: Math.round(15 * k) };
}
export { makeCard };
