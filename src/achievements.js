// achievements.js — secretos (Easter eggs) que funcionan como logros. Sin DOM: la interfaz escucha bus 'egg'.
// Se guardan en gs.meta.eggs Y en settings.eggs (así los que se encuentran en el menú, antes de cargar partida, no se pierden).
import { gs, settings, bus } from './state.js';

export const EGGS = ['ojos', 'konami', 'paciencia', 'poliglota', 'real', 'ases', 'limite', 'mesa3', 'cinco', 'arrepentido', 'colapso', 'jackpot'];
export const LANGS = ['es', 'en', 'fr', 'de'];

export const eggsFound = () => [...new Set([...(gs.meta && gs.meta.eggs ? gs.meta.eggs : []), ...(settings.eggs || [])])].filter(id => EGGS.includes(id));
export const hasEgg = id => eggsFound().includes(id);

export function unlockEgg(id) {
  if (!EGGS.includes(id) || hasEgg(id)) return false;
  if (!gs.meta.eggs) gs.meta.eggs = [];
  gs.meta.eggs.push(id);
  if (!settings.eggs) settings.eggs = [];
  if (!settings.eggs.includes(id)) settings.eggs.push(id);
  bus.emit('egg', { id });
  return true;
}
export function resetEggs() { settings.eggs = []; settings.langsSeen = []; if (gs.meta) gs.meta.eggs = []; }

// ---- Menú: idioma (los cuatro), ojos, código, paciencia ----
export function noteLang(code) {
  if (!LANGS.includes(code)) return;
  if (!settings.langsSeen) settings.langsSeen = [];
  if (!settings.langsSeen.includes(code)) settings.langsSeen.push(code);
  checkLangs();
}
export function checkLangs() { if (LANGS.every(l => (settings.langsSeen || []).includes(l))) unlockEgg('poliglota'); }

export const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
let kIdx = 0;
export function konamiKey(key) {
  const k = String(key).toLowerCase();
  if (k === KONAMI[kIdx]) kIdx++; else kIdx = (k === KONAMI[0]) ? 1 : 0;
  if (kIdx >= KONAMI.length) { kIdx = 0; return unlockEgg('konami'); }
  return false;
}
let eyeN = 0, eyeT = 0;
export function eyeClick(now = Date.now()) {
  if (now - eyeT > 6000) eyeN = 0;
  eyeT = now; eyeN++;
  if (eyeN >= 7) { eyeN = 0; return unlockEgg('ojos'); }
  return false;
}

export const IDLE = { ms: 60000 };   // un minuto en el menú sin tocar nada
let idleTm = null;
export function idleStop() { if (idleTm) { clearTimeout(idleTm); idleTm = null; } }
export function idleStart() { idleStop(); idleTm = setTimeout(() => { idleTm = null; unlockEgg('paciencia'); }, IDLE.ms); }

// ---- Mesa de cartas: `cards` son las cartas jugadas (con rank/suit), `res` el resultado de la jugada ----
export function onPlay(cards, res) {
  if (!res) return;
  const rk = cards.map(c => c.rank);
  if (res.hand === 'royal') unlockEgg('real');
  if (rk.filter(r => r === 1).length >= 4) unlockEgg('ases');
  if (rk.filter(r => r === 7).length >= 3 && ['three', 'full', 'four', 'five'].includes(res.hand)) unlockEgg('jackpot');
}
export function onRoundWon(R) { if (R && R.playsLeft === 0) unlockEgg('limite'); }
export function onDuelStreak(D) { if (D && D.streakSafe >= 3) unlockEgg('mesa3'); }
export function onJokers() { if (gs.jokers && gs.jokers.length >= 5) unlockEgg('cinco'); }
export function onSellJoker(boughtHere) { if (boughtHere) unlockEgg('arrepentido'); }
export function onCollapse() { unlockEgg('colapso'); }
