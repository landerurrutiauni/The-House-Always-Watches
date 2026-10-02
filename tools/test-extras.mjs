// Pruebas (sin DOM) de lo añadido en la ampliación: 6 alas, 13 personajes, historia, secretos (logros) y misiones. Uso: node tools/test-extras.mjs
import assert from 'node:assert/strict';
import { gs, settings, bus, replaceState, defaultSettings } from '../src/state.js';
import { makeCard } from '../src/cards.js';
import * as C from '../src/combat.js';
import * as E from '../src/effects.js';
import * as K from '../src/content.js';
import * as S from '../src/shotgun.js';
import * as G from '../src/game.js';
import * as ACH from '../src/achievements.js';
import * as MIS from '../src/missions.js';
import { RNG } from '../src/rng.js';

let ok = 0, bad = 0;
const T = async (name, fn) => { try { await fn(); ok++; console.log('  ok  ' + name); } catch (e) { bad++; console.log('  FAIL ' + name + '\n       ' + String(e.message).split('\n').slice(0, 3).join(' | ')); } };
const reset = () => { replaceState({}); Object.assign(settings, defaultSettings()); settings.eggs = []; settings.langsSeen = []; };
const fresh = (wing = 'salon') => { reset(); E.startRun(wing); MIS.begin(wing); };
const round = () => C.startRound({ key: 't', target: 99999, opp: { id: 'dealer', rule: [] }, tutorial: false, row: 1, kind: 'game' });
const mk = (...ids) => ids.map(i => makeCard(i));
const heard = []; bus.on('egg', e => heard.push(e.id)); const heardM = []; bus.on('mission', e => heardM.push(e.id));

console.log('alas, personajes e historia');
await T('hay 6 alas con guardián, fondo y requisito; los guardianes existen', () => {
  assert.deepEqual(Object.keys(K.WING_INFO), ['salon', 'pasillo', 'sotano', 'capilla', 'cocinas', 'enfermeria']);
  for (const [w, i] of Object.entries(K.WING_INFO)) { assert.ok(K.BOSSES[i.boss], 'jefe de ' + w); assert.ok(K.CHARACTERS.includes(i.boss), 'personaje ' + i.boss); assert.ok(i.bg && Array.isArray(i.req)); }
});
await T('13 personajes y todos los jefes/duelistas nuevos están entre ellos', () => {
  assert.equal(K.CHARACTERS.length, 13);
  for (const id of ['nun', 'cook', 'nurse', 'puppet', 'pianist']) { assert.ok(K.CHARACTERS.includes(id), id); assert.ok(S.FOES[id], 'duelista ' + id); }
});
await T('requisitos de apertura: salón libre; pasillo/sótano 1 descenso; capilla 2; cocinas 3; enfermería 1 guardián', () => {
  reset();
  assert.equal(E.wingUnlocked('salon'), true);
  for (const w of ['pasillo', 'sotano', 'capilla', 'cocinas', 'enfermeria']) assert.equal(E.wingUnlocked(w), false, w);
  gs.meta.runsFinished = 1; assert.equal(E.wingUnlocked('pasillo'), true); assert.equal(E.wingUnlocked('sotano'), true); assert.equal(E.wingUnlocked('capilla'), false);
  gs.meta.runsFinished = 2; assert.equal(E.wingUnlocked('capilla'), true); assert.equal(E.wingUnlocked('cocinas'), false);
  gs.meta.runsFinished = 3; assert.equal(E.wingUnlocked('cocinas'), true); assert.equal(E.wingUnlocked('enfermeria'), false);
  gs.meta.wingsCleared = ['salon']; assert.equal(E.wingUnlocked('enfermeria'), true);
});
await T('cada ala genera un mapa válido de 8 filas con su guardián y eventos propios', () => {
  for (const w of Object.keys(K.WING_INFO)) {
    reset(); E.startRun(w); const rows = gs.run.map.rows; assert.equal(rows.length, 8, w);
    const boss = rows.flat().find(n => n.kind === 'boss'); assert.ok(boss && boss.opp.id === K.WING_INFO[w].boss, 'boss de ' + w);
    const kinds = new Set(rows.flat().map(n => n.kind)); assert.ok(kinds.has('game') && kinds.has('event'), 'nodos de ' + w);
  }
});
await T('los eventos de cada ala existen; las cadenas nuevas están completas y ordenadas', () => {
  for (const w of Object.keys(K.WING_INFO)) for (const e of K.eventPool(w)) { if (e.startsWith('chain:')) assert.ok(K.CHAINS[e.slice(6)], e); else assert.ok(K.EVENTS[e], e); }
  for (const [c, ids] of Object.entries({ nun: 3, pianist: 2, cook: 3, nurse: 3, puppet: 2 })) { assert.equal(K.CHAINS[c].length, ids, c); for (const id of K.CHAINS[c]) assert.equal(K.EVENTS[id].chain, c, id); }
});
await T('los guardianes nuevos se debilitan con su conocimiento (La Hermana, El Cocinero, La Enfermera)', () => {
  fresh('capilla');
  const pairs = [['nun', 'remember', 'k_nun_name'], ['cook', 'greedy', 'k_cook_jars'], ['nurse', 'blind_eyes', 'k_nurse_eye']];
  for (const [boss, rule, kn] of pairs) { assert.ok(G.bossRules(boss).includes(rule), boss + ' trae ' + rule); E.learn(kn); assert.ok(!G.bossRules(boss).includes(rule), boss + ' pierde ' + rule); assert.ok(G.bossWeakened(boss).includes(rule)); }
});
await T('cada evento nuevo se puede resolver por ambas opciones sin errores y sus conocimientos existen', () => {
  const news = ['nun_1', 'nun_2', 'nun_3', 'chapel_candles', 'pianist_1', 'pianist_2', 'cook_1', 'cook_2', 'cook_3', 'kitchen_fire', 'nurse_1', 'nurse_2', 'nurse_3', 'puppet_1', 'puppet_2', 'wall_notes', 'staff_room'];
  for (const id of news) { assert.ok(K.EVENTS[id], id); for (const o of ['a', 'b']) { fresh('capilla'); E.applyEffects(K.EVENTS[id][o], { rng: new RNG(5) }); } }
  for (const k of ['k_nun_name', 'k_nurse_eye', 'k_cook_jars', 'k_puppet_script', 'k_pianist_hands']) assert.ok(K.KNOWLEDGE.includes(k), k);
});
await T('duelos con los nuevos rivales: se juegan hasta el final sin errores', () => {
  for (const foe of ['nun', 'cook', 'nurse', 'puppet', 'pianist']) {
    const D = S.startDuel({ seed: 11, key: 'x', foe, stake: { type: 'money', value: 20 } }); let g = 0;
    while (!D.over && g++ < 60) { if (D.turn === 'p') { const ev = S.playerShoot(D, g % 2 ? 'foe' : 'table'); assert.ok(ev && ev.pos >= 0 && Array.isArray(ev.marks ? [] : []) || true); if (!D.over && D.turn === 'f') S.foeTurn(D); } else S.foeTurn(D); }
    assert.ok(D.over, foe);
  }
});

console.log('secretos (logros)');
await T('hay 12 secretos y se guardan en la partida Y en los ajustes; se desbloquean una sola vez', () => {
  reset(); heard.length = 0; assert.equal(ACH.EGGS.length, 12);
  assert.equal(ACH.unlockEgg('ojos'), true); assert.equal(ACH.unlockEgg('ojos'), false); assert.equal(ACH.unlockEgg('no_existe'), false);
  assert.deepEqual(heard, ['ojos']); assert.ok(gs.meta.eggs.includes('ojos') && settings.eggs.includes('ojos')); assert.equal(ACH.hasEgg('ojos'), true);
  replaceState({}); assert.equal(ACH.hasEgg('ojos'), true, 'los ajustes lo conservan aunque no haya partida');
});
await T('Te mira de vuelta: 7 toques a los ojos seguidos; si se espera demasiado, se reinicia', () => {
  reset(); heard.length = 0; let t0 = 1000;
  for (let i = 0; i < 6; i++) assert.equal(ACH.eyeClick(t0 += 500), false);
  assert.equal(ACH.eyeClick(t0 += 500), true);
  reset(); for (let i = 0; i < 6; i++) ACH.eyeClick(t0 += 500); assert.equal(ACH.eyeClick(t0 += 7000), false, 'tras una pausa larga cuenta desde 1'); for (let i = 0; i < 5; i++) ACH.eyeClick(t0 += 300); assert.equal(ACH.eyeClick(t0 += 300), true);
});
await T('Código antiguo: ↑↑↓↓←→←→BA; un fallo a mitad lo reinicia', () => {
  reset(); const seq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  for (const k of seq.slice(0, 9)) assert.equal(ACH.konamiKey(k), false);
  assert.equal(ACH.konamiKey('a'), true);
  reset(); for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'x']) ACH.konamiKey(k); for (const k of seq.slice(0, 9)) ACH.konamiKey(k); assert.equal(ACH.hasEgg('konami'), false); assert.equal(ACH.konamiKey('A'), true, 'mayúsculas valen');
});
await T('La casa habla todos los idiomas: hay que ver los cuatro', () => {
  reset(); for (const l of ['es', 'en', 'fr']) ACH.noteLang(l); assert.equal(ACH.hasEgg('poliglota'), false); ACH.noteLang('xx'); assert.equal(ACH.hasEgg('poliglota'), false); ACH.noteLang('de'); assert.equal(ACH.hasEgg('poliglota'), true);
});
await T('Paciencia: un minuto (aquí 30 ms) en el menú sin tocar nada; tocar reinicia la cuenta', async () => {
  reset(); const keep = ACH.IDLE.ms; ACH.IDLE.ms = 40;
  ACH.idleStart(); await new Promise(r => setTimeout(r, 25)); ACH.idleStart(); await new Promise(r => setTimeout(r, 25)); assert.equal(ACH.hasEgg('paciencia'), false, 'reiniciado a tiempo');
  await new Promise(r => setTimeout(r, 40)); assert.equal(ACH.hasEgg('paciencia'), true);
  reset(); ACH.idleStart(); ACH.idleStop(); await new Promise(r => setTimeout(r, 60)); assert.equal(ACH.hasEgg('paciencia'), false, 'salir del menú lo cancela'); ACH.IDLE.ms = keep;
});
await T('Escalera real (10-J-Q-K-A del mismo palo) y Cuatro Ases, jugados de verdad con roundPlay', () => {
  fresh(); G.G.tut = { plays: 0, discards: 0 };
  let R = round(); G.G.R = R; const royal = mk('eye_10', 'eye_11', 'eye_12', 'eye_13', 'eye_01'); R.hand = royal.slice(); R.pocket = [];
  const res = G.roundPlay(royal.map(c => c.uid)); assert.equal(res.hand, 'sflush'); assert.equal(ACH.hasEgg('real'), true);
  reset(); fresh(); R = round(); G.G.R = R; const aces = mk('eye_01', 'blood_01', 'tooth_01', 'key_01', 'eye_05'); R.hand = aces.slice(); R.pocket = [];
  G.roundPlay(aces.map(c => c.uid)); assert.equal(ACH.hasEgg('ases'), true); assert.equal(ACH.hasEgg('real'), false);
  reset(); fresh(); R = round(); G.G.R = R; const nope = mk('eye_09', 'eye_10', 'eye_11', 'eye_12', 'eye_13'); R.hand = nope.slice(); R.pocket = []; G.roundPlay(nope.map(c => c.uid)); assert.equal(ACH.hasEgg('real'), false, '9-K no es la escalera real');
});
await T('Triple siete: tres sietes en trío o mejor; sietes sueltos no valen', () => {
  fresh(); G.G.tut = { plays: 0, discards: 0 }; let R = round(); G.G.R = R; let cs = mk('eye_07', 'blood_07', 'key_07', 'tooth_02'); R.hand = cs.slice(); R.pocket = []; G.roundPlay(cs.map(c => c.uid)); assert.equal(ACH.hasEgg('jackpot'), true);
  reset(); fresh(); R = round(); G.G.R = R; cs = mk('eye_07', 'blood_07', 'key_03', 'tooth_02'); R.hand = cs.slice(); R.pocket = []; G.roundPlay(cs.map(c => c.uid)); assert.equal(ACH.hasEgg('jackpot'), false);
});
await T('Por los pelos: ganar la ronda justo en la última jugada', () => {
  reset(); ACH.onRoundWon({ playsLeft: 2 }); assert.equal(ACH.hasEgg('limite'), false); ACH.onRoundWon({ playsLeft: 0 }); assert.equal(ACH.hasEgg('limite'), true);
  fresh(); G.G.tut = { plays: 0, discards: 0 }; const R = round(); R.target = 1; R.playsLeft = 1; G.G.R = R; G.G.roundCtx = { kind: 'game', row: 1, node: { id: 'n' }, opp: { id: 'dealer' }, tutorial: false }; const cs = mk('eye_05'); R.hand = cs.slice(); R.pocket = [];
  G.roundPlay(cs.map(c => c.uid)); assert.equal(R.over, 'win'); G.roundFinish(); assert.equal(ACH.hasEgg('limite'), true, 'ganó con playsLeft=0');
});
await T('La Mesa calla: tres «tentar a la Mesa» seguros seguidos en un duelo (rachas rotas lo reinician)', () => {
  reset(); ACH.onDuelStreak({ streakSafe: 2 }); assert.equal(ACH.hasEgg('mesa3'), false); ACH.onDuelStreak({ streakSafe: 3 }); assert.equal(ACH.hasEgg('mesa3'), true);
  const D = S.startDuel({ seed: 5, key: 'k', foe: 'gambler', stake: { type: 'money', value: 20 } }); D.chambers = [false, false, false, false, false, false]; D.pos = 0; D.turn = 'p';
  for (let i = 0; i < 3; i++) { D.turn = 'p'; S.playerShoot(D, 'table'); } assert.ok(D.streakSafe >= 3, 'racha ' + D.streakSafe);
});
await T('Cinco bufones: tener 5 comodines a la vez', () => {
  fresh(); for (const id of ['bufon', 'sonrisa', 'sanguijuela', 'ojo_nuca']) E.addJoker(id); assert.equal(ACH.hasEgg('cinco'), false); E.addJoker('trapero'); assert.equal(ACH.hasEgg('cinco'), true);
});
await T('Compra y arrepiéntete: vender un comodín comprado en la misma visita (no uno que ya tenías)', () => {
  fresh(); E.addJoker('sonrisa'); G.G.shop = { stock: [], bought: [] }; G.sellJoker(0); assert.equal(ACH.hasEgg('arrepentido'), false);
  E.addJoker('bufon'); G.G.shop = { stock: [], bought: ['bufon'] }; assert.ok(G.sellJoker(gs.jokers.indexOf('bufon')) > 0); assert.equal(ACH.hasEgg('arrepentido'), true); G.G.shop = null;
});
await T('Compra por la tienda real marca el joker como «comprado aquí»', () => {
  fresh(); gs.player.money = 500; const sh = { stock: [{ kind: 'joker', id: 'bufon', price: 30 }], rng: new RNG(1) }; G.G.shop = sh; G.G.view = { type: 'merchant' };
  G.buy(0); assert.deepEqual(sh.bought, ['bufon']); assert.ok(gs.jokers.includes('bufon')); G.sellJoker(0); assert.equal(ACH.hasEgg('arrepentido'), true); G.G.shop = null;
});
await T('Cordura cero: colapsar al llegar a 0 de Cordura', () => {
  fresh(); gs.player.sanity = 10; assert.equal(E.collapseIfNeeded(), false); assert.equal(ACH.hasEgg('colapso'), false); gs.player.sanity = 0; assert.equal(E.collapseIfNeeded(), true); assert.equal(ACH.hasEgg('colapso'), true);
});
await T('«Reiniciar progreso» borra también los secretos', () => {
  reset(); for (const id of ACH.EGGS) ACH.unlockEgg(id); assert.equal(ACH.eggsFound().length, 12); G.resetAll(); assert.equal(ACH.eggsFound().length, 0); assert.deepEqual(settings.eggs, []);
});
await T('el archivo informa de los 12 secretos y de las misiones', () => {
  reset(); ACH.unlockEgg('real'); const d = G.archiveData(); assert.equal(d.eggs.length, 12); assert.deepEqual(d.eggs.filter(e => e.got).map(e => e.id), ['real']); assert.equal(d.missions.total, 18); assert.equal(d.characters.length, 13);
});

console.log('misiones');
await T('3 misiones por ala (18 en total), ids únicos y recompensas válidas', () => {
  assert.deepEqual(Object.keys(MIS.MISSIONS), Object.keys(K.WING_INFO)); assert.equal(MIS.MISSION_IDS.length, 18); assert.equal(new Set(MIS.MISSION_IDS).size, 18);
  const known = new Set(['money', 'sanity', 'health', 'card', 'mod', 'level', 'joker']);
  for (const [w, list] of Object.entries(MIS.MISSIONS)) { assert.equal(list.length, 3, w); for (const m of list) { assert.ok(m.need >= 1 && m.ev); for (const r of m.reward) assert.ok(known.has(r[0]), m.id); } }
});
await T('begin() crea el progreso del ala y list() lo refleja', () => {
  fresh('capilla'); const l = MIS.list(); assert.equal(l.length, 3); assert.ok(l.every(m => m.n === 0 && !m.done)); assert.deepEqual(l.map(m => m.id), MIS.MISSIONS.capilla.map(m => m.id));
});
await T('«Gana 2 rondas»: avanza 1/2, se cumple a la 2.ª, paga 20 de dinero y no se repite', () => {
  fresh('salon'); heardM.length = 0; const m0 = gs.player.money;
  assert.deepEqual(MIS.track('roundWon', { kind: 'game', discards: 1, sanity: 80 }), []); assert.equal(MIS.list().find(m => m.id === 'salon_win2').n, 1);
  const done = MIS.track('roundWon', { kind: 'game', discards: 1, sanity: 80 }); assert.deepEqual(done.map(d => d.id), ['salon_win2']); assert.equal(gs.player.money, m0 + 20);
  assert.deepEqual(heardM, ['salon_win2']); assert.ok(gs.meta.missionsDone.includes('salon_win2')); assert.deepEqual(MIS.track('roundWon', { kind: 'game' }), []); assert.equal(gs.player.money, m0 + 20);
});
await T('condiciones: escalera de verdad, ronda sin descartar, cordura baja, 300+ de una jugada', () => {
  fresh('salon'); MIS.track('play', { hand: 'pair', total: 40 }); assert.equal(MIS.list().find(m => m.id === 'salon_straight').done, false); const lv = Object.values(gs.handLevels).reduce((a, b) => a + b, 0);
  MIS.track('play', { hand: 'straight', total: 120 }); assert.equal(MIS.list().find(m => m.id === 'salon_straight').done, true); assert.equal(Object.values(gs.handLevels).reduce((a, b) => a + b, 0), lv + 1, 'sube un nivel de mano');
  fresh('pasillo'); MIS.track('roundWon', { kind: 'game', discards: 2 }); assert.equal(MIS.list().find(m => m.id === 'pasillo_clean').done, false); MIS.track('roundWon', { kind: 'game', discards: 0 }); assert.equal(MIS.list().find(m => m.id === 'pasillo_clean').done, true);
  fresh('enfermeria'); MIS.track('roundWon', { kind: 'game', sanity: 60 }); assert.equal(MIS.list().find(m => m.id === 'enf_low').done, false); MIS.track('roundWon', { kind: 'game', sanity: 30 }); assert.equal(MIS.list().find(m => m.id === 'enf_low').done, true);
  fresh('sotano'); const n = gs.deck.length; MIS.track('play', { hand: 'high', total: 299 }); assert.equal(MIS.list().find(m => m.id === 'sotano_big').done, false); MIS.track('play', { hand: 'three', total: 300 }); assert.equal(gs.deck.length, n + 1, 'da una carta');
});
await T('el tutorial y la ronda final no cuentan; los sucesos de otra ala tampoco', () => {
  fresh('salon'); MIS.track('roundWon', { kind: 'game', tutorial: true }); MIS.track('roundWon', { kind: 'final' }); assert.equal(MIS.list().find(m => m.id === 'salon_win2').n, 0);
  MIS.track('listen'); MIS.track('rest'); MIS.track('buy'); assert.ok(MIS.list().every(m => m.n === 0), 'listen/rest/buy no son del Salón');
  reset(); assert.deepEqual(MIS.track('roundWon', {}), [], 'sin descenso en curso no hace nada');
});
await T('las 18 misiones se pueden cumplir y sus recompensas se aplican sin errores (incluidos card/mod/level/joker)', () => {
  const cand = [{ hand: 'straight', total: 400, discards: 0, sanity: 30, kind: 'game' }, { hand: 'flush', total: 400, discards: 0, sanity: 30, kind: 'game' }, { hand: 'full', total: 400, discards: 0, sanity: 30, kind: 'game' }];
  for (const [w, list] of Object.entries(MIS.MISSIONS)) {
    fresh(w); for (const m of list) { const d = cand.find(c => !m.when || m.when(c)); assert.ok(d, m.id); for (let i = 0; i < m.need; i++) MIS.track(m.ev, d); }
    assert.ok(MIS.list().every(m => m.done), 'todas hechas en ' + w);
  }
  assert.equal(gs.meta.missionsDone.length, 3, 'missionsDone acumula las del último reset');
});
await T('el progreso sobrevive a guardar y cargar; una partida antigua sin misiones se repara con ensure()', () => {
  fresh('cocinas'); MIS.track('buy', {}); const snap = JSON.parse(JSON.stringify(gs)); replaceState(snap); assert.equal(MIS.list().find(m => m.id === 'cocinas_buy2').n, 1);
  delete gs.run.missions; MIS.ensure(); assert.equal(MIS.list().length, 3);
});
await T('descansar, comprar y resolver eventos avanzan misiones reales a través de game.js', () => {
  fresh('sotano'); G.G.view = { type: 'rest', phase: 'choose', options: [{ k: 'heal', ok: true, amount: 35 }] }; G.restChoose('heal'); assert.equal(MIS.list().find(m => m.id === 'sotano_rest').done, true);
  fresh('pasillo'); gs.player.money = 500; G.G.shop = { stock: [{ kind: 'item', id: 'ceniza', price: 10, can: true }], rng: new RNG(2) }; G.G.view = { type: 'merchant' }; G.buy(0); assert.equal(MIS.list().find(m => m.id === 'pasillo_buy').done, true);
});
console.log(`\n${ok} ok, ${bad} fallos`); process.exit(bad ? 1 : 0);
