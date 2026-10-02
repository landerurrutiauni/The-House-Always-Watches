import { eqRow } from './scale.js';
// jokers.js — Jokers al estilo Balatro: modificadores pasivos de la jugada (máx. 5 por descenso). Sin DOM.
// Cada joker tiene un precio, una rareza y fx(S, J, data), que se ejecuta al puntuar (de izquierda a derecha, después de las cartas):
//   S = { scoring:[{c,i,suit,rank}], cards, hand, R, stake, played }   J = { addChips, addMult, addX, cost }
// Los pasos que genera cada joker llevan su id (j) para que la interfaz pueda animarlo. `data` = contadores persistentes del descenso.
export const MAX_JOKERS = 5;
const PAIRISH = ['pair', 'twopair', 'three', 'full', 'four', 'five'];
// Listas EXPLÍCITAS (los textos de cada comodín nombran todas las manos que valen; la escalera real es una mano propia)
export const FLUSHISH = ['flush', 'full', 'four', 'sflush', 'royal', 'five'];
export const STRAIGHTISH = ['straight', 'sflush', 'royal'];
const nSuit = (S, su) => S.scoring.filter(s => s.suit === su).length;
const nFaces = S => S.scoring.filter(s => s.rank >= 11 && s.rank <= 13).length;
const nAces = S => S.scoring.filter(s => s.rank === 1).length;

export const JOKERS = {
  bufon:              { price: 30, rarity: 'common', fx: (S, J) => J.addMult(4) },
  sonrisa:            { price: 35, rarity: 'common', fx: (S, J) => { if (PAIRISH.includes(S.hand)) J.addChips(30); } },
  sanguijuela:        { price: 40, rarity: 'common', fx: (S, J) => { const k = nSuit(S, 'blood'); if (k) J.addMult(2 * k); } },
  ojo_nuca:           { price: 40, rarity: 'common', fx: (S, J) => { const k = nSuit(S, 'eye'); if (k) J.addChips(12 * k); } },
  colmillo_dorado:    { price: 40, rarity: 'common', fx: (S, J) => { const k = nSuit(S, 'tooth'); if (k) J.addChips(10 * k); } },
  llavero_roto:       { price: 40, rarity: 'common', fx: (S, J) => { const k = nSuit(S, 'key'); if (k) { J.addChips(8 * k); J.cost('shield', k); } } },
  ultima_oportunidad: { price: 40, rarity: 'common', fx: (S, J) => { if (S.R.playsLeft === 1) J.addMult(10); } },
  trapero:            { price: 45, rarity: 'common', fx: (S, J) => { const m = Math.min(10, Math.floor(S.R.player.debt / 40)); if (m) J.addMult(m); } },
  peaje:              { price: 45, rarity: 'common', fx: (S, J) => { J.cost('money', 2 * S.scoring.length); } },
  vela_viuda:         { price: 45, rarity: 'uncommon', fx: (S, J) => { if (S.R.player.sanity < 40) J.addX(1.5); } },
  gemelos:            { price: 50, rarity: 'uncommon', fx: (S, J) => { if (S.hand === 'twopair' || S.hand === 'full') J.addX(1.5); } },
  escalera_sin_fin:   { price: 50, rarity: 'uncommon', fx: (S, J) => { if (STRAIGHTISH.includes(S.hand)) { J.addChips(40); J.addMult(4); } } },
  monja_ciega:        { price: 55, rarity: 'uncommon', fx: (S, J) => { for (let i = 0; i < nFaces(S); i++) J.addX(1.25); } },
  as_manga:           { price: 55, rarity: 'uncommon', fx: (S, J) => { for (let i = 0; i < nAces(S); i++) J.addX(1.5); } },
  casa_gana:          { price: 55, rarity: 'uncommon', fx: (S, J) => { if (S.stake && S.stake !== 'none') J.addX(1.4); } },
  abaco:              { price: 55, rarity: 'uncommon', fx: (S, J, data) => { const k = (data && data.abaco) || 0; if (k) J.addMult(k); } },
  corona_podrida:     { price: 70, rarity: 'rare', fx: (S, J) => { if (FLUSHISH.includes(S.hand)) J.addX(2); } },
  sombrero:           { price: 70, rarity: 'rare', fx: (S, J) => { J.addX(1.3); J.cost('sanity', -2); } },
  ultimo_aliento:     { price: 75, rarity: 'rare', fx: (S, J) => { if (S.R.player.health < 0.3 * S.R.player.maxHealth) J.addX(3); } }
};
export const JOKER_IDS = Object.keys(JOKERS);
export const JOKER_PRICE = id => (JOKERS[id] ? JOKERS[id].price : 0);
export const jokerSellPrice = id => Math.floor(JOKER_PRICE(id) / 2);
// Peso de aparición por rareza (las raras salen sobre todo en filas altas y de jefes)
export const rarityWeight = (rarity, row = 0, boss = false) => { const r = eqRow(row); return rarity === 'common' ? 6 : rarity === 'uncommon' ? 3 + (r >= 3 ? 1 : 0) : (boss ? 4 : 1 + (r >= 4 ? 1 : 0)); };
export function pickJoker(rng, owned = [], row = 0, boss = false) {
  const pool = JOKER_IDS.filter(id => !owned.includes(id));
  if (!pool.length) return null;
  const bag = []; for (const id of pool) for (let i = 0; i < rarityWeight(JOKERS[id].rarity, row, boss); i++) bag.push(id);
  return rng.pick(bag);
}
// Al ganar una ronda: contadores de jokers que escalan.
export function onRoundWon(jokers, data) { if (jokers.includes('abaco')) data.abaco = (data.abaco || 0) + 1; }
