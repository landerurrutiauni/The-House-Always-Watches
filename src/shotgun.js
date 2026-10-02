// Duelo de la escopeta ficticia. Sin DOM. 6 cámaras ocultas, anuncio que puede ser MENTIRA,
// disparar al rival o tentar a la Mesa. Cada bando tiene "marcas" (abstractas), no hay autolesión.
import { RNG, rngFor } from './rng.js';

export const FOES = {
  dealer: { lieP: 0.35, noise: 0.12, marks: 3 },
  girl: { lieP: 0.55, noise: 0.18, marks: 3 },
  chair: { lieP: 0.2, noise: 0.08, marks: 3 },
  drowned: { lieP: 0.4, noise: 0.15, marks: 3 },
  child: { lieP: 0.5, noise: 0.2, marks: 3 },
  gambler: { lieP: 0.3, noise: 0.25, marks: 3 },
  nun: { lieP: 0.25, noise: 0.1, marks: 3 },
  cook: { lieP: 0.45, noise: 0.2, marks: 3 },
  nurse: { lieP: 0.35, noise: 0.08, marks: 3 },
  puppet: { lieP: 0.6, noise: 0.22, marks: 3 },
  pianist: { lieP: 0.3, noise: 0.15, marks: 3 },
  final: { lieP: 0.45, noise: 0.05, marks: 4 }
};
export const LISTEN_COST = 5;
export const LISTEN_RELIABILITY = 0.75;

export function startDuel({ seed, key, foe = 'gambler', stake = { type: 'money', value: 20 }, first = false, marks }) {
  const F = FOES[foe] || FOES.gambler;
  const D = {
    rng: rngFor(seed, 'duel', key), foe: { id: foe, lieP: F.lieP, noise: F.noise },
    marks: { p: marks || 3, f: F.marks }, maxMarks: { p: marks || 3, f: F.marks }, turn: 'p', chambers: [], pos: 0,
    announce: 0, real: 0, lied: false, heard: null, truthKnown: false, skipFoe: false, over: null,
    stake, first, anomalyDone: false, loads: 0, shots: 0, log: [], fired: Array(6).fill(null), streakSafe: 0
  };
  load(D);
  return D;
}

export function load(D) {
  D.loads++;
  D.real = D.rng.int(2, 4);
  const ch = Array(6).fill(false);
  for (let i = 0; i < D.real; i++) ch[i] = true;
  D.chambers = D.rng.shuffle(ch);
  D.pos = 0;
  D.lied = D.rng.chance(D.foe.lieP);
  D.announce = D.real;
  if (D.lied) { const opts = [1, 2, 3, 4, 5].filter(n => n !== D.real && Math.abs(n - D.real) <= 2); D.announce = D.rng.pick(opts); }
  D.heard = null; D.truthKnown = false; D.fired = Array(6).fill(null);   // lo que se MOSTRÓ en cada cámara (para el cargador de la interfaz)
}

export const remaining = D => 6 - D.pos;
export const remainingLoaded = D => D.chambers.slice(D.pos).filter(Boolean).length;

function advance(D) {
  D.pos++; D.shots++;
  if (D.pos >= 6) { load(D); return true; }
  return false;
}
function checkOver(D) {
  if (D.marks.f <= 0) D.over = 'win';
  else if (D.marks.p <= 0) D.over = 'lose';
  return D.over;
}

// Acciones del jugador. Devuelven un evento para la animación.
export function playerShoot(D, at /* 'foe' | 'table' */) {
  if (D.over || D.turn !== 'p') return null;
  let loaded = D.chambers[D.pos];
  let anomaly = false;
  if (at === 'foe' && loaded && D.first && !D.anomalyDone) { anomaly = true; loaded = false; D.anomalyDone = true; }
  const pos0 = D.pos, ev = { who: 'p', at, loaded, anomaly, result: '', pos: pos0 };
  D.fired[pos0] = loaded;
  if (at === 'foe') {
    if (loaded) { D.marks.f--; ev.result = 'hit'; } else ev.result = 'click';
    D.turn = 'f';
  } else {
    if (loaded) { D.marks.p--; ev.result = 'backfire'; D.turn = 'f'; } else { ev.result = 'safe'; }
  }
  D.streakSafe = (at === 'table' && ev.result === 'safe') ? D.streakSafe + 1 : 0;
  ev.marks = { p: D.marks.p, f: D.marks.f };
  ev.reload = advance(D); ev.newAnnounce = ev.reload ? D.announce : null;
  ev.over = checkOver(D);
  if (ev.over) D.turn = null;
  return ev;
}

// Escuchar: no consume cámara. `fiable`: 75%.
export function listen(D, reliability = LISTEN_RELIABILITY) {
  if (D.over || D.turn !== 'p') return null;
  const truth = D.chambers[D.pos];
  const ok = D.rng.chance(reliability);
  D.heard = { pos: D.pos, says: ok ? truth : !truth };
  return D.heard;
}

export function useTool(D, id) {
  if (D.over || D.turn !== 'p') return null;
  if (id === 'testigo') { D.truthKnown = true; return { id, real: D.real, lied: D.lied }; }
  if (id === 'mala_memoria') { D.skipFoe = true; return { id }; }
  if (id === 'contrato') {
    if (D.lied) { D.marks.f--; checkOver(D); if (D.over) D.turn = null; return { id, lied: true, over: D.over }; }
    return { id, lied: false, debt: 20 };
  }
  return null;
}

// Turno del rival: puede encadenar acciones (si tienta a la Mesa y sale vacía, sigue).
export function foeTurn(D) {
  const evs = [];
  if (D.over) return evs;
  if (D.skipFoe) { D.skipFoe = false; D.turn = 'p'; evs.push({ who: 'f', skipped: true }); return evs; }
  let guard = 0;
  while (D.turn === 'f' && !D.over && guard++ < 6) {
    const pL = remainingLoaded(D) / remaining(D);
    const noisy = D.rng.chance(D.foe.noise);
    let at = pL >= 0.5 ? 'p' : 'table';
    if (D.marks.f === 1 && pL > 0.3) at = 'p';
    if (noisy) at = at === 'p' ? 'table' : 'p';
    const loaded = D.chambers[D.pos];
    const pos0 = D.pos, ev = { who: 'f', at, loaded, result: '', pos: pos0 };
    D.fired[pos0] = loaded;
    if (at === 'p') {
      if (loaded) { D.marks.p--; ev.result = 'hit'; } else ev.result = 'click';
      D.turn = 'p';
    } else {
      if (loaded) { D.marks.f--; ev.result = 'backfire'; D.turn = 'p'; } else ev.result = 'safe';
    }
    ev.marks = { p: D.marks.p, f: D.marks.f };
    ev.reload = advance(D); ev.newAnnounce = ev.reload ? D.announce : null;
    ev.over = checkOver(D);
    if (ev.over) D.turn = null;
    evs.push(ev);
  }
  if (!D.over && D.turn === 'f') D.turn = 'p';
  return evs;
}
