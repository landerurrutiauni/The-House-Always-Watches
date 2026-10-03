#!/usr/bin/env python3
"""Verificación de funciones transversales en Chromium real (Playwright). Uso: python3 tools/test-features.py [--url http://localhost:8080/index.html]
Cubre: sin anuncios ni terceros, consentimiento para servicios opcionales (si se declaran), persistencia (continuar/nueva/reiniciar),
audio (señal real en la salida), accesibilidad, cambio de idioma en caliente, pantalla completa y panel de depuración."""
import re, sys, json, re
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parent.parent
URL = sys.argv[sys.argv.index('--url') + 1] if '--url' in sys.argv else 'http://localhost:8080/index.html'
ORIGIN = urlparse(URL).hostname
res = []
def check(name, cond, extra=''):
    res.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name + ((' — ' + str(extra)) if extra != '' and not cond else ''), flush=True)

AUDIO_PROBE = """(() => { const o = AudioNode.prototype.connect; window.__peak = 0; window.__hops = 0;
  AudioNode.prototype.connect = function (d, ...r) { const x = o.call(this, d, ...r);
    try { if (d && d.constructor && d.constructor.name === 'AudioDestinationNode' && !window.__an) { const an = this.context.createAnalyser(); an.fftSize = 2048; o.call(this, an); window.__an = an; const buf = new Float32Array(2048);
      setInterval(() => { an.getFloatTimeDomainData(buf); let m = 0; for (let i = 0; i < buf.length; i++) m = Math.max(m, Math.abs(buf[i])); window.__peak = Math.max(window.__peak, m); window.__hops++; }, 40); } } catch (e) {}
    return x; }; })();"""

def boot(b, init='', locale='en-US', url=URL, w=1280, h=720, route=None):
    ctx = b.new_context(viewport={'width': w, 'height': h}, locale=locale)
    if init: ctx.add_init_script(init)
    if route: ctx.route(route[0], route[1])
    pg = ctx.new_page(); pg.reqs, pg.errs = [], []
    pg.on('request', lambda r: pg.reqs.append(r.url)); pg.on('pageerror', lambda e: pg.errs.append('PAGEERROR ' + str(e)))
    pg.on('console', lambda m: pg.errs.append('CONSOLE ' + m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    pg.goto(url); pg.wait_for_selector('body[data-ready="1"]', timeout=15000); pg.wait_for_timeout(250)
    return ctx, pg
view = lambda pg: pg.evaluate('document.body.dataset.view')
ls = lambda pg, k: pg.evaluate('(k) => localStorage.getItem(k)', k)
def waitview(pg, v, ms=6000):
    try: pg.wait_for_function('(v) => document.body.dataset.view === v', arg=v, timeout=ms); return True
    except Exception: return False
def eva(pg, code, arg=None): return pg.evaluate("async (arg) => { const G = await import('/src/game.js'); const st = await import('/src/state.js'); " + code + "}", arg)
def start_run(pg):
    pg.click('[data-act="menu_new"]'); pg.wait_for_selector('.intro'); pg.click('[data-act="intro_skip"]'); return waitview(pg, 'map')

with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])

    # ---------- A. Sin anuncios ni servicios de terceros ----------
    bad = []
    files = list(ROOT.glob('src/**/*.js')) + [ROOT / 'index.html'] + list(ROOT.glob('assets/**/*.css')) + list(ROOT.glob('legal/*')) + list(ROOT.glob('locales/*.json'))
    for f in files:
        if re.search(r'adsbygoogle|googlesyndication|pagead|adsense|ca-pub-|dataLayer|gtag\(', f.read_text(encoding='utf-8', errors='ignore'), re.I): bad.append(str(f.relative_to(ROOT)))
    check('A1 el código, los estilos y los textos no contienen nada de AdSense ni de Google (adsbygoogle, ca-pub, dataLayer…)', not bad, bad)
    ctx, pg = boot(b)
    hosts = {urlparse(u).hostname for u in pg.reqs if urlparse(u).hostname}
    check('A2 arranque limpio: solo peticiones al propio origen', hosts <= {ORIGIN}, hosts)
    check('A3 sin banner de cookies ni botones de cookies (no hay servicios opcionales)', pg.query_selector('.cookie-layer') is None and pg.query_selector('[data-act="cookies"]') is None)
    check('A4 sin huecos de anuncios ni scripts de terceros', pg.evaluate("!document.querySelector('.ad-slot, #ad-top, #ad-bottom, #ad-side') && ![...document.scripts].some(s => /google|doubleclick|gtag/i.test(s.src)) && typeof window.dataLayer === 'undefined'"))
    check('A5 el menú es jugable desde el primer instante (nada lo tapa)', view(pg) == 'menu' and pg.is_visible('[data-act="menu_new"]'))
    start_run(pg); pg.click('[data-act="settings"]'); pg.keyboard.press('Escape')
    check('A6 no usa cookies: document.cookie sigue vacío tras empezar una partida y abrir ajustes', pg.evaluate('document.cookie') == '', pg.evaluate('document.cookie'))
    hosts = {urlparse(u).hostname for u in pg.reqs if urlparse(u).hostname}
    check('A7 durante la partida tampoco se pide nada fuera del propio origen', hosts <= {ORIGIN}, hosts)
    check('A8 sin errores JS', not pg.errs, pg.errs); ctx.close()

    # ---------- B. Consentimiento para servicios opcionales (si los añades) ----------
    OPT = "window.HOUSE_CONFIG = { OPTIONAL_CATEGORIES: ['analytics'] };"
    stub = ('**/example.invalid/**', lambda route: route.fulfill(status=200, content_type='application/javascript', body='/* stub */'))
    exr = lambda pg: [u for u in pg.reqs if 'example.invalid' in u]
    LT = "const p = await import('/src/privacy.js'); return [p.loadThirdParty('analytics', 'https://example.invalid/a.js'), p.thirdPartyLog.blocked.length];"
    ctx, pg = boot(b, OPT, route=stub)
    check('B1 con una categoría opcional declarada aparece el banner y el juego se ve detrás', pg.is_visible('.cookie-layer .cookie-box') and view(pg) == 'menu')
    r = eva(pg, LT); check('B2 antes de decidir, loadThirdParty bloquea el servicio y no hay petición', r == [False, 1] and not exr(pg), (r, exr(pg)))
    pg.click('[data-ck="none"]'); pg.wait_for_timeout(150); c = json.loads(ls(pg, 'thaw.consent.v1') or '{}')
    check('B3 rechazar opcionales: elección guardada (decidido, analytics=false)', c.get('decided') and c.get('analytics') is False, c)
    r = eva(pg, LT); check('B4 tras rechazar sigue bloqueado', r[0] is False and not exr(pg), (r, exr(pg)))
    pg.reload(); pg.wait_for_selector('body[data-ready="1"]'); pg.wait_for_timeout(250)
    check('B5 tras recargar no vuelve a aparecer el banner (elección persistente)', pg.query_selector('.cookie-layer') is None)
    pg.click('[data-act="cookies"]'); pg.wait_for_timeout(100)
    check('B6 desde el menú se reabre la configuración, con botón Cerrar', pg.is_visible('.cookie-layer.is-config') and pg.query_selector('[data-ck="close"]') is not None)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100); check('B7 Escape cierra la configuración (ya hay decisión)', pg.query_selector('.cookie-layer') is None)
    pg.click('[data-act="cookies"]'); pg.check('input[data-cat="analytics"]'); pg.click('[data-ck="save"]'); pg.wait_for_timeout(100)
    c = json.loads(ls(pg, 'thaw.consent.v1')); check('B8 configurar y guardar: analytics=true', c['analytics'] is True, c)
    r = eva(pg, LT); pg.wait_for_timeout(300)
    check('B9 tras aceptar, el servicio se carga (una petición y su script insertado)', r[0] is True and len(exr(pg)) == 1 and pg.evaluate("[...document.scripts].some(s => s.src.includes('example.invalid'))"), (r, exr(pg)))
    pg.keyboard.type('debug'); pg.wait_for_timeout(150); pg.evaluate("window.HOUSE_DEBUG.clearCookieConsent()"); pg.wait_for_timeout(200)
    check('B10 clearCookieConsent borra la elección y vuelve a mostrar el banner', ls(pg, 'thaw.consent.v1') is None and pg.query_selector('.cookie-layer') is not None)
    check('B11 sin errores JS', not pg.errs, pg.errs); ctx.close()

    # ---------- C. Persistencia: continuar / nueva partida / reiniciar ----------
    ctx, pg = boot(b)
    check('C1 sin partida: CONTINUAR y REINICIAR desactivados', pg.is_disabled('[data-act="menu_continue"]') and pg.is_disabled('[data-act="menu_reset"]'))
    start_run(pg); pg.click('.node.avail >> nth=0'); pg.click('[data-act="map_enter"]'); pg.wait_for_timeout(300)
    snap = eva(pg, "return { deck: st.gs.deck.length, wing: st.gs.run && st.gs.run.wing }")
    pg.reload(); pg.wait_for_selector('body[data-ready="1"]'); pg.wait_for_timeout(250)
    check('C2 tras recargar hay partida: CONTINUAR activo', not pg.is_disabled('[data-act="menu_continue"]'))
    pg.click('[data-act="menu_continue"]'); ok = waitview(pg, 'map'); snap2 = eva(pg, "return { deck: st.gs.deck.length, wing: st.gs.run && st.gs.run.wing }")
    check('C3 CONTINUAR reanuda en el mapa con los mismos datos (mazo, ala)', ok and snap2 == snap, (snap, snap2))
    eva(pg, "G.toMenu();"); pg.wait_for_timeout(200); pg.click('[data-act="menu_new"]'); pg.wait_for_timeout(300)
    if pg.query_selector('.modal'): pg.click('.modal .btn.primary')
    check('C4 NUEVA PARTIDA con progreso: nuevo descenso (mapa/alas) sin pasar por la intro', waitview(pg, 'map') or view(pg) == 'wings', view(pg))
    eva(pg, "G.toMenu();"); pg.wait_for_timeout(200); sv0 = ls(pg, 'thaw.save.v1'); st0 = ls(pg, 'thaw.settings.v1')
    pg.click('[data-act="menu_reset"]'); pg.wait_for_selector('.modal'); pg.click('.modal .btn.danger'); pg.wait_for_timeout(200)
    check('C5 REINICIAR PROGRESO pide doble confirmación', pg.query_selector('.modal') is not None)
    pg.click('.modal .btn.danger'); pg.wait_for_timeout(300)
    check('C6 tras reiniciar: sin partida guardada y CONTINUAR desactivado', ls(pg, 'thaw.save.v1') is None and pg.is_disabled('[data-act="menu_continue"]') and sv0 is not None)
    check('C7 sin errores JS', not pg.errs, pg.errs); ctx.close()

    # ---------- D. Audio ----------
    ctx, pg = boot(b, AUDIO_PROBE)
    pre = pg.evaluate("async () => { const a = (await import('/src/audio.js')).audioManager; return a.ctx ? 1 : 0; }")
    check('D1 antes de cualquier gesto no se crea el contexto de audio', pre == 0, pre)
    pg.click('[data-act="settings"]'); pg.wait_for_timeout(2500)
    st = pg.evaluate("async () => { const a = (await import('/src/audio.js')).audioManager; return { ready: a.ready, state: a.ctx && a.ctx.state, t: a.ctx && a.ctx.currentTime }; }")
    check('D2 tras el primer gesto el AudioContext está "running" y avanza el tiempo', st['ready'] and st['t'] > 0.5, st)
    pk = pg.evaluate("window.__peak"); check('D3 hay señal real en la salida (música del menú): pico entre 0.001 y 1.0 (sin saturar)', 0.001 < pk < 1.0, pk)
    pg.check('label.tog:has-text("Mute music") input'); pg.check('label.tog:has-text("Mute effects") input')
    pg.evaluate("() => { const r = document.getElementById('set-ambient'); r.value = 0; r.dispatchEvent(new Event('input', { bubbles: true })); }")
    pg.wait_for_timeout(1500); pg.evaluate("window.__peak = 0"); pg.wait_for_timeout(1500); pk2 = pg.evaluate("window.__peak")
    check('D4 silenciando música, efectos y ambiente la salida cae a ~0', pk2 < 0.01, (pk, pk2))
    check('D5 sin errores JS en el audio', not pg.errs, pg.errs); ctx.close()

    # ---------- E. Accesibilidad, calidad, idioma en caliente ----------
    ctx, pg = boot(b); pg.click('[data-act="settings"]')
    pg.check('label.tog:has-text("High contrast") input'); pg.check('label.tog:has-text("Reduce effects") input'); pg.click('.seg button:has-text("Low")')
    cls = pg.evaluate("document.body.className"); fs = pg.evaluate("getComputedStyle(document.body).fontSize")
    check('E1 alto contraste, reducir efectos y calidad baja se aplican al instante; el tamaño del texto es fijo (16 px)', 'hc' in cls and 'reduce' in cls and 'q-low' in cls and fs == '16px', (cls, fs))
    nots = pg.evaluate("() => ({ labels: [...document.querySelectorAll('.modal .set-row label')].map(l => l.textContent), pct: [...document.querySelectorAll('.modal .seg button')].filter(b => /%$/.test(b.textContent.trim())).length })")
    check('E1b Ajustes ya NO ofrece cambiar el tamaño del texto (ni el 100/115/130/150 %)', not any(re.search(r'size|tama[ñn]o|taille|gr[öo](ß|ss)e|tamaina', l, re.I) for l in nots['labels']) and nots['pct'] == 0, nots)   # (la «velocidad» del texto sí existe)
    pg.evaluate("() => { const k = Object.keys(localStorage).find(x => /settings/i.test(x)); const o = JSON.parse(localStorage.getItem(k) || '{}'); o.textSize = 1.5; localStorage.setItem(k, JSON.stringify(o)); }"); pg.reload(); pg.wait_for_selector('body[data-ready="1"]'); pg.wait_for_timeout(250)
    check('E1c un ajuste antiguo de tamaño de texto guardado (150 %) se ignora', pg.evaluate("getComputedStyle(document.body).fontSize") == '16px')
    pg.click('[data-act="settings"]'); pg.wait_for_selector('.modal')
    pg.keyboard.press('Escape'); pg.reload(); pg.wait_for_selector('body[data-ready="1"]'); pg.wait_for_timeout(250)
    cls = pg.evaluate("document.body.className"); check('E2 los ajustes persisten tras recargar', 'hc' in cls and 'reduce' in cls and 'q-low' in cls, cls)
    pg.click('[data-act="settings"]'); pg.click('.seg button[lang="es"]'); pg.wait_for_timeout(300)
    check('E3 cambio de idioma en caliente: interfaz y ajustes pasan a español sin recargar', pg.evaluate("document.documentElement.lang") == 'es' and 'nueva partida' in pg.inner_text('#view').lower() and 'ajustes' in pg.inner_text('.modal').lower() and 'idioma' in pg.inner_text('.modal').lower(), pg.inner_text('.modal')[:60])
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100); check('E4 tras cambiar de idioma queda UN solo modal y Escape lo cierra', pg.query_selector('.modal-back') is None)
    pg.click('[data-act="settings"]'); pg.click('.seg button[lang="fr"]'); pg.wait_for_timeout(200); pg.click('.seg button[lang="de"]'); pg.wait_for_timeout(200)
    check('E5 varios cambios seguidos: sigue habiendo un único modal', pg.evaluate("document.querySelectorAll('.modal-back').length") == 1)
    pg.keyboard.press('Escape'); pg.reload(); pg.wait_for_selector('body[data-ready="1"]'); pg.wait_for_timeout(250)
    check('E6 el idioma elegido persiste (de)', pg.evaluate("document.documentElement.lang") == 'de' and 'NEUES SPIEL' in pg.inner_text('#view'))
    # euskera: elegirlo en Ajustes, que persista y que el navegador en euskera lo detecte solo
    pg.click('[data-act="settings"]'); pg.wait_for_selector('.modal'); pg.click('.seg button[lang="eu"]'); pg.wait_for_timeout(250)
    check('E5b hay 5 idiomas en Ajustes y el euskera se llama «Euskara»', pg.evaluate("document.querySelectorAll('.modal .seg button[lang]').length") == 5 and 'euskara' in pg.inner_text('.modal .seg').lower(), pg.inner_text('.modal .seg'))   # los botones salen en mayúsculas por CSS
    pg.keyboard.press('Escape'); pg.reload(); pg.wait_for_selector('body[data-ready="1"]'); pg.wait_for_timeout(250)
    check('E6b el euskera persiste: <html lang="eu"> y el menú dice PARTIDA BERRIA / JARRAITU', pg.evaluate("document.documentElement.lang") == 'eu' and 'PARTIDA BERRIA' in pg.inner_text('#view'), pg.inner_text('#view')[:80])
    ctx.close()
    ctx, pg = boot(b, locale='eu-ES'); pg.wait_for_selector('body[data-ready="1"]'); pg.wait_for_timeout(300)
    check('E6c un navegador en euskera (eu-ES) arranca el juego en euskera sin tocar nada', pg.evaluate("document.documentElement.lang") == 'eu' and 'PARTIDA BERRIA' in pg.inner_text('#view'), pg.evaluate("document.documentElement.lang")); ctx.close()
    ctx, pg = boot(b)
    check('E7 sin errores JS', not pg.errs, pg.errs); ctx.close()

    # ---------- F. Pantalla completa ----------
    ctx, pg = boot(b)
    FS = lambda pg: pg.evaluate("document.fullscreenElement ? document.fullscreenElement.tagName : null")
    check('F1 hay botón de pantalla completa en el menú', pg.query_selector('[data-act="fullscreen"][data-fs="text"]') is not None)
    pg.click('[data-act="settings"]'); row = pg.query_selector('.modal [data-act="fullscreen"]') is not None; pg.keyboard.press('Escape')
    check('F2 y una fila en Ajustes', row)
    pg.click('[data-act="fullscreen"][data-fs="text"]'); pg.wait_for_timeout(600)
    check('F3 pulsarlo entra en pantalla completa (página entera) y el botón pasa a SALIR', FS(pg) == 'HTML' and 'EXIT' in pg.inner_text('[data-fs="text"]') and pg.get_attribute('[data-fs="text"]', 'aria-pressed') == 'true', (FS(pg), pg.inner_text('[data-fs="text"]')))
    pg.click('[data-act="fullscreen"][data-fs="text"]'); pg.wait_for_timeout(600)
    check('F4 pulsarlo otra vez sale de pantalla completa', FS(pg) is None and pg.get_attribute('[data-fs="text"]', 'aria-pressed') == 'false', FS(pg))
    start_run(pg)
    check('F5 durante la partida hay botón (icono) en el HUD', pg.query_selector('#hud [data-act="fullscreen"][data-fs="icon"]') is not None)
    pg.click('#hud [data-fs="icon"]'); pg.wait_for_timeout(600); on = FS(pg) == 'HTML'
    pg.evaluate("document.exitFullscreen()"); pg.wait_for_timeout(600)
    check('F6 funciona desde el HUD y, si se sale por otro medio (Esc del navegador), el botón se actualiza solo', on and FS(pg) is None and pg.get_attribute('#hud [data-fs="icon"]', 'aria-pressed') == 'false', (on, FS(pg)))
    check('F7 sin errores JS', not pg.errs, pg.errs); ctx.close()
    NOFS = "for (const k of ['fullscreenEnabled', 'webkitFullscreenEnabled']) Object.defineProperty(Document.prototype, k, { get() { return false; }, configurable: true });"
    ctx, pg = boot(b, NOFS); start_run(pg); pg.click('[data-act="settings"]'); inset = pg.query_selector('.modal [data-fs]'); pg.keyboard.press('Escape')
    check('F8 sin soporte (p. ej. iPhone) no se muestran botones de pantalla completa en ningún sitio', inset is None and pg.query_selector('#hud [data-fs]') is None and not pg.evaluate("document.querySelector('[data-fs]')"))
    ctx.close()

    # ---------- H. Ayuda «Cómo se juega» y pistas de una sola vez ----------
    ctx, pg = boot(b)
    check('H1 el menú tiene el botón CÓMO SE JUEGA', pg.query_selector('[data-act="howto"]') is not None)
    pg.click('[data-act="howto"]'); pg.wait_for_selector('.howto-modal'); txt = pg.inner_text('.howto-modal')
    nsec = pg.evaluate("document.querySelectorAll('.howto-modal details').length"); nopen = pg.evaluate("document.querySelectorAll('.howto-modal details[open]').length")
    check('H2 la ayuda tiene 9 secciones plegables (solo la primera desplegada) y ningún texto sin traducir', nsec == 9 and nopen == 1 and not re.search(r'\b(howto|hint|menu|hud|ui)\.[a-z0-9_.]+', txt), (nsec, nopen))
    pg.click('.howto-modal summary >> nth=2'); pg.wait_for_timeout(100)
    check('H3 se despliegan más secciones (Tus recursos: Health, Sanity, Money, Debt, Shield)', all(w in pg.inner_text('.howto-modal') for w in ['Health', 'Sanity', 'Money', 'Debt', 'Shield']))
    pg.click('.howto-modal button:has-text("SEE HANDS")'); pg.wait_for_timeout(150)
    check('H4 «Ver manos y palos» abre la guía de cartas encima de la ayuda', pg.evaluate("document.querySelectorAll('.modal-back').length") == 2)
    pg.keyboard.press('Escape'); pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
    check('H5 Escape cierra las ayudas una a una', pg.query_selector('.modal-back') is None)
    start_run(pg)
    mi = pg.inner_text('.map-info').lower()
    check('H6 el primer mapa muestra la pista del Crupier en el panel de información', 'tap a room' in mi and 'hint' in (pg.get_attribute('.map-info', 'class') or ''), mi)
    check('H7 la barra superior tiene el botón «?» y la tecla ? abre la ayuda', pg.query_selector('#hud [data-act="howto"]') is not None and (pg.keyboard.press('?') or True) and pg.wait_for_selector('.howto-modal', timeout=2000) is not None)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
    pg.click('.node.avail >> nth=0'); pg.wait_for_timeout(100)
    check('H8 al tocar un nodo, la pista deja paso a la información del nodo', 'hint' not in (pg.get_attribute('.map-info', 'class') or '') and 'tap a room' not in pg.inner_text('.map-info').lower())
    eva(pg, "G.showMap();"); pg.wait_for_timeout(200)
    check('H9 la pista del mapa no vuelve a salir', 'tap a room' not in pg.inner_text('.map-info').lower() and 'hint' not in (pg.get_attribute('.map-info', 'class') or ''))
    eva(pg, "G.debugEvent('first_chip');"); pg.wait_for_timeout(300)
    check('H10 el primer suceso muestra su pista (REJECT / ACCEPT, Health, Sanity, Debt)', pg.is_visible('.evscr .hint') and all(w in pg.inner_text('.evscr .hint') for w in ['REJECT', 'ACCEPT', 'Health', 'Sanity', 'Debt']), pg.inner_text('.evscr')[:80])
    eva(pg, "G.debugEvent('first_chip');"); pg.wait_for_timeout(300)
    check('H11 el segundo suceso ya no la muestra', pg.query_selector('.evscr .hint') is None)
    eva(pg, "G.enterMerchant({ id: 'tm', row: 2, kind: 'merchant', links: [] });"); pg.wait_for_timeout(300)
    check('H12 la primera tienda muestra su pista (préstamos suman Deuda)', pg.is_visible('.resscr .hint') and 'Debt' in pg.inner_text('.resscr .hint'))
    eva(pg, "G.enterMerchant({ id: 'tm', row: 2, kind: 'merchant', links: [] });"); pg.wait_for_timeout(300)
    check('H13 la segunda tienda ya no', pg.query_selector('.resscr .hint') is None)
    eva(pg, "G.enterRest();"); pg.wait_for_timeout(300)
    check('H14 el primer descanso muestra su pista (elige una sola cosa)', pg.is_visible('.resscr .hint') and 'one thing' in pg.inner_text('.resscr .hint'))
    eva(pg, "G.enterRest();"); pg.wait_for_timeout(300); r2 = pg.query_selector('.resscr .hint') is None
    eva(pg, "const rr = st.gs.run.map.rows; G.enterBoss(rr[rr.length - 1][0]);"); pg.wait_for_timeout(400)
    bb = pg.query_selector('.bossscr [data-primary]').bounding_box()
    check('H15 el segundo descanso ya no; el primer guardián muestra su pista y su botón JUGAR LA PARTIDA queda a la vista (1280×720)', r2 and pg.is_visible('.bossscr .hint') and bb['y'] + bb['height'] <= 720, (r2, bb))
    eva(pg, "(await import('/src/save.js')).saveGame();"); pg.reload(); pg.wait_for_selector('body[data-ready="1"]'); pg.wait_for_timeout(250)
    pg.click('[data-act="menu_continue"]'); waitview(pg, 'map'); pg.wait_for_timeout(200)
    map_ok = 'tap a room' not in pg.inner_text('.map-info').lower() and 'hint' not in (pg.get_attribute('.map-info', 'class') or '')
    eva(pg, "G.enterRest();"); pg.wait_for_timeout(300)
    check('H16 tras recargar y continuar, las pistas ya vistas no reaparecen (mapa y descanso)', map_ok and pg.query_selector('.resscr .hint') is None, map_ok)
    check('H17 sin errores JS', not pg.errs, pg.errs); ctx.close()
    ctx, pg = boot(b, locale='de-DE'); start_run(pg)
    check('H18 la pista sale en el idioma activo (alemán)', 'Tippe einen Raum an' in pg.inner_text('.map-info'), pg.inner_text('.map-info')[:60]); ctx.close()
    ctx, pg = boot(b, w=390, h=844); start_run(pg); eva(pg, "G.debugEvent('first_chip');")
    try: pg.wait_for_selector('.choices[style*="opacity: 1"]', timeout=9000)
    except Exception: pass
    bx = pg.query_selector('.choice.accept').bounding_box(); hb = pg.query_selector('.evscr .hint').bounding_box()
    check('H19 en móvil (390×844) la pista del suceso no empuja las opciones fuera de la pantalla', pg.is_visible('.evscr .hint') and bx['y'] + bx['height'] <= 844 and hb['y'] >= 0, (bx, hb)); ctx.close()

    # ---------- G. Depuración oculta ----------
    ctx, pg = boot(b)
    check('G1 sin activar, no hay panel ni API de depuración', pg.query_selector('#debug') is None and pg.evaluate('typeof window.HOUSE_DEBUG') == 'undefined')
    pg.keyboard.type('debug'); pg.wait_for_timeout(200)
    check('G2 escribir "debug" lo activa', pg.query_selector('#debug') is not None and pg.evaluate('typeof window.HOUSE_DEBUG') == 'object'); ctx.close()
    ctx, pg = boot(b, url=URL + '?debug')
    need = ['addMoney', 'addCard', 'addItem', 'setSanity', 'setDebt', 'setDestiny', 'unlockCharacter', 'unlockEnding', 'triggerEvent', 'killPlayer', 'setLanguage', 'clearCookieConsent', 'toggleMusic']
    have = pg.evaluate('Object.keys(window.HOUSE_DEBUG)'); check('G3 ?debug expone los 13 comandos (toggleAds ya no existe)', set(need) <= set(have) and 'toggleAds' not in have, (set(need) - set(have), have))
    start_run(pg)
    D = lambda code: pg.evaluate("async () => { const D = window.HOUSE_DEBUG, st = await import('/src/state.js'); " + code + "}")
    m0 = D("return st.gs.player.money"); D("D.addMoney(100)"); check('G4 addMoney(100)', D("return st.gs.player.money") == m0 + 100)
    D("D.setSanity(33)"); D("D.setDebt(77)"); D("D.setDestiny(5)")
    check('G5 setSanity / setDebt / setDestiny', D("return [st.gs.player.sanity, st.gs.player.debt, st.gs.destiny]") == [33, 77, 5])
    n0 = D("return st.gs.deck.length"); D("D.addCard('la_mujer')"); D("D.addItem('llave_hueso')")
    check('G6 addCard / addItem', D("return [st.gs.deck.length, st.gs.inventory.includes('llave_hueso')]") == [n0 + 1, True])
    D("D.unlockCharacter('girl'); D.unlockEnding('crupier')"); check('G7 unlockCharacter / unlockEnding', D("return [st.gs.discoveredCharacters.includes('girl'), st.gs.meta.endings.includes('crupier')]") == [True, True])
    m0 = D("return D.toggleMusic()"); m1 = D("return D.toggleMusic()"); check('G8 toggleMusic alterna', m0 != m1)
    D("await D.setLanguage('fr')"); check('G9 setLanguage(fr)', pg.evaluate("document.documentElement.lang") == 'fr')
    D("D.triggerEvent('first_chip')"); pg.wait_for_timeout(300); check('G10 triggerEvent muestra el evento', view(pg) == 'event', view(pg))
    D("D.killPlayer()"); pg.wait_for_timeout(300); check('G11 killPlayer lleva a la pantalla de muerte (DEUDA ACTUAL)', view(pg) == 'death' and 'DETTE ACTUELLE' in pg.inner_text('#view'), view(pg))
    check('G12 sin errores JS', not pg.errs, pg.errs); ctx.close()
    b.close()
bad = [n for n, ok in res if not ok]
print('\n%d comprobaciones, %d fallan' % (len(res), len(bad))); sys.exit(1 if bad else 0)
