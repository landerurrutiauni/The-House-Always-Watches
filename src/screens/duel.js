// screens/duel.js — duelo de la escopeta ficticia (apuestas, anuncio que puede mentir, cámaras, marcas). [capa B, escrita por A]
import * as G from '../game.js';
import * as S from '../shotgun.js';
import { gs, settings } from '../state.js';
import { t } from '../i18n.js';
import { h, btn, act, ico, sigil, resChip, announce, sc, typewriter, textSpeedMul } from '../ui.js';
import { characterEl, PAL } from '../sprites.js';
import { audioManager as audio } from '../audio.js';
import { fx } from '../fx.js';
import { TOOLS } from '../content.js';

const oppName = id => (id === 'final' ? t('char.dealer') : String(id).startsWith('gambler') ? t('opp.' + (id === 'gambler' ? 'gambler_a' : id)) : t('char.' + id));
const foeChar = id => (id === 'final' ? 'dealer' : id === 'gambler' ? 'merchant' : id);
let log = [], lastD = null, busy = false;

function setupScreen(v) {
  const opts = v.stakes.map(s => {
    const n = s.value;
    return h('button', { type: 'button', class: 'btn', style: 'flex-direction:column;align-items:flex-start;text-transform:none;text-align:left', 'data-act': 'duel_stake', 'data-arg': s.type, disabled: !s.ok },
      h('b', { style: 'text-transform:uppercase;letter-spacing:.08em' }, t(`duel.stake.${s.type}.name`, { n })), h('span', { class: 'good' }, t(`duel.stake.${s.type}.win`)), h('span', { class: 'red' }, t(`duel.stake.${s.type}.lose`, { n })));
  });
  return h('section', { class: 'scr resscr duelsetup' }, characterEl(foeChar(v.foe), { scale: sc(4, 2) }), h('h2', { class: 'bigtitle' }, t('duel.title')), h('p', { class: 'muted', style: 'margin:0' }, oppName(v.foe)),
    v.hintKey ? h('div', { class: 'panel hint' }, h('small', null, t('char.dealer')), t(v.hintKey)) : null,
    h('p', { class: 'say' }, t('duel.setup.sub')), h('div', { class: 'rest-opts' }, ...opts), h('p', { class: 'muted', style: 'font-size:.85em' }, t('duel.setup.note')));
}
act.duel_stake = type => { log = []; lastD = null; G.duelStart(type); };

// ---------------------------------------------------------------------------------------------------------
// El duelo se NARRA paso a paso: por cada disparo se escribe «quién apunta» → se resalta la cámara → BANG/CLIC (cámara cargada o vacía)
// → se actualizan las marcas → se explica quién sigue. El cargador y las marcas cambian EN EL MOMENTO de cada frase.
// Tocar la pantalla acelera. «Reducir efectos» solo quita sacudidas y destellos: la secuencia sigue siendo legible.
// ---------------------------------------------------------------------------------------------------------
const voiceOf = id => (id === 'final' ? 'dealer' : id === 'gambler' ? 'merchant' : id);
let speedUp = false;
const pace = () => { const m = textSpeedMul(); return speedUp ? 0.1 : m === 0 ? 0.25 : m; };   // normal 1 · rápida .35 · instantánea .25 · toque .1
const wait = ms => new Promise(r => setTimeout(r, Math.round(ms * pace())));
const AIM = { p_foe: 'duel.n.p_aim_foe', p_table: 'duel.n.p_aim_table', f_p: 'duel.n.f_aim_p', f_table: 'duel.n.f_aim_table' };

function duelScreen(v) {
  const D = v.D; if (D !== lastD) { lastD = D; log = []; busy = false; speedUp = false; }
  const foe = oppName(v.foe), fv = voiceOf(v.foe);
  const maxM = D.maxMarks;
  const marks = (n, max) => h('span', { class: 'marks', 'aria-label': n + '/' + max }, ...Array.from({ length: max }, (_, i) => h('span', { class: 'mark' + (i < n ? '' : ' lost') })));
  const setMarks = (box, n, flash) => { [...box.querySelectorAll('.mark')].forEach((m, i) => { const lost = i >= n; if (lost && !m.classList.contains('lost') && flash) { m.classList.add('hit'); } m.classList.toggle('lost', lost); }); box.setAttribute('aria-label', n + '/' + box.children.length); };
  // Cargador: estado LOCAL que se va descubriendo a medida que avanza la narración (null = desconocida, true = cargada, false = vacía)
  const dr = { fired: D.fired.slice(), cur: D.pos, aim: -1 };
  const drum = h('div', { class: 'drum', role: 'img' });
  const drawDrum = () => {
    drum.setAttribute('aria-label', t('duel.chambers') + ': ' + (6 - dr.cur) + '/6');
    drum.replaceChildren(...Array.from({ length: 6 }, (_, i) => { const f = dr.fired[i], spent = f !== null && f !== undefined;
      return h('span', { class: 'ch' + (i === dr.cur ? ' cur' : '') + (i === dr.aim ? ' aim' : '') + (spent ? ' spent ' + (f ? 'l' : 'e') : '') }, spent ? (f ? '●' : '○') : String(i + 1)); }));
  };
  drawDrum();
  const heard = D.heard && D.heard.pos === D.pos ? h('div', { class: 'good heard' }, ico('ear'), ' ' + t(D.heard.says ? 'duel.heard_loaded' : 'duel.heard_empty')) : null;
  const truth = D.truthKnown ? h('div', { class: 'gold' }, ico('eye'), ' ' + t('duel.truth', { n: D.real }) + ' ' + t(D.lied ? 'duel.truth.lied' : 'duel.truth.honest')) : null;
  const announceTxt = h('span', null, t('duel.announce', { name: foe, n: D.announce }));
  const extraBox = h('div', null, heard, truth);
  const pTurn = D.turn === 'p' && !D.over;
  const logEl = h('div', { class: 'panel duel-log', 'aria-live': 'polite' });
  const paint = l => (l.div ? h('p', { class: 'turn-div ' + (l.cls || '') }, l.text) : h('p', { class: 'ln ' + (l.cls || '') }, l.text));
  logEl.append(...log.slice(-40).map(paint));
  const cap = h('div', { class: 'duel-cap', 'aria-hidden': 'true' }, '\u00a0');
  const turnEl = h('p', { class: 'center muted turnline', style: 'margin:0' }, pTurn ? t('duel.turn_you') : (D.over ? '' : t('duel.turn_foe')));
  const skipHint = h('p', { class: 'center muted skiphint', style: 'margin:0;font-size:.8em;visibility:hidden' }, t('duel.n.skip_hint'));
  const canListen = pTurn && gs.player.sanity > v.listenCost, tools = v.tools || [];
  const setBusy = b => { busy = b; skipHint.style.visibility = b ? 'visible' : 'hidden'; root.querySelectorAll('.duel-act .btn').forEach(x => { x.disabled = b || !pTurn || (x.dataset.act === 'duel_listen' && !canListen); }); };
  let cur = null;   // control del texto que se está escribiendo
  const addDiv = (text, cls) => { log.push({ text, cls, div: true }); logEl.append(paint({ text, cls, div: true })); logEl.scrollTop = 1e6; };
  const say = (text, cls, voice) => new Promise(res => {
    const l = { text, cls }; log.push(l); const p = paint(l); logEl.querySelectorAll('.now').forEach(x => x.classList.remove('now')); p.classList.add('now'); logEl.append(p); logEl.scrollTop = 1e6; announce(text);
    // pausa tras cada frase: con «instantáneo» mínima; con «reducir efectos» (texto entero de golpe) el tiempo de leerla; si no, un respiro
    const beat = () => wait(textSpeedMul() === 0 ? 300 : settings.reduceEffects ? Math.min(2200, 450 + text.length * 26) : 380).then(res);
    if (speedUp) { p.textContent = text; return res(); }
    cur = typewriter(p, text, { speed: 15, voice, onDone: beat });
  });
  const showCap = (txt, kind) => { cap.className = 'duel-cap'; void cap.offsetWidth; cap.className = 'duel-cap ' + kind; cap.textContent = txt; };
  const actions = h('div', { class: 'duel-act' },
    btn(t('duel.shoot_foe'), 'duel_shoot', 'foe', 'primary', { disabled: !pTurn, 'data-primary': '1' }), btn(t('duel.shoot_table'), 'duel_shoot', 'table', '', { disabled: !pTurn }),
    btn(t('duel.listen', { c: v.listenCost }), 'duel_listen', null, 'ghost', { disabled: !canListen }),
    ...tools.map(id => btn(t(`tool.${id}.name`), 'duel_tool', id, 'ghost', { disabled: !pTurn, title: t(`tool.${id}.desc`) })));
  const foeMarks = marks(D.marks.f, maxM.f), youMarks = marks(D.marks.p, maxM.p);
  const root = h('section', { class: 'scr duel' },
    h('div', { class: 'panel duel-top' }, characterEl(foeChar(v.foe), { scale: sc(3, 1) }), h('div', { style: 'flex:1' }, h('div', { class: 'opp-name' }, foe, v.final ? h('span', { class: 'tag red', style: 'margin-left:.6em' }, t('duel.final')) : null), h('div', { class: 'muted', style: 'font-size:.8em' }, t('duel.marks_foe')), foeMarks, h('div', { class: 'muted', style: 'font-size:.8em;margin-top:6px' }, t('duel.marks_you')), youMarks)),
    v.hintKey ? h('div', { class: 'panel hint' }, h('small', null, t('char.dealer')), t(v.hintKey)) : null,
    h('div', { class: 'panel announce' }, announceTxt, h('div', { class: 'muted', style: 'font-size:.8em' }, t('duel.announce_note')), extraBox), drum, cap,
    turnEl, logEl, skipHint, actions);
  if (D.over) { setTimeout(() => G.duelFinish(), 900); actions.querySelectorAll('.btn').forEach(b => { b.disabled = true; }); }
  root.addEventListener('click', e => { if (busy && !e.target.closest('.duel-act')) { speedUp = true; if (cur) cur.skip(); } });

  // ---- Narración de un evento (un disparo) ----
  async function narrateEvent(e) {
    const mine = e.who === 'p', who = mine ? 'p' : 'f';
    if (e.skipped) { addDiv(t('duel.n.turn_of', { name: foe }), 'foe'); await say(t('duel.n.skipped', { name: foe }), 'foe', fv); return; }
    const k = e.pos + 1, target = e.at === 'table' ? 'table' : (mine ? 'foe' : 'p');
    // 1) quién apunta y a quién
    await say(t(AIM[who + '_' + (target === 'table' ? 'table' : (mine ? 'foe' : 'p'))], { name: foe }), mine ? 'you' : 'foe', mine ? 'narrator' : fv);
    // 2) se resalta la cámara
    dr.aim = e.pos; drawDrum(); showCap('…', 'wait'); await wait(650);
    // 3) resultado: BANG o CLIC
    dr.aim = -1; dr.fired[e.pos] = e.anomaly ? false : !!e.loaded; dr.cur = e.pos + 1; drawDrum();
    const live = e.result === 'hit' || e.result === 'backfire';
    if (live) {
      audio.playSFX('shot'); showCap(t(e.result === 'backfire' ? 'duel.cap.back' : 'duel.cap.bang'), e.result === 'backfire' ? 'back' : 'bang');
      const youHurt = (e.result === 'hit' && !mine) || (e.result === 'backfire' && mine);
      if (youHurt) { fx.flash(); fx.shake(); fx.vibrate(80); } else fx.shake();
    } else { audio.playSFX('click_empty'); showCap(t(e.result === 'safe' ? 'duel.cap.safe' : 'duel.cap.click'), e.result === 'safe' ? 'safe' : 'click'); }
    if (e.anomaly) { fx.glitch(root, 900); fx.flash('#ffffff'); }
    await say(t(live ? 'duel.n.loaded' : 'duel.n.empty', { k }), live ? 'bang' : '', 'narrator');
    if (e.anomaly) await say(t('duel.anomaly'), 'red', 'dealer');
    // 4) consecuencias
    if (e.result === 'backfire') await say(t(mine ? 'duel.n.backfire_p' : 'duel.n.backfire_f', { name: foe }), mine ? 'bad' : 'good', 'narrator');
    if (e.result === 'safe') await say(t(mine ? 'duel.n.safe_p' : 'duel.n.safe_f', { name: foe }), '', 'narrator');
    if (live) {
      const youLose = (e.result === 'hit' && !mine) || (e.result === 'backfire' && mine);
      if (youLose) { setMarks(youMarks, e.marks.p, true); await say(t('duel.n.p_loses', { n: e.marks.p }), 'bad', 'narrator'); }
      else { setMarks(foeMarks, e.marks.f, true); await say(t('duel.n.f_loses', { name: foe, n: e.marks.f }), 'good', 'narrator'); }
    }
    // 5) recarga: seis cámaras nuevas y nuevo anuncio (que también puede mentir)
    if (e.reload) {
      audio.playSFX('gun_load'); dr.fired = Array(6).fill(null); dr.cur = 0; drawDrum();
      announceTxt.textContent = t('duel.announce', { name: foe, n: e.newAnnounce }); extraBox.replaceChildren();
      await say(t('duel.n.reload', { name: foe, n: e.newAnnounce }), 'sys', 'narrator');
    }
  }
  act.duel_shoot = async at => {
    if (busy || !pTurn) return; setBusy(true); speedUp = false; cap.textContent = '\u00a0'; cap.className = 'duel-cap';
    try {
      const r = G.duelShoot(at, { silent: true }); if (!r) return;
      let actor = null;
      for (const e of r.events) {
        if (e.who !== actor && !e.skipped) { actor = e.who; turnEl.textContent = e.who === 'p' ? t('duel.turn_you') : t('duel.n.turn_of', { name: foe }); addDiv(e.who === 'p' ? t('duel.turn_you') : t('duel.n.turn_of', { name: foe }), e.who === 'p' ? 'you' : 'foe'); }
        await narrateEvent(e);
        if (e.over) break;
      }
      cap.className = 'duel-cap'; cap.textContent = '\u00a0';
      if (!r.over) { addDiv(t('duel.turn_you'), 'you'); await wait(500); }
      else await wait(900);
      busy = false; speedUp = false;
      if (r.over) G.duelFinish(); else G.duelView();
    } catch (err) { console.error('[duel]', err); } finally { busy = false; }
  };
  act.duel_listen = () => { if (busy || !pTurn) return; const r = G.duelListen(); if (r) { log.push({ text: t(r.says ? 'duel.heard_loaded' : 'duel.heard_empty'), cls: 'good' }); G.duelView(); } };
  act.duel_tool = async id => {
    if (busy || !pTurn) return; const r = G.duelTool(id); if (!r) return;
    if (r.id === 'contrato') log.push({ text: r.lied ? t('duel.contract.lied', { name: foe }) : t('duel.contract.honest'), cls: r.lied ? 'good' : 'red' });
    if (r.id === 'mala_memoria') log.push({ text: t('duel.tool.memory'), cls: 'good' });
    if (r.over) { setTimeout(() => G.duelFinish(), 700); return; }
    G.duelView();
  };
  root._keys = e => { if (busy) return false; if (e.key === 'f' || e.key === 'F') { act.duel_shoot('foe'); return true; } if (e.key === 't' || e.key === 'T') { act.duel_shoot('table'); return true; } if (e.key === 'l' || e.key === 'L') { act.duel_listen(); return true; } return false; };
  return root;
}
export function register(Sc) {
  Sc.duel_setup = { render: setupScreen, hud: true, bg: 'casino' };
  Sc.duel = { render: duelScreen, hud: true, bg: 'casino', sameKeep: true };
}
