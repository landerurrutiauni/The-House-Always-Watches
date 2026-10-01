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

const confirmModal = (title, text, onYes, danger) => {
  const m = modal(h('div', null, h('p', null, text), h('div', { class: 'row' }, h('button', { class: 'btn ' + (danger ? 'danger' : 'primary'), type: 'button', onclick: () => { m.close(); onYes(); } }, t('ui.confirm')), h('button', { class: 'btn', type: 'button', onclick: () => m.close() }, t('ui.cancel')))), { title });
  return m;
};

// ---------------- Ajustes ----------------
export function openSettings() {
  const save = () => { saveSettings(); fx.applyDisplay(); audio.applySettings(settings); };
  const slider = (key, label) => h('div', { class: 'set-row' }, h('label', { for: 'set-' + key }, label), h('input', { id: 'set-' + key, type: 'range', min: 0, max: 100, value: Math.round(settings[key] * 100), oninput: e => { settings[key] = e.target.value / 100; save(); }, 'aria-label': label }));
  const tog = (key, label) => h('label', { class: 'tog' }, h('input', { type: 'checkbox', checked: !!settings[key], onchange: e => { settings[key] = e.target.checked; save(); if (key === 'reduceEffects') announce(label); } }), label);
  const seg = (key, opts) => { const box = h('div', { class: 'seg', role: 'group' }); const draw = () => box.replaceChildren(...opts.map(([v, lbl]) => h('button', { type: 'button', class: 'btn' + (settings[key] === v ? ' on' : ''), 'aria-pressed': settings[key] === v ? 'true' : 'false', onclick: () => { settings[key] = v; save(); draw(); } }, lbl))); draw(); return box; };
  const langBox = h('div', { class: 'seg', role: 'group' }); const drawLang = () => langBox.replaceChildren(...CONFIG.LANGS.map(l => h('button', { type: 'button', class: 'btn' + (getLang() === l ? ' on' : ''), 'aria-pressed': getLang() === l ? 'true' : 'false', lang: l, onclick: async () => { await setLang(l); saveSettings(); } }, CONFIG.LANG_NAMES[l])));
  drawLang();
  const fsRow = () => { const b = fsButton('text', ''); return b ? h('div', { class: 'set-row' }, h('label', null, t('settings.fullscreen')), b) : null; };
  const body = h('div', null,
    h('div', { class: 'set-sec' }, h('h3', null, t('settings.language')), langBox),
    h('div', { class: 'set-sec' }, h('h3', null, t('settings.audio')), slider('music', t('settings.music')), slider('sfx', t('settings.sfx')), slider('ambient', t('settings.ambient')), tog('muteMusic', t('settings.mute_music')), tog('muteSfx', t('settings.mute_sfx')), tog('reduceIntense', t('settings.reduce_intense'))),
    h('div', { class: 'set-sec' }, h('h3', null, t('settings.display')),
      h('div', { class: 'set-row' }, h('label', null, t('settings.text_size')), seg('textSize', [[1, '100%'], [1.15, '115%'], [1.3, '130%'], [1.5, '150%']])),
      h('div', { class: 'set-row' }, h('label', null, t('settings.quality')), seg('quality', [['high', t('settings.q.high')], ['medium', t('settings.q.medium')], ['low', t('settings.q.low')]])),
      tog('contrast', t('settings.contrast')), tog('reduceEffects', t('settings.reduce_effects')), tog('vibration', t('settings.vibration')), fsRow()),
    h('div', { class: 'set-sec' }, h('h3', null, t('settings.privacy')), h('div', { class: 'row' }, canOpenPreferences() ? h('button', { class: 'btn', type: 'button', onclick: () => openPreferences() }, t('settings.cookies')) : null,
      h('a', { class: 'btn ghost', href: 'legal/privacy.html', target: '_blank', rel: 'noopener' }, t('menu.legal.privacy')), h('a', { class: 'btn ghost', href: 'legal/cookies.html', target: '_blank', rel: 'noopener' }, t('menu.legal.cookies')), h('a', { class: 'btn ghost', href: 'legal/terms.html', target: '_blank', rel: 'noopener' }, t('menu.legal.terms')))),
    h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'button', onclick: () => closeTopModal() }, t('ui.close'))));
  let off = null;
  const m = modal(body, { title: t('settings.title'), onClose: () => { if (off) { off(); off = null; } } });
  off = bus.on('lang', () => { m.close(); openSettings(); });   // al cambiar de idioma se redibuja en el nuevo idioma
  return m;
}
act.settings = () => openSettings();

// ---------------- Menú ----------------
function menuScreen() {
  const ms = G.menuState(), narrow = window.innerWidth < 430, big = window.innerWidth >= 1500 && window.innerHeight >= 980;
  const title = h('div', { class: 'menu-title', role: 'img', 'aria-label': CONFIG.GAME_TITLE }, pixelText('THE HOUSE', { scale: narrow ? 5 : (big ? 10 : 7), color: PAL.t4 }), h('br'), pixelText('ALWAYS WATCHES', { scale: narrow ? 3 : (big ? 6 : 4), color: PAL.r4 }));
  const main = h('div', { class: 'menu-main' }, title, h('p', { class: 'tagline' }, t('menu.tagline')),
    ms.hasSave ? btn(t('menu.continue'), 'menu_continue', null, 'primary') : btn(t('menu.new'), 'menu_new', null, 'primary'),
    ms.hasSave ? btn(t('menu.new'), 'menu_new', null, '') : btn(t('menu.continue'), 'menu_continue', null, '', { disabled: true }),
    btn(t('menu.settings'), 'settings', null, ''),
    fsButton('text', ''),
    btn(t('menu.reset'), 'menu_reset', null, 'ghost danger', { disabled: !ms.hasSave }),
    ms.secretButton ? btn(t('menu.secret'), 'menu_archive', null, 'ghost secret-btn', { 'aria-label': t('archive.title') }) : null,
    h('div', { class: 'menu-foot' }, h('a', { href: 'legal/privacy.html', target: '_blank', rel: 'noopener' }, t('menu.legal.privacy')), h('a', { href: 'legal/cookies.html', target: '_blank', rel: 'noopener' }, t('menu.legal.cookies')), h('a', { href: 'legal/terms.html', target: '_blank', rel: 'noopener' }, t('menu.legal.terms')), canOpenPreferences() ? h('button', { type: 'button', 'data-act': 'cookies' }, t('menu.cookies')) : null),
    h('div', { class: 'ver' }, t('menu.version', { v: CONFIG.VERSION }), ms.deaths ? ' · ' + t('menu.deaths', { n: ms.deaths }) : ''));
  const ch = characterEl('dealer', { scale: narrow ? 3 : (window.innerHeight < 780 ? 5 : (big ? 8 : 6)) });
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
  wrap.appendChild(characterEl('dealer', { scale: window.innerWidth < 500 ? 3 : 4 }));
  const prompt = h('p', { class: 'prompt' }, t('ui.tap'));
  const root = h('section', { class: 'scr intro', tabindex: 0, role: 'button', 'aria-label': t('ui.tap') }, wrap, line, prompt, h('button', { class: 'btn ghost small', type: 'button', 'data-act': 'intro_skip' }, t('ui.skip')));
  const show = () => { const key = v.lines[i]; line.className = 'line' + (key === 'intro.4' ? ' you' : ''); ctl = typewriter(line, t(key), { speed: 38 }); if (i >= 1) wrap.style.opacity = '1'; if (i === 1) audio.playSFX('whisper'); };
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
      cv, h('div', { class: 'wb' }, h('b', null, t(`wing.${w.id}.name`).toUpperCase()), h('div', { class: 'muted' }, w.unlocked ? t(`wing.${w.id}.desc`) : t('wings.locked')),
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
  const ctl = typewriter(text, t(`ending.${v.id}.text`), { speed: 14, onDone: () => { epi.style.opacity = '1'; } });
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
function archiveScreen(v) {
  const d = v.data, cell = (on, a, b) => h('div', { class: 'arc-cell' + (on ? '' : ' off') }, h('b', null, on ? a : t('archive.unknown')), on && b ? h('div', { class: 'muted' }, b) : null);
  const st = d.stats, stat = (k, val) => h('div', { class: 'arc-cell' }, t('archive.stat.' + k) + ': ', h('b', null, val));
  const dealerSeen = d.knowledge.filter(k => DEALER_CLUES.includes(k.id) && k.got).length;
  return h('section', { class: 'scr archive' }, h('div', { class: 'row' }, h('h2', { class: 'bigtitle', style: 'flex:1' }, t('archive.title')), btn(t('ui.back'), 'archive_back', null, 'primary')),
    h('div', { class: 'panel' }, h('h3', null, t('archive.endings') + ' ' + d.endings.filter(e => e.seen).length + '/' + d.endings.length), h('div', { class: 'arc-grid' }, ...d.endings.map(e => cell(e.seen, t(`ending.${e.id}.title`), t(`ending.${e.id}.epi`))))),
    h('div', { class: 'panel' }, h('h3', null, t('archive.chars')), h('div', { class: 'arc-chars' }, ...d.characters.map(c => { const el = characterEl(c.id, { scale: 1.6 }); if (!c.met) el.classList.add('dark'); el.title = c.met ? t('char.' + c.id) : t('archive.unknown'); return el; }))),
    h('div', { class: 'panel' }, h('h3', null, t('archive.memories') + ' ' + d.memories.filter(m => m.got).length + '/' + d.memories.length), h('div', { class: 'arc-grid' }, ...d.memories.map(m => cell(m.got, t(`mem.${m.id}.name`), t(`mem.${m.id}.text`))))),
    h('div', { class: 'panel' }, h('h3', null, t('archive.knowledge') + ' ' + d.knowledge.filter(k => k.got).length + '/' + d.knowledge.length), h('div', { class: 'arc-grid' }, ...d.knowledge.map(k => cell(k.got, t(`know.${k.id}.name`), t(`know.${k.id}.text`))))),
    h('div', { class: 'panel' }, h('h3', null, t('archive.stats')), h('div', { class: 'arc-grid' }, stat('deaths', st.deaths), stat('runs', st.runs), stat('roundsWon', st.roundsWon), stat('roundsLost', st.roundsLost), stat('duelsWon', st.duelsWon), stat('duelsLost', st.duelsLost), stat('anomalies', st.anomalies))));
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
