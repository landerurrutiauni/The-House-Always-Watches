// Pruebas (sin DOM) de las pistas de una sola vez y de los textos de la ayuda «Cómo se juega». Uso: node tools/test-help.mjs
import fs from 'node:fs';
import * as G from '../src/game.js';
import { gs, replaceState } from '../src/state.js';
import { resetProgress, saveGame, loadGame } from '../src/save.js';

let ok = 0, bad = 0;
const t = (name, cond, extra) => { if (cond) { ok++; console.log('  ok  ' + name); } else { bad++; console.log('  FALLA ' + name + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); } };

// ---- el tutorial de la primera mesa no se mezcla con las pistas de una sola vez ----
resetProgress(); G.newGame(); G.introDone();
let v = G.getView();
t('mapa: la primera vez trae la pista hint.map', v.type === 'map' && v.hintKey === 'hint.map', v && [v.type, v.hintKey]);
v = G.showMap();
t('mapa: construir la vista otra vez NO consume la pista (solo la consume la interfaz al mostrarla)', v.hintKey === 'hint.map', v.hintKey);
G.markHint('hint.map'); v = G.showMap();
t('mapa: una vez mostrada, ya no sale', v.hintKey == null, v.hintKey);
const gameNode = gs.run.map.rows[0].find(n => n.kind === 'game') || gs.run.map.rows[1].find(n => n.kind === 'game');
G.chooseNode(gameNode.id); v = G.getView();
t('tutorial de la primera mesa: sigue con sus pistas tut.r* (no empiezan por hint.)', v.type === 'round' && v.tutorial === true && /^tut\.r\d$/.test(v.hintKey), v && [v.type, v.tutorial, v.hintKey]);

// ---- suceso ----
resetProgress(); G.newGame(); G.introDone(); G.markHint('hint.map');   // (la interfaz ya habría mostrado la del mapa)
v = G.debugEvent('first_chip');
t('suceso: la primera vez trae hint.event en la fase de elección', v && v.type === 'event' && v.phase === 'choose' && v.hintKey === 'hint.event', v && [v.type, v.phase, v.hintKey]);
G.markHint('hint.event'); v = G.debugEvent('first_chip');
t('suceso: después ya no', v.hintKey == null, v.hintKey);
G.eventChoose('a'); v = G.getView();
t('suceso: la fase de resultado nunca lleva pista', v.phase === 'result' && v.hintKey == null, [v.phase, v.hintKey]);

// ---- tienda, descanso y guardián ----
v = G.enterMerchant({ id: 'tm', row: 2, kind: 'merchant', links: [] });
t('tienda: la primera vez trae hint.merchant', v.type === 'merchant' && v.hintKey === 'hint.merchant', [v.type, v.hintKey]);
G.markHint('hint.merchant'); v = G.enterMerchant({ id: 'tm', row: 2, kind: 'merchant', links: [] });
t('tienda: después ya no', v.hintKey == null);
v = G.enterRest();
t('descanso: la primera vez trae hint.rest', v.type === 'rest' && v.phase === 'choose' && v.hintKey === 'hint.rest', [v.type, v.phase, v.hintKey]);
G.markHint('hint.rest'); v = G.enterRest();
t('descanso: después ya no', v.hintKey == null);
for (const k of ['study', 'calm', 'heal', 'pay']) { G.restChoose(k); if (G.getView().phase === 'done') break; }
v = G.getView();
t('descanso: la fase final nunca lleva pista', v.phase === 'done' && v.hintKey == null, [v.phase, v.hintKey]);
const boss = gs.run.map.rows[gs.run.map.rows.length - 1][0];
v = G.enterBoss(boss);
t('guardián: la primera vez trae hint.boss', v.type === 'boss_intro' && v.hintKey === 'hint.boss', [v.type, v.hintKey]);
G.markHint('hint.boss'); v = G.enterBoss(boss);
t('guardián: después ya no', v.hintKey == null);

// ---- persistencia en el perfil ----
saveGame(); replaceState(null);
t('persistencia: tras vaciar el estado, las pistas ya no están (punto de partida de la prueba)', Object.keys(gs.meta.hints).length === 0);
const loaded = loadGame();
t('persistencia: guardar → vaciar → cargar devuelve las pistas vistas (mapa, suceso, tienda, descanso, guardián)', loaded === true && ['map', 'event', 'merchant', 'rest', 'boss'].every(k => gs.meta.hints[k] === true), gs.meta.hints);
const keep = JSON.parse(JSON.stringify(gs.meta)); replaceState({ meta: keep });
t('perfil: al recargar el estado se conservan las pistas vistas', gs.meta.hints.map === true && gs.meta.hints.boss === true);
replaceState({ meta: { introSeen: true } });
t('perfil antiguo (sin hints): no rompe y las pistas pueden volver a salir', typeof gs.meta.hints === 'object' && Object.keys(gs.meta.hints).length === 0);
G.markHint('hint.map'); t('perfil antiguo: markHint funciona', gs.meta.hints.map === true);

// ---- textos de la ayuda en los 4 idiomas ----
for (const lang of ['es', 'en', 'fr', 'de', 'eu']) {
  const L = JSON.parse(fs.readFileSync(new URL(`../locales/${lang}.json`, import.meta.url), 'utf8'));
  const need = ['menu.howto', 'hud.howto', 'howto.title', 'howto.cards', ...['map', 'event', 'merchant', 'rest', 'boss'].map(k => 'hint.' + k), ...Array.from({ length: 8 }, (_, i) => [`howto.s${i + 1}.h`, `howto.s${i + 1}.t`]).flat()];
  const miss = need.filter(k => !L[k] || !String(L[k]).trim());
  t(`${lang}: están todos los textos de la ayuda y las pistas (${need.length})`, miss.length === 0, miss);
  t(`${lang}: las pistas son cortas (≤ 300 caracteres)`, ['map', 'event', 'merchant', 'rest', 'boss'].every(k => L['hint.' + k].length <= 300), ['map', 'event', 'merchant', 'rest', 'boss'].map(k => L['hint.' + k].length));
  t(`${lang}: la ayuda no menciona nada que ya no existe (AdSense, anuncios, cookies de seguimiento)`, !/adsense|\banuncios?\b|publicidad|advertis|cookie/i.test(Object.keys(L).filter(k => k.startsWith('howto.') || k.startsWith('hint.')).map(k => L[k]).join(' ')));
}
console.log(`\n${ok} ok, ${bad} fallos`); process.exit(bad ? 1 : 0);
