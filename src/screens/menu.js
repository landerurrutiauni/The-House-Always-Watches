// screens/menu.js — menú, intro, alas, ajustes, muerte, puerta, finales y archivo. [capa B, escrita por A]
import * as G from '../game.js';
import { gs, settings, bus } from '../state.js';
import { CONFIG } from '../config.js';
import { t, setLang, getLang } from '../i18n.js';
import { saveSettings } from '../save.js';
import { h, btn, act, modal, ico, sigil, typewriter, closeTopModal, setBackground, announce, fsButton } from '../ui.js';
import { pixelText, characterEl, backgroundCanvas, PAL } from '../sprites.js';
import { audioManager as audio } from '../audio.js';
import { fx } from '../fx.js';
import { openPreferences, canOpenPreferences } from '../cookies.js';
import { CHARACTERS, ENDING_ORDER, MEMORY_ORDER, KNOWLEDGE, DEALER_CLUES } from '../content.js';
import * as ACH from '../achievements.js';

const confirmModal = (title, text, onYes, danger) => {
  const m = modal(h('div', null, h('p', null, text), h('div', { class: 'row' }, h('button', { class: 'btn ' + (danger ? 'danger' : 'primary'), type: 'button', onclick: () => { m.close(); onYes(); } }, t('ui.confirm')), h('button', { class: 'btn', type: 'button', onclick: () => m.close() }, t('ui.cancel')))), { title });
  return m;
};

// ---------------- Ajustes ----------------
export function openSettings() {
  const save = () => { saveSettings(); fx.applyDisplay(); audio.applySettings(settings); };
  let pvT = null; const previewVoice = () => { clearTimeout(pvT); pvT = setTimeout(() => { audio.applySettings && audio.applySettings(settings); ['dealer', 'girl', 'chair', 'narrator'].forEach((v, i) => setTimeout(() => bus.emit('blip', { voice: v }), i * 90)); }, 120); };
  const slider = (key, label) => h('div', { class: 'set-row' }, h('label', { for: 'set-' + key }, label), h('input', { id: 'set-' + key, type: 'range', min: 0, max: 100, value: Math.round(settings[key] * 100), oninput: e => { settings[key] = e.target.value / 100; save(); if (key === 'voice') previewVoice(); }, 'aria-label': label }));
  const tog = (key, label) => h('label', { class: 'tog' }, h('input', { type: 'checkbox', checked: !!settings[key], onchange: e => { settings[key] = e.target.checked; save(); if (key === 'reduceEffects') announce(label); } }), label);
  const seg = (key, opts) => { const box = h('div', { class: 'seg', role: 'group' }); const draw = () => box.replaceChildren(...opts.map(([v, lbl]) => h('button', { type: 'button', class: 'btn' + (settings[key] === v ? ' on' : ''), 'aria-pressed': settings[key] === v ? 'true' : 'false', onclick: () => { settings[key] = v; save(); draw(); } }, lbl))); draw(); return box; };
  const langBox = h('div', { class: 'seg', role: 'group' }); const drawLang = () => langBox.replaceChildren(...CONFIG.LANGS.map(l => h('button', { type: 'button', class: 'btn' + (getLang() === l ? ' on' : ''), 'aria-pressed': getLang() === l ? 'true' : 'false', lang: l, onclick: async () => { await setLang(l); saveSettings(); } }, CONFIG.LANG_NAMES[l])));
  drawLang();
  const fsRow = () => { const b = fsButton('text', ''); return b ? h('div', { class: 'set-row' }, h('label', null, t('settings.fullscreen')), b) : null; };
  const inGame = (() => { const v = G.getView(); return !!v && v.type !== 'menu'; })();
  const homeSec = inGame ? h('div', { class: 'set-sec' }, h('h3', null, t('settings.game')), h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', 'data-act': 'to_menu', onclick: () => confirmModal(t('settings.to_menu'), t(G.leaveSafe() ? 'settings.to_menu_safe' : 'settings.to_menu_warn'), () => { closeTopModal(); G.leaveToMenu(); }) }, t('settings.to_menu')))) : null;
  const body = h('div', null,
    homeSec,
    h('div', { class: 'set-sec' }, h('h3', null, t('settings.language')), langBox),
    h('div', { class: 'set-sec' }, h('h3', null, t('settings.audio')), slider('music', t('settings.music')), slider('sfx', t('settings.sfx')), slider('ambient', t('settings.ambient')), slider('voice', t('settings.voices')), tog('muteMusic', t('settings.mute_music')), tog('muteSfx', t('settings.mute_sfx')), tog('muteVoices', t('settings.mute_voices')), tog('reduceIntense', t('settings.reduce_intense'))),
    h('div', { class: 'set-sec' }, h('h3', null, t('settings.display')),
      h('div', { class: 'set-row' }, h('label', null, t('settings.quality')), seg('quality', [['high', t('settings.q.high')], ['medium', t('settings.q.medium')], ['low', t('settings.q.low')]])),
      h('div', { class: 'set-row' }, h('label', null, t('settings.text_speed')), seg('textSpeed', [['normal', t('settings.ts.normal')], ['fast', t('settings.ts.fast')], ['instant', t('settings.ts.instant')]])),
      tog('contrast', t('settings.contrast')), tog('reduceEffects', t('settings.reduce_effects')), tog('vibration', t('settings.vibration')), fsRow()),
    h('div', { class: 'set-sec' }, h('h3', null, t('settings.privacy')), h('div', { class: 'row' }, canOpenPreferences() ? h('button', { class: 'btn', type: 'button', onclick: () => openPreferences() }, t('settings.cookies')) : null,
      h('a', { class: 'btn ghost', href: 'legal/privacy.html', target: '_blank', rel: 'noopener' }, t('menu.legal.privacy')))),
    h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'button', onclick: () => closeTopModal() }, t('ui.close'))));
  let off = null;
  const m = modal(body, { title: t('settings.title'), onClose: () => { if (off) { off(); off = null; } } });
  off = bus.on('lang', () => { m.close(); openSettings(); });   // al cambiar de idioma se redibuja en el nuevo idioma
  return m;
}
act.settings = () => openSettings();

// ---------------- Menú ----------------
function menuScreen() {
  const ms = G.menuState(), narrow = false, big = false;
  const title = h('div', { class: 'menu-title', role: 'img', 'aria-label': CONFIG.GAME_TITLE }, pixelText('THE HOUSE', { scale: narrow ? 5 : (big ? 10 : 7), color: PAL.t4 }), h('br'), pixelText('ALWAYS WATCHES', { scale: narrow ? 3 : (big ? 6 : 4), color: PAL.r4 }));
  const main = h('div', { class: 'menu-main' }, title, h('p', { class: 'tagline' }, t('menu.tagline')),
    ms.hasSave ? btn(t('menu.continue'), 'menu_continue', null, 'primary') : btn(t('menu.new'), 'menu_new', null, 'primary'),
    ms.hasSave ? btn(t('menu.new'), 'menu_new', null, '') : btn(t('menu.continue'), 'menu_continue', null, '', { disabled: true }),
    btn(t('menu.howto'), 'howto', null, ''),
    btn(t('menu.settings'), 'settings', null, ''),
    fsButton('text', ''),
    btn(t('menu.reset'), 'menu_reset', null, 'ghost danger', { disabled: !ms.hasSave }),
    ms.secretButton ? btn(t('menu.secret'), 'menu_archive', null, 'ghost secret-btn', { 'aria-label': t('archive.title') }) : null,
    h('div', { class: 'menu-foot' }, h('a', { href: 'legal/privacy.html', target: '_blank', rel: 'noopener' }, t('menu.legal.privacy')), canOpenPreferences() ? h('button', { type: 'button', 'data-act': 'cookies' }, t('menu.cookies')) : null),
    h('div', { class: 'ver' }, t('menu.version', { v: CONFIG.VERSION }), ms.deaths ? ' · ' + t('menu.deaths', { n: ms.deaths }) : ''));
  const ch = characterEl('dealer', { scale: 5 });
  // Secreto: tocar los ojos del Crupier varias veces (zona invisible sobre sus ojos)
  ch.append(h('div', { class: 'eyes-hit', 'aria-hidden': 'true', onclick: () => { audio.playSFX('card_flip'); ch.classList.add('wince'); setTimeout(() => ch.classList.remove('wince'), 240); ACH.eyeClick(); } }));
  return h('section', { class: 'scr menu' }, main, h('div', { class: 'char-wrap', 'aria-hidden': 'true' }, ch));
}
act.menu_continue = () => { audio.unlock(); G.continueGame(); };
act.menu_new = () => { audio.unlock(); const ms = G.menuState(); if (ms.runInProgress) confirmModal(t('menu.confirm_new.title'), t('menu.confirm_new.text'), () => G.newGame()); else G.newGame(); };
act.menu_reset = () => confirmModal(t('menu.confirm_reset.title'), t('menu.confirm_reset.text'), () => confirmModal(t('menu.confirm_reset.title'), t('menu.confirm_reset.text2'), () => G.resetAll(), true), true);
act.menu_archive = () => G.openArchive();
act.cookies = () => openPreferences();

// ---------------- Intro ----------------
function introScreen(v) {
  let i = 0, ctl = null; const line = h('p', { class: 'line', 'aria-live': 'polite' }), wrap = h('div', { style: 'opacity:0;transition:opacity 1.6s' });
  wrap.appendChild(characterEl('dealer', { scale: 4 }));
  const prompt = h('p', { class: 'prompt' }, t('ui.tap'));
  const root = h('section', { class: 'scr intro', tabindex: 0, role: 'button', 'aria-label': t('ui.tap') }, wrap, line, prompt, h('button', { class: 'btn ghost small', type: 'button', 'data-act': 'intro_skip' }, t('ui.skip')));
  const show = () => { const key = v.lines[i]; line.className = 'line' + (key === 'intro.4' ? ' you' : ''); ctl = typewriter(line, t(key), { speed: 38, voice: key === 'intro.4' ? 'narrator' : 'dealer' }); if (i >= 1) wrap.style.opacity = '1'; if (i === 1) audio.playSFX('whisper'); };
  const next = () => { if (ctl && !ctl.done) { ctl.skip(); return; } i++; if (i >= v.lines.length) { G.introDone(); return; } show(); };
  root.addEventListener('click', e => { if (e.target.closest('[data-act]')) return; next(); });
  root.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); } });
  act.intro_skip = () => G.introDone();
  setTimeout(() => { show(); root.focus(); }, 500);
  return root;
}

// ---------------- Alas ----------------
function wingsScreen(v) {
  const list = v.wings.map(w => {
    const cv = backgroundCanvas(w.bg, 64, 30, 3); cv.setAttribute('aria-hidden', 'true');
    return h('button', { type: 'button', class: 'wing', 'data-act': 'pick_wing', 'data-arg': w.id, disabled: !w.unlocked, 'aria-label': t(`wing.${w.id}.name`) },
      cv, h('div', { class: 'wb' }, h('b', null, t(`wing.${w.id}.name`).toUpperCase()), h('div', { class: 'muted' }, w.unlocked ? t(`wing.${w.id}.desc`) : (w.req && w.req.length ? t('wings.req.' + w.req[0], { n: w.req[1] }) : t('wings.locked'))),
        h('div', null, ico('skull'), ' ' + t('wings.boss', { name: t('char.' + w.boss) }), w.cleared ? h('span', { class: 'tag good' }, ' ' + t('wings.cleared')) : null)));
  });
  return h('section', { class: 'scr wings' }, h('h2', { class: 'bigtitle' }, t('wings.title')), h('div', { class: 'wing-list' }, ...list));
}
act.pick_wing = id => G.pickWing(id);

// ---------------- Muerte ----------------
function deathScreen(v) {
  const newSet = new Set(v.memories || []);
  const mems = (v.allMemories || []).map(id => h('li', null, h('b', null, t(`mem.${id}.name`)), newSet.has(id) ? h('span', { class: 'tag new' }, ' ' + t('ui.new')) : null, h('small', null, t(`mem.${id}.text`))));
  return h('section', { class: 'scr deathscr' },
    h('h2', { class: 'bigtitle lose' }, t('death.title')), h('p', { class: 'say' }, t('death.sub')),
    h('div', { class: 'panel ledger' }, h('span', null, t('death.debt')), h('b', { class: 'red' }, ico('ledger'), ' ' + v.carry), h('span', null, t('death.memories')), h('b', null, (v.allMemories || []).length + '/' + MEMORY_ORDER.length), h('span', null, t('death.knowledge')), h('b', null, (v.knowledge || []).length + '/' + KNOWLEDGE.length), h('span', null, t('death.deaths', { n: '' })), h('b', null, v.deaths)),
    h('div', { class: 'panel', style: 'width:min(520px,94%)' }, h('h3', null, t('death.memories')), mems.length ? h('ul', { class: 'memlist' }, ...mems) : h('p', { class: 'muted' }, t('death.none'))),
    btn(t('death.retry'), 'death_next', null, 'primary'));
}
act.death_next = () => G.afterDeath();

// ---------------- Puerta final ----------------
function doorScreen(v) {
  const list = v.choices.map(c => h('button', { type: 'button', class: 'btn', 'data-act': 'door_pick', 'data-arg': c.id, disabled: !c.ok, 'aria-disabled': c.ok ? 'false' : 'true' },
    h('b', null, (c.ok ? '' : '🔒 ') + t(`ending.${c.id}.title`)), h('span', { class: 'muted' }, c.ok ? (c.seen ? t('door.seen') : t('door.open')) : t('door.req.' + c.id))));
  return h('section', { class: 'scr resscr' }, h('h2', { class: 'bigtitle' }, t('door.title')), h('p', { class: 'say' }, t('door.hint')), h('div', { class: 'doors' }, ...list));
}
act.door_pick = id => G.doorChoose(id);

// ---------------- Final ----------------
function endingScreen(v) {
  const text = h('p', { class: 'endtext' }), epi = h('p', { class: 'say', style: 'opacity:0;transition:opacity 1.2s' }, t(`ending.${v.id}.epi`));
  const n = ENDING_ORDER.indexOf(v.id) + 1;
  const ctl = typewriter(text, t(`ending.${v.id}.text`), { speed: 14, voice: 'narrator', onDone: () => { epi.style.opacity = '1'; } });
  const root = h('section', { class: 'scr endscr' }, h('p', { class: 'muted' }, t('ending.n', { n, total: v.total }), v.first ? h('span', { class: 'tag new' }, ' ' + t('ending.first')) : null),
    h('h2', { class: 'bigtitle' }, t(`ending.${v.id}.title`)), text, epi,
    v.memories && v.memories.length ? h('div', { class: 'panel' }, h('h3', null, t('ending.memories')), h('ul', { class: 'memlist' }, ...v.memories.map(id => h('li', null, h('b', null, t(`mem.${id}.name`)), h('small', null, t(`mem.${id}.text`)))))) : null,
    v.trueOpen && v.id !== 'verdad' ? h('p', { class: 'muted' }, t('ending.true_hint')) : null,
    btn(t('ending.to_menu'), 'ending_done', null, 'primary'));
  root.addEventListener('click', e => { if (!e.target.closest('[data-act]') && ctl && !ctl.done) ctl.skip(); });
  return root;
}
act.ending_done = () => G.endingDone();

// ---------------- Archivo "???" ----------------
// El Archivo se reparte en pestañas (y páginas) para que NADA obligue a deslizar: cada pestaña cabe entera en el escenario.
let arcTab = 'endings', arcPage = { chars: 0, know: 0 };
const ARC_TABS = ['endings', 'chars', 'eggs', 'know', 'stats'], ARC_PER = { chars: 9, know: 12 };
function archiveScreen(v) {
  const d = v.data, cell = (on, a, b) => h('div', { class: 'arc-cell' + (on ? '' : ' off') }, h('b', null, on ? a : t('archive.unknown')), on && b ? h('div', { class: 'muted' }, b) : null);
  const st = d.stats, stat = (k, val) => h('div', { class: 'arc-cell' }, t('archive.stat.' + k) + ': ', h('b', null, val));
  const body = h('div', { class: 'arc-body' }), tabs = h('div', { class: 'arc-tabs', role: 'tablist' });
  const pager = (key, total) => {
    const pages = Math.max(1, Math.ceil(total / ARC_PER[key]));
    return pages < 2 ? null : h('div', { class: 'arc-pager' }, h('button', { type: 'button', class: 'btn small ghost', 'data-act': 'arc_page', 'data-arg': key + ':-1', 'aria-label': t('archive.prev'), disabled: arcPage[key] <= 0 }, '◀'), h('span', null, t('archive.page', { n: arcPage[key] + 1, m: pages })), h('button', { type: 'button', class: 'btn small ghost', 'data-act': 'arc_page', 'data-arg': key + ':1', 'aria-label': t('archive.next'), disabled: arcPage[key] >= pages - 1 }, '▶'));
  };
  const slice = (key, arr) => arr.slice(arcPage[key] * ARC_PER[key], (arcPage[key] + 1) * ARC_PER[key]);
  const panels = {
    endings: () => [
      h('div', { class: 'panel' }, h('h3', null, t('archive.endings') + ' ' + d.endings.filter(e => e.seen).length + '/' + d.endings.length), h('div', { class: 'arc-grid c3' }, ...d.endings.map(e => cell(e.seen, t(`ending.${e.id}.title`), t(`ending.${e.id}.epi`))))),
      h('div', { class: 'panel' }, h('h3', null, t('archive.memories') + ' ' + d.memories.filter(m => m.got).length + '/' + d.memories.length), h('div', { class: 'arc-grid c4' }, ...d.memories.map(m => cell(m.got, t(`mem.${m.id}.name`), t(`mem.${m.id}.text`)))))],
    chars: () => [h('div', { class: 'panel' }, h('h3', null, t('archive.chars') + ' ' + d.characters.filter(c => c.met).length + '/' + d.characters.length), h('div', { class: 'arc-chars' }, ...slice('chars', d.characters).map(c => {
      const el = characterEl(c.id, { scale: 1.6 }); if (!c.met) el.classList.add('dark'); el.title = c.met ? t('char.' + c.id) : t('archive.unknown');
      return h('div', { class: 'arc-char' + (c.met ? '' : ' off'), 'data-char': c.id }, el, h('div', null, h('b', null, c.met ? t('char.' + c.id) : t('archive.unknown')), h('div', { class: 'muted' }, c.met ? t('bio.' + c.id) : t('archive.char_locked'))));
    })), pager('chars', d.characters.length))],
    eggs: () => [h('div', { class: 'panel' }, h('h3', null, t('archive.eggs') + ' ' + d.eggs.filter(e => e.got).length + '/' + d.eggs.length), h('div', { class: 'arc-grid c4' }, ...d.eggs.map(e => h('div', { class: 'arc-cell egg' + (e.got ? '' : ' off'), 'data-egg': e.id }, h('b', null, e.got ? t(`egg.${e.id}.name`) : t('archive.unknown')), h('div', { class: 'muted' }, e.got ? t(`egg.${e.id}.text`) : t('archive.hint') + ': ' + t(`egg.${e.id}.hint`))))))],
    know: () => [h('div', { class: 'panel' }, h('h3', null, t('archive.knowledge') + ' ' + d.knowledge.filter(k => k.got).length + '/' + d.knowledge.length), h('div', { class: 'arc-grid c4' }, ...slice('know', d.knowledge).map(k => cell(k.got, t(`know.${k.id}.name`), t(`know.${k.id}.text`)))), pager('know', d.knowledge.length))],
    stats: () => [h('div', { class: 'panel' }, h('h3', null, t('archive.stats')), h('div', { class: 'arc-grid c4' }, stat('deaths', st.deaths), stat('runs', st.runs), stat('roundsWon', st.roundsWon), stat('roundsLost', st.roundsLost), stat('duelsWon', st.duelsWon), stat('duelsLost', st.duelsLost), stat('anomalies', st.anomalies), h('div', { class: 'arc-cell' }, t('archive.missions') + ': ', h('b', null, d.missions.done + '/' + d.missions.total))))]
  };
  const draw = () => {
    tabs.replaceChildren(...ARC_TABS.map(k => h('button', { type: 'button', role: 'tab', class: 'btn small' + (arcTab === k ? ' on primary' : ' ghost'), 'aria-selected': arcTab === k ? 'true' : 'false', 'data-act': 'arc_tab', 'data-arg': k }, t('archive.tab.' + k))));
    body.replaceChildren(...panels[arcTab]());
  };
  act.arc_tab = k => { arcTab = k; draw(); };
  act.arc_page = a => { const [k, dl] = a.split(':'); const pages = Math.max(1, Math.ceil((k === 'chars' ? d.characters.length : d.knowledge.length) / ARC_PER[k])); arcPage[k] = Math.max(0, Math.min(pages - 1, arcPage[k] + +dl)); draw(); };
  draw();
  return h('section', { class: 'scr archive' }, h('div', { class: 'row' }, h('h2', { class: 'bigtitle', style: 'flex:1' }, t('archive.title')), btn(t('ui.back'), 'archive_back', null, 'primary')), tabs, body);
}
act.archive_back = () => G.toMenu();

export function register(S) {
  S.menu = { render: menuScreen, hud: false, bg: 'menu' };
  S.intro = { render: introScreen, hud: false, bg: 'secret' };
  S.wings = { render: wingsScreen, hud: false, bg: 'corridor' };
  S.death = { render: deathScreen, hud: false, bg: 'secret' };
  S.door = { render: doorScreen, hud: true, bg: 'door' };
  S.ending = { render: endingScreen, hud: false, bg: 'secret' };
  S.archive = { render: archiveScreen, hud: false, bg: 'secret' };
}
