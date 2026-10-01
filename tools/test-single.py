#!/usr/bin/env python3
"""Prueba del build de un solo archivo abierto como file:// (sin servidor). Uso: python3 tools/test-single.py [ruta/al/the-house-always-watches.html]"""
import sys, re
from urllib.parse import urlparse
from pathlib import Path
from playwright.sync_api import sync_playwright
root = Path(__file__).resolve().parent.parent
FILE = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else root / 'dist' / 'the-house-always-watches.html'
URL = FILE.as_uri()
res = []
def check(name, cond, extra=''):
    res.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name + ((' — ' + str(extra)) if not cond and extra != '' else ''), flush=True)
PROBE = """(() => { const o = AudioNode.prototype.connect; window.__peak = 0; AudioNode.prototype.connect = function (d, ...r) { const x = o.call(this, d, ...r);
  try { if (d && d.constructor && d.constructor.name === 'AudioDestinationNode' && !window.__an) { const an = this.context.createAnalyser(); an.fftSize = 2048; o.call(this, an); window.__an = an; const b = new Float32Array(2048);
    setInterval(() => { an.getFloatTimeDomainData(b); let m = 0; for (let i = 0; i < b.length; i++) m = Math.max(m, Math.abs(b[i])); window.__peak = Math.max(window.__peak, m); }, 40); } } catch (e) {} return x; }; })();"""
text = FILE.read_text(encoding='utf-8', errors='ignore')
check('S0 el HTML no contiene nada de AdSense ni de Google (adsbygoogle, googlesyndication, ca-pub, dataLayer)', not re.search(r'adsbygoogle|googlesyndication|pagead|adsense|ca-pub-|dataLayer|gtag\(', text, re.I))
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    ctx = b.new_context(viewport={'width': 1280, 'height': 720}, locale='en-US'); ctx.add_init_script(PROBE)
    pg = ctx.new_page(); reqs, errs = [], []
    pg.on('request', lambda r: reqs.append(r.url)); pg.on('requestfailed', lambda r: errs.append('REQFAIL ' + r.url))
    pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e))); pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
    pg.goto(URL + '?test'); pg.wait_for_selector('body[data-ready="1"]', timeout=15000); pg.wait_for_timeout(300)
    schemes = {urlparse(u).scheme for u in reqs}
    check('S1 abre como file:// y arranca (menú visible, sin banner ni anuncios)', pg.evaluate('document.body.dataset.view') == 'menu' and pg.query_selector('.cookie-layer') is None and pg.query_selector('.ad-slot') is None)
    check('S2 solo se piden recursos locales (file:/data:), nada de red', schemes <= {'file', 'data'}, reqs)
    check('S3 sin errores JS ni peticiones fallidas', not errs, errs)
    pg.click('[data-act="settings"]'); pg.click('.seg button[lang="de"]'); pg.wait_for_timeout(300)
    check('S4 cambio de idioma en caliente funciona sin servidor (alemán)', 'NEUES SPIEL' in pg.inner_text('#view') and pg.evaluate('document.documentElement.lang') == 'de')
    pg.keyboard.press('Escape'); pg.click('[data-act="settings"]'); pg.click('.seg button[lang="en"]'); pg.keyboard.press('Escape'); pg.wait_for_timeout(2000)
    pk = pg.evaluate('window.__peak'); check('S5 el audio produce señal real en file:// (pico > 0.001)', pk > 0.001, pk)
    pg.click('[data-act="fullscreen"][data-fs="text"]'); pg.wait_for_timeout(600)
    on = pg.evaluate('!!document.fullscreenElement'); pg.click('[data-act="fullscreen"][data-fs="text"]'); pg.wait_for_timeout(600)
    check('S6 la pantalla completa entra y sale también en file://', on and not pg.evaluate('!!document.fullscreenElement'), on)
    pg.reload(); pg.wait_for_selector('body[data-ready="1"]'); pg.wait_for_timeout(300)
    check('S7 el idioma persiste tras recargar en file://', 'NEW GAME' in pg.inner_text('#view'))
    pg.click('[data-act="menu_new"]'); pg.wait_for_selector('.intro'); pg.click('[data-act="intro_skip"]'); pg.wait_for_function('document.body.dataset.view === "map"', timeout=6000)
    pg.reload(); pg.wait_for_selector('body[data-ready="1"]'); pg.wait_for_timeout(300)
    check('S8 la partida se guarda y CONTINUAR la recupera en file://', not pg.is_disabled('[data-act="menu_continue"]')); pg.click('[data-act="menu_continue"]')
    check('S9 CONTINUAR vuelve al mapa', (pg.wait_for_function('document.body.dataset.view === "map"', timeout=6000) is not None))
    pg.goto(URL); pg.wait_for_selector('body[data-ready="1"]')
    href = pg.evaluate("[...document.querySelectorAll('.menu-foot a')].map(a => a.href)")
    check('S10 el menú enlaza a UNA sola página legal: «Privacidad y aviso»', len(href) == 1 and href[0].endswith('privacy.html'), href)
    for h in href:
        lp = ctx.new_page(); lerr = []; lp.on('pageerror', lambda e: lerr.append(str(e))); lp.goto(h); lp.wait_for_selector('#legal h1', timeout=8000)
        n = lp.evaluate("document.querySelectorAll('#legal section').length"); back = lp.evaluate("document.querySelector('a.btn').href"); txt = lp.inner_text('#legal')
        check('S11 privacy.html se pinta sin servidor (4 secciones, volver al juego), sin huecos [..], sin contacto ni menciones a AdSense/Google', n == 4 and back.endswith('the-house-always-watches.html') and not lerr and '[' not in txt and '@' not in txt and not re.search(r'adsense|google', txt, re.I), (n, back, lerr, txt[:80]))
        lp.close()
    ctx2 = b.new_context(viewport={'width': 1280, 'height': 720}, locale='en-US'); pg = ctx2.new_page(); pg.goto(URL + '?test'); pg.wait_for_selector('body[data-ready="1"]'); pg.wait_for_timeout(300)
    pg.click('#view [data-act="howto"]'); pg.wait_for_selector('.howto-modal'); nsec = pg.evaluate("document.querySelectorAll('.howto-modal details').length"); pg.keyboard.press('Escape')
    check('S12 la ayuda «Cómo se juega» funciona en el archivo único (8 secciones)', nsec == 8, nsec)
    pg.click('[data-act="menu_new"]'); pg.wait_for_selector('.intro'); pg.click('[data-act="intro_skip"]'); pg.wait_for_function('document.body.dataset.view === "map"', timeout=6000)
    check('S13 con un perfil nuevo, la pista del primer mapa aparece en el archivo único', 'tap a room' in pg.inner_text('.map-info').lower(), pg.inner_text('.map-info')[:60])
    b.close()
bad = res.count(False); print('\n%d comprobaciones, %d fallan' % (len(res), bad)); sys.exit(1 if bad else 0)
