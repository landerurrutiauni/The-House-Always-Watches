// audio.js — núcleo de audio (Web Audio) + API pública `audioManager`. [capa B, escrita por A]
// Crea el AudioContext SOLO tras el primer gesto del usuario (política de autoplay), monta los buses
// (music / sfx / ambient → master → compresor) y conecta music.js y sfx.js.
//
// API (singleton audioManager):
//   audioManager.unlock()                      crea/reanuda el AudioContext (se llama solo en el primer toque/tecla)
//   audioManager.playMusic(state, {fade})      = music.play   ·  audioManager.transitionTo(state, opts) (alias)
//   audioManager.stopMusic(fade)               = music.stop
//   audioManager.setIntensity(0..1)
//   audioManager.playSFX(name, opts)           ignora nombres desconocidos; silencio hasta que el audio esté desbloqueado
//   audioManager.applySettings(settings)       volúmenes, silencios y "reducir sonidos intensos"
//   audioManager.music                         el singleton music (setLayer/addLayer/removeLayer/setSanity/setDebt…)
//   audioManager.bindGame(bus, gs)             suscribe 'sfx' y 'stats' del juego
import { music } from './music.js';
import { sfx } from './sfx.js';

const S = { ctx: null, master: null, buses: null, noise: null, unlocked: false, settings: null, wanted: null, hidden: false, listeners: false };

function makeNoise(ctx) {
  const len = Math.floor(ctx.sampleRate * 3), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.22; }
  return buf;
}
function build() {
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AC) return false;
  try { S.ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { try { S.ctx = new AC(); } catch (e2) { return false; } }
  const ctx = S.ctx;
  S.master = ctx.createGain(); S.master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 24; comp.ratio.value = 4; comp.attack.value = 0.01; comp.release.value = 0.25;
  S.master.connect(comp); comp.connect(ctx.destination);
  S.buses = { music: ctx.createGain(), sfx: ctx.createGain(), ambient: ctx.createGain(), voice: ctx.createGain() };
  for (const k of Object.keys(S.buses)) S.buses[k].connect(S.master);
  S.noise = makeNoise(ctx);
  const core = { ctx, buses: S.buses, noise: S.noise };
  music.attach(core); sfx.attach(core);
  audioManager.applySettings(S.settings);
  return true;
}

export const audioManager = {
  music, sfx,
  get ready() { return !!S.ctx && S.ctx.state === 'running'; },
  get unlocked() { return S.unlocked; },
  get ctx() { return S.ctx; },
  unlock() {
    if (S.unlocked && S.ctx) { if (S.ctx.state === 'suspended' && !S.hidden) S.ctx.resume(); return true; }
    if (!S.ctx && !build()) return false;
    S.unlocked = true;
    if (S.ctx.state === 'suspended') S.ctx.resume().catch(() => {});
    return true;
  },
  applySettings(st) {
    if (st) S.settings = st;
    const s = S.settings; if (!s) return;
    sfx.setReduceIntense(!!s.reduceIntense);
    // "Reducir sonidos intensos": baja también las capas más agresivas de la música.
    if (s.reduceIntense) { music.setLayer('distortion', 0); music.setLayer('horror', 0.12); music.setLayer('heartbeat', 0.25); }
    else { music.setLayer('distortion', null); music.setLayer('horror', null); music.setLayer('heartbeat', null); }
    if (!S.ctx) return;
    const t = S.ctx.currentTime;
    const vol = (v, mute) => (mute ? 0 : Math.pow(Math.max(0, Math.min(1, v)), 1.6));
    S.buses.music.gain.setTargetAtTime(vol(s.music, s.muteMusic), t, 0.05);
    S.buses.sfx.gain.setTargetAtTime(vol(s.sfx, s.muteSfx), t, 0.05);
    S.buses.ambient.gain.setTargetAtTime(vol(s.ambient, s.muteMusic), t, 0.05);
    S.buses.voice.gain.setTargetAtTime(vol(s.voice == null ? 0.7 : s.voice, s.muteVoices), t, 0.05);
  },
  playMusic(state, opts = {}) { S.wanted = state; return music.play(state, opts); },
  transitionTo(state, opts = {}) { return this.playMusic(state, opts); },
  stopMusic(fade = 2) { S.wanted = null; music.stop(fade); },
  setIntensity(v) { music.setIntensity(v); },
  playSFX(name, opts) { return sfx.play(name, opts); },
  bindGame(bus, gs) {
    if (S.bound) return; S.bound = true;
    bus.on('sfx', e => this.playSFX(e.name, e.opts));
    bus.on('blip', e => sfx.blip(e.voice, e));
    const sync = () => { music.setSanity(gs.player.sanity); music.setDebt(gs.player.debt); music.setDestiny(gs.destiny); music.setContext({ deaths: gs.deaths }); };
    bus.on('stats', sync); sync();
  },
  installListeners() {
    if (S.listeners || typeof document === 'undefined') return; S.listeners = true;
    const first = () => { audioManager.unlock(); if (S.unlocked) { for (const ev of ['pointerdown', 'keydown', 'touchend', 'click']) window.removeEventListener(ev, first, true); } };
    for (const ev of ['pointerdown', 'keydown', 'touchend', 'click']) window.addEventListener(ev, first, true);
    // Segundo plano: suspender el contexto y el planificador de la música.
    document.addEventListener('visibilitychange', () => {
      S.hidden = document.hidden;
      if (!S.ctx) return;
      if (document.hidden) { music.suspendTimer(); S.ctx.suspend().catch(() => {}); }
      else if (S.unlocked) { S.ctx.resume().then(() => music.resumeTimer()).catch(() => {}); }
    });
  }
};
