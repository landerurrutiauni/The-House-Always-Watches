/* Observador de textos para las pruebas (se inyecta con add_init_script).
   Registra en window.__leaks CUALQUIER cadena que llegue al DOM —texto, title, aria-label, alt, placeholder— y que parezca
   (a) una clave de traducción sin traducir (prefijos reales de locales/en.json o cualquier «palabra.palabra»),
   (b) un marcador {algo} sin sustituir, o (c) basura de programación (undefined, null, NaN, [object Object]).
   Mira también lo efímero (avisos, pancartas, tooltips) porque se engancha a MutationObserver. */
(function (NS) {
  var KEY = new RegExp('(?<![\\w./@-])(?:' + NS.join('|') + ')\\.[A-Za-z0-9_]+(?:\\.[A-Za-z0-9_]+)*(?![\\w@-])');
  var GEN = /(?<![\w./@#-])[a-z][a-z0-9_]+(?:\.[a-z0-9_]+){1,4}(?![\w@-])/;
  var PLACE = /\{[A-Za-z_][A-Za-z0-9_]*\}/;
  var BAD = /(?:^|[^\w])(?:undefined|NaN|\[object \w+\])(?:[^\w]|$)|(?:^|\s)null(?:\s|$)/;
  // «null» es una palabra normal en alemán (= cero: «Verstand null»); allí solo se da por basura si es el texto entero o va tras «: » / «= ».
  var BAD_DE = /(?:^|[^\w])(?:undefined|NaN|\[object \w+\])(?:[^\w]|$)|^\s*null\s*$|[:=]\s*null(?:\s|$)/;
  window.__leaks = new Map(); window.__seenText = 0; window.__strings = new Set();
  var ATTRS = ['title', 'aria-label', 'aria-description', 'placeholder', 'alt'];
  function bad(s) {
    if (!s || s.length < 3) return null;
    var m = KEY.exec(s) || PLACE.exec(s) || (document.documentElement.lang === 'de' ? BAD_DE : BAD).exec(s);
    if (m) return m[0];
    m = GEN.exec(s);
    if (m && !/^v\d/.test(m[0]) && !/^(?:e\.g|i\.e|www|localhost)/.test(m[0]) && !/\.(?:html?|js|css|json|png|svg|com|org|io|net|zip)$/.test(m[0])) return m[0];
    return null;
  }
  function note(where, s) {
    window.__seenText++; if (s && s.length < 400 && window.__strings.size < 20000) window.__strings.add(s.trim());
    var b = bad(s); if (!b) return;
    var k = where + ' :: ' + b + ' :: ' + s.slice(0, 120).replace(/\s+/g, ' ');
    if (!window.__leaks.has(k)) window.__leaks.set(k, (document.body && document.body.dataset.view) || '?');
  }
  function walk(n) {
    if (n.nodeType === 3) { var p = n.parentNode; if (p && (p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE')) return; note('text', n.data); return; }
    if (n.nodeType !== 1 || n.nodeName === 'SCRIPT' || n.nodeName === 'STYLE') return;
    for (var i = 0; i < ATTRS.length; i++) { var v = n.getAttribute(ATTRS[i]); if (v) note('@' + ATTRS[i], v); }
    for (var c = n.firstChild; c; c = c.nextSibling) walk(c);
  }
  function start() {
    walk(document.documentElement);
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'childList') m.addedNodes.forEach(walk);
        else if (m.type === 'characterData') note('text', m.target.data);
        else if (m.type === 'attributes') { var v = m.target.getAttribute(m.attributeName); if (v) note('@' + m.attributeName, v); }
      }
    }).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  if (document.documentElement) start(); else document.addEventListener('DOMContentLoaded', start);
})(window.__KEY_NS__ || []);
