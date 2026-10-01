// Generador de mapa de nodos (sin DOM). 8 filas: fila 0 = inicio, fila 6 = descanso+tienda, fila 7 = jefe.
import { RNG, hashStr } from './rng.js';

export const WINGS = {
  salon: { boss: 'girl', bg: 'casino', w: { game: 40, event: 28, shotgun: 10, merchant: 9, rest: 13 } },
  pasillo: { boss: 'chair', bg: 'corridor', w: { game: 34, event: 32, shotgun: 12, merchant: 8, rest: 14 } },
  sotano: { boss: 'drowned', bg: 'basement', w: { game: 36, event: 30, shotgun: 14, merchant: 8, rest: 12 } }
};
export const ROWS = 8;

export function generateMap(seed, wing, pools) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const rng = new RNG(hashStr(seed + ':map:' + wing + ':' + attempt));
    const m = build(rng, wing, pools);
    if (validateMap(m)) return m;
  }
  throw new Error('no se pudo generar un mapa válido');
}

function build(rng, wing, pools) {
  const W = WINGS[wing] || WINGS.salon;
  const rows = [];
  const mk = (row, col, kind) => ({ id: `r${row}c${col}`, row, col, kind, links: [], secret: false });
  rows.push([mk(0, 0, 'game'), mk(0, 1, 'event')]);
  for (let r = 1; r <= ROWS - 3; r++) {
    const n = rng.int(2, 3), kinds = [];
    for (let c = 0; c < n; c++) {
      let k;
      for (let t = 0; t < 12; t++) {
        k = rng.weighted(Object.keys(W.w), x => W.w[x]);
        if (k === 'shotgun' && (kinds.includes('shotgun') || r < 2)) continue;
        if (k === 'merchant' && kinds.includes('merchant')) continue;
        if (k === 'rest' && r === 1) continue;
        break;
      }
      kinds.push(k);
    }
    if (r === 1 && !kinds.includes('game')) kinds[0] = 'game';
    rows.push(kinds.map((k, c) => mk(r, c, k)));
  }
  rows.push([mk(ROWS - 2, 0, 'rest'), mk(ROWS - 2, 1, 'merchant')]);
  rows.push([mk(ROWS - 1, 0, 'boss')]);
  // enlaces
  for (let r = 0; r < ROWS - 1; r++) {
    const A = rows[r], B = rows[r + 1];
    const near = (i, la, lb) => la === 1 ? 0 : Math.round(i * (lb - 1) / (la - 1));
    B.forEach((b, j) => {
      let bi = 0, bd = 9; A.forEach((a, i) => { const d = Math.abs(near(i, A.length, B.length) - j); if (d < bd) { bd = d; bi = i; } });
      if (!A[bi].links.includes(b.id)) A[bi].links.push(b.id);
    });
    A.forEach((a, i) => {
      if (!a.links.length) a.links.push(B[near(i, A.length, B.length)].id);
      else if (rng.chance(0.4)) { const c = rng.pick(B); if (!a.links.includes(c.id)) a.links.push(c.id); }
    });
  }
  // nodo secreto oculto (fila 3), alcanzable desde la fila 2 y con salida a la fila 4
  const sec = { id: 'secret', row: 3, col: 9, kind: 'secret', links: rows[4].map(n => n.id).slice(0, 2), secret: true };
  rows[3].push(sec);
  rows[2].forEach(n => n.links.push('secret'));
  // contenido
  const evPool = pools.events.slice();
  const usedEv = new Set();
  const oppIds = pools.opps;
  for (const row of rows) for (const n of row) {
    const nr = new RNG(hashStr(rng.seed + ':' + n.id));
    if (n.kind === 'event') {
      let choices = evPool.filter(e => !usedEv.has(e));
      if (!choices.length) choices = evPool;
      n.ev = nr.pick(choices); usedEv.add(n.ev);
    } else if (n.kind === 'game') {
      n.opp = { id: nr.pick(oppIds), rule: nr.pick(pools.rules), name: nr.int(1, 6) };
    } else if (n.kind === 'shotgun') {
      n.opp = { id: nr.pick(pools.duelFoes), name: nr.int(1, 6) };
    } else if (n.kind === 'boss') {
      n.opp = { id: W.boss };
    } else if (n.kind === 'secret') {
      n.ev = nr.pick(pools.secretEvents);
    }
  }
  return { wing, rows };
}

export function nodeById(map, id) { for (const r of map.rows) for (const n of r) if (n.id === id) return n; return null; }

export function validateMap(map) {
  const all = map.rows.flat();
  const ids = new Set(all.map(n => n.id));
  if (ids.size !== all.length) return false;
  for (const n of all) for (const l of n.links) if (!ids.has(l)) return false;
  // todos los nodos no secretos alcanzables desde la fila 0 y todos llevan al jefe
  const boss = all.find(n => n.kind === 'boss').id;
  const reach = new Set(map.rows[0].map(n => n.id)); const q = [...reach];
  while (q.length) { const id = q.pop(); for (const l of nodeById(map, id).links) if (!reach.has(l)) { reach.add(l); q.push(l); } }
  if (!reach.has(boss)) return false;
  for (const n of all) if (!n.secret && !reach.has(n.id)) return false;
  const rev = {}; all.forEach(n => n.links.forEach(l => (rev[l] = rev[l] || []).push(n.id)));
  const toBoss = new Set([boss]); const q2 = [boss];
  while (q2.length) { const id = q2.pop(); for (const p of rev[id] || []) if (!toBoss.has(p)) { toBoss.add(p); q2.push(p); } }
  return all.every(n => toBoss.has(n.id));
}

// Nodos a los que se puede ir desde la posición actual.
export function available(map, pos, secretOk) {
  if (!pos) return map.rows[0].map(n => n.id);
  const n = nodeById(map, pos);
  return n.links.filter(id => id !== 'secret' || secretOk);
}
