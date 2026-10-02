// Bot que juega partidas completas a través de la máquina de vistas de game.js (sin DOM).
// Uso: node tools/test-game.mjs [nPartidas=30] [semilla=1]
import * as G from '../src/game.js';
import * as C from '../src/combat.js';
import * as S from '../src/shotgun.js';
import { gs, bus, replaceState } from '../src/state.js';
import { mulberry32 } from '../src/rng.js';
import { resetProgress } from '../src/save.js';

const N = +process.argv[2] || 30, SEED = +process.argv[3] || 1;
const rnd = mulberry32(SEED); Math.random = rnd;
const pickR = a => a[Math.floor(rnd() * a.length)];
const seen = {}, errs = [], sfxSeen = new Set(), endings = {}; let views = 0, deaths = 0, stuck = 0;
bus.on('sfx', e => sfxSeen.add(e.name));
const noEvent = process.argv.includes('--quiet');
const FORCE_WING = (process.argv.find(a => a.startsWith('--wing=')) || '').slice(7) || null;   // fuerza el ala (desbloqueándola); «all» las rota todas para recorrer también las nuevas
const ALL_WINGS = ['salon', 'pasillo', 'sotano', 'capilla', 'cocinas', 'enfermeria']; let wingRot = 0;

function playRound() {
  let guard = 0;
  while (!G.G.R.over && guard++ < 30) {
    const R = G.G.R;
    const b = C.bestPlay(R);
    if (!b) { const all = R.hand.concat(R.pocket).slice(0, 1).map(c => c.uid); if (!G.roundDiscard(all)) break; continue; }
    const r = G.roundPlay(b.uids, 'none');
    if (!r) break;
  }
  return G.roundFinish();
}
function playDuel() {
  let guard = 0;
  while (!G.G.D.over && guard++ < 80) {
    const D = G.G.D;
    if (D.turn !== 'p') break;
    const pl = S.remainingLoaded(D) / S.remaining(D);
    if (!D.heard && gs.player.sanity > 12 && rnd() < 0.3) G.duelListen();
    const r = G.duelShoot(pl >= 0.5 ? 'foe' : (rnd() < 0.5 ? 'foe' : 'table'));
    if (!r) break;
  }
  return G.duelFinish();
}
function step(v) {
  switch (v.type) {
    case 'menu': return G.newGame();
    case 'intro': return G.introDone();
    case 'wings': {
      if (FORCE_WING) { gs.meta.runsFinished = Math.max(gs.meta.runsFinished, 3); if (!gs.meta.wingsCleared.length) gs.meta.wingsCleared.push('salon'); return G.pickWing(FORCE_WING === 'all' ? ALL_WINGS[wingRot++ % ALL_WINGS.length] : FORCE_WING); }
      return G.pickWing(pickR(v.wings.filter(w => w.unlocked)).id);
    }
    case 'map': return G.chooseNode(pickR(v.avail));
    case 'event': return v.phase === 'choose' ? G.eventChoose(pickR(v.options).k) : G.eventContinue();
    case 'round': return playRound();
    case 'round_result': return G.resultContinue();
    case 'reward': return rnd() < 0.85 ? G.rewardPick(0) : G.rewardSkip();
    case 'duel_setup': { const o = v.stakes.filter(s => s.ok); return G.duelStart(pickR(o).type); }
    case 'duel': return playDuel();
    case 'duel_result': return G.resultContinue();
    case 'merchant': { const c = v.stock.filter(s => s.can); if (c.length && rnd() < 0.6) return G.buy(pickR(c).index); return G.leaveShop(); }
    case 'rest': return v.phase === 'choose' ? (v.options.filter(o => o.ok).length ? G.restChoose(pickR(v.options.filter(o => o.ok)).k) : G.restContinue()) : G.restContinue();
    case 'boss_intro': return G.bossStart();
    case 'finale': return G.finaleContinue();
    case 'door': { const ok = v.choices.filter(c => c.ok && c.id !== 'deuda'); return G.doorChoose((ok.length ? pickR(ok) : pickR(v.choices.filter(c => c.ok))).id); }
    case 'ending': endings[v.id] = (endings[v.id] || 0) + 1; return G.endingDone();
    case 'death': deaths++; return G.afterDeath();
    case 'archive': return G.toMenu();
    default: throw new Error('vista desconocida ' + v.type);
  }
}
// Varias "vidas" del mismo perfil para probar la meta-progresión (muertes → recuerdos → finales)
let profile = 0, steps = 0, lastKey = '', same = 0;
resetProgress();
let v = G.toMenu();
for (let run = 0; run < N; run++) {
  let guard = 0;
  v = G.G.view && G.G.view.type !== 'menu' ? G.G.view : G.toMenu();
  // una "partida" del bot = hasta ver un final o N muertes; luego se reinicia el perfil
  let doneRun = false;
  while (!doneRun && guard++ < 6000) {
    try { v = step(v); } catch (e) { errs.push(e.stack.split('\n').slice(0, 4).join(' | ')); break; }
    views++; seen[v.type] = (seen[v.type] || 0) + 1; steps++;
    const key = v.type + JSON.stringify(v.hud || {}) + (v.phase || '');
    if (key === lastKey) { if (++same > 25) { stuck++; errs.push('ATASCADO en ' + v.type); break; } } else { same = 0; lastKey = key; }
    if (v.type === 'menu' && guard > 3) doneRun = true;
    if (v.type === 'ending') { /* el siguiente step devuelve al menú */ }
  }
  // sin ruido en menú: empezar perfil nuevo cada 3 partidas
  if (run % 3 === 2) { resetProgress(); }
}
console.log('vistas visitadas:', views, JSON.stringify(seen));
console.log('muertes:', deaths, 'finales:', JSON.stringify(endings), 'meta:', JSON.stringify({ endings: gs.meta.endings, mem: gs.meta.memories.length, know: gs.meta.knowledge.length }));
console.log('sfx usados:', [...sfxSeen].sort().join(','));
if (errs.length) { console.log('ERRORES (' + errs.length + '):'); [...new Set(errs)].slice(0, 8).forEach(e => console.log(' -', e)); process.exit(1); }
console.log('OK sin errores');
