// missions.js — 3 misiones por ala. El progreso vive en gs.run.missions (por descenso); las cumplidas alguna vez, en gs.meta.missionsDone.
// Al cumplirse se aplica una recompensa menor (recursos, una carta, un nivel de mano…) y se emite bus 'mission'. Sin DOM.
import { gs, bus } from './state.js';
import * as FX from './effects.js';
import { t } from './i18n.js';

// Listas EXPLÍCITAS: los textos de las misiones nombran cada mano que vale (la escalera real es su propia mano, no «una escalera de color»)
const STRAIGHT = ['straight', 'sflush', 'royal'], FLUSH = ['flush', 'sflush', 'royal'], FULL = ['full', 'four', 'sflush', 'royal', 'five'];
// ev: roundWon | play | duelWon | listen | buy | rest | event · need: veces · when(datos): condición opcional · reward: efectos de effects.js
export const MISSIONS = {
  salon: [
    { id: 'salon_win2', ev: 'roundWon', need: 2, reward: [['money', 20]] },
    { id: 'salon_straight', ev: 'play', need: 1, when: d => STRAIGHT.includes(d.hand), reward: [['level', 'random']] },
    { id: 'salon_duel', ev: 'duelWon', need: 1, reward: [['sanity', 8]] }
  ],
  pasillo: [
    { id: 'pasillo_events', ev: 'event', need: 3, reward: [['money', 15]] },
    { id: 'pasillo_clean', ev: 'roundWon', need: 1, when: d => d.discards === 0, reward: [['sanity', 10]] },
    { id: 'pasillo_buy', ev: 'buy', need: 1, reward: [['health', 10]] }
  ],
  sotano: [
    { id: 'sotano_rest', ev: 'rest', need: 1, reward: [['money', 15]] },
    { id: 'sotano_big', ev: 'play', need: 1, when: d => d.total >= 300, reward: [['card', 'random']] },
    { id: 'sotano_win3', ev: 'roundWon', need: 3, reward: [['joker', 'bufon']] }
  ],
  capilla: [
    { id: 'capilla_events', ev: 'event', need: 2, reward: [['sanity', 8]] },
    { id: 'capilla_flush', ev: 'play', need: 1, when: d => FLUSH.includes(d.hand), reward: [['money', 20]] },
    { id: 'capilla_listen', ev: 'listen', need: 1, reward: [['health', 10]] }
  ],
  cocinas: [
    { id: 'cocinas_buy2', ev: 'buy', need: 2, reward: [['sanity', 10]] },
    { id: 'cocinas_full', ev: 'play', need: 1, when: d => FULL.includes(d.hand), reward: [['mod', 'random']] },
    { id: 'cocinas_win2', ev: 'roundWon', need: 2, reward: [['health', 15]] }
  ],
  teatro: [
    { id: 'teatro_win3', ev: 'roundWon', need: 3, reward: [['level', 'random']] },
    { id: 'teatro_listen', ev: 'listen', need: 2, reward: [['sanity', 10]] },
    { id: 'teatro_buy', ev: 'buy', need: 1, reward: [['mod', 'random']] }
  ],
  vigilancia: [
    { id: 'vig_clean', ev: 'roundWon', need: 1, when: d => d.discards === 0, reward: [['card', 'random']] },
    { id: 'vig_events', ev: 'event', need: 3, reward: [['health', 15]] },
    { id: 'vig_duel', ev: 'duelWon', need: 1, reward: [['money', 25]] }
  ],
  enfermeria: [
    { id: 'enf_rest2', ev: 'rest', need: 2, reward: [['level', 'random']] },
    { id: 'enf_low', ev: 'roundWon', need: 1, when: d => d.sanity < 40, reward: [['money', 25]] },
    { id: 'enf_duel', ev: 'duelWon', need: 1, reward: [['card', 'random']] }
  ]
};
export const ALL = Object.values(MISSIONS).flat();
export const MISSION_IDS = ALL.map(m => m.id);

export function begin(wing) {
  const run = gs.run; if (!run) return;
  run.missions = {};
  for (const m of MISSIONS[wing] || []) run.missions[m.id] = { n: 0, done: false };
}
// Partidas guardadas antes de las misiones (o ala distinta): se crean sin progreso.
export function ensure() {
  const run = gs.run; if (!run) return;
  if (!run.missions || !(MISSIONS[run.wing] || []).every(m => run.missions[m.id])) begin(run.wing);
}
export function list() {
  const run = gs.run; if (!run || !run.missions) return [];
  return (MISSIONS[run.wing] || []).map(m => { const s = run.missions[m.id] || { n: 0, done: false }; return { id: m.id, n: s.n, need: m.need, done: s.done, reward: m.reward }; });
}
export const rewardText = reward => reward.map(([k, a]) => t('mission.reward.' + k, { n: a })).join(', ');

// Notifica un suceso de la partida. Devuelve las misiones que se acaban de cumplir.
export function track(ev, data = {}) {
  const run = gs.run; if (!run || !run.missions || data.tutorial || data.kind === 'final') return [];
  const done = [];
  for (const m of MISSIONS[run.wing] || []) {
    const s = run.missions[m.id];
    if (!s || s.done || m.ev !== ev || (m.when && !m.when(data))) continue;
    s.n = Math.min(m.need, s.n + 1);
    if (s.n < m.need) continue;
    s.done = true;
    const outcomes = FX.applyEffects(m.reward);
    if (!gs.meta.missionsDone.includes(m.id)) gs.meta.missionsDone.push(m.id);
    done.push({ id: m.id, outcomes });
    bus.emit('mission', { id: m.id, reward: m.reward, outcomes });
  }
  if (done.length) bus.emit('stats', {});
  return done;
}
