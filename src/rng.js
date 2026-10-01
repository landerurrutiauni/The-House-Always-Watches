// RNG determinista (mulberry32). Todo el azar "importante" del juego sale de aquí,
// derivado de la semilla de la partida, para que recargar la página no permita repetir tiradas.
export function hashStr(s) {
  s = String(s);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RNG {
  constructor(seed) {
    this.seed = ((typeof seed === 'string' ? hashStr(seed) : seed) >>> 0) || 1;
    this.f = mulberry32(this.seed);
  }
  next() { return this.f(); }
  int(a, b) { return a + Math.floor(this.f() * (b - a + 1)); }
  chance(p) { return this.f() < p; }
  pick(arr) { return arr[Math.floor(this.f() * arr.length)]; }
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.f() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  weighted(items, wf) {
    let tot = 0;
    const ws = items.map(it => { const w = Math.max(0, wf ? wf(it) : it.w); tot += w; return w; });
    if (tot <= 0) return items[0];
    let r = this.f() * tot;
    for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  }
  fork(salt) { return new RNG(hashStr(this.seed + ':' + salt)); }
}

// RNG derivado de (semilla, ...partes): estable entre recargas para el mismo nodo/acción.
export const rngFor = (seed, ...parts) => new RNG(hashStr(seed + ':' + parts.join(':')));
export const newSeed = () => (Math.floor(Math.random() * 0xFFFFFFFF) >>> 0) || 7;
