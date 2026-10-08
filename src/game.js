// game.js — ORQUESTADOR del juego (sin DOM). [PROCESO A]
// Máquina de vistas: cada acción devuelve la NUEVA VISTA (y además emite bus 'view'). La UI solo dibuja `view` y llama a acciones.
// Las vistas llevan CLAVES i18n (no textos) para que el cambio de idioma en caliente funcione: la UI llama a t().
//
// Eventos del bus (import { bus } from './state.js'):
//   'view' (vista)     'stats' ({k,v})     'lang' (l)
//   'sfx' ({name})     → nombres de sfx.js (card_play, chip, hurt, glitch, door, knock, shot, click_empty, gun_load, whisper, sting, victory, defeat, unlock, memory, heal, bet, confirm, deny, swipe…)
//   'toast' ({key, vars, kind})   → aviso breve (kind: 'info'|'good'|'bad'|'memory')
//   'memory' ({id})    → recuerdo recién obtenido
//
// Toda vista tiene: { type, hud, music } donde music ∈ estados de music.js (menu, exploration, dialogue, normal_gameplay, high_stakes,
// roulette, boss, horror, low_sanity, victory, defeat, secret, true_ending) y hud = hud().
//
// VISTAS (view.type) y acciones que las hacen avanzar:
//  'menu'         {}                                   ← game.toMenu()
//  'intro'        {lines:[claves intro.*]}            → game.introDone()
//  'wings'        {wings:[{id,unlocked,cleared,boss}]} → game.pickWing(id)
//  'map'          {map, pos, avail:[ids], visited, secretVisible, wing, row}  → game.chooseNode(id)
//  'event'        {id, who, bg, phase:'choose', title, text, options:[{k:'a'|'b'|'h', key, hidden}]}      → game.eventChoose(k)
//                 {…, phase:'result', textKey, outcomes:[{k,v|id|isNew|won}], redo:[{via,cost}]}         → game.eventRedo(via) | game.eventContinue()
//  'round'        {R, opp:{id,rule[],nameKey}, kind:'game'|'boss'|'final', tutorial, hintKey, odds, target, row}
//                    acciones: roundPreview(uids,stake) roundPlay(uids,stake) roundDiscard(uids) roundStash(uid) roundUnstash(uid) roundStashMany(uids) roundUnstashMany(uids) roundSalt()
//                    cuando R.over ≠ null → game.roundFinish()
//  'round_result' {won, rewards, costs, lineKey}      → game.resultContinue()
//  'reward'       {choices:[{type,id|hand|uid,mod}], boss}   → game.rewardPick(i) | game.rewardSkip()
//  'duel_setup'   {foe, stakes:[{type,value,ok}], first, hintKey} → game.duelStart(stakeType)
//  'duel'         {D, foe, tools:[ids], hintKey, final}       → duelShoot('foe'|'table') duelListen() duelTool(id); D.over ≠ null → game.duelFinish()
//  'duel_result'  {won, lineKey, deltas}              → game.resultContinue()
//  'merchant'     {stock:[{kind,id,price,sold,can}]}  → game.buy(i) | game.leaveShop()
//  'rest'         {options:[{k,ok,…}]}                → game.restChoose(k)
//  'boss_intro'   {boss, lineKey}                     → game.bossStart()
//  'finale'       {stage:1|2, lineKeys[]}             → game.finaleContinue()
//  'door'         {choices:[{id,ok,seen}]}            → game.doorChoose(id)
//  'ending'       {id, first, memories, endingsSeen, trueOpen} → game.endingDone()
//  'death'        {carry, debt, memories, knowledge, deaths}    → game.afterDeath()
//  'archive'      {…archiveData()}                    ← game.openArchive() / game.toMenu()
import { gs, bus, replaceState, settings, addMoney, addSanity, addHealth, addDebt, sanityTier, hasItem, hasTool, know, flag, rel } from './state.js';
import { RNG, rngFor } from './rng.js';
import * as C from './combat.js';
import * as S from './shotgun.js';
import * as FX from './effects.js';
import { EVENTS, BOSSES, CHARACTERS, WING_INFO, TOOLS, MEMORY_ORDER, KNOWLEDGE, ENDING_ORDER, MAX_TOOLS } from './content.js';
import * as ACH from './achievements.js';
import * as MIS from './missions.js';
import { WINGS, nodeById, available } from './map.js';
import { SPECIAL_IDS, CURSED_IDS } from './cards.js';
import { MAX_JOKERS, onRoundWon } from './jokers.js';
import { saveGame, loadGame, resetProgress, hasSave, saveSettings } from './save.js';
import { ROWS } from './scale.js';

// ---------------- Estado transitorio (NO se guarda) ----------------
export const G = { view: null, R: null, D: null, node: null, ev: null, snap: null, rewardCtx: null, shop: null, tut: { plays: 0, discards: 0 }, lastDuel: null, pendingBoss: null };

const sfx = name => bus.emit('sfx', { name });
const toast = (key, vars, kind = 'info') => bus.emit('toast', { key, vars, kind });

export function hud() {
  const p = gs.player;
  return {
    health: p.health, maxHealth: p.maxHealth, sanity: p.sanity, money: p.money, debt: p.debt, lives: p.lives,
    tier: sanityTier(), tools: gs.tools.slice(), items: gs.inventory.slice(), jokers: gs.jokers.slice(), deck: gs.deck.length,
    run: gs.runNumber, deaths: gs.deaths, wing: gs.run ? gs.run.wing : null, row: currentRow(), levels: Object.assign({}, gs.handLevels),
    guide: guideActive()   // el botón «?» de la guía late en el tutorial y mientras se ve la primera pista del mapa
  };
}
function currentRow() { const r = gs.run; if (!r || !r.pos || !r.map) return -1; const n = nodeById(r.map, r.pos); return n ? n.row : -1; }

function setView(v) {
  v.hud = hud();
  if (!v.music) v.music = 'exploration';
  G.view = v;
  bus.emit('view', v);
  return v;
}
export const getView = () => G.view;

// ---------------- Menú / nueva partida / continuar ----------------
let bootLoaded = false;
export function menuState() {
  // Al abrir el juego el estado aún está vacío: se lee la partida guardada UNA vez para que el menú (Archivo, Continuar…) refleje el progreso real.
  if (!bootLoaded) { bootLoaded = true; if (!gs.run && gs.deaths === 0 && hasSave()) loadGame(); }
  return {
    hasSave: hasSave(), runInProgress: !!(gs.run), deaths: gs.deaths, endings: gs.meta.endings.slice(), run: gs.runNumber,
    secretButton: archiveUnlocked(), archive: archiveUnlocked(), introSeen: gs.meta.introSeen
  };
}
// El Archivo (historia de los personajes, recuerdos, conocimiento, secretos y datos) se abre tras tu PRIMERA muerte, al ver un final o al saber que alguien te mira
export const archiveUnlocked = () => gs.deaths >= 1 || gs.meta.endings.length >= 1 || know('k_watcher');
export const secretButtonVisible = archiveUnlocked;   // nombre antiguo
export function toMenu() { return setView({ type: 'menu', music: 'menu' }); }

export function newGame() {
  // Con progreso existente: nueva PARTIDA (descenso) conservando recuerdos, conocimiento y finales.
  if (hasSave() && loadGame() && gs.meta.introSeen) {
    G.R = G.D = G.node = G.ev = null; gs.run = null; gs.pendingDeath = false;
    return chooseWing();
  }
  return freshStart();
}
function freshStart() {
  const lang = gs.language;
  resetProgress();
  gs.language = lang;
  G.R = G.D = G.node = G.ev = null;
  saveGame();
  return setView({ type: 'intro', lines: ['intro.1', 'intro.2', 'intro.3', 'intro.4', 'intro.5', 'intro.6'], music: 'menu' });
}
// REINICIAR PROGRESO: borra todo (la UI pide confirmación).
export function resetAll() { resetProgress(); ACH.resetEggs(); saveSettings(); G.R = G.D = G.node = G.ev = null; return toMenu(); }
export function introDone() {
  gs.meta.introSeen = true; saveGame();
  return chooseWing();
}
export function continueGame() {
  if (!loadGame()) return freshStart();
  G.R = G.D = G.node = G.ev = null;
  if (!gs.meta.introSeen && !gs.run && gs.deaths === 0 && gs.meta.runsStarted === 0) return freshStart();
  if (!gs.run) return chooseWing();
  return resumeRun();
}

export function chooseWing() {
  const list = Object.keys(WINGS).map(id => ({ id, unlocked: FX.wingUnlocked(id), cleared: gs.meta.wingsCleared.includes(id), boss: WINGS[id].boss, bg: WINGS[id].bg, req: WING_INFO[id] ? WING_INFO[id].req : [] }));
  const open = list.filter(w => w.unlocked);
  if (open.length <= 1) return beginRun(open[0] ? open[0].id : 'salon');
  return setView({ type: 'wings', wings: list, music: 'menu' });
}
export function pickWing(id) {
  if (!FX.wingUnlocked(id)) { sfx('deny'); return G.view; }
  return beginRun(id);
}
export function beginRun(wing) {
  FX.startRun(wing); MIS.begin(wing);
  G.R = G.D = G.node = G.ev = null;
  G.tut = { plays: 0, discards: 0 };
  saveGame();
  return showMap();
}

// Reanudar tras recargar: el nodo pendiente se considera abandonado (anti-repetición de tiradas).
function resumeRun() {
  const run = gs.run;
  if (run.phase === 'door') return showDoor();
  if (run.phase === 'finale') { run.attempt = (run.attempt || 0) + 1; return finaleView(run.finalStage || 1); }
  if (run.pending) {
    const node = nodeById(run.map, run.pending);
    run.pending = null;
    if (node) {
      const kind = node.kind;
      const fc = C.failCost(node.row, kind === 'boss' ? 'boss' : 'game');
      addHealth(-Math.round(fc.health / 2)); addDebt(Math.round(fc.debt / 2));
      toast('fx.abandoned', null, 'bad');
      if (kind === 'boss') { run.attempt = (run.attempt || 0) + 1; run.pos = pickPrev(node); if (checkDeath()) return G.view; return enterBoss(node); }
      if (checkDeath()) return G.view;
      return finishNode();
    }
  }
  return showMap();
}
function pickPrev(node) { return gs.run.pos; }

// ---------------- Mapa ----------------
// Pistas de una sola vez: la primera vez que aparece cada tipo de pantalla se añade una pista del Crupier a la vista (hintKey).
// peekHint() solo consulta; la interfaz llama a markHint() cuando la ha mostrado de verdad, y entonces no vuelve a salir
// (se guarda en la meta del perfil: sobrevive a muertes y a NUEVA PARTIDA; REINICIAR PROGRESO la borra).
function peekHint(name) { const h = gs.meta.hints; return h && h[name] ? null : 'hint.' + name; }
// ¿Hay que recordar dónde está la guía? Durante el tutorial y la primera pista del mapa, hasta que se abra la guía una vez (indicador del interfaz, no del Crupier)
export function guideActive() { return !(gs.meta.hints && gs.meta.hints.guide) && (!!(G.R && G.R.tutorial) || (!!gs.run && !(gs.meta.hints && gs.meta.hints.map))); }
export function markHint(key) { const name = String(key).replace(/^hint\./, ''); if (!gs.meta.hints) gs.meta.hints = {}; gs.meta.hints[name] = true; }

export function showMap() {
  const run = gs.run;
  run.phase = 'map'; MIS.ensure();
  const avail = available(run.map, run.pos, FX.secretUnlocked());
  return setView({
    type: 'map', map: run.map, pos: run.pos, visited: run.visited.slice(), avail, secretVisible: FX.secretUnlocked(),
    wing: run.wing, row: currentRow(), missions: MIS.list(), hintKey: peekHint('map'), music: gs.player.sanity < 25 ? 'low_sanity' : 'exploration'
  });
}

export function chooseNode(id) {
  const run = gs.run;
  if (!run || run.pending) return G.view;
  const avail = available(run.map, run.pos, FX.secretUnlocked());
  if (!avail.includes(id)) { sfx('deny'); return G.view; }
  const node = nodeById(run.map, id);
  run.pos = id; run.pending = id; run.visited.push(id); run.attempt = 0;
  G.node = node;
  saveGame();
  sfx('door');
  switch (node.kind) {
    case 'game': return enterRound(node);
    case 'event': case 'secret': return enterEvent(node);
    case 'shotgun': return enterDuelSetup(node);
    case 'merchant': return enterMerchant(node);
    case 'rest': return enterRest(node);
    case 'boss': return enterBoss(node);
    default: return finishNode();
  }
}

// Fin de un nodo: interés de deuda, coste de objetos, muerte, colapso, jefe → final.
export function finishNode() {
  const run = gs.run;
  run.pending = null;
  const node = G.node || (run.pos ? nodeById(run.map, run.pos) : null);
  const interest = FX.nodeInterest();
  if (interest) toast('fx.interest', { n: interest }, 'bad');
  if (hasItem('ceniza')) addSanity(-1);
  run.nodes++; gs.storyProgress++;
  if (FX.collapseIfNeeded()) { toast('fx.collapse', null, 'bad'); sfx('glitch'); }
  if (checkDeath()) return G.view;
  if (node && node.kind === 'boss' && run.wing && WINGS[run.wing].boss === node.opp.id) { return startFinale(); }
  saveGame();
  return showMap();
}

// ---------------- Muerte ----------------
export function checkDeath() {
  const p = gs.player;
  if (p.health > 0) { gs.pendingDeath = false; return false; }
  const rv = FX.tryRevive();
  if (rv) { toast(rv === 'candle' ? 'fx.revive_candle' : 'fx.revive_life', null, 'good'); sfx('heal'); return false; }
  die();
  return true;
}
function die() {
  const r = FX.registerDeath();
  G.R = G.D = G.node = G.ev = null;
  saveGame();
  sfx('defeat');
  for (const m of r.memories) bus.emit('memory', { id: m });
  return setView({
    type: 'death', carry: r.summary.carry, debt: r.summary.debt, memories: r.memories, allMemories: gs.meta.memories.slice(),
    knowledge: gs.meta.knowledge.slice(), deaths: gs.deaths, nodes: r.summary.nodes, music: 'defeat'
  });
}
export function afterDeath() { return chooseWing(); }

// ---------------- Eventos ----------------
export function enterEvent(node) {
  const run = gs.run;
  let id;
  if (!gs.discoveredEvents.includes('first_chip') && node.row === 0 && node.kind === 'event') id = 'first_chip';
  else id = FX.resolveEvent(node.ev, rngFor(run.seed, 'ev', node.id, run.attempt || 0));
  if (!EVENTS[id]) id = 'mirror_hall';
  return showEvent(id, node);
}
function showEvent(id, node) {
  const ev = EVENTS[id];
  G.ev = { id, node };
  if (ev.who) FX.discoverCharacter(ev.who);
  const opts = [{ k: 'a', key: 'event.' + id + '.a' }, { k: 'b', key: 'event.' + id + '.b' }];
  if (ev.hid && FX.checkReq(ev.hid.req)) opts.push({ k: 'h', key: 'event.' + id + '.h', hidden: true });
  const secret = !!(ev.secret || node.kind === 'secret');
  return setView({
    type: 'event', id, who: ev.who || null, bg: ev.bg || 'corridor', phase: 'choose', hintKey: peekHint('event'),
    titleKey: 'event.' + id + '.title', textKey: 'event.' + id + '.text', options: opts, secret,
    music: secret ? 'secret' : (gs.player.sanity < 25 ? 'horror' : 'dialogue')
  });
}
const snapshot = () => JSON.stringify({ player: gs.player, deck: gs.deck, inventory: gs.inventory, tools: gs.tools, jokers: gs.jokers, jokerData: gs.jokerData, handLevels: gs.handLevels, flags: gs.flags, runFlags: gs.runFlags, rels: gs.relationships, destiny: gs.destiny, know: gs.meta.knowledge, disc: gs.discoveredCharacters });
function restore(s) {
  const o = JSON.parse(s);
  Object.assign(gs.player, o.player); gs.deck = o.deck; gs.inventory = o.inventory; gs.tools = o.tools; gs.jokers = o.jokers || []; gs.jokerData = o.jokerData || {}; gs.handLevels = o.handLevels;
  gs.flags = o.flags; gs.runFlags = o.runFlags; gs.relationships = o.rels; gs.destiny = o.destiny; gs.meta.knowledge = o.know; gs.discoveredCharacters = o.disc;
  bus.emit('stats', {});
}
export function eventChoose(k) {
  const cur = G.ev; if (!cur || !G.view || G.view.phase !== 'choose') return G.view;
  const ev = EVENTS[cur.id];
  let list, rkey;
  if (k === 'a') { list = ev.a; rkey = 'ra'; }
  else if (k === 'b') { list = ev.b; rkey = 'rb'; }
  else if (k === 'h' && ev.hid && FX.checkReq(ev.hid.req)) { list = ev.hid.fx; rkey = 'rh'; }
  else { sfx('deny'); return G.view; }
  G.snap = snapshot(); G.lastChoice = k;
  const outcomes = FX.applyEffects(list);
  sfx(k === 'a' ? 'swipe' : 'swipe');
  for (const o of outcomes) { if (o.k === 'know' && o.isNew) { sfx('unlock'); } }
  const redo = [];
  if (hasItem('espejo_roto') && !gs.runFlags.mirror_used && gs.player.sanity > 5) redo.push({ via: 'espejo_roto', cost: { sanity: 5 } });
  if (hasItem('ficha_negra')) redo.push({ via: 'ficha_negra', cost: { debt: 50 } });
  const boss = outcomes.find(o => o.k === 'boss');
  return setView({
    type: 'event', id: cur.id, who: ev.who || null, bg: ev.bg || 'corridor', phase: 'result', choice: k,
    titleKey: 'event.' + cur.id + '.title', textKey: 'event.' + cur.id + '.' + rkey, outcomes, redo, boss: boss ? boss.id : null,
    music: G.view.music
  });
}
export function eventRedo(via) {
  const cur = G.ev; if (!cur || !G.view || G.view.phase !== 'result' || !G.snap) return G.view;
  const r = G.view.redo.find(x => x.via === via); if (!r) { sfx('deny'); return G.view; }
  restore(G.snap); G.snap = null;
  if (via === 'espejo_roto') { gs.runFlags.mirror_used = true; addSanity(-5); }
  if (via === 'ficha_negra') addDebt(50);
  sfx('glitch');
  return showEvent(cur.id, cur.node);
}
export function eventContinue() {
  const cur = G.ev; if (!cur || !G.view || G.view.phase !== 'result') return G.view;
  if (!gs.discoveredEvents.includes(cur.id)) gs.discoveredEvents.push(cur.id);
  MIS.track('event', { id: cur.id });
  const bossId = G.view.boss;
  G.ev = null; G.snap = null;
  if (checkDeath()) return G.view;
  if (bossId) { G.pendingBoss = bossId; return enterBoss({ id: cur.node.id, row: cur.node.row, kind: 'boss', opp: { id: bossId }, hidden: true }); }
  return finishNode();
}

// ---------------- Rondas de cartas ----------------
const TUT_RIG = ['eye_08', 'blood_08', 'eye_03', 'eye_05', 'eye_09', 'key_02', 'tooth_04'];
export const bossRules = id => {
  let rules = (BOSSES[id] ? BOSSES[id].rule : []).slice();
  if (id === 'girl' && know('k_girl_lies')) rules = rules.filter(r => r !== 'no_repeat');
  if (id === 'chair' && know('k_moon')) rules = rules.filter(r => r !== 'cold_blood');
  if (id === 'drowned' && know('k_drowned_paid')) rules = rules.filter(r => r !== 'drown');
  if (id === 'child' && know('k_child_self')) rules = rules.filter(r => r !== 'blind_eyes');
  if (id === 'nun' && know('k_nun_name')) rules = rules.filter(r => r !== 'remember');
  if (id === 'cook' && know('k_cook_jars')) rules = rules.filter(r => r !== 'greedy');
  if (id === 'nurse' && know('k_nurse_eye')) rules = rules.filter(r => r !== 'blind_eyes');
  if (id === 'prompter' && know('k_prompter_box')) rules = rules.filter(r => r !== 'remember');
  if (id === 'watcher' && know('k_watcher_blind')) rules = rules.filter(r => r !== 'watched');
  return rules;
};
export const bossWeakened = id => BOSSES[id] ? BOSSES[id].rule.filter(r => !bossRules(id).includes(r)) : [];
const oppNameKey = id => (String(id).startsWith('gambler') ? 'opp.' + id : id === 'final' ? 'char.dealer' : 'char.' + id);   // el duelo final es contra el Crupier

function startRoundCtx(ctx) {
  // ctx: { kind:'game'|'boss'|'final', node, opp:{id,rule[]}, row, tutorial }
  const run = gs.run, P = FX.perks();
  const mods = C.deriveMods(gs.inventory, P);
  let target = C.targetFor(ctx.row, ctx.kind, 1 + FX.debtSurcharge(), run.pity || 0, mods);
  if (ctx.tutorial) target = 120;
  const R = C.startRound({
    key: ctx.node.id + ':' + (ctx.kind) + ':' + (run.attempt || 0), opp: { id: ctx.opp.id, rule: ctx.opp.rule }, target, perks: P, mods,
    tutorial: !!ctx.tutorial, rigged: ctx.tutorial ? TUT_RIG : null
  });
  G.R = R; G.roundCtx = ctx; G.tut = { plays: 0, discards: 0 };
  let odds = null;
  try { odds = ctx.tutorial ? 1 : C.estimateWin(R, 20); } catch (e) { odds = null; }
  G.odds = odds;
  return roundView();
}
function tutorialHint() {
  const R = G.R; if (!R || !R.tutorial) return null;
  return 'tut.r' + Math.min(6, G.tut.plays + G.tut.discards + 1);
}
export function roundView() {
  const R = G.R, ctx = G.roundCtx;
  const music = ctx.kind === 'game' ? (R.rule.includes('watched') ? 'high_stakes' : 'normal_gameplay') : 'boss';
  return setView({
    type: 'round', R, kind: ctx.kind, opp: { id: ctx.opp.id, rule: R.rule.slice(), nameKey: oppNameKey(ctx.opp.id), alias: ctx.opp.name || 0 },
    tutorial: !!ctx.tutorial, hintKey: tutorialHint(), odds: G.odds, target: R.target, row: ctx.row, bg: ctx.bg || 'casino', music,
    weakened: ctx.kind === 'boss' ? bossWeakened(ctx.opp.id) : []
  });
}
export function enterRound(node) {
  const run = gs.run;
  const tut = !gs.meta.tutorial.round;
  const opp = tut ? { id: 'dealer', rule: [], name: 0 } : { id: node.opp.id, rule: [].concat(node.opp.rule || []), name: node.opp.name };
  FX.discoverCharacter(opp.id === 'dealer' || CHARACTERS.includes(opp.id) ? opp.id : null);
  return startRoundCtx({ kind: 'game', node, opp, row: node.row, tutorial: tut, bg: WINGS[run.wing].bg });
}
export const roundPreview = (uids, stake = 'none') => (G.R ? C.preview(G.R, uids, stake) : null);
export function roundPlay(uids, stake = 'none') {
  const R = G.R; if (!R || R.over) return null;
  const played = uids.map(u => R.hand.find(c => c.uid === u) || R.pocket.find(c => c.uid === u)).filter(Boolean);
  const res = C.play(R, uids, stake);
  if (!res) { sfx('deny'); return null; }
  G.tut.plays++;
  ACH.onPlay(played, res); MIS.track('play', { hand: res.hand, total: res.total });
  sfx('card_play'); if (stake !== 'none') sfx('bet');
  if (res.delta.health < 0) sfx('hurt');
  return res;
}
export function roundDiscard(uids) { const ok = G.R && C.discard(G.R, uids); if (ok) { G.tut.discards++; sfx('card_discard'); } else sfx('deny'); return !!ok; }
export function roundStash(uid) { const ok = G.R && C.stash(G.R, uid); sfx(ok ? 'card_flip' : 'deny'); return !!ok; }
export function roundUnstash(uid) { const ok = G.R && C.unstash(G.R, uid); sfx(ok ? 'card_flip' : 'deny'); return !!ok; }
// Varias de golpe (hasta donde quepan). Devuelven los uid movidos; [] si no se movió ninguna.
export function roundStashMany(uids) { const moved = G.R ? C.stashMany(G.R, uids) : []; sfx(moved.length ? 'card_flip' : 'deny'); return moved; }
export function roundUnstashMany(uids) { const moved = G.R ? C.unstashMany(G.R, uids) : []; sfx(moved.length ? 'card_flip' : 'deny'); return moved; }
export function roundSalt() {
  const R = G.R; if (!R || R.over || !hasTool('sal')) { sfx('deny'); return false; }
  if (!C.useSalt(R)) { sfx('deny'); return false; }
  gs.tools.splice(gs.tools.indexOf('sal'), 1); sfx('unlock'); bus.emit('stats', {});
  return true;
}
export function roundFinish() {
  const R = G.R, ctx = G.roundCtx; if (!R || !R.over) return G.view;
  const run = gs.run, P = FX.perks();
  const won = R.over === 'win';
  const st = gs.meta.stats;
  if (won) {
    st.roundsWon++; run.pity = 0; onRoundWon(gs.jokers, gs.jokerData);
    ACH.onRoundWon(R); MIS.track('roundWon', { kind: ctx.kind, tutorial: !!ctx.tutorial, discards: R.discardsMade || 0, sanity: gs.player.sanity });
    const rew = C.roundRewards(R, ctx.row);
    let rewards = { money: 0, sanity: 0 };
    if (ctx.kind === 'game' || ctx.kind === 'boss') { rewards.money = addMoney(rew.money); if (P.sanityWin) rewards.sanity = addSanity(P.sanityWin); }
    if (ctx.tutorial) gs.meta.tutorial.round = true;
    sfx('victory');
    let lineKey = ctx.tutorial ? 'tut.done' : (ctx.kind === 'boss' ? 'boss.' + ctx.opp.id + '.w' : (ctx.kind === 'final' ? 'dlg.final.won' : 'log.round_won'));
    if (ctx.kind === 'boss') {
      st.bossesDown.includes(ctx.opp.id) || st.bossesDown.push(ctx.opp.id);
      if (WINGS[run.wing] && WINGS[run.wing].boss === ctx.opp.id && !gs.meta.wingsCleared.includes(run.wing)) gs.meta.wingsCleared.push(run.wing);
      FX.discoverCharacter(ctx.opp.id);
      for (const m of FX.checkMemories()) { bus.emit('memory', { id: m }); }
    }
    G.after = () => {
      if (ctx.kind === 'final') { run.finalStage = 2; run.attempt = 0; saveGame(); return finaleView(2); }
      return rewardView(ctx.kind === 'boss');
    };
    return setView({ type: 'round_result', won: true, kind: ctx.kind, rewards, lineKey, score: R.score, target: R.target, bossId: ctx.kind === 'boss' ? ctx.opp.id : null, music: 'victory' });
  }
  // derrota
  st.roundsLost++;
  const fc = C.failCost(ctx.row, ctx.kind);
  if (ctx.tutorial) {
    run.attempt = (run.attempt || 0) + 1;
    G.after = () => startRoundCtx(ctx);
    return setView({ type: 'round_result', won: false, kind: ctx.kind, costs: { health: 0, sanity: 0, debt: 0 }, lineKey: 'tut.retry', score: R.score, target: R.target, tutorial: true, music: 'defeat' });
  }
  addHealth(-fc.health); addSanity(-fc.sanity); addDebt(fc.debt);
  run.pity = Math.min(0.24, (run.pity || 0) + 0.08);
  sfx('hurt');
  const lineKey = ctx.kind === 'boss' ? 'boss.' + ctx.opp.id + '.l' : (ctx.kind === 'final' ? 'dlg.final.lost' : 'log.round_lost');
  if (checkDeath()) return G.view;
  if (gs.player.sanity <= 0 && FX.collapseIfNeeded()) { toast('fx.collapse', null, 'bad'); if (checkDeath()) return G.view; }
  G.after = () => {
    if (ctx.kind === 'boss') { run.attempt = (run.attempt || 0) + 1; return enterBoss(ctx.node); }
    if (ctx.kind === 'final') { run.attempt = (run.attempt || 0) + 1; return startFinalRound(); }
    return finishNode();
  };
  return setView({ type: 'round_result', won: false, kind: ctx.kind, costs: fc, lineKey, score: R.score, target: R.target, music: 'defeat' });
}
export function resultContinue() {
  const f = G.after; G.after = null;
  if (!f) return G.view;
  return f();
}

// ---------------- Recompensas ----------------
function rewardView(boss) {
  const run = gs.run, node = G.node;
  const rng = rngFor(run.seed, 'reward', node ? node.id : 'x', (run.step = (run.step || 0) + 1));
  const row = G.roundCtx ? G.roundCtx.row : (node ? node.row : 1);
  const choices = FX.rewardChoices(rng, row, boss);
  G.rewardCtx = { choices, boss };
  return setView({ type: 'reward', choices, boss: !!boss, music: 'victory' });
}
export function rewardPick(i) {
  const rc = G.rewardCtx; if (!rc || !rc.choices[i]) { sfx('deny'); return G.view; }
  FX.takeReward(rc.choices[i]);
  sfx('unlock');
  G.rewardCtx = null;
  return finishNode();
}
export function rewardSkip() {
  if (!G.rewardCtx) return G.view;
  addMoney(G.rewardCtx.boss ? 30 : 8); sfx('chip'); G.rewardCtx = null;
  return finishNode();
}

// ---------------- Escopeta ----------------
export const DUEL_STAKE_DEFS = { money: 20, sanity: 10, debt: 40, card: 1 };
export function duelStakeOptions(node) {
  const p = gs.player;
  const opts = [
    { type: 'money', value: DUEL_STAKE_DEFS.money, ok: p.money >= DUEL_STAKE_DEFS.money },
    { type: 'sanity', value: DUEL_STAKE_DEFS.sanity, ok: p.sanity > DUEL_STAKE_DEFS.sanity + 2 },
    { type: 'debt', value: DUEL_STAKE_DEFS.debt, ok: true },
    { type: 'card', value: 1, ok: gs.deck.length > 30 }
  ];
  // La apuesta de carta se decide ANTES de elegir: se sabe qué carta de tu mazo pierdes si caes y cuál ganas si vences (semilla fija por sala)
  const c = opts[3];
  if (gs.run && gs.deck.length) {
    const rng = rngFor(gs.run.seed, 'duelcard', (node && node.id) || '?', gs.run.attempt || 0);
    const pool = gs.deck.filter(x => x.sp).concat(gs.deck.filter(x => !x.sp));
    const lose = rng.pick(pool.slice(0, Math.max(1, Math.min(pool.length, 8))));
    c.loseUid = lose.uid; c.lose = { id: lose.id, suit: lose.suit, rank: lose.rank, sp: !!lose.sp, mods: (lose.mods || []).slice(), grow: lose.grow || 0 };
    c.winId = rng.pick(SPECIAL_IDS.filter(i => !CURSED_IDS.includes(i)));
  }
  return opts;
}
export function enterDuelSetup(node) {
  const first = gs.meta.stats.anomalies === 0;
  G.duelCtx = { node, foe: node.opp.id, look: node.opp.look || null, kind: 'game', first };
  FX.discoverCharacter(CHARACTERS.includes(node.opp.id) ? node.opp.id : null);
  return setView({ type: 'duel_setup', foe: node.opp.id, look: node.opp.look || null, nameKey: oppNameKey(node.opp.id === 'gambler' ? (node.opp.look || 'gambler_a') : node.opp.id), stakes: duelStakeOptions(node), first, hintKey: first ? 'tut.d0' : null, music: 'roulette', bg: 'casino' });
}
function duelListenReliability() { return Math.max(S.LISTEN_RELIABILITY, FX.perks().listen || 0); }
function duelTools() { return gs.tools.filter(id => TOOLS[id] && TOOLS[id].ctx === 'duel'); }
function duelHint() {
  const D = G.D, ctx = G.duelCtx; if (!D || !ctx.first) return null;
  if (D.shots === 0 && !D.heard) return 'tut.d1';
  if (D.shots < 3) return 'tut.d2';
  return null;
}
export function duelView() {
  const D = G.D, ctx = G.duelCtx;
  return setView({
    type: 'duel', D, foe: D.foe.id, look: ctx.look || null, nameKey: oppNameKey(D.foe.id === 'gambler' ? (ctx.look || 'gambler_a') : D.foe.id), tools: duelTools(), hintKey: duelHint(), final: ctx.kind === 'final',
    stake: D.stake, listenCost: S.LISTEN_COST, listenReliability: duelListenReliability(), music: 'roulette', bg: 'casino'
  });
}
export function duelStart(type) {
  const ctx = G.duelCtx; if (!ctx || !G.view || G.view.type !== 'duel_setup') return G.view;
  const opt = G.view.stakes.find(s => s.type === type);
  if (!opt || !opt.ok) { sfx('deny'); return G.view; }
  const run = gs.run;
  G.D = S.startDuel({ seed: run.seed, key: ctx.node.id + ':' + (run.attempt || 0), foe: ctx.foe, stake: { type: opt.type, value: opt.value, loseUid: opt.loseUid, winId: opt.winId }, first: ctx.first, marks: 3 });
  sfx('gun_load');
  return duelView();
}
function foeSfx(e) { if (e.result === 'hit' || e.result === 'backfire') sfx('shot'); else if (e.result === 'click') sfx('click_empty'); else if (e.result === 'safe') sfx('click_empty'); if (e.reload) sfx('gun_load'); }
export function duelShoot(at, o = {}) {   // o.silent: la interfaz reproduce los sonidos al ritmo de la narración
  const D = G.D; if (!D || D.over || D.turn !== 'p') return null;
  const ev = S.playerShoot(D, at); if (!ev) return null;
  const events = [ev];
  if (!o.silent) foeSfx(ev);
  if (ev.anomaly) { gs.meta.stats.anomalies++; gs.runFlags.anomaly = true; if (!o.silent) sfx('glitch'); ev.lineKey = 'duel.anomaly'; }
  if (!D.over && D.turn === 'f') { const fe = S.foeTurn(D); for (const e of fe) { if (!o.silent) foeSfx(e); events.push(e); } }
  bus.emit('stats', {});
  ACH.onDuelStreak(D);
  return { events, over: D.over, turn: D.turn };
}
export function duelListen() {
  const D = G.D; if (!D || D.over || D.turn !== 'p') return null;
  const p = gs.player; if (p.sanity <= S.LISTEN_COST) { sfx('deny'); return null; }
  addSanity(-S.LISTEN_COST);   // el sonido lo pone la pantalla del duelo, según lo que se oiga (cargada / vacía)
  const r = S.listen(D, duelListenReliability()); MIS.track('listen');
  return r;
}
export function duelTool(id) {
  const D = G.D; if (!D || D.over || D.turn !== 'p' || !hasTool(id)) { sfx('deny'); return null; }
  const r = S.useTool(D, id); if (!r) { sfx('deny'); return null; }
  gs.tools.splice(gs.tools.indexOf(id), 1);
  if (r.debt) addDebt(r.debt);
  sfx('unlock'); bus.emit('stats', {});
  return r;
}
export function duelFinish() {
  const D = G.D, ctx = G.duelCtx; if (!D || !D.over) return G.view;
  const won = D.over === 'win', st = gs.meta.stats, run = gs.run;
  const deltas = { money: 0, sanity: 0, debt: 0, health: 0, card: null, lostCard: null };
  if (won) { st.duelsWon++; if (ctx.kind !== 'final') MIS.track('duelWon'); } else st.duelsLost++;
  if (ctx.kind === 'final') {
    if (won) {
      sfx('victory'); run.finalStage = 3; run.phase = 'door'; saveGame();
      G.after = () => showDoor();
      return setView({ type: 'duel_result', won: true, final: true, lineKey: 'dlg.final.duel_won', deltas, music: 'victory' });
    }
    const fc = C.failCost(6, 'final');
    addHealth(-fc.health); addSanity(-fc.sanity); addDebt(fc.debt); deltas.health = -fc.health; deltas.sanity = -fc.sanity; deltas.debt = fc.debt; sfx('hurt');
    if (checkDeath()) return G.view;
    if (gs.player.sanity <= 0 && FX.collapseIfNeeded()) { toast('fx.collapse', null, 'bad'); if (checkDeath()) return G.view; }
    G.after = () => { run.attempt = (run.attempt || 0) + 1; return startFinalDuel(); };
    return setView({ type: 'duel_result', won: false, final: true, lineKey: 'dlg.final.duel_lost', deltas, music: 'defeat' });
  }
  const s = D.stake; const rng = rngFor(run.seed, 'duelreward', ctx.node.id, (run.step = (run.step || 0) + 1));
  if (won) {
    sfx('victory');
    if (s.type === 'money') deltas.money = addMoney(25);
    else if (s.type === 'sanity') deltas.sanity = addSanity(8);
    else if (s.type === 'debt') deltas.debt = addDebt(-60);
    else if (s.type === 'card') { const pool = SPECIAL_IDS.filter(i => !CURSED_IDS.includes(i)); deltas.card = s.winId || rng.pick(pool); FX.addToDeck(deltas.card); }
    deltas.money += addMoney(10);
  } else {
    sfx('hurt');
    if (s.type === 'money') deltas.money = addMoney(-s.value);
    else if (s.type === 'sanity') deltas.sanity = addSanity(-s.value);
    else if (s.type === 'debt') deltas.debt = addDebt(s.value);
    else if (s.type === 'card') { const pool = gs.deck.filter(c => c.sp).concat(gs.deck.filter(c => !c.sp)); const c = (s.loseUid && gs.deck.find(x => x.uid === s.loseUid)) || (pool[0] ? rng.pick(pool.slice(0, Math.max(1, Math.min(pool.length, 8)))) : null); if (c && gs.deck.length > 30) { gs.deck.splice(gs.deck.indexOf(c), 1); deltas.lostCard = c.id; } }
    deltas.health = addHealth(-12);
    if (checkDeath()) return G.view;
  }
  G.after = () => finishNode();
  const lineKey = won ? 'duel.win' : 'duel.lose';
  return setView({ type: 'duel_result', won, final: false, lineKey, deltas, stakeType: s.type, music: won ? 'victory' : 'defeat' });
}

// ---------------- Tienda ----------------
export function shopRefresh() { return G.shop ? shopView() : G.view; }
function shopView() {
  const p = gs.player, sh = G.shop;
  const stock = sh.stock.map((e, i) => {
    let can = !e.sold && p.money >= e.price;
    if (e.kind === 'tool' && gs.tools.length >= MAX_TOOLS) can = false;
    if (e.kind === 'remove' && gs.deck.filter(c => !c.sp).length <= 20) can = false;
    if (e.kind === 'joker' && (gs.jokers.length >= MAX_JOKERS || gs.jokers.includes(e.id))) can = false;
    if (e.kind === 'loan') can = !e.sold;
    return Object.assign({}, e, { index: i, can });
  });
  return setView({ type: 'merchant', stock, music: 'dialogue', bg: 'shop', who: 'merchant', hintKey: peekHint('merchant') });
}
export function enterMerchant(node) {
  const run = gs.run; const rng = rngFor(run.seed, 'shop', node.id);
  const stock = FX.merchantStock(rng, node.row).map(e => Object.assign({ sold: false }, e));
  stock.push({ kind: 'loan', price: 0, sold: false, amount: 100, debt: 130 });
  G.shop = { stock, rng };
  FX.discoverCharacter('merchant');
  return shopView();
}
export function buy(i) {
  const sh = G.shop; if (!sh || !sh.stock[i] || sh.stock[i].sold) { sfx('deny'); return G.view; }
  const e = sh.stock[i]; let ok = false;
  if (e.kind === 'loan') { addMoney(e.amount); addDebt(e.debt); e.sold = true; ok = true; }
  else { ok = FX.buy(e, sh.rng); if (ok) { e.sold = true; MIS.track('buy', { kind: e.kind }); if (e.kind === 'joker') (sh.bought = sh.bought || []).push(e.id); } }
  sfx(ok ? 'chip' : 'deny');
  return shopView();
}
// Ordenar comodines: solo al elegir sala (en el mapa), igual que en Balatro se ordenan entre manos
export function reorderJokers(from, to) {
  if (!G.view || G.view.type !== 'map') return false;
  if (!FX.moveJoker(from, to)) return false;
  saveGame(); sfx('card_flip'); bus.emit('stats', {}); return true;
}
// Volver a la pantalla de inicio desde una partida. En mapa/alas/archivo no se abandona ninguna sala.
const SAFE_LEAVE = ['map', 'wings', 'archive', 'ending', 'death', 'intro', 'menu'];
export function leaveSafe() { return !G.view || SAFE_LEAVE.includes(G.view.type); }
export function leaveToMenu() {
  if (gs.run && leaveSafe()) saveGame();
  G.R = G.D = G.node = G.ev = null;
  return toMenu();
}
// Vender un comodín desde el inventario (si lo habías comprado en esta misma tienda, es un secreto)
export function sellJoker(i) {
  const id = gs.jokers[+i]; const n = FX.sellJoker(+i);
  if (n) ACH.onSellJoker(!!(G.shop && G.shop.bought && G.shop.bought.includes(id)));
  return n;
}
export function leaveShop() { G.shop = null; return finishNode(); }

// ---------------- Descanso ----------------
export const REST_AMOUNTS = { heal: 35, calm: 25, study: 8 };
function restView(done) {
  const p = gs.player, payable = Math.min(60, p.money, p.debt);
  const options = [
    { k: 'heal', ok: p.health < p.maxHealth, amount: REST_AMOUNTS.heal },
    { k: 'calm', ok: p.sanity < 100, amount: REST_AMOUNTS.calm },
    { k: 'pay', ok: payable > 0, amount: payable },
    { k: 'study', ok: p.sanity > REST_AMOUNTS.study + 2, amount: REST_AMOUNTS.study }
  ];
  return setView(Object.assign({ type: 'rest', options, music: 'dialogue', bg: 'rest' }, done ? { phase: 'done', done } : { phase: 'choose', hintKey: peekHint('rest') }));
}
export function enterRest() { return restView(null); }
export function restChoose(k) {
  const o = G.view && G.view.type === 'rest' && G.view.phase === 'choose' && G.view.options.find(x => x.k === k);
  if (!o || !o.ok) { sfx('deny'); return G.view; }
  const done = { k, amount: o.amount, extra: null };
  if (k === 'heal') { addHealth(REST_AMOUNTS.heal); sfx('heal'); }
  else if (k === 'calm') { addSanity(REST_AMOUNTS.calm); sfx('heal'); }
  else if (k === 'pay') { addMoney(-o.amount); addDebt(-o.amount); sfx('chip'); }
  else if (k === 'study') { addSanity(-REST_AMOUNTS.study); done.extra = FX.levelUp(gs.run ? rngFor(gs.run.seed, 'study', gs.run.nodes).pick(['pair', 'twopair', 'three', 'straight', 'flush', 'full']) : 'pair'); sfx('unlock'); }
  MIS.track('rest', { k });
  return restView(done);
}
export function restContinue() { return finishNode(); }

// ---------------- Jefes ----------------
export function enterBoss(node) {
  const id = node.opp.id, b = BOSSES[id];
  G.bossCtx = { node, id };
  if (!G.node || G.node.id !== node.id) G.node = node;
  return setView({ type: 'boss_intro', boss: id, lineKey: 'boss.' + id + '.a', bg: b.bg, secret: !!b.secret, rules: bossRules(id), weakened: bossWeakened(id), hintKey: peekHint('boss'), music: 'boss' });
}
export function bossStart() {
  const bc = G.bossCtx; if (!bc) return G.view;
  const row = bc.node.hidden ? Math.max(bc.node.row, 5) : bc.node.row;
  return startRoundCtx({ kind: 'boss', node: bc.node, opp: { id: bc.id, rule: bossRules(bc.id) }, row, tutorial: false, bg: BOSSES[bc.id].bg });
}

// ---------------- Final: la última mano, la última bala, la puerta ----------------
export function startFinale() {
  const run = gs.run; run.finalStage = 1; run.phase = 'finale'; run.attempt = 0; run.pending = null;
  saveGame();
  return finaleView(1);
}
function finaleView(stage) {
  return setView({ type: 'finale', stage, lineKeys: stage === 1 ? ['dlg.final.1', 'dlg.final.2', 'dlg.final.3'] : ['dlg.final.4', 'dlg.final.5'], bg: 'casino', music: 'boss' });
}
export function finaleContinue() {
  const run = gs.run; if (!run) return G.view;
  if (run.finalStage <= 1) return startFinalRound();
  if (run.finalStage === 2) return startFinalDuel();
  return showDoor();
}
function startFinalRound() {
  const node = { id: 'final', row: ROWS - 2, kind: 'boss', opp: { id: 'dealer' } };
  G.node = node;
  return startRoundCtx({ kind: 'final', node, opp: { id: 'dealer', rule: BOSSES.dealer.rule.slice() }, row: ROWS - 2, tutorial: false, bg: 'casino' });
}
function startFinalDuel() {
  const run = gs.run;
  G.duelCtx = { node: { id: 'final', row: ROWS - 1 }, foe: 'final', kind: 'final', first: false };
  G.D = S.startDuel({ seed: run.seed, key: 'final:' + (run.attempt || 0), foe: 'final', stake: { type: 'life', value: 0 }, first: false, marks: 4 });
  sfx('gun_load');
  return duelView();
}
export function showDoor() {
  const run = gs.run; if (run) run.phase = 'door';
  const choices = FX.endingChoices();
  return setView({ type: 'door', choices, music: 'secret', bg: 'door' });
}
export function doorChoose(id) {
  const ch = FX.endingChoices().find(c => c.id === id);
  if (!ch || !ch.ok) { sfx('deny'); return G.view; }
  const first = !gs.meta.endings.includes(id);
  const r = FX.registerEnding(id);
  G.R = G.D = G.node = G.ev = null;
  for (const m of r.memories) bus.emit('memory', { id: m });
  saveGame();
  sfx(id === 'verdad' ? 'memory' : 'victory');
  return setView({
    type: 'ending', id, first, memories: r.memories, endingsSeen: gs.meta.endings.slice(), total: ENDING_ORDER.length,
    trueOpen: gs.meta.endings.filter(e => e !== 'verdad').length >= 5, music: id === 'verdad' ? 'true_ending' : 'victory'
  });
}
export function endingDone() { return toMenu(); }

// ---------------- Archivo ("???") ----------------
export function archiveData() {
  return {
    endings: ENDING_ORDER.map(id => ({ id, seen: gs.meta.endings.includes(id) })),
    memories: MEMORY_ORDER.map(id => ({ id, got: gs.meta.memories.includes(id) })),
    knowledge: KNOWLEDGE.map(id => ({ id, got: gs.meta.knowledge.includes(id) })),
    characters: CHARACTERS.map(id => ({ id, met: gs.discoveredCharacters.includes(id) })),
    stats: Object.assign({ deaths: gs.deaths, runs: gs.meta.runsFinished }, gs.meta.stats),
    eggs: ACH.EGGS.map(id => ({ id, got: ACH.hasEgg(id) })),
    missions: { done: gs.meta.missionsDone.length, total: MIS.MISSION_IDS.length }
  };
}
export function openArchive() { return setView({ type: 'archive', data: archiveData(), music: 'secret' }); }

// Depuración: muestra un evento concreto (solo lo usa src/debug.js)
export function debugEvent(id) {
  if (!EVENTS[id]) return null;
  if (!gs.run) beginRun('salon');
  const node = { id: 'dbg', row: Math.max(1, currentRow()), kind: 'event', links: [] };
  G.node = node; gs.run.pending = 'dbg';
  return showEvent(id, node);
}
// Utilidades para la UI
export const canContinue = () => hasSave();
export { saveGame, loadGame, resetProgress, hasSave };
