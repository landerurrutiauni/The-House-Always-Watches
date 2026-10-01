// music.js — motor de música procedural POR CAPAS (Web Audio, sin assets). [PROCESO B]
// Capas: ambient · melody (piano desafinado) · percussion · tension · horror · distortion · lowPulse · tape · heartbeat
// Estados: menu, exploration, dialogue, normal_gameplay, high_stakes, roulette, boss, horror, low_sanity, victory, defeat, secret, true_ending
// API (singleton `music`):
//   music.attach(core)                      lo llama audio.js al crear el AudioContext ({ctx, buses:{music}, noise})
//   music.play(state, {fade})               entra en un estado con crossfade de capas (alias: transitionTo)
//   music.stop(fade)                        fade out y detiene el planificador
//   music.setIntensity(0..1)                escala percusión/tensión/horror/latido…
//   music.setLayer(name, true|false|0..1|null)  fuerza una capa (null = quita el override) · addLayer(name) · removeLayer(name)
//   music.setSanity(0..100) · setDebt(n) · setDestiny(n) · setContext({deaths, boss, progress})   (reactividad)
//   music.info() → { state, intensity, layers:{capa:ganancia objetivo} }
export const STATES = ['menu', 'exploration', 'dialogue', 'normal_gameplay', 'high_stakes', 'roulette', 'boss', 'horror', 'low_sanity', 'victory', 'defeat', 'secret', 'true_ending'];
export const LAYERS = ['ambient', 'melody', 'percussion', 'tension', 'horror', 'distortion', 'lowPulse', 'tape', 'heartbeat'];

const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], locrian: [0, 1, 3, 5, 6, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], major: [0, 2, 4, 5, 7, 9, 11], harm: [0, 2, 3, 5, 7, 8, 11], whole: [0, 2, 4, 6, 8, 10, 12], mixb6: [0, 2, 4, 5, 7, 8, 10] };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const degMidi = (root, scale, d) => { const S = SCALES[scale], n = S.length, o = Math.floor(d / n); return root + S[((d % n) + n) % n] + 12 * o; };
// Motivos: "pos:grado:duración" separados por espacio; compases separados por |; variantes separadas por /
const parseMotifs = s => s.split('/').map(v => v.split('|').map(b => b.trim() ? b.trim().split(/\s+/).map(n => n.split(':').map(Number)) : []));
const PERC = {
  p1: 'k...t...k..kt...', p2: 'k.t.w.tkk.t.w.t.', p3: 'k.ktw.t.kktw.ttt',
};
const ST = {
  menu: { bpm: 54, root: 50, scale: 'phrygian', L: { ambient: .45, melody: .8, tape: .5 }, mel: { dens: .95, decay: 2.6, vel: .72 }, chords: [0, -2, -4, -2], fade: 3, m: '0:0:6 6:2:4 10:1:6|0:-1:8 8:0:8/0:4:4 4:2:4 8:3:8|0:1:6 8:0:8/0:0:4 6:1:4 12:-1:4|0:2:8 8:0:8' },
  exploration: { bpm: 60, root: 45, scale: 'dorian', L: { ambient: .35, melody: .2, tape: .15 }, mel: { dens: .8, decay: 3.2, vel: .5 }, rest: .55, chords: [0, 3, -2, 0], fade: 4, m: '0:0:8|8:4:8||0:-2:8/4:2:8||0:3:8 8:1:8|' },
  dialogue: { bpm: 52, root: 45, scale: 'minor', L: { ambient: .22, melody: .1, tape: .1 }, mel: { dens: .7, decay: 3.4, vel: .4 }, rest: .6, chords: [0, -2], fade: 2, m: '0:0:8||8:2:8|/0:4:8||0:3:8|' },
  normal_gameplay: { bpm: 84, root: 48, scale: 'minor', L: { ambient: .3, melody: .45, percussion: .45, tape: .1 }, mel: { dens: .9, decay: 1.2, vel: .6 }, perc: PERC.p1, chords: [0, -2, 3, -4], fade: 2.5, m: '0:0:2 4:2:2 8:4:2 12:2:2|0:0:2 4:3:2 8:2:2 12:1:2/0:0:2 3:2:1 6:4:2 10:2:2 12:0:2|0:-1:2 4:1:2 8:3:2 12:1:2' },
  high_stakes: { bpm: 98, root: 47, scale: 'harm', L: { ambient: .3, melody: .4, percussion: .7, tension: .55, lowPulse: .35 }, mel: { dens: .95, decay: .9, vel: .6 }, perc: PERC.p2, chords: [0, 0, -2, -1], fade: 1.6, m: '0:0:1 2:0:1 4:3:2 8:2:1 10:1:1 12:0:4|0:0:1 2:0:1 4:4:2 8:3:1 10:2:1 12:1:4' },
  roulette: { bpm: 70, root: 40, scale: 'locrian', L: { ambient: .12, heartbeat: .75, lowPulse: .35, tension: .25, horror: .2 }, mel: { dens: .35, decay: 3, vel: .4, oct: -1 }, rest: .5, chords: [0, 1], fade: 2, m: '0:0:16|/8:1:16|' },
  boss: { bpm: 112, root: 43, scale: 'locrian', L: { ambient: .3, melody: .55, percussion: .85, tension: .5, horror: .3, distortion: .25 }, mel: { dens: 1, decay: .7, vel: .7 }, perc: PERC.p3, chords: [0, 1, 0, -2], fade: 1, m: '0:0:2 3:1:1 6:0:2 8:4:2 11:3:1 14:1:2|0:0:2 3:1:1 6:0:2 8:5:2 11:4:1 14:2:2/0:0:1 2:0:1 4:1:2 8:0:2 12:-1:4|0:0:1 2:0:1 4:3:2 8:1:2 12:0:4' },
  horror: { bpm: 50, root: 41, scale: 'phrygian', L: { horror: .8, tape: .3, lowPulse: .3 }, mel: { dens: .5, decay: 3.5, vel: .3, oct: 2 }, rest: .7, chords: [0], fade: 1.2, m: '0:1:16|/8:4:16|' },
  low_sanity: { bpm: 46, root: 48, scale: 'phrygian', L: { ambient: .2, melody: .5, horror: .4, distortion: .7, tape: .6, heartbeat: .2 }, mel: { dens: .8, decay: 2, vel: .6 }, chords: [0, 1], fade: 2, m: '0:0:6 6:2:4 10:1:6|0:-1:8 8:0:8' },
  victory: { bpm: 66, root: 50, scale: 'mixb6', L: { ambient: .35, melody: .55, tape: .3 }, mel: { dens: .95, decay: 2.4, vel: .6 }, chords: [0, 3, 5, 0], fade: 2.5, m: '0:0:6 6:2:4 10:4:6|0:5:8 8:4:8/0:4:4 4:2:4 8:0:8|0:5:8 8:3:8' },
  defeat: { bpm: 48, root: 45, scale: 'minor', L: { ambient: .3, melody: .5, lowPulse: .45, tape: .3 }, mel: { dens: .95, decay: 3, vel: .55 }, chords: [0, -2, -4], fade: 2, m: '0:4:8 8:3:8|0:2:8 8:0:16/0:3:8 8:2:8|0:1:8 8:0:16' },
  secret: { bpm: 58, root: 62, scale: 'whole', L: { ambient: .3, melody: .6, horror: .25, tape: .2 }, mel: { dens: .9, decay: 3.4, vel: .55 }, chords: [0, 2], fade: 3, m: '0:0:8 8:3:8|0:1:8 8:4:8/0:2:6 6:0:10|0:5:8 8:3:8' },
  true_ending: { bpm: 60, root: 50, scale: 'major', L: { ambient: .5, melody: .85, tape: .25, lowPulse: .2 }, mel: { dens: 1, decay: 2.6, vel: .7 }, chords: [0, 3, -2, 5], fade: 4, m: '' }
};
for (const k of Object.keys(ST)) ST[k].motifs = parseMotifs(ST[k].m || '0:0:8');
// El final verdadero REUTILIZA los motivos de otros temas (menú, jefe, secreto) reinterpretados en modo mayor.
ST.true_ending.motifs = [[...ST.menu.motifs[0], ...ST.boss.motifs[0].map(b => b.map(([p, d, l]) => [p * 2 % 16, d, Math.max(4, l * 2)])), ...ST.secret.motifs[0], [[0, 0, 16]], []]];
const BOSS_ROOT = { girl: 47, chair: 43, drowned: 41, child: 50, dealer: 38 };
const MIX = { ambient: .5, melody: .9, percussion: .7, tension: .32, horror: .45, lowPulse: .8, tape: .5, heartbeat: 1 };
const SCALE_INT = { ambient: v => 1, melody: v => .55 + .45 * v, percussion: v => .3 + .7 * v, tension: v => .25 + .75 * v, horror: v => .35 + .65 * v, distortion: v => 1, lowPulse: v => .5 + .5 * v, tape: v => 1, heartbeat: v => .4 + .6 * v };

const C = { ctx: null, bus: null, abus: null, noise: null };
const ATMOS = new Set(['ambient', 'tape', 'horror', 'heartbeat', 'lowPulse']); // pasan por el bus "Ambiente"
const M = { state: null, cfg: null, timer: null, stepN: 0, next: 0, intensity: .5, sanity: 100, debt: 0, destiny: 0, deaths: 0, boss: null, progress: 0, manual: {}, eff: {}, variant: 0, pat: null, hbNext: 0, root: 50, tOff: 0, stopTok: 0 };
const L = {}; let mel = null;
const tierOf = s => s >= 70 ? 0 : s >= 40 ? 1 : s >= 20 ? 2 : s >= 1 ? 3 : 4;

// ---------- utilidades de nodos ----------
const gain = v => { const g = C.ctx.createGain(); g.gain.value = v; return g; };
const filt = (type, f, q = 1) => { const b = C.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
const osc = (type, f) => { const o = C.ctx.createOscillator(); o.type = type; o.frequency.value = f; return o; };
function noiseSrc(t, dur) { const s = C.ctx.createBufferSource(); s.buffer = C.noise; s.loop = true; s.start(t, Math.random() * 1.5); s.stop(t + dur); return s; }
function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function distCurve(k) { const n = 256, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = (3 + k) * x * 20 * (Math.PI / 180) / (Math.PI + k * Math.abs(x)); } return c; }

// ---------- voces puntuales ----------
function piano(t, midi, vel, decay, dest) {
  const tier = tierOf(M.sanity), det = (Math.random() - .5) * (8 + 16 * tier) + (M.deaths > 2 ? 6 : 0);
  const g = gain(0), lp = filt('lowpass', 800 + 2600 * vel, .6); g.connect(lp); lp.connect(dest);
  const f = mtof(midi);
  for (const [type, cents, v] of [['triangle', det, .6], ['sine', det + 7, .45], ['triangle', det - 5, .18]]) {
    const o = osc(type, f * (type === 'triangle' && v < .2 ? 2 : 1)); o.detune.value = cents; const og = gain(v); o.connect(og); og.connect(g); o.start(t); o.stop(t + decay + .3);
  }
  env(g, t, .006, .34 * vel, decay);
  const n = noiseSrc(t, .03), bp = filt('bandpass', 2400, 1), ng = gain(0); n.connect(bp); bp.connect(ng); ng.connect(dest); env(ng, t, .002, .05 * vel, .025);
}
function hit(kind, t, lv) {
  const out = L.percussion.node, v = Math.min(1, lv + .2);
  if (kind === 'k') { const o = osc('sine', 130), g = gain(0); o.frequency.exponentialRampToValueAtTime(42, t + .14); o.connect(g); g.connect(out); env(g, t, .004, .9 * v, .28); o.start(t); o.stop(t + .35); }
  else if (kind === 't') { const n = noiseSrc(t, .06), hp = filt('highpass', 6500), g = gain(0); n.connect(hp); hp.connect(g); g.connect(out); env(g, t, .002, .16 * v, .04); }
  else if (kind === 'w') { const o = osc('triangle', 330), g = gain(0), bp = filt('bandpass', 900, 3); o.frequency.exponentialRampToValueAtTime(180, t + .05); o.connect(bp); bp.connect(g); g.connect(out); env(g, t, .002, .5 * v, .09); o.start(t); o.stop(t + .12); }
}
function pulse(t, lv) { const o = osc('sine', mtof(M.root - 24)), g = gain(0); o.connect(g); g.connect(L.lowPulse.node); env(g, t, .03, .8, .7); o.start(t); o.stop(t + .9); }
function pop(t) { const n = noiseSrc(t, .01), hp = filt('highpass', 3000), g = gain(0); n.connect(hp); hp.connect(g); g.connect(L.tape.node); env(g, t, .0005, .25 * Math.random(), .006); }
function whisper(t) {
  const n = noiseSrc(t, 2.2), bp = filt('bandpass', 1400, 9), g = gain(0), pan = C.ctx.createStereoPanner ? C.ctx.createStereoPanner() : null;
  bp.frequency.setValueAtTime(1300 + Math.random() * 400, t); bp.frequency.linearRampToValueAtTime(2200 + Math.random() * 900, t + 1.8);
  n.connect(bp); bp.connect(g); if (pan) { pan.pan.value = Math.random() * 2 - 1; g.connect(pan); pan.connect(L.horror.node); } else g.connect(L.horror.node);
  env(g, t, .9, .5, 1.2);
}
function beat(t) { // lub-dub
  const out = L.heartbeat.node;
  for (const [dt, f, v] of [[0, 62, .9], [.23, 52, .6]]) { const o = osc('sine', f), g = gain(0); o.frequency.exponentialRampToValueAtTime(34, t + dt + .12); o.connect(g); g.connect(out); env(g, t + dt, .01, v, .18); o.start(t + dt); o.stop(t + dt + .3); }
}

// ---------- capas continuas ----------
function buildLayers() {
  for (const n of LAYERS) if (n !== 'distortion') { const node = gain(0); node.connect(ATMOS.has(n) && C.abus ? C.abus : C.bus); L[n] = { node, live: null, tok: 0 }; }
  const bus = gain(1), dry = gain(1), wet = gain(0), sh = C.ctx.createWaveShaper(), lp = filt('lowpass', 3200, .7);
  sh.curve = distCurve(60); sh.oversample = '2x';
  bus.connect(dry); dry.connect(L.melody.node); bus.connect(sh); sh.connect(lp); lp.connect(wet); wet.connect(L.melody.node);
  mel = { bus, dry, wet };
  const c = C.ctx;
  L.ambient.on = () => {
    if (L.ambient.live) return; const t = c.currentTime, lp = filt('lowpass', 520, 1.5), out = gain(.5); lp.connect(out); out.connect(L.ambient.node);
    const oscs = [['sawtooth', 0, .5], ['triangle', 7, .6], ['sine', -12, .9]].map(([ty, iv, v]) => { const o = osc(ty, mtof(M.root + iv - 12)), g = gain(v * .5); o.connect(g); g.connect(lp); o.start(t); return { o, iv }; });
    const lfo = osc('sine', .06), lg = gain(260); lfo.connect(lg); lg.connect(lp.frequency); lfo.start(t);
    L.ambient.live = { oscs, lfo, out };
  };
  L.tension.on = () => {
    if (L.tension.live) return; const t = c.currentTime, bp = filt('bandpass', 700, 1.2), trem = gain(.5), out = gain(.6); bp.connect(trem); trem.connect(out); out.connect(L.tension.node);
    const oscs = [[12, -9], [19, 9], [24, 0]].map(([iv, cents]) => { const o = osc('sawtooth', mtof(M.root + iv)), g = gain(.35); o.detune.value = cents; o.connect(g); g.connect(bp); o.start(t); return { o, iv }; });
    const lfo = osc('sine', 5.5), lg = gain(.4); lfo.connect(lg); lg.connect(trem.gain); lfo.start(t);
    L.tension.live = { oscs, lfo, out };
  };
  L.horror.on = () => {
    if (L.horror.live) return; const t = c.currentTime, out = gain(.5); out.connect(L.horror.node);
    const oscs = [0, 1, 6].map((iv, i) => { const o = osc('sine', mtof(M.root + 12 + iv)), g = gain(.3), v = osc('sine', .1 + i * .07), vg = gain(2 + i); v.connect(vg); vg.connect(o.detune); o.connect(g); g.connect(out); o.start(t); v.start(t); return { o, v, iv }; });
    L.horror.live = { oscs, lfo: null, out };
  };
  L.tape.on = () => {
    if (L.tape.live) return; const t = c.currentTime, n = c.createBufferSource(); n.buffer = C.noise; n.loop = true; n.start(t, Math.random());
    const bp = filt('bandpass', 2100, .35), g = gain(.05), hum = osc('sine', 55), hg = gain(.018); n.connect(bp); bp.connect(g); g.connect(L.tape.node); hum.connect(hg); hg.connect(L.tape.node); hum.start(t);
    L.tape.live = { n, hum, out: g, hg };
  };
  const off = name => () => {
    const l = L[name].live; if (!l) return; L[name].live = null; const t = c.currentTime + .05;
    (l.oscs || []).forEach(x => { try { x.o.stop(t); if (x.v) x.v.stop(t); } catch (e) { /* ya parado */ } });
    for (const k of ['lfo', 'n', 'hum']) if (l[k]) try { l[k].stop(t); } catch (e) { /* ya parado */ }
    setTimeout(() => { try { l.out.disconnect(); if (l.hg) l.hg.disconnect(); } catch (e) { /* ya desconectado */ } }, 150);
  };
  for (const n of ['ambient', 'tension', 'horror', 'tape']) L[n].off = off(n);
}

// ---------- efectivos por capa (estado + reactividad + overrides) ----------
function overlay() {
  const t = tierOf(M.sanity), o = {};
  if (t >= 1) o.tape = .12;
  if (t >= 2) { o.horror = .18; o.tape = .3; }
  if (t >= 3) { o.distortion = .55; o.horror = .35; o.tape = .4; }
  if (M.debt > 250) o.lowPulse = .15;
  if (M.debt > 500) { o.lowPulse = .4; o.tension = .15; }
  if (M.deaths >= 3) o.tape = Math.max(o.tape || 0, .2);
  if (M.destiny <= -6) o.horror = Math.max(o.horror || 0, .12);
  return o;
}
function computeEff() {
  const eff = {}, cfg = M.cfg, o = overlay(), v = M.intensity, t = tierOf(M.sanity);
  let base = cfg ? Object.assign({}, cfg.L) : {};
  if (t === 4 && cfg) base = { horror: .7, distortion: .8, heartbeat: .5, tape: .6, lowPulse: .5 }; // 0% de cordura: estado musical especial
  for (const n of LAYERS) {
    let b = Math.max(base[n] || 0, cfg ? (o[n] || 0) : 0);
    const mv = M.manual[n]; if (mv !== undefined && mv !== null) b = mv;
    eff[n] = Math.max(0, Math.min(1, b * SCALE_INT[n](v)));
  }
  return eff;
}
function apply(fade = 2) {
  if (!C.ctx) return; const t = C.ctx.currentTime, eff = computeEff(); M.eff = eff;
  for (const n of LAYERS) {
    const tg = eff[n];
    if (n === 'distortion') { mel.wet.gain.setTargetAtTime(tg * .9, t, fade / 3); mel.dry.gain.setTargetAtTime(1 - .5 * tg, t, fade / 3); continue; }
    const l = L[n];
    if (tg > .003) { if (l.on) l.on(); l.tok++; }
    l.node.gain.setTargetAtTime(tg * MIX[n], t, fade / 3);
    if (tg <= .003 && l.off && l.live) { const tk = ++l.tok; setTimeout(() => { if (l.tok === tk && (M.eff[n] || 0) <= .003) l.off(); }, fade * 1000 + 500); }
  }
}

// ---------- planificador ----------
const stepDur = () => 60 / (M.cfg.bpm * (tierOf(M.sanity) === 3 ? .88 : 1)) / 4;
function onBar(bar, t) {
  const cfg = M.cfg, mo = cfg.motifs;
  if (bar % 8 === 0 && mo.length > 1) M.variant = Math.floor(Math.random() * mo.length);
  const v = mo[M.variant] || mo[0]; M.pat = v[bar % v.length] || [];
  if (cfg.rest && Math.random() < cfg.rest) M.pat = [];
  if (bar % 4 === 0 && L.ambient.live) { // cambio de acorde (glissando lento)
    const sh = cfg.chords[(bar / 4) % cfg.chords.length | 0] || 0;
    for (const x of L.ambient.live.oscs) x.o.frequency.setTargetAtTime(mtof(M.root + sh + x.iv - 12), t, 1.6);
    if (L.horror.live) for (const x of L.horror.live.oscs) x.o.frequency.setTargetAtTime(mtof(M.root + sh + 12 + x.iv), t, 2);
  }
  if (L.tension.live) { M.tOff = bar % 8 === 0 ? 0 : M.tOff + .7; for (const x of L.tension.live.oscs) x.o.frequency.setTargetAtTime(mtof(M.root + x.iv + M.tOff), t, .6); }
  if (M.eff.horror > .05 && Math.random() < .12 + .2 * M.intensity) whisper(t + Math.random() * 2);
}
function step(n, t) {
  const cfg = M.cfg, pos = n % 16, bar = (n / 16) | 0, e = M.eff;
  if (pos === 0) onBar(bar, t);
  const sd = stepDur(), tier = tierOf(M.sanity);
  if (e.melody > .02 && M.pat && tier < 4) for (const [p, d, len] of M.pat) if (p === pos && Math.random() < (cfg.mel.dens || 1)) {
    let midi = degMidi(M.root, cfg.scale, d) + 12 * (cfg.mel.oct || 0) + (Math.random() < .05 ? 12 : 0);
    if (tier >= 1 && Math.random() < .06 + .08 * tier) midi += Math.random() < .5 ? 1 : -1; // notas desafinadas
    if (tier === 3) midi -= 1;
    piano(t + Math.random() * .012, midi, cfg.mel.vel * (.75 + .25 * Math.random()) * (.6 + .4 * M.intensity), Math.min(cfg.mel.decay, .5 + len * sd * 1.2 + cfg.mel.decay * .5), mel.bus);
  }
  if (e.percussion > .02 && cfg.perc) { const k = cfg.perc[pos]; if (k !== '.') hit(k, t, e.percussion); }
  if (e.lowPulse > .02 && (pos === 0 || pos === 8)) pulse(t, e.lowPulse);
  if (e.tape > .02 && Math.random() < .09) pop(t + Math.random() * sd);
}
function tick() {
  const c = C.ctx; if (!c || c.state !== 'running' || !M.cfg) return;
  const now = c.currentTime; if (M.next < now - .5) M.next = now + .05;
  while (M.next < now + .45) { step(M.stepN, M.next); M.next += stepDur(); M.stepN++; }
  if (M.eff.heartbeat > .02) { // el latido tiene su propio reloj
    const hr = 52 + 55 * M.intensity + (tierOf(M.sanity) >= 3 ? 18 : 0);
    if (M.hbNext < now) M.hbNext = now + .05;
    while (M.hbNext < now + .45) { beat(M.hbNext); M.hbNext += 60 / hr; }
  }
}
function ensureTimer() { if (!M.timer) M.timer = setInterval(tick, 90); }

export const music = {
  STATES, LAYERS,
  attach(core) {
    if (C.ctx === core.ctx) return; C.ctx = core.ctx; C.bus = core.buses.music; C.abus = core.buses.ambient; C.noise = core.noise; buildLayers();
    if (M.pending) { const p = M.pending; M.pending = null; this.play(p.state, p.opts); }
  },
  get state() { return M.state; },
  play(state, opts = {}) {
    if (!ST[state]) return false;
    if (!C.ctx) { M.pending = { state, opts }; M.state = state; return true; }
    if (M.state === state && M.cfg && !opts.force) return true;
    M.stopTok++; M.state = state; M.cfg = ST[state];
    M.root = state === 'boss' ? (BOSS_ROOT[M.boss] || M.cfg.root) : M.cfg.root;
    M.stepN = Math.ceil(M.stepN / 16) * 16; M.next = C.ctx.currentTime + .08; M.variant = Math.floor(Math.random() * M.cfg.motifs.length); M.pat = [];
    ensureTimer(); apply(opts.fade != null ? opts.fade : M.cfg.fade);
    return true;
  },
  stop(fade = 2) {
    M.state = null; M.cfg = null; M.pending = null; if (!C.ctx) return;
    const tk = ++M.stopTok; apply(fade); M.eff = {};
    for (const n of LAYERS) if (n !== 'distortion' && L[n]) L[n].node.gain.setTargetAtTime(0, C.ctx.currentTime, fade / 3);
    setTimeout(() => { if (M.stopTok === tk && !M.cfg) { clearInterval(M.timer); M.timer = null; for (const n of ['ambient', 'tension', 'horror', 'tape']) if (L[n] && L[n].live) L[n].off(); } }, fade * 1000 + 600);
  },
  setIntensity(v) { M.intensity = Math.max(0, Math.min(1, +v || 0)); if (M.cfg) apply(1.2); },
  setLayer(name, val) {
    if (!LAYERS.includes(name)) return; M.manual[name] = val === null || val === undefined ? null : val === true ? .7 : val === false ? 0 : +val;
    if (M.manual[name] === null) delete M.manual[name]; if (M.cfg) apply(1.5);
  },
  addLayer(name) { this.setLayer(name, true); },
  removeLayer(name) { this.setLayer(name, false); },
  clearLayers() { M.manual = {}; if (M.cfg) apply(1.5); },
  setSanity(s) { const old = tierOf(M.sanity); M.sanity = s; if (M.cfg && tierOf(s) !== old) apply(2.5); },
  setDebt(d) { const old = M.debt > 500 ? 2 : M.debt > 250 ? 1 : 0, nw = d > 500 ? 2 : d > 250 ? 1 : 0; M.debt = d; if (M.cfg && old !== nw) apply(3); },
  setDestiny(d) { M.destiny = d; },
  setContext(o = {}) { if ('deaths' in o) M.deaths = o.deaths; if ('boss' in o) M.boss = o.boss; if ('progress' in o) M.progress = o.progress; },
  info() { return { state: M.state, intensity: M.intensity, sanityTier: tierOf(M.sanity), layers: Object.assign({}, M.eff), active: LAYERS.filter(n => L[n] && L[n].live) }; },
  suspendTimer() { clearInterval(M.timer); M.timer = null; },
  resumeTimer() { if (M.cfg) ensureTimer(); }
};
