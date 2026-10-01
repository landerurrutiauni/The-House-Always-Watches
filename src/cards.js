// Cartas, manos y evaluación. Módulo puro (sin DOM) para poder testearlo en Node.
export const SUITS = ['blood', 'eye', 'tooth', 'key'];
export const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Manos: chips base y multiplicador base. Cada nivel de mano suma +8 chips y +1 mult.
export const HANDS = {
  high: { chips: 5, mult: 1, n: 1 },
  pair: { chips: 10, mult: 2, n: 2 },
  twopair: { chips: 20, mult: 2, n: 4 },
  three: { chips: 30, mult: 3, n: 3 },
  straight: { chips: 30, mult: 4, n: 5 },
  flush: { chips: 35, mult: 4, n: 5 },
  full: { chips: 40, mult: 4, n: 5 },
  four: { chips: 60, mult: 7, n: 4 },
  sflush: { chips: 100, mult: 8, n: 5 },
  five: { chips: 120, mult: 12, n: 5 }
};
export const HAND_ORDER = ['five', 'sflush', 'four', 'full', 'flush', 'straight', 'three', 'twopair', 'pair', 'high'];
const HAND_RANK = Object.fromEntries(HAND_ORDER.map((h, i) => [h, HAND_ORDER.length - i]));

// Cartas especiales. `wild`: 'suit' | 'rank' | 'both'. `curse`: maldita.
export const SPECIALS = {
  la_mujer:      { suit: 'blood', rank: 0, wild: 'both', curse: true },
  el_ahogado:    { suit: 'eye', rank: 3, curse: true },
  la_septima:    { suit: 'key', rank: 7, curse: true },
  la_deuda:      { suit: 'tooth', rank: 10, curse: true },
  el_hambre:     { suit: 'tooth', rank: 5, curse: true },
  sangre_pacto:  { suit: 'blood', rank: 6 },
  ojo_vigia:     { suit: 'eye', rank: 8 },
  colmillo:      { suit: 'tooth', rank: 9 },
  llave_maestra: { suit: 'key', rank: 4 },
  dado_trucado:  { suit: 'key', rank: 6, wild: 'suit' },
  moneda_gemela: { suit: 'key', rank: 2 },
  carta_doble:   { suit: 'blood', rank: 5 },
  corazon:       { suit: 'blood', rank: 9 },
  hueso_liso:    { suit: 'tooth', rank: 1 },
  sombra:        { suit: 'eye', rank: 4, wild: 'rank' }
};
export const SPECIAL_IDS = Object.keys(SPECIALS);
export const CURSED_IDS = SPECIAL_IDS.filter(i => SPECIALS[i].curse);
export const MODS = ['edge', 'red', 'gold', 'glass', 'hex'];

let _uid = 0;
export const freshUid = () => 'k' + (++_uid).toString(36) + Math.floor(Math.random() * 1e6).toString(36);

export function makeCard(id, extra) {
  const sp = SPECIALS[id];
  if (sp) return Object.assign({ uid: freshUid(), id, suit: sp.suit, rank: sp.rank, sp: true, mods: [], grow: 0 }, extra);
  const m = /^(blood|eye|tooth|key)_(\d+)$/.exec(id);
  if (!m) throw new Error('carta desconocida ' + id);
  return Object.assign({ uid: freshUid(), id, suit: m[1], rank: +m[2], sp: false, mods: [], grow: 0 }, extra);
}
export function baseDeck() {
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push(makeCard(s + '_' + (r < 10 ? '0' + r : r)));
  return d;
}
export const isWildRank = c => !!c.sp && (SPECIALS[c.id].wild === 'rank' || SPECIALS[c.id].wild === 'both');
export const isWildSuit = c => !!c.sp && (SPECIALS[c.id].wild === 'suit' || SPECIALS[c.id].wild === 'both');
export const cardName = c => c.sp ? 'card.' + c.id : null; // la UI compone el nombre de las cartas base con plantilla

// ---------------- Evaluación ----------------
function rankType(ranks) {
  const cnt = {};
  for (const r of ranks) cnt[r] = (cnt[r] || 0) + 1;
  const groups = Object.entries(cnt).map(([r, n]) => ({ r: +r, n })).sort((a, b) => b.n - a.n || b.r - a.r);
  const n = ranks.length;
  const g0 = groups[0].n, g1 = groups[1] ? groups[1].n : 0;
  let type = 'high';
  if (g0 === 5) type = 'five';
  else if (g0 === 4) type = 'four';
  else if (g0 === 3 && g1 === 2) type = 'full';
  else if (g0 === 3) type = 'three';
  else if (g0 === 2 && g1 === 2) type = 'twopair';
  else if (g0 === 2) type = 'pair';
  let straight = false;
  if (n === 5) { const s = [...ranks].sort((a, b) => a - b); straight = s.every((v, i) => i === 0 || v === s[i - 1] + 1); }
  return { type, straight, groups };
}

// Devuelve { type, idx: índices de cartas que puntúan, ranks, suits } eligiendo la mejor asignación de comodines.
export function evaluate(cards) {
  const n = cards.length;
  if (!n) return { type: 'high', idx: [], ranks: [], suits: [] };
  const wr = [], ws = [];
  cards.forEach((c, i) => { if (isWildRank(c)) wr.push(i); if (isWildSuit(c)) ws.push(i); });
  // Suelo de palo: ¿es posible el color?
  const fixedSuits = cards.filter(c => !isWildSuit(c)).map(c => c.suit);
  const flushPossible = n === 5 && new Set(fixedSuits).size <= 1;
  const assignedSuit = () => {
    const base = fixedSuits[0] || 'blood';
    return cards.map(c => isWildSuit(c) ? base : c.suit);
  };
  let best = null;
  const kr = Math.min(wr.length, 2);
  const combos = Math.pow(10, kr);
  for (let k = 0; k < combos; k++) {
    const ranks = cards.map(c => c.rank);
    let kk = k;
    for (let j = 0; j < wr.length; j++) {
      if (j < kr) { ranks[wr[j]] = 1 + (kk % 10); kk = Math.floor(kk / 10); }
      else { // comodines extra: el rango más repetido
        const cnt = {}; ranks.forEach((r, i) => { if (!wr.includes(i) || i === wr[j]) return; cnt[r] = (cnt[r] || 0) + 1; });
        ranks[wr[j]] = +(Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0] || 1);
      }
    }
    const { type: t0, straight, groups } = rankType(ranks);
    let type = t0;
    if (straight && flushPossible) type = 'sflush';
    else if (flushPossible && HAND_RANK.flush > HAND_RANK[type]) type = 'flush';
    else if (straight && HAND_RANK.straight > HAND_RANK[type]) type = 'straight';
    // cartas que puntúan
    let idx;
    if (['five', 'sflush', 'flush', 'straight', 'full'].includes(type)) idx = cards.map((_, i) => i);
    else if (type === 'four') idx = ranks.map((r, i) => r === groups[0].r ? i : -1).filter(i => i >= 0);
    else if (type === 'three') idx = ranks.map((r, i) => r === groups[0].r ? i : -1).filter(i => i >= 0);
    else if (type === 'twopair') idx = ranks.map((r, i) => (r === groups[0].r || r === groups[1].r) ? i : -1).filter(i => i >= 0);
    else if (type === 'pair') idx = ranks.map((r, i) => r === groups[0].r ? i : -1).filter(i => i >= 0);
    else { let bi = 0; ranks.forEach((r, i) => { if (r > ranks[bi]) bi = i; }); idx = [bi]; }
    const sumChips = idx.reduce((a, i) => a + ranks[i], 0);
    const key = HAND_RANK[type] * 1000 + sumChips;
    if (!best || key > best.key) best = { key, type, idx, ranks: ranks.slice(), suits: assignedSuit() };
  }
  // Los comodines de palo: si NO forman color, mantienen su palo natural para los efectos.
  if (best.type !== 'flush' && best.type !== 'sflush') best.suits = cards.map(c => c.suit);
  return best;
}

export function cardLabelParts(c) { return { suit: c.suit, rank: c.rank, id: c.id, sp: c.sp }; }
