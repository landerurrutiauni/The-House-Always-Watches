// screens/duel.js — duelo de la escopeta ficticia (apuestas, anuncio que puede mentir, cámaras, marcas). [capa B, escrita por A]
import * as G from '../game.js';
import * as S from '../shotgun.js';
import { gs, settings } from '../state.js';
import { t } from '../i18n.js';
import { h, btn, act, ico, sigil, resChip, announce, sc } from '../ui.js';
import { characterEl, PAL } from '../sprites.js';
import { audioManager as audio } from '../audio.js';
import { fx } from '../fx.js';
import { TOOLS } from '../content.js';

const oppName = id => (id === 'final' ? t('char.dealer') : String(id).startsWith('gambler') ? t('opp.' + (id === 'gambler' ? 'gambler_a' : id)) : t('char.' + id));
const foeChar = id => (id === 'final' ? 'dealer' : id === 'gambler' ? 'merchant' : id);
const sleep = ms => new Promise(r => setTimeout(r, settings.reduceEffects ? 0 : ms));
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

function lineFor(e, foe) {
  if (e.skipped) return t('duel.ev.skipped', { name: foe });
  const who = e.who === 'p' ? 'p' : 'f';
  const key = `duel.ev.${who}_${e.at === 'foe' || e.at === 'p' ? 'shot' : 'table'}_${e.result}`;
  return t(key, { name: foe });
}
function duelScreen(v) {
  const D = v.D; if (D !== lastD) { lastD = D; log = []; busy = false; }
  const foe = oppName(v.foe), rem = S.remaining(D);
  const marks = (n, max) => h('span', { class: 'marks', 'aria-label': n + '/' + max }, ...Array.from({ length: max }, (_, i) => h('span', { class: 'mark' + (i < n ? '' : ' lost') })));
  const chambers = h('div', { class: 'drum', role: 'img', 'aria-label': t('duel.chambers') + ': ' + rem + '/6' }, ...Array.from({ length: 6 }, (_, i) => {
    const spent = i < D.pos, cur = i === D.pos; const loaded = spent && D.chambers[i];
    return h('span', { class: 'ch' + (cur ? ' cur' : '') + (spent ? ' spent ' + (loaded ? 'l' : 'e') : '') }, spent ? (loaded ? '●' : '○') : (cur ? '?' : '·'));
  }));
  const heard = D.heard && D.heard.pos === D.pos ? h('div', { class: 'good' }, ico('ear'), ' ' + t(D.heard.says ? 'duel.heard_loaded' : 'duel.heard_empty')) : null;
  const truth = D.truthKnown ? h('div', { class: 'gold' }, ico('eye'), ' ' + t('duel.truth', { n: D.real }) + ' ' + t(D.lied ? 'duel.truth.lied' : 'duel.truth.honest')) : null;
  const pTurn = D.turn === 'p' && !D.over;
  const logEl = h('div', { class: 'panel duel-log', 'aria-live': 'polite' }, ...log.map(l => h('p', { class: l.cls || '' }, l.text)));
  const canListen = pTurn && gs.player.sanity > v.listenCost, tools = v.tools || [];
  const setBusy = b => { busy = b; root.querySelectorAll('.duel-act .btn').forEach(x => { x.disabled = b || !pTurn || (x.dataset.act === 'duel_listen' && !canListen); }); };
  const addLog = (text, cls) => { log.push({ text, cls }); logEl.append(h('p', { class: cls || '' }, text)); logEl.scrollTop = 1e6; announce(text); };
  const actions = h('div', { class: 'duel-act' },
    btn(t('duel.shoot_foe'), 'duel_shoot', 'foe', 'primary', { disabled: !pTurn, 'data-primary': '1' }), btn(t('duel.shoot_table'), 'duel_shoot', 'table', '', { disabled: !pTurn }),
    btn(t('duel.listen', { c: v.listenCost }), 'duel_listen', null, 'ghost', { disabled: !canListen }),
    ...tools.map(id => btn(t(`tool.${id}.name`), 'duel_tool', id, 'ghost', { disabled: !pTurn, title: t(`tool.${id}.desc`) })));
  const root = h('section', { class: 'scr duel' },
    h('div', { class: 'panel duel-top' }, characterEl(foeChar(v.foe), { scale: sc(3, 1) }), h('div', { style: 'flex:1' }, h('div', { class: 'opp-name' }, foe, v.final ? h('span', { class: 'tag red', style: 'margin-left:.6em' }, t('duel.final')) : null), h('div', { class: 'muted', style: 'font-size:.8em' }, t('duel.marks_foe')), marks(D.marks.f, D.maxMarks.f), h('div', { class: 'muted', style: 'font-size:.8em;margin-top:6px' }, t('duel.marks_you')), marks(D.marks.p, D.maxMarks.p))),
    v.hintKey ? h('div', { class: 'panel hint' }, h('small', null, t('char.dealer')), t(v.hintKey)) : null,
    h('div', { class: 'panel announce' }, t('duel.announce', { name: foe, n: D.announce }), h('div', { class: 'muted', style: 'font-size:.8em' }, t('duel.announce_note')), heard, truth), chambers,
    h('p', { class: 'center muted', style: 'margin:0' }, pTurn ? t('duel.turn_you') : (D.over ? '' : t('duel.turn_foe'))), logEl, actions);
  if (D.over) { setTimeout(() => G.duelFinish(), 900); actions.querySelectorAll('.btn').forEach(b => { b.disabled = true; }); }
  act.duel_shoot = async at => {
    if (busy || !pTurn) return; setBusy(true);
    try {
      const r = G.duelShoot(at); if (!r) return;
      for (const e of r.events) {
        addLog(lineFor(e, foe), e.who === 'p' ? '' : 'muted');
        if (e.anomaly) { fx.glitch(root, 900); fx.flash('#ffffff'); addLog(t('duel.anomaly'), 'red'); }
        if (e.result === 'hit') { if (e.who === 'p') fx.shake(); else { fx.flash(); fx.shake(); fx.vibrate(80); } }
        if (e.result === 'backfire') { if (e.who === 'p') { fx.flash(); fx.shake(); fx.vibrate(80); } else fx.shake(); }
        if (e.reload) addLog(t('duel.ev.reload'), 'muted');
        await sleep(e.anomaly ? 1100 : 650);
      }
      busy = false;
      if (r.over) G.duelFinish(); else G.duelView();
    } catch (err) { console.error('[duel]', err); } finally { busy = false; }
  };
  act.duel_listen = () => { if (busy || !pTurn) return; const r = G.duelListen(); if (r) G.duelView(); };
  act.duel_tool = async id => {
    if (busy || !pTurn) return; const r = G.duelTool(id); if (!r) return;
    if (r.id === 'contrato') addLog(r.lied ? t('duel.contract.lied', { name: foe }) : t('duel.contract.honest'), r.lied ? 'good' : 'red');
    if (r.id === 'mala_memoria') addLog(t('duel.tool.memory'), 'good');
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
