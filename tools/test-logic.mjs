// Tests de lógica pura (Node). Ejecuta: node tools/test-logic.mjs
import assert from 'node:assert/strict';
import { gs, replaceState } from '../src/state.js';
import { baseDeck, makeCard, evaluate, HANDS, HAND_ORDER, rankChips } from '../src/cards.js';
import * as C from '../src/combat.js';

let pass = 0, fail = 0;
const T = (name, fn) => { try { fn(); pass++; console.log('  ok  ' + name); } catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + (e.stack || e).toString().split('\n').slice(0, 4).join('\n       ')); } };
const mk = (...ids) => ids.map(i => makeCard(i));

console.log('cards');
T('mazo base: baraja completa de 52 cartas únicas (As–Rey × 4 palos)', () => { const d = baseDeck(); assert.equal(d.length, 52); assert.equal(new Set(d.map(c => c.id)).size, 52); assert.equal(Math.min(...d.map(c => c.rank)), 1); assert.equal(Math.max(...d.map(c => c.rank)), 13); });
T('par', () => assert.equal(evaluate(mk('blood_03', 'eye_03', 'key_08')).type, 'pair'));
T('carta alta puntúa 1 carta', () => { const e = evaluate(mk('blood_03', 'eye_07', 'key_08')); assert.equal(e.type, 'high'); assert.deepEqual(e.idx, [2]); });
T('doble par', () => assert.equal(evaluate(mk('blood_03', 'eye_03', 'key_08', 'tooth_08')).type, 'twopair'));
T('trío / póker / full', () => {
  assert.equal(evaluate(mk('blood_03', 'eye_03', 'key_03')).type, 'three');
  assert.equal(evaluate(mk('blood_03', 'eye_03', 'key_03', 'tooth_03')).type, 'four');
  assert.equal(evaluate(mk('blood_03', 'eye_03', 'key_03', 'tooth_08', 'eye_08')).type, 'full');
});
T('escalera y color', () => {
  assert.equal(evaluate(mk('blood_03', 'eye_04', 'key_05', 'tooth_06', 'eye_07')).type, 'straight');
  assert.equal(evaluate(mk('blood_01', 'blood_04', 'blood_05', 'blood_09', 'blood_07')).type, 'flush');
  assert.equal(evaluate(mk('blood_03', 'blood_04', 'blood_05', 'blood_06', 'blood_07')).type, 'sflush');
});
T('comodín de palo completa color', () => assert.equal(evaluate(mk('blood_01', 'blood_04', 'blood_05', 'blood_09', 'dado_trucado')).type, 'flush'));
T('sombra (comodín de rango) mejora par a trío', () => assert.equal(evaluate(mk('blood_03', 'eye_03', 'sombra')).type, 'three'));
T('As–Rey: valor en fichas (As 11, figuras 10, resto su número)', () => { assert.equal(rankChips(1), 11); assert.equal(rankChips(11), 10); assert.equal(rankChips(12), 10); assert.equal(rankChips(13), 10); assert.equal(rankChips(7), 7); });
T('escalera con As ALTO (10-J-Q-K-A)', () => assert.equal(evaluate(mk('blood_10', 'eye_11', 'key_12', 'tooth_13', 'eye_01')).type, 'straight'));
T('escalera con As BAJO (A-2-3-4-5)', () => assert.equal(evaluate(mk('blood_01', 'eye_02', 'key_03', 'tooth_04', 'eye_05')).type, 'straight'));
T('escalera real (10-J-Q-K-A del mismo palo) es una mano propia, mejor que la escalera de color y peor que el repóker', () => {
  assert.equal(evaluate(mk('eye_10', 'eye_11', 'eye_12', 'eye_13', 'eye_01')).type, 'royal');
  assert.equal(evaluate(mk('eye_09', 'eye_10', 'eye_11', 'eye_12', 'eye_13')).type, 'sflush', '9-K es escalera de color');
  assert.equal(evaluate(mk('eye_01', 'eye_02', 'eye_03', 'eye_04', 'eye_05')).type, 'sflush', 'A-5 es escalera de color');
  assert.equal(evaluate(mk('eye_10', 'eye_11', 'eye_12', 'eye_13', 'blood_01')).type, 'straight', 'sin el mismo palo es escalera');
  assert.ok(HAND_ORDER.indexOf('five') < HAND_ORDER.indexOf('royal') && HAND_ORDER.indexOf('royal') < HAND_ORDER.indexOf('sflush'));
  assert.ok(HANDS.royal.chips * HANDS.royal.mult > HANDS.sflush.chips * HANDS.sflush.mult && HANDS.royal.chips * HANDS.royal.mult < HANDS.five.chips * HANDS.five.mult);
});
T('el As no «da la vuelta» (Q-K-A-2-3 no es escalera)', () => assert.equal(evaluate(mk('blood_12', 'eye_13', 'key_01', 'tooth_02', 'eye_03')).type, 'high'));
T('carta alta: puntúa el As (la más alta)', () => { const e = evaluate(mk('blood_13', 'eye_07', 'key_01')); assert.equal(e.type, 'high'); assert.deepEqual(e.idx, [2]); });
T('par de Ases pesa más que par de Reyes (desempate por fichas)', () => { const pa = evaluate(mk('blood_01', 'eye_01', 'key_05')), pk = evaluate(mk('blood_13', 'eye_13', 'key_05')); assert.equal(pa.type, 'pair'); assert.equal(pk.type, 'pair'); assert.deepEqual(pa.idx, [0, 1]); });
T('comodín de rango completa una escalera real (10-J-Q-K + sombra)', () => assert.equal(evaluate(mk('blood_10', 'eye_11', 'key_12', 'tooth_13', 'sombra')).type, 'straight'));
T('cuatro cartas de cada rango: 13 rangos × 4 palos', () => { const d = baseDeck(); for (let r = 1; r <= 13; r++) assert.equal(d.filter(c => c.rank === r).length, 4); });

T('quintilla con la séptima', () => assert.equal(evaluate(mk('blood_07', 'eye_07', 'key_07', 'tooth_07', 'la_septima')).type, 'five'));
T('manos: todas definidas (11, con la escalera real)', () => { assert.equal(Object.keys(HANDS).length, 11); assert.equal(HAND_ORDER.length, 11); });

console.log('combat');
replaceState({}); gs.deck = baseDeck(); gs.run = { seed: 42 }; gs.deaths = 0;
const R0 = () => ({ levels: {}, mods: C.deriveMods([]), rule: null, history: [], shield: 0, deaths: 0, player: { health: 100, sanity: 100, money: 50, debt: 0 } });
T('puntuación par de Ojos', () => {
  const r = C.resolvePlay(R0(), mk('eye_05', 'eye_05', 'key_02'), 'none');
  assert.equal(r.hand, 'pair');
  // chips: 10 + (5+6) + (5+6) = 32 ; mult 2 => 64
  assert.equal(r.total, 64); assert.equal(r.steps[0].t, 'hand');
});
T('sangre da mult y cuesta vida', () => {
  const r = C.resolvePlay(R0(), mk('blood_05', 'blood_05'), 'none');
  assert.equal(r.mult, 2 + 3); assert.equal(r.delta.health, -2);
});
T('escudo de Llave absorbe coste de sangre', () => {
  const R = R0(); R.shield = 5;
  assert.equal(C.resolvePlay(R, mk('blood_05', 'blood_05'), 'none').delta.health, 0);
});
T('diente crece y respeta tope', () => {
  const c = makeCard('tooth_04'); c.grow = 29; const r = C.resolvePlay(R0(), [c, makeCard('tooth_04')], 'none');
  assert.equal(r.grow[0].cap, 30);
});
T('combo LA MIRADA con 3 ojos', () => assert.ok(C.resolvePlay(R0(), mk('eye_05', 'eye_05', 'eye_05'), 'none').combos.includes('mirada')));
T('combo EL RITUAL con 3 sangre; puertas lo excluye', () => {
  assert.ok(C.resolvePlay(R0(), mk('blood_05', 'blood_05', 'blood_05'), 'none').combos.includes('ritual'));
  // 5 cartas, suma 14 (=2*7) y puntúan todas: escalera 1-2-3-4-... no; usamos flush de sangre 1,2,3,4,... suma múltiplo de 7
  const r = C.resolvePlay(R0(), mk('blood_01', 'blood_02', 'blood_03', 'blood_04', 'blood_05'), 'none'); // 15 no
  assert.ok(!r.combos.includes('puertas'));
  const r2 = C.resolvePlay(R0(), mk('blood_01', 'blood_02', 'blood_03', 'blood_04', 'blood_06'), 'none'); // 16 no
  const r3 = C.resolvePlay(R0(), mk('blood_02', 'blood_03', 'blood_04', 'blood_05', 'blood_06'), 'none'); // 20 no
  const r4 = C.resolvePlay(R0(), mk('blood_03', 'blood_04', 'blood_05', 'blood_06', 'blood_07'), 'none'); // 25 no
  const r5 = C.resolvePlay(R0(), mk('blood_04', 'blood_05', 'blood_06', 'blood_07', 'blood_08'), 'none'); // 30 no
  const r6 = C.resolvePlay(R0(), mk('blood_05', 'blood_06', 'blood_07', 'blood_08', 'blood_09'), 'none'); // 35 sí
  assert.ok(r6.combos.includes('puertas') && !r6.combos.includes('ritual'));
});
T('regla cold_blood anula el mult de sangre', () => { const R = R0(); R.rule = 'cold_blood'; assert.equal(C.resolvePlay(R, mk('blood_05', 'blood_05'), 'none').mult, 2); });
T('regla no_repeat penaliza repetir mano', () => {
  const R = R0(); R.rule = 'no_repeat'; R.history = ['pair'];
  const a = C.resolvePlay(R, mk('eye_05', 'eye_05'), 'none').total, R2 = R0(), b = C.resolvePlay(R2, mk('eye_05', 'eye_05'), 'none').total;
  assert.equal(a, Math.floor(b * 0.5));
});
T('apuesta de sangre multiplica y cuesta 8 de vida', () => {
  const a = C.resolvePlay(R0(), mk('eye_05', 'eye_05'), 'none'), b = C.resolvePlay(R0(), mk('eye_05', 'eye_05'), 'blood');
  assert.ok(b.total > a.total); assert.equal(b.delta.health, -8);
});
T('preview no muta el estado', () => {
  const R = C.startRound({ key: 't1', target: 200 });
  const before = JSON.stringify([gs.player, R.score, R.hand.map(c => c.uid)]);
  C.preview(R, R.hand.slice(0, 3).map(c => c.uid), 'blood');
  assert.equal(JSON.stringify([gs.player, R.score, R.hand.map(c => c.uid)]), before);
});
T('ronda: jugar, descartar, rellenar mano', () => {
  const R = C.startRound({ key: 't2', target: 100000 });
  assert.equal(R.hand.length, 7);
  assert.ok(C.discard(R, R.hand.slice(0, 2).map(c => c.uid))); assert.equal(R.hand.length, 7); assert.equal(R.discardsLeft, 2);
  const r = C.play(R, R.hand.slice(0, 3).map(c => c.uid), 'none');
  assert.ok(r.total > 0); assert.equal(R.playsLeft, 3); assert.equal(R.hand.length, 7);
});
T('ronda pierde al agotar jugadas', () => {
  replaceState({}); gs.deck = baseDeck(); gs.run = { seed: 5 };
  const R = C.startRound({ key: 't3', target: 1e9 });
  for (let i = 0; i < 4; i++) C.play(R, [R.hand[0].uid], 'none');
  assert.equal(R.over, 'lose');
});
T('bolsillo: guardar y sacar', () => {
  replaceState({}); gs.deck = baseDeck(); gs.run = { seed: 6 };
  const R = C.startRound({ key: 't4', target: 500 });
  const u = R.hand[0].uid; assert.ok(C.stash(R, u)); assert.equal(R.pocket.length, 1); assert.equal(R.hand.length, 7);
  assert.ok(C.unstash(R, u)); assert.equal(R.pocket.length, 0);
});
T('estimateWin no muta jugador ni mazo', () => {
  replaceState({}); gs.deck = baseDeck(); gs.run = { seed: 7 };
  const R = C.startRound({ key: 't5', target: 120 });
  const snap = JSON.stringify([gs.player, gs.deck.map(c => c.uid + c.grow), gs.pendingDeath]);
  const p = C.estimateWin(R, 30);
  assert.ok(p >= 0 && p <= 1); assert.equal(JSON.stringify([gs.player, gs.deck.map(c => c.uid + c.grow), gs.pendingDeath]), snap);
});

export const results = () => ({ pass, fail });
if (process.argv[1] && process.argv[1].endsWith('test-logic.mjs')) {
  const mods = process.argv.includes('--only-basic') ? [] : ['./test-more.mjs', './test-effects.mjs'];
  for (const m of mods) { try { await import(m); } catch (e) { if (!String(e).includes('Cannot find')) throw e; } }
  const P = pass + (globalThis.__p || 0), F = fail + (globalThis.__f || 0);
  console.log(`\n${P} ok, ${F} fallos`);
  process.exit(F ? 1 : 0);
}
