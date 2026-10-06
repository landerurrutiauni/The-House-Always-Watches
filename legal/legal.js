/* legal.js — pinta la página «Privacidad y aviso» desde locales/<lang>.json o desde window.__LOCALES__ (build de un solo archivo).
   Script clásico, sin dependencias: funciona también con file://. Todo se inserta como texto (nunca como HTML). */
(function () {
  'use strict';
  var LANGS = ['es', 'en', 'fr', 'de', 'eu'], NAMES = { es: 'Español', en: 'English', fr: 'Français', de: 'Deutsch', eu: 'Euskara' }, SETTINGS_KEY = 'thaw.settings.v1';
  var body = document.body, page = body.getAttribute('data-page') || 'privacy', GAME = body.getAttribute('data-game') || '../index.html';
  try { var cs = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || 'null'); if (cs && cs.contrast) body.classList.add('hc'); } catch (e) { /* sin almacenamiento */ }
  var cache = {};

  function detect() {
    try { var s = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || 'null'); if (s && LANGS.indexOf(s.lang) >= 0) return s.lang; } catch (e) { /* sin almacenamiento */ }
    var n = ((navigator.languages && navigator.languages[0]) || navigator.language || 'en').slice(0, 2).toLowerCase();
    return LANGS.indexOf(n) >= 0 ? n : 'en';
  }
  var loading = {};
  // Carga un idioma: incrustado (build de un solo archivo) o JSON. Hasta 3 intentos (el 2.º y el 3.º saltándose la caché).
  // Un fallo NO se guarda: devuelve null y se volverá a intentar la próxima vez (antes se guardaba {} y se veían los nombres de las claves).
  function load(l) {
    if (cache[l]) return Promise.resolve(cache[l]);
    if (window.__LOCALES__ && window.__LOCALES__[l]) { cache[l] = window.__LOCALES__[l]; return Promise.resolve(cache[l]); }
    if (loading[l]) return loading[l];
    loading[l] = new Promise(function (resolve) {
      var n = 0;
      (function attempt() {
        fetch('../locales/' + l + '.json' + (n ? '?r=' + Date.now() : ''), n ? { cache: 'reload' } : undefined)
          .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
          .then(function (j) { if (!j || typeof j !== 'object' || Object.keys(j).length < 20) throw new Error('vacío'); cache[l] = j; resolve(j); })
          .catch(function () { if (++n < 3) setTimeout(attempt, n === 1 ? 250 : 900); else resolve(null); });
      })();
    }).then(function (d) { delete loading[l]; return d; });
    return loading[l];
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function paragraphs(parent, text) { text.split('\n').forEach(function (line) { parent.appendChild(el('p', null, line)); }); }
  function failure(root, lang) {
    root.textContent = '';
    root.appendChild(el('p', null, 'The text could not be loaded. Check your connection and try again. / No se pudo cargar el texto. Comprueba tu conexión y vuelve a intentarlo.'));
    var b = el('button', 'btn', 'Retry / Reintentar'); b.type = 'button'; b.addEventListener('click', function () { render(lang); }); root.appendChild(b);
  }
  var token = 0;
  function render(lang) {
    var mine = ++token;
    Promise.all([load(lang), load('en')]).then(function (r) {
      if (mine !== token) return;          // se pulsó otro idioma mientras cargaba este
      var root = document.getElementById('legal');
      var L = r[0], E = r[1] || r[0];
      if (!L && !E) { failure(root, lang); return; }
      var shown = L ? lang : 'en';        // si el idioma pedido no cargó, se muestra inglés y se avisa
      L = L || E;
      var t = function (k) { return L[k] !== undefined ? L[k] : (E[k] !== undefined ? E[k] : ''); };
      var has = function (k) { return L[k] !== undefined || E[k] !== undefined; };
      document.documentElement.lang = shown;
      document.title = t('legal.title.' + page) + ' — THE HOUSE ALWAYS WATCHES';
      root.textContent = '';
      var top = el('div', 'top');
      var back = el('a', 'btn', t('legal.back')); back.href = GAME; top.appendChild(back);
      var langs = el('div', 'langs'); langs.setAttribute('role', 'group'); langs.setAttribute('aria-label', t('legal.lang'));
      LANGS.forEach(function (l) {
        var b = el('button', 'btn small' + (l === lang ? ' on' : ''), NAMES[l]); b.type = 'button'; b.setAttribute('lang', l); b.setAttribute('aria-pressed', l === lang ? 'true' : 'false');
        b.addEventListener('click', function () { render(l); }); langs.appendChild(b);
      });
      top.appendChild(langs); root.appendChild(top);
      if (shown !== lang) { var warn = el('p', 'muted', t('legal.load_error').replace('{lang}', NAMES[lang])); warn.setAttribute('role', 'status'); root.appendChild(warn); }
      root.appendChild(el('h1', null, t('legal.title.' + page)));
      root.appendChild(el('p', 'muted', t('legal.updated')));
      for (var i = 1; has('legal.' + page + '.s' + i + '.h'); i++) {
        var sec = el('section'); sec.appendChild(el('h2', null, t('legal.' + page + '.s' + i + '.h')));
        paragraphs(sec, t('legal.' + page + '.s' + i + '.t')); root.appendChild(sec);
      }
    });
  }
  render(detect());
})();
