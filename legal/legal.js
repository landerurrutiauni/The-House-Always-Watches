/* legal.js — pinta las páginas legales (PLANTILLAS, no son asesoramiento legal) desde locales/<lang>.json
   o desde window.__LOCALES__ (build de un solo archivo). Script clásico, sin dependencias: funciona también con file://. */
(function () {
  'use strict';
  var LANGS = ['es', 'en', 'fr', 'de'], NAMES = { es: 'Español', en: 'English', fr: 'Français', de: 'Deutsch' };
  var PAGES = ['privacy', 'cookies', 'terms'], SETTINGS_KEY = 'thaw.settings.v1';
  var body = document.body, page = body.getAttribute('data-page') || 'privacy', GAME = body.getAttribute('data-game') || '../index.html';
  var cache = {};

  function detect() {
    try { var s = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || 'null'); if (s && LANGS.indexOf(s.lang) >= 0) return s.lang; } catch (e) { /* sin almacenamiento */ }
    var n = ((navigator.languages && navigator.languages[0]) || navigator.language || 'en').slice(0, 2).toLowerCase();
    return LANGS.indexOf(n) >= 0 ? n : 'en';
  }
  function load(l) {
    if (cache[l]) return Promise.resolve(cache[l]);
    if (window.__LOCALES__ && window.__LOCALES__[l]) { cache[l] = window.__LOCALES__[l]; return Promise.resolve(cache[l]); }
    return fetch('../locales/' + l + '.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { cache[l] = j; return j; }).catch(function () { cache[l] = {}; return cache[l]; });
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  // Los [textos entre corchetes] son huecos que hay que rellenar: se resaltan. Todo se inserta como texto (nunca como HTML).
  function rich(parent, text) {
    text.split(/(\[[^\]]+\])/).forEach(function (part) {
      if (!part) return;
      if (part.charAt(0) === '[') parent.appendChild(el('span', 'ph', part)); else parent.appendChild(document.createTextNode(part));
    });
  }
  function paragraphs(parent, text) {
    var list = null;
    text.split('\n').forEach(function (line) {
      if (line.indexOf('• ') === 0) { if (!list) { list = el('ul'); parent.appendChild(list); } var li = el('li'); rich(li, line.slice(2)); list.appendChild(li); }
      else { list = null; var p = el('p'); rich(p, line); parent.appendChild(p); }
    });
  }
  function render(lang) {
    Promise.all([load(lang), load('en')]).then(function (r) {
      var L = r[0], E = r[1];
      var t = function (k) { return L[k] !== undefined ? L[k] : (E[k] !== undefined ? E[k] : k); };
      var has = function (k) { return L[k] !== undefined || E[k] !== undefined; };
      document.documentElement.lang = lang;
      document.title = t('legal.title.' + page) + ' — THE HOUSE ALWAYS WATCHES';
      var root = document.getElementById('legal'); root.textContent = '';

      var top = el('div', 'top');
      var back = el('a', 'btn', t('legal.back')); back.href = GAME; top.appendChild(back);
      var langs = el('div', 'langs'); langs.setAttribute('role', 'group'); langs.setAttribute('aria-label', t('legal.lang'));
      LANGS.forEach(function (l) {
        var b = el('button', 'btn small' + (l === lang ? ' on' : ''), NAMES[l]); b.type = 'button'; b.setAttribute('lang', l); b.setAttribute('aria-pressed', l === lang ? 'true' : 'false');
        b.addEventListener('click', function () { render(l); }); langs.appendChild(b);
      });
      top.appendChild(langs); root.appendChild(top);

      var ban = el('div', 'banner', t('legal.placeholder')); ban.setAttribute('role', 'note'); root.appendChild(ban);
      root.appendChild(el('h1', null, t('legal.title.' + page)));
      var upd = el('p', 'muted'); rich(upd, t('legal.updated')); root.appendChild(upd);

      for (var i = 1; has('legal.' + page + '.s' + i + '.h'); i++) {
        var sec = el('section'); sec.appendChild(el('h2', null, t('legal.' + page + '.s' + i + '.h')));
        paragraphs(sec, t('legal.' + page + '.s' + i + '.t'));
        root.appendChild(sec);
      }
      var nav = el('nav', 'others'); nav.setAttribute('aria-label', t('legal.other'));
      PAGES.forEach(function (p) { if (p !== page) { var a = el('a', null, t('legal.title.' + p)); a.href = p + '.html'; nav.appendChild(a); } });
      root.appendChild(nav);
    });
  }
  render(detect());
})();
