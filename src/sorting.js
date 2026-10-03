// sorting.js — orden de cartas para la mano (Valor / Palo) y para la vista del mazo. Sin DOM. Estable: a igualdad se respeta el orden original.
import { rankPower } from './cards.js';
export const SUIT_ORDER = ['blood', 'eye', 'tooth', 'key'];
export const SORT_MODES = ['suit', 'rank', 'special', 'recent'];
const nsp = c => (c.sp ? 0 : 1);                                   // especiales primero
const suitIx = c => { const i = SUIT_ORDER.indexOf(c.suit); return i < 0 ? 9 : i; };
const pw = c => (typeof c.rank === 'number' ? rankPower(c.rank) : 0);   // As = 14 (de mayor a menor: A K Q J 10…)
const CMP = {
  suit: (x, y) => suitIx(x[0]) - suitIx(y[0]) || pw(y[0]) - pw(x[0]) || nsp(x[0]) - nsp(y[0]) || x[1] - y[1],
  rank: (x, y) => pw(y[0]) - pw(x[0]) || suitIx(x[0]) - suitIx(y[0]) || nsp(x[0]) - nsp(y[0]) || x[1] - y[1],
  special: (x, y) => nsp(x[0]) - nsp(y[0]) || suitIx(x[0]) - suitIx(y[0]) || pw(y[0]) - pw(x[0]) || x[1] - y[1],
  recent: (x, y) => y[1] - x[1]                                    // las últimas en llegar primero
};
export function sortCards(cards, mode = 'suit') {
  const cmp = CMP[mode]; if (!cmp) return cards.slice();
  return cards.map((c, i) => [c, i]).sort(cmp).map(x => x[0]);
}
