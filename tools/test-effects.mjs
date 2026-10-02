import { ROWS } from '../src/scale.js';
import assert from 'node:assert/strict';
import { gs, replaceState } from '../src/state.js';
import { RNG } from '../src/rng.js';
import * as E from '../src/effects.js';
import * as K from '../src/content.js';
const T = (name, fn) => { try { fn(); globalThis.__p = (globalThis.__p || 0) + 1; console.log('  ok  ' + name); } catch (e) { globalThis.__f = (globalThis.__f || 0) + 1; console.log('  FAIL ' + name + '\n       ' + (e.stack || e).toString().split('\n').slice(0, 4).join('\n       ')); } };
console.log('effects/content');
T('startRun crea partida válida', () => { replaceState({}); E.startRun('salon'); assert.equal(gs.deck.length, 52); assert.equal(gs.player.health, 100); assert.ok(gs.run.map.rows.length === 16); });
T('eventos: 57 y todas sus tuplas conocidas', () => {
  assert.equal(K.EVENT_IDS.length, 57);
  const known = new Set(['money', 'sanity', 'health', 'debt', 'destiny', 'flag', 'runflag', 'know', 'rel', 'card', 'mod', 'item', 'tool', 'level', 'remove', 'gamble', 'boss']);
  const walk = l => l.forEach(fx => { assert.ok(known.has(fx[0]), 'efecto ' + fx[0]); if (fx[0] === 'gamble') { walk(fx[2]); walk(fx[3]); } if (fx[0] === 'know') assert.ok(K.KNOWLEDGE.includes(fx[1]), fx[1]); if (fx[0] === 'item') assert.ok(K.ITEMS.includes(fx[1]), fx[1]); if (fx[0] === 'tool') assert.ok(K.TOOLS[fx[1]], fx[1]); if (fx[0] === 'rel') assert.ok(K.CHARACTERS.includes(fx[1])); });
  for (const [id, e] of Object.entries(K.EVENTS)) { walk(e.a); walk(e.b); if (e.hid) walk(e.hid.fx); }
});
T('cada evento aplicable sin lanzar errores (ambas opciones)', () => {
  for (const [id, e] of Object.entries(K.EVENTS)) for (const opt of ['a', 'b']) { replaceState({}); E.startRun('salon'); E.applyEffects(e[opt], { rng: new RNG(3) }); }
});
T('recursos se acotan (dinero ≥ 0, cordura 0..100)', () => { replaceState({}); E.startRun('salon'); E.applyEffects([['money', -999], ['sanity', -999], ['sanity', 500]]); assert.equal(gs.player.money, 0); assert.equal(gs.player.sanity, 100); });
T('conocimiento sin duplicados y marca isNew', () => { replaceState({}); E.startRun('salon'); const a = E.applyEffects([['know', 'k_moon']]); const b = E.applyEffects([['know', 'k_moon']]); assert.equal(a[0].isNew, true); assert.equal(b[0].isNew, false); assert.equal(gs.meta.knowledge.length, 1); });
T('herramientas: máximo 3 (la 4ª se convierte en dinero)', () => { replaceState({}); E.startRun('salon'); for (const t of ['sal', 'sal', 'testigo', 'contrato']) E.applyEffects([['tool', t]]); assert.equal(gs.tools.length, 3); });
T('cadena de eventos avanza y se agota', () => { replaceState({}); E.startRun('salon'); const rng = new RNG(1); const a = E.resolveEvent('chain:girl', rng); assert.equal(a, 'girl_1'); gs.discoveredEvents.push('girl_1'); assert.equal(E.resolveEvent('chain:girl', rng), 'girl_2'); });
T('evento con requisito no sale sin cumplirlo', () => { replaceState({}); E.startRun('salon'); assert.notEqual(E.resolveEvent('phone_call', new RNG(2)), 'phone_call'); gs.deaths = 1; assert.equal(E.resolveEvent('phone_call', new RNG(2)), 'phone_call'); });
T('muerte: conserva conocimiento, arrastra deuda, da recuerdo', () => {
  replaceState({}); E.startRun('salon'); gs.player.debt = 200; E.applyEffects([['know', 'k_moon']]);
  const r = E.registerDeath(); assert.equal(gs.deaths, 1); assert.equal(gs.meta.carryDebt, 120); assert.ok(r.memories.includes('m01')); assert.equal(gs.meta.knowledge.length, 1); assert.equal(gs.run, null);
  E.startRun('salon'); assert.equal(gs.player.debt, 120); assert.equal(gs.player.money, 60); // recuerdo m01: +10
});
T('revivir con vela corta y no dos veces', () => { replaceState({}); E.startRun('salon'); gs.tools = ['vela_corta']; gs.player.health = 0; assert.equal(E.tryRevive(), 'candle'); assert.ok(gs.player.health > 0); gs.player.health = 0; assert.equal(E.tryRevive(), false); });
T('recompensas: 3 opciones, jefe da objetos', () => { replaceState({}); E.startRun('salon'); const r = E.rewardChoices(new RNG(4), 3, false); assert.equal(r.length, 3); const b = E.rewardChoices(new RNG(4), 7, true); assert.ok(b.every(x => x.type === 'item' || x.type === 'joker') && b.some(x => x.type === 'item')); E.takeReward(b[0]); assert.ok(gs.inventory.includes(b[0].id)); });
T('tienda: compra descuenta dinero y respeta fondos', () => { replaceState({}); E.startRun('salon'); const st = E.merchantStock(new RNG(5), 3); const e = st.find(x => x.kind === 'level'); gs.player.money = 10; assert.equal(E.buy(e, new RNG(1)), false); gs.player.money = 100; assert.equal(E.buy(e, new RNG(1)), true); assert.equal(gs.player.money, 60); });
T('finales: deuda siempre; puerta exige llave; verdad exige 5', () => { replaceState({}); E.startRun('salon'); let c = E.endingChoices(); assert.ok(c.find(x => x.id === 'deuda').ok); assert.ok(!c.find(x => x.id === 'puerta').ok); gs.inventory.push('llave_hueso'); assert.ok(E.endingChoices().find(x => x.id === 'puerta').ok); assert.ok(!E.endingChoices().find(x => x.id === 'verdad')); });
T('interés de deuda y recargo', () => { replaceState({}); E.startRun('salon'); gs.player.debt = 300; assert.equal(E.debtSurcharge(), 0.05); const exp = Math.ceil(300 * 0.03 * (7 / (ROWS - 1))); const v = E.nodeInterest(); assert.equal(v, exp, 'el interés por sala se reparte entre las 16 salas'); assert.equal(gs.player.debt, 300 + exp); });
T('nodo secreto se desbloquea por condiciones', () => { replaceState({}); E.startRun('salon'); assert.equal(E.secretUnlocked(), false); gs.deaths = 2; assert.equal(E.secretUnlocked(), true); });
