// Efectos, condiciones, generación de partidas y reglas de meta-progresión. Sin DOM.
import { gs, replaceState, addMoney, addSanity, addHealth, addDebt, addDestiny, rel, hasItem, hasCard, hasTool, know, flag, bus, clamp } from './state.js';
import { RNG, rngFor, newSeed } from './rng.js';
import { baseDeck, makeCard, SPECIAL_IDS, CURSED_IDS, MODS, HAND_ORDER } from './cards.js';
import { ITEMS, ITEM_PRICE, TOOLS, MAX_TOOLS, EVENTS, CHAINS, MEMORIES, MEMORY_ORDER, ENDINGS, ENDING_ORDER, DEALER_CLUES, CHARACTERS, GENERIC_OPPS, DUEL_FOES, SECRET_EVENTS, WING_INFO, WING_OPPS, WING_FOES, GAMBLERS, eventPool, perksFrom } from './content.js';
import { onJokers, onCollapse } from './achievements.js';
import { OPP_RULES } from './combat.js';
import { JOKERS, MAX_JOKERS, pickJoker, jokerSellPrice } from './jokers.js';
import { generateMap, WINGS } from './map.js';
import { eqRow } from './scale.js';

export const perks = () => perksFrom(gs.meta.memories);

// ---------------- Condiciones ----------------
export function check(c) {
  if (!c || !c.length) return true;
  const [k, a, b] = c;
  switch (k) {
    case 'know': return know(a);
    case 'flag': return flag(a);
    case 'item': return hasItem(a);
    case 'deaths': return gs.deaths >= a;
    case 'money': return gs.player.money >= a;
    case 'sanityLt': return gs.player.sanity < a;
    case 'debtGt': return gs.player.debt > a;
    case 'seen': return gs.discoveredEvents.includes(a);
    case 'clues': return DEALER_CLUES.filter(x => know(x)).length >= a;
    case 'chars': return gs.discoveredCharacters.length >= a;
    case 'runs': return gs.meta.runsFinished >= a;
    case 'cleared': return gs.meta.wingsCleared.length >= a;
    case 'endings': return gs.meta.endings.filter(e => e !== 'verdad').length >= a;
    default: return false;
  }
}
export function checkReq(req) { if (!req || !req.length) return true; return Array.isArray(req[0]) ? req.every(check) : check(req); }

// ---------------- Efectos ----------------
const fxRng = () => rngFor(gs.run ? gs.run.seed : 1, 'fx', gs.run ? (gs.run.step = (gs.run.step || 0) + 1) : 0);

export function addToDeck(id) { const c = makeCard(id); gs.deck.push(c); return c; }
export function addTool(id) {
  if (gs.tools.length >= MAX_TOOLS) { addMoney(Math.floor(TOOLS[id].price / 2)); return false; }
  gs.tools.push(id); return true;
}
export function addJoker(id) {
  if (!JOKERS[id] || gs.jokers.includes(id)) return false;
  if (gs.jokers.length >= MAX_JOKERS) { addMoney(jokerSellPrice(id)); return false; }   // sin hueco: se vende por la mitad
  gs.jokers.push(id); onJokers(); return true;
}
export function sellJoker(index) {
  const id = gs.jokers[index]; if (!id) return 0;
  gs.jokers.splice(index, 1); const v = jokerSellPrice(id); addMoney(v); return v;
}
export const jokerSlotFree = () => gs.jokers.length < MAX_JOKERS;
export function levelUp(type) { gs.handLevels[type] = (gs.handLevels[type] || 0) + 1; bus.emit('levelup', { type }); return type; }
export function discoverCharacter(id) { if (id && !gs.discoveredCharacters.includes(id)) gs.discoveredCharacters.push(id); }
export function learn(id) { if (!gs.meta.knowledge.includes(id)) { gs.meta.knowledge.push(id); return true; } return false; }

export function applyEffects(list, opts = {}) {
  const rng = opts.rng || fxRng(); const out = [];
  for (const fx of list || []) {
    const [k, a, b, c] = fx;
    switch (k) {
      case 'money': { const v = addMoney(a); if (v) out.push({ k, v }); break; }
      case 'sanity': { const v = addSanity(a); if (v) out.push({ k, v }); break; }
      case 'health': { const v = addHealth(a); if (v) out.push({ k, v }); break; }
      case 'debt': { const v = addDebt(a); if (v) out.push({ k, v }); break; }
      case 'destiny': addDestiny(a); break;
      case 'flag': gs.flags[a] = true; break;
      case 'runflag': gs.runFlags[a] = true; break;
      case 'know': out.push({ k, id: a, isNew: learn(a) }); break;
      case 'rel': { const r = rel(a); r.trust += b || 0; r.fear += c || 0; discoverCharacter(a); break; }
      case 'card': {
        let id = a;
        if (a === 'random') { const pool = SPECIAL_IDS.filter(i => !CURSED_IDS.includes(i)); id = rng.pick(pool); }
        addToDeck(id); out.push({ k, id }); break;
      }
      case 'mod': { const cs = gs.deck.filter(x => !x.mods.includes(a === 'random' ? '_' : a)); if (cs.length) { const card = rng.pick(cs); const m = a === 'random' ? rng.pick(MODS) : a; card.mods.push(m); out.push({ k, id: m, uid: card.uid }); } break; }
      case 'item': if (!hasItem(a)) { gs.inventory.push(a); out.push({ k, id: a }); } break;
      case 'tool': out.push({ k, id: a, ok: addTool(a) }); break;
      case 'level': { const t = a === 'random' ? rng.pick(['pair', 'twopair', 'three', 'straight', 'flush', 'full']) : a; levelUp(t); out.push({ k, id: t }); break; }
      case 'remove': { const base = gs.deck.filter(x => !x.sp); if (base.length > 20) { const x = rng.pick(base); gs.deck.splice(gs.deck.indexOf(x), 1); out.push({ k, id: x.id }); } break; }
      case 'gamble': { const won = rng.chance(a); out.push({ k, won }); out.push(...applyEffects(won ? b : c, { rng })); break; }
      case 'boss': out.push({ k, id: a }); break;
      case 'joker': { const id = a === 'random' ? pickJoker(rng, gs.jokers, gs.run ? gs.run.nodes : 0) : a; if (id) out.push({ k, id, ok: addJoker(id) }); break; }
      default: console.warn('efecto desconocido', fx);
    }
  }
  return out;
}

// ---------------- Eventos ----------------
// Resuelve el id real de un evento del mapa ("chain:girl" -> el primer capítulo sin ver).
export function resolveEvent(slot, rng) {
  const ok = id => { const e = EVENTS[id]; return e && (!e.req || checkReq(e.req)); };
  if (slot && slot.startsWith('chain:')) {
    const list = CHAINS[slot.slice(6)];
    const next = list.find(id => !gs.discoveredEvents.includes(id) && ok(id));
    if (next) return next;
    const seen = list.filter(ok);
    if (seen.length && rng.chance(0.4)) return rng.pick(seen);
    return rng.pick(['mirror_hall', 'wet_footprints', 'dice_pit', 'debt_collector', 'moon_window']);
  }
  if (ok(slot)) return slot;
  return rng.pick(['mirror_hall', 'dice_pit', 'debt_collector', 'old_photograph']);
}

// ---------------- Partida ----------------
export const HAND_START_LEVELS = {};
export function secretUnlocked() {
  return hasItem('llave_hueso') || gs.player.sanity < 25 || gs.player.debt > 400 || gs.deaths >= 2 || hasCard('la_mujer') || flag('room13_hint');
}
export function wingUnlocked(w) { const i = WING_INFO[w]; return !!i && check(i.req); }

export function pools(wing) {
  return { events: eventPool(wing), opps: GENERIC_OPPS.concat(WING_OPPS[wing] || []), gamblers: GAMBLERS, rules: OPP_RULES, duelFoes: DUEL_FOES.concat(WING_FOES[wing] || []), secretEvents: SECRET_EVENTS };
}

export function startRun(wing = 'salon') {
  const P = perks();
  const seed = newSeed();
  const keepFlags = gs.flags, keepRel = gs.relationships, keepDisc = gs.discoveredCharacters, keepEv = gs.discoveredEvents;
  gs.run = { seed, wing, map: null, pos: null, visited: [], step: 0, uid: 0, nodes: 0, rounds: 0, phase: 'map', finalStage: 0, dead: false };
  gs.run.map = generateMap(seed, wing, pools(wing));
  gs.deck = baseDeck();
  for (const c of P.cards) addToDeck(c);
  gs.inventory = []; gs.tools = P.tools.slice(0, MAX_TOOLS); gs.handLevels = {}; gs.jokers = []; gs.jokerData = {};
  for (const l of P.levels) levelUp(l);
  gs.runFlags = {}; gs.pendingDeath = false;
  const p = gs.player;
  p.maxHealth = 100 + P.maxHealth; p.health = p.maxHealth; p.sanity = 100; p.lives = 1;
  p.money = 50 + P.money; p.debt = gs.meta.carryDebt || 0;
  gs.meta.runsStarted++;
  gs.runNumber = gs.meta.runsStarted;
  bus.emit('stats', {});
  return gs.run;
}

// Interés de la deuda al terminar cada nodo.
export function nodeInterest() {
  const p = gs.player; if (p.debt <= 0) return 0;
  const k = 0.03 * eqRow(1) * (hasItem('libro_cuentas') ? 0.5 : 1) * (hasItem('reloj_parado') ? 1.5 : 1) * perks().interest;
  const v = Math.max(1, Math.ceil(p.debt * k)); addDebt(v); return v;
}
// Recargo de la Casa por deuda alta: +5% del objetivo por cada 100 sobre 200 (máx. 25%).
export function debtSurcharge() { return clamp(Math.floor((gs.player.debt - 200) / 100) * 0.05, 0, 0.25); }

export function collapseIfNeeded() {
  if (gs.player.sanity <= 0) { addSanity(25); addHealth(-20); onCollapse(); return true; }
  return false;
}

// Objetos que evitan la muerte
export function tryRevive() {
  const p = gs.player;
  if (p.health > 0) return false;
  if (hasTool('vela_corta')) { gs.tools.splice(gs.tools.indexOf('vela_corta'), 1); p.health = Math.round(p.maxHealth * 0.4); addSanity(-10); gs.pendingDeath = false; return 'candle'; }
  if (p.lives > 1) { p.lives--; p.health = Math.round(p.maxHealth * 0.4); gs.pendingDeath = false; return 'life'; }
  return false;
}

export function checkMemories() {
  const m = gs.meta, st = m.stats, got = [];
  const cond = {
    m01: () => gs.deaths >= 1, m02: () => gs.deaths >= 3, m03: () => gs.deaths >= 7,
    m04: () => st.bossesDown.includes('girl'), m05: () => st.bossesDown.includes('chair'), m06: () => st.bossesDown.includes('drowned'), m07: () => st.bossesDown.includes('child'),
    m08: () => st.anomalies >= 1, m09: () => st.duelsWon >= 3, m10: () => (st.maxDebt || 0) >= 500, m11: () => know('k_room13'), m12: () => m.endings.length >= 1
  };
  for (const id of MEMORY_ORDER) if (!m.memories.includes(id) && cond[id]()) { m.memories.push(id); got.push(id); }
  return got;
}

// Muerte: la partida no termina. Se conserva lo aprendido y parte de la deuda.
export function registerDeath() {
  const m = gs.meta, p = gs.player;
  gs.deaths++; m.runsFinished++;
  m.stats.maxDebt = Math.max(m.stats.maxDebt || 0, p.debt);
  const summary = { debt: p.debt, carry: Math.floor(p.debt * 0.5) + 20, nodes: gs.run ? gs.run.nodes : 0, wing: gs.run ? gs.run.wing : 'salon', row: 0 };
  m.carryDebt = summary.carry; m.lastRun = summary;
  gs.run = null; gs.pendingDeath = false;
  const mem = checkMemories();
  return { summary, memories: mem };
}

export function registerEnding(id) {
  const m = gs.meta; m.runsFinished++;
  if (!m.endings.includes(id)) m.endings.push(id);
  m.stats.maxDebt = Math.max(m.stats.maxDebt || 0, gs.player.debt);
  m.carryDebt = Math.floor(gs.player.debt * 0.3);
  gs.run = null;
  return { memories: checkMemories() };
}

export function endingChoices() {
  return ENDING_ORDER.filter(id => id !== 'verdad' || gs.meta.endings.filter(e => e !== 'verdad').length >= 5 || gs.meta.endings.includes('verdad')).map(id => ({ id, ok: checkReq(ENDINGS[id].req), seen: gs.meta.endings.includes(id) }));
}

// ---------------- Recompensas y tienda ----------------
export function rewardChoices(rng, row, boss) {
  if (boss) {
    const left = ITEMS.filter(i => !hasItem(i));
    const picks = rng.shuffle(left).slice(0, 3).map(id => ({ type: 'item', id }));
    if (picks.length >= 2 && jokerSlotFree()) { const j = pickJoker(rng, gs.jokers, row, true); if (j) picks[picks.length - 1] = { type: 'joker', id: j }; }
    return picks.length ? picks : [{ type: 'card', id: rng.pick(SPECIAL_IDS.filter(i => !CURSED_IDS.includes(i))) }];
  }
  const out = [];
  const pool = SPECIAL_IDS.filter(i => CURSED_IDS.includes(i) ? (eqRow(row) >= 3 && rng.chance(0.25)) : true);
  out.push({ type: 'card', id: rng.pick(pool.length ? pool : SPECIAL_IDS) });
  out.push({ type: 'level', hand: rng.pick(['pair', 'twopair', 'three', 'straight', 'flush', 'full']) });
  const jk = jokerSlotFree() && rng.chance(0.4) ? pickJoker(rng, gs.jokers, row, false) : null;
  if (jk) out.push({ type: 'joker', id: jk });
  else { const c = rng.pick(gs.deck), m = rng.pick(MODS); out.push({ type: 'mod', uid: c.uid, card: c.id, mod: m }); }
  return out;
}
export function takeReward(r) {
  if (r.type === 'card') addToDeck(r.id);
  else if (r.type === 'level') levelUp(r.hand);
  else if (r.type === 'mod') { const c = gs.deck.find(x => x.uid === r.uid); if (c && !c.mods.includes(r.mod)) c.mods.push(r.mod); }
  else if (r.type === 'item') { if (!hasItem(r.id)) gs.inventory.push(r.id); }
  else if (r.type === 'joker') addJoker(r.id);
}

export function merchantStock(rng, row) {
  const items = rng.shuffle(ITEMS.filter(i => !hasItem(i))).slice(0, 2).map(id => ({ kind: 'item', id, price: ITEM_PRICE[id] }));
  const tool = rng.pick(Object.keys(TOOLS));
  const card = rng.pick(SPECIAL_IDS.filter(i => !CURSED_IDS.includes(i)));
  const jk = pickJoker(rng, gs.jokers, row, false);
  return [
    ...items,
    ...(jk ? [{ kind: 'joker', id: jk, price: JOKERS[jk].price }] : []),
    { kind: 'tool', id: tool, price: TOOLS[tool].price },
    { kind: 'card', id: card, price: 40 },
    { kind: 'heal', price: 30 }, { kind: 'level', price: 40 }, { kind: 'remove', price: 25 }
  ];
}
export function buy(entry, rng) {
  const p = gs.player; if (p.money < entry.price) return false;
  if (entry.kind === 'tool' && gs.tools.length >= MAX_TOOLS) return false;
  if (entry.kind === 'item' && hasItem(entry.id)) return false;
  if (entry.kind === 'joker' && (!jokerSlotFree() || gs.jokers.includes(entry.id))) return false;
  if (entry.kind === 'remove' && gs.deck.filter(c => !c.sp).length <= 20) return false;
  addMoney(-entry.price);
  if (entry.kind === 'item') gs.inventory.push(entry.id);
  else if (entry.kind === 'tool') addTool(entry.id);
  else if (entry.kind === 'joker') addJoker(entry.id);
  else if (entry.kind === 'card') addToDeck(entry.id);
  else if (entry.kind === 'heal') addHealth(35);
  else if (entry.kind === 'level') levelUp(rng.pick(['pair', 'twopair', 'three', 'straight', 'flush', 'full']));
  else if (entry.kind === 'remove') applyEffects([['remove']], { rng });
  return true;
}
