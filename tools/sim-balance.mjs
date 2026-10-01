// Simulación de balance: un bot voraz juega rondas de cartas a lo largo de una partida.
// Uso: node tools/sim-balance.mjs [nRuns]
import { gs, replaceState, addHealth } from '../src/state.js';
import { RNG } from '../src/rng.js';
import * as C from '../src/combat.js';
import * as E from '../src/effects.js';
import { OPP_RULES } from '../src/combat.js';

const N = +process.argv[2] || 300;
if (process.argv[3]) C.TARGET.growth = +process.argv[3];
if (process.argv[4]) C.TARGET.base = +process.argv[4];
const stats = Array.from({ length: 9 }, () => ({ n: 0, win: 0 }));
let deaths = 0, reachBoss = 0, reachFinal = 0, clears = 0;

function playRound(row, kind, rule, key) {
  const P = E.perks();
  const mods = C.deriveMods(gs.inventory, P);
  const target = C.targetFor(row, kind, 1, 0, mods) * (1 + E.debtSurcharge());
  const R = C.startRound({ key, target: Math.round(target / 5) * 5, opp: { id: 'x', rule }, perks: P });
  let guard = 0;
  while (!R.over && guard++ < 20) {
    const b = C.bestPlay(R);
    if (!b) break;
    const need = (R.target - R.score) / Math.max(1, R.playsLeft);
    if (R.discardsLeft > 0 && R.playsLeft > 1 && b.total < need * 0.55) {
      const keep = new Set(b.uids); const junk = R.hand.filter(c => !keep.has(c.uid) && !R.hidden.has(c.uid)).slice(0, 5);
      if (junk.length && C.discard(R, junk.map(c => c.uid))) continue;
    }
    // apuesta de dinero/cordura cuando conviene y es barato
    let stake = 'none';
    if (b.total < need * 0.9 && C.stakeAllowed(R, 'sanity') && gs.player.sanity > 50) stake = 'sanity';
    C.play(R, b.uids, stake);
    if (gs.player.health <= 0) break;
  }
  return { R, won: R.over === 'win' };
}

for (let run = 0; run < N; run++) {
  replaceState({}); E.startRun('salon'); gs.run.seed = 1000 + run;
  const rng = new RNG(run + 1);
  let alive = true;
  for (let row = 0; row < 8 && alive; row++) {
    const kind = row === 7 ? 'boss' : 'game';
    if (row === 7) reachBoss++;
    const rule = row === 7 ? ['no_repeat'] : [rng.pick(OPP_RULES)];
    const { R, won } = playRound(row, kind, rule, 'r' + row);
    stats[row].n++; if (won) stats[row].win++;
    if (won) {
      gs.player.money += C.roundRewards(R, row).money;
      const ch = E.rewardChoices(rng, row, kind === 'boss');
      // el bot prefiere carta > nivel > mod
      E.takeReward(ch.find(c => c.type === 'card') || ch.find(c => c.type === 'level') || ch[0]);
      // tiendas/descansos aproximados: recupera algo de vida y cordura entre mesas
      addHealth(12); gs.player.sanity = Math.min(100, gs.player.sanity + 6);
      // compra: nivel de mano si hay dinero
      while (gs.player.money >= 40) { gs.player.money -= 40; E.levelUp(rng.pick(['pair', 'twopair', 'three', 'straight', 'flush', 'full'])); }
      if (row === 7) { clears++; }
    } else {
      const f = C.failCost(row, kind); addHealth(-f.health); gs.player.sanity = Math.max(0, gs.player.sanity - f.sanity); gs.player.debt += f.debt;
      if (gs.player.health <= 0) { alive = false; deaths++; }
      else if (kind === 'boss') alive = false;
    }
    E.nodeInterest();
  }
}
console.log(`Partidas simuladas: ${N}`);
console.log('fila  n     victoria');
stats.slice(0, 8).forEach((s, i) => console.log(String(i).padEnd(5), String(s.n).padEnd(5), s.n ? (100 * s.win / s.n).toFixed(0) + '%' : '-'));
console.log(`llegan al jefe: ${(100 * reachBoss / N).toFixed(0)}%  ·  vencen al jefe: ${(100 * clears / N).toFixed(0)}%  ·  mueren por vida: ${(100 * deaths / N).toFixed(0)}%`);
