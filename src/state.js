// Estado global. `gs` es el "gameState" del diseño: un único objeto mutable y serializable.
//  - Lo persistente entre partidas (muertes, relaciones, flags narrativos, conocimiento...) vive en la raíz y en gs.meta.
//  - Lo que dura una partida (mapa, semilla, flags de partida) vive en gs.run / gs.runFlags.
let _muted = false;
export const muteBus = v => { _muted = !!v; };
export const bus = (() => {
  const m = new Map();
  return {
    on(e, f) { if (!m.has(e)) m.set(e, []); m.get(e).push(f); return () => this.off(e, f); },
    off(e, f) { const a = m.get(e); if (a) m.set(e, a.filter(x => x !== f)); },
    emit(e, d) { if (_muted) return; (m.get(e) || []).slice().forEach(f => { try { f(d); } catch (err) { console.error('[bus]', e, err); } }); }
  };
})();

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function defaultMeta() {
  return {
    runsStarted: 0, runsFinished: 0,
    endings: [], memories: [], knowledge: [],
    unlockedCards: [], unlockedItems: [], wingsCleared: [],
    carryDebt: 0, introSeen: false, tutorial: {}, hints: {},
    mutations: 0,
    stats: { roundsWon: 0, roundsLost: 0, duelsWon: 0, duelsLost: 0, anomalies: 0, bossesDown: [] },
    lastRun: null
  };
}

export function defaultGameState() {
  return {
    v: 1,
    player: { health: 100, maxHealth: 100, sanity: 100, money: 50, debt: 0, lives: 1 },
    deck: [],
    inventory: [],            // ids de objetos
    tools: [],                // ids de cartas de mesa consumibles (máx. 3)
    handLevels: {},           // tipo de mano -> nivel
    discoveredEvents: [],
    discoveredCharacters: [],
    relationships: {},        // { personaje: { trust, fear } } (persistente entre partidas)
    flags: {},                // flags narrativos persistentes
    runFlags: {},             // flags de la partida actual
    destiny: 0,               // variable invisible (-10..10)
    runNumber: 1,
    deaths: 0,
    room: null,
    storyProgress: 0,
    language: 'en',
    cookieConsent: { necessary: true, decided: false },
    meta: defaultMeta(),
    run: null,
    pendingDeath: false
  };
}

export const gs = defaultGameState();

export function replaceState(next) {
  const fresh = defaultGameState();
  for (const k of Object.keys(gs)) delete gs[k];
  Object.assign(gs, fresh, next || {});
  gs.meta = Object.assign(defaultMeta(), (next && next.meta) || {});
  gs.meta.stats = Object.assign(defaultMeta().stats, gs.meta.stats || {});
  bus.emit('stats', {});
}

// ---------------- Ajustes (se guardan aparte de la partida) ----------------
export function defaultSettings() {
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {
    lang: null, music: 0.7, sfx: 0.9, ambient: 0.6,
    muteMusic: false, muteSfx: false, reduceIntense: false,
    textSize: 1, contrast: false, reduceEffects: reduce,
    quality: coarse ? 'medium' : 'high', vibration: true
  };
}
export const settings = defaultSettings();

// ---------------- Recursos ----------------
export function addMoney(n) {
  const p = gs.player; const old = p.money;
  p.money = Math.max(0, Math.round(p.money + n));
  bus.emit('stats', { k: 'money', v: p.money - old });
  return p.money - old;
}
export function addSanity(n) {
  const p = gs.player; const old = p.sanity;
  p.sanity = clamp(Math.round(p.sanity + n), 0, 100);
  bus.emit('stats', { k: 'sanity', v: p.sanity - old });
  if (p.sanity === 0 && old > 0) bus.emit('sanityZero');
  return p.sanity - old;
}
export function addHealth(n) {
  const p = gs.player; const old = p.health;
  p.health = clamp(Math.round(p.health + n), 0, p.maxHealth);
  if (p.health <= 0) gs.pendingDeath = true;
  bus.emit('stats', { k: 'health', v: p.health - old });
  return p.health - old;
}
export function addDebt(n) {
  const p = gs.player; const old = p.debt;
  p.debt = Math.max(0, Math.round(p.debt + n));
  bus.emit('stats', { k: 'debt', v: p.debt - old });
  return p.debt - old;
}
export function addDestiny(n) { gs.destiny = clamp(Math.round((gs.destiny + n) * 10) / 10, -10, 10); bus.emit('stats', { k: 'destiny' }); }

// 0 = estable, 1 = pequeñas disonancias, 2 = capas extrañas, 3 = deformada, 4 = cordura 0
export function sanityTier(s = gs.player.sanity) { return s >= 70 ? 0 : s >= 40 ? 1 : s >= 20 ? 2 : s >= 1 ? 3 : 4; }

export const rel = id => (gs.relationships[id] || (gs.relationships[id] = { trust: 0, fear: 0 }));
export const hasItem = id => gs.inventory.includes(id);
export const hasCard = id => gs.deck.some(c => c.id === id);
export const hasTool = id => gs.tools.includes(id);
export const know = id => gs.meta.knowledge.includes(id);
export const flag = id => !!(gs.runFlags[id] || gs.flags[id]);
export function nextUid() {
  if (!gs.run) return 'u' + Math.floor(Math.random() * 1e9);
  gs.run.uid = (gs.run.uid || 0) + 1; return 'c' + gs.run.uid;
}
