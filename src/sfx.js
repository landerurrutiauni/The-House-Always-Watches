// sfx.js — efectos de sonido sintetizados (Web Audio, sin assets). [PROCESO B]
// API (singleton `sfx`):  sfx.attach(core) · sfx.play(nombre, {vol, rate, delay}) · sfx.NAMES · sfx.setReduceIntense(bool)
// Los nombres desconocidos se ignoran (no rompen el juego). Algunos nombres tienen alias (ver ALIAS).
const C = { ctx: null, bus: null, abus: null, noise: null, reduce: false };
const INTENSE = new Set(['hurt', 'glitch', 'shot', 'sting', 'heartbeat', 'scream', 'slam', 'boss_in']);
export const ALIAS = { card_deal: 'card_flip', flip: 'card_flip', play: 'card_play', place: 'card_play', discard: 'card_discard', coin: 'chip', money: 'chip', select: 'click', tap: 'click', ok: 'confirm', error: 'deny', no: 'deny', damage: 'hurt', gun_click: 'click_empty', blank: 'click_empty', gun_shot: 'shot', bang: 'shot', reload: 'gun_load', win: 'victory', lose: 'defeat', unlock_memory: 'memory', choice_left: 'swipe', choice_right: 'swipe', open: 'door', text: 'type', item: 'unlock', buy: 'chip', sell: 'chip', lightbulb: 'bulb', whispers: 'whisper', stinger: 'sting', sanity_loss: 'whisper', stake: 'bet' };

const g = v => { const n = C.ctx.createGain(); n.gain.value = v; return n; };
const F = (type, f, q = 1) => { const b = C.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
function env(p, t, a, pk, d) { p.setValueAtTime(0.0001, t); p.linearRampToValueAtTime(Math.max(pk, .0002), t + a); p.exponentialRampToValueAtTime(0.0001, t + a + d); }
// tono: f (→ f2 exponencial), tipo, ataque, decaimiento, volumen
function tone(dest, t, { f = 440, f2, type = 'sine', a = .004, d = .2, v = .3, det = 0, lp }) {
  const o = C.ctx.createOscillator(), n = g(0); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + a + d); o.detune.value = det;
  let last = o; if (lp) { const fl = F('lowpass', lp, .7); o.connect(fl); last = fl; } last.connect(n); n.connect(dest); env(n.gain, t, a, v, d); o.start(t); o.stop(t + a + d + .05);
}
function burst(dest, t, { d = .08, type = 'bandpass', f = 2000, f2, q = 1, v = .3, a = .002, pan }) {
  const s = C.ctx.createBufferSource(); s.buffer = C.noise; s.loop = true; const fl = F(type, f, q); if (f2) fl.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + a + d);
  const n = g(0); s.connect(fl); fl.connect(n); let out = n; if (pan != null && C.ctx.createStereoPanner) { const p = C.ctx.createStereoPanner(); p.pan.value = pan; n.connect(p); out = p; }
  out.connect(dest); env(n.gain, t, a, v, d); s.start(t, Math.random() * 1.5); s.stop(t + a + d + .05);
}
const rnd = (a, b) => a + Math.random() * (b - a);

const R = {
  click: (o, t) => tone(o, t, { f: 1500, f2: 900, type: 'square', d: .03, v: .07 }),
  hover: (o, t) => tone(o, t, { f: 900, type: 'sine', d: .02, v: .025 }),
  confirm: (o, t) => { tone(o, t, { f: 520, type: 'triangle', d: .14, v: .12 }); tone(o, t + .07, { f: 780, type: 'triangle', d: .2, v: .12 }); },
  deny: (o, t) => { tone(o, t, { f: 180, f2: 120, type: 'sawtooth', d: .16, v: .1, lp: 700 }); tone(o, t + .1, { f: 150, f2: 90, type: 'sawtooth', d: .2, v: .1, lp: 600 }); },
  card_flip: (o, t) => { burst(o, t, { d: .07, f: 3200, f2: 1600, q: .8, v: .16 }); tone(o, t, { f: 260, f2: 160, type: 'triangle', d: .05, v: .04 }); },
  card_play: (o, t) => { burst(o, t, { d: .09, type: 'lowpass', f: 1800, v: .25 }); tone(o, t, { f: 190, f2: 90, type: 'sine', d: .12, v: .28 }); },
  card_discard: (o, t) => burst(o, t, { d: .16, f: 2600, f2: 700, q: .7, v: .16 }),
  chip: (o, t) => { tone(o, t, { f: 2300, type: 'sine', d: .18, v: .12 }); tone(o, t + .045, { f: 3400, type: 'sine', d: .22, v: .09 }); burst(o, t, { d: .02, f: 5000, v: .08 }); },
  bet: (o, t) => { R.chip(o, t); tone(o, t + .05, { f: 70, f2: 45, d: .35, v: .3 }); },
  hurt: (o, t) => { tone(o, t, { f: 110, f2: 38, d: .32, v: .5 }); burst(o, t, { d: .16, type: 'lowpass', f: 1400, f2: 200, v: .32 }); },
  heal: (o, t) => [523, 659, 784].forEach((f, i) => tone(o, t + i * .07, { f, type: 'sine', d: .5, v: .09 })),
  glitch: (o, t) => { for (let i = 0; i < 7; i++) tone(o, t + i * .035, { f: rnd(120, 2400), type: 'square', d: .03, v: .09 }); burst(o, t, { d: .25, type: 'highpass', f: 4000, v: .12 }); },
  door: (o, t) => { tone(o, t, { f: 90, f2: 160, type: 'sawtooth', a: .15, d: .9, v: .07, lp: 500 }); tone(o, t + .95, { f: 70, f2: 40, d: .3, v: .4 }); },
  knock: (o, t) => [0, .22, .4].forEach(d => { tone(o, t + d, { f: 200, f2: 110, type: 'triangle', d: .1, v: .4 }); burst(o, t + d, { d: .05, f: 900, q: 2, v: .2 }); }),
  bulb: (o, t) => { for (let i = 0; i < 5; i++) tone(o, t + i * .06 + Math.random() * .03, { f: 100, type: 'sawtooth', d: .05, v: .05, lp: 900 }); },
  click_empty: (o, t) => { burst(o, t, { d: .03, f: 3800, q: 6, v: .35 }); tone(o, t, { f: 1800, f2: 900, type: 'square', d: .02, v: .05 }); },
  gun_load: (o, t) => { for (let i = 0; i < 6; i++) burst(o, t + i * .07, { d: .025, f: 3000 + i * 150, q: 5, v: .18 }); burst(o, t + .5, { d: .05, f: 1200, q: 3, v: .3 }); },
  shot: (o, t) => { tone(o, t, { f: 95, f2: 32, d: .5, v: .7 }); burst(o, t, { d: .35, type: 'lowpass', f: 2600, f2: 120, v: .5 }); },
  heartbeat: (o, t) => { tone(o, t, { f: 62, f2: 34, d: .22, v: .8 }); tone(o, t + .23, { f: 52, f2: 32, d: .2, v: .55 }); },
  whisper: (o, t) => { burst(o, t, { d: 1.6, a: .6, f: 1500, f2: 2600, q: 9, v: .16, pan: rnd(-.8, .8) }); burst(o, t + .3, { d: 1.3, a: .5, f: 2400, f2: 1300, q: 7, v: .1, pan: rnd(-.8, .8) }); },
  sting: (o, t) => { [0, 1, 6, 11].forEach(iv => tone(o, t, { f: 220 * Math.pow(2, iv / 12), type: 'sawtooth', a: .02, d: 1.1, v: .09, lp: 1800 })); burst(o, t, { d: .5, type: 'highpass', f: 3500, v: .1 }); },
  boss_in: (o, t) => { tone(o, t, { f: 55, f2: 40, type: 'sawtooth', a: .05, d: 1.4, v: .3, lp: 400 }); R.sting(o, t + .05); },
  victory: (o, t) => [[0, 0], [3, .35], [7, .7], [10, 1.15]].forEach(([iv, d]) => tone(o, t + d, { f: 293.7 * Math.pow(2, iv / 12), type: 'triangle', d: 1.8, v: .11 })),
  defeat: (o, t) => { tone(o, t, { f: 196, f2: 82, type: 'sawtooth', a: .05, d: 1.6, v: .12, lp: 700 }); burst(o, t, { d: 1.2, type: 'lowpass', f: 500, v: .12 }); },
  unlock: (o, t) => [0, 4, 7, 12].forEach((iv, i) => tone(o, t + i * .08, { f: 659 * Math.pow(2, iv / 12), type: 'sine', d: .6, v: .09 })),
  memory: (o, t) => { [880, 1108, 1318].forEach((f, i) => tone(o, t + i * .11, { f, type: 'sine', d: 1.4, v: .07 })); tone(o, t, { f: 110, type: 'sine', a: .3, d: 1.5, v: .1 }); },
  type: (o, t) => tone(o, t, { f: rnd(700, 1300), type: 'square', d: .012, v: .022 }),
  page: (o, t) => burst(o, t, { d: .22, f: 4200, f2: 1200, q: .5, v: .09 }),
  swipe: (o, t) => burst(o, t, { d: .18, f: 500, f2: 3000, q: 1.4, v: .1 }),
  bell: (o, t) => [1, 2.4, 4.1, 5.9].forEach((m, i) => tone(o, t, { f: 330 * m, type: 'sine', d: 2.4 / (1 + i * .6), v: .12 / (1 + i * .5) })),
  drip: (o, t) => tone(o, t, { f: 1500, f2: 500, type: 'sine', d: .12, v: .12 }),
  footstep: (o, t) => { tone(o, t, { f: 80, f2: 50, d: .1, v: .25 }); burst(o, t, { d: .06, type: 'lowpass', f: 700, v: .1 }); },
  dice: (o, t) => { for (let i = 0; i < 6; i++) burst(o, t + i * .06 + Math.random() * .03, { d: .04, f: rnd(1500, 3500), q: 4, v: .14 }); },
  shield: (o, t) => { tone(o, t, { f: 1800, type: 'triangle', d: .35, v: .1 }); tone(o, t, { f: 2700, type: 'sine', d: .4, v: .07 }); },
  level_up: (o, t) => [0, 3, 7, 10, 14].forEach((iv, i) => tone(o, t + i * .06, { f: 392 * Math.pow(2, iv / 12), type: 'triangle', d: .3, v: .09 })),
  scream: (o, t) => { tone(o, t, { f: 700, f2: 300, type: 'sawtooth', a: .03, d: .9, v: .1, lp: 2000, det: 40 }); burst(o, t, { d: .8, f: 2200, q: 3, v: .1 }); },
  slam: (o, t) => { tone(o, t, { f: 60, f2: 30, d: .6, v: .7 }); burst(o, t, { d: .3, type: 'lowpass', f: 900, v: .4 }); },
  creak: (o, t) => tone(o, t, { f: 120, f2: 210, type: 'sawtooth', a: .3, d: .7, v: .06, lp: 420 })
};

export const sfx = {
  NAMES: Object.keys(R),
  attach(core) { C.ctx = core.ctx; C.noise = core.noise; C.bus = core.buses.sfx; C.abus = core.buses.ambient; },
  setReduceIntense(v) { C.reduce = !!v; },
  has(name) { return !!R[ALIAS[name] || name]; },
  play(name, opts = {}) {
    const key = R[name] ? name : ALIAS[name]; if (!key || !R[key] || !C.ctx || C.ctx.state !== 'running') return false;
    try {
      const t = C.ctx.currentTime + .005 + (opts.delay || 0); let out = opts.bus === 'ambient' && C.abus ? C.abus : C.bus;
      const vol = (opts.vol != null ? opts.vol : 1) * (C.reduce && INTENSE.has(key) ? .35 : 1);
      const node = g(vol); let dest = node; if (C.reduce && INTENSE.has(key)) { const lp = F('lowpass', 1200, .5); node.connect(lp); lp.connect(out); } else node.connect(out);
      R[key](dest, t);
      setTimeout(() => { try { node.disconnect(); } catch (e) { /* ok */ } }, 4000);
      return true;
    } catch (e) { console.warn('[sfx]', name, e); return false; }
  }
};
