#!/usr/bin/env python3
"""Fallos de carga de idiomas en Chromium real (inyectados con route/abort). Comprueba que, pase lo que pase con la red, la persona NUNCA ve
el nombre de una clave («menu.new») en vez del texto:
  · un fallo puntual de un archivo de idioma se reintenta y el idioma acaba cargando;
  · un idioma que no carga nunca → se muestra inglés, con un aviso, y se vuelve a intentar al elegirlo otra vez;
  · el inglés no depende de la red (viaja dentro del propio código): bloquear locales/en.json no cambia nada;
  · la página de privacidad se comporta igual (reintento, inglés de reserva con aviso, mensaje con botón «Reintentar» si no hay nada).
Uso: python3 tools/test-i18n-load.py [--url http://localhost:8080]"""
import sys, json, re, argparse
from pathlib import Path
from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser(); ap.add_argument('--url', default='http://localhost:8080'); A = ap.parse_args()
ROOT = Path(__file__).resolve().parent.parent
LOC = {l: json.load(open(ROOT / 'locales' / (l + '.json'), encoding='utf-8')) for l in ['es', 'en', 'fr', 'de', 'eu']}
NS = sorted({k.split('.')[0] for k in LOC['en']})
OBS = (ROOT / 'tools' / 'i18n-observer.js').read_text(encoding='utf-8')
res = []
def check(name, cond, extra=''):
    res.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name + ((' — ' + str(extra)) if extra != '' and not cond else ''), flush=True)

SETTINGS = lambda lang: "localStorage.setItem('thaw.settings.v1', JSON.stringify(%s))" % json.dumps({'lang': lang, 'reduceEffects': True, 'muteMusic': True, 'muteSfx': True, 'quality': 'low'})

class Net:
    """Controla qué peticiones a locales/ fallan. block[lang] = nº de peticiones que abortar (None = todas)."""
    def __init__(self): self.block = {}; self.seen = []; self.on = True
    def handler(self, route):
        m = re.search(r'/locales/([a-z]{2})\.(js|json)', route.request.url)
        l = m.group(1) if m else None
        ext = m.group(2) if m else ''
        self.seen.append((l, ext, route.request.url))
        for key in (l + '.' + ext, l):          # 'en.json' bloquea solo el JSON; 'en' bloquea el módulo y el JSON
            if key in self.block:
                n = self.block[key]
                if n is None: return route.abort()
                if n > 0: self.block[key] = n - 1; return route.abort()
        route.continue_()
    def count(self, l, ext=None): return sum(1 for x in self.seen if x[0] == l and (ext is None or x[1] == ext))

def page(b, lang, net, path='/index.html?test', observe=True, nav='en-US'):
    ctx = b.new_context(viewport={'width': 1280, 'height': 720}, locale=nav)
    ctx.add_init_script(SETTINGS(lang))
    if observe: ctx.add_init_script('window.__KEY_NS__ = ' + json.dumps(NS) + ';'); ctx.add_init_script(OBS)
    ctx.route(re.compile(r'/locales/'), net.handler)
    pg = ctx.new_page(); pg.errs = []
    pg.on('pageerror', lambda e: pg.errs.append('PAGEERROR ' + str(e)))
    pg.set_default_timeout(6000)
    pg.goto(A.url + path); return pg

def leaks(pg):
    return pg.evaluate("(() => { const a = window.__leaks ? [...window.__leaks.entries()] : []; return a; })()")
def menu_texts(pg): return pg.evaluate("[...document.querySelectorAll('#view button')].map(b => b.textContent.trim()).filter(Boolean)")
def visible_keys(pg):
    """Texto visible que parezca un nombre de clave de los espacios de nombres del juego."""
    return pg.evaluate("""(NS) => { const re = new RegExp('(^|[^A-Za-z0-9_.])((?:' + NS.join('|') + ')\\\\.[a-z0-9_]+(?:\\\\.[A-Za-z0-9_]+)*)', 'g'); const out = []; const txt = document.body.innerText || '';
        for (const m of txt.matchAll(re)) out.push(m[2]); return out; }""", NS)

with sync_playwright() as p:
    b = p.chromium.launch()

    # ---- 0. línea base: arranque normal en inglés y en español; el inglés NO se pide por red ----
    net = Net(); pg = page(b, 'en', net); pg.wait_for_selector('body[data-ready="1"]'); pg.wait_for_timeout(300)
    mt = menu_texts(pg)
    check('base: el menú en inglés tiene sus textos (NEW GAME)', LOC['en']['menu.new'] in mt, mt[:6])
    check('base: sin claves a la vista ni textos sospechosos', not visible_keys(pg) and not leaks(pg), (visible_keys(pg), leaks(pg)[:3]))
    check('base: el inglés no se pide por red (va dentro del código) → no hay peticiones a en.json', net.count('en', 'json') == 0, net.seen)
    check('base: sin errores de página', not pg.errs, pg.errs[:2])
    pg.context.close()

    # ---- 1. el inglés no depende de locales/en.json: bloquearlo por completo no cambia nada ----
    net = Net(); net.block['en.json'] = None
    pg = page(b, 'en', net); pg.wait_for_selector('body[data-ready="1"]', timeout=20000); pg.wait_for_timeout(300)
    mt = menu_texts(pg)
    check('en.json bloqueado: el menú en inglés sale con sus textos', LOC['en']['menu.new'] in mt, mt[:6])
    check('en.json bloqueado: sin claves a la vista', not visible_keys(pg) and not leaks(pg), (visible_keys(pg), leaks(pg)[:3]))
    # cambiar de idioma y volver al inglés tampoco toca la red
    pg.click('[data-act="settings"]'); pg.wait_for_selector('.modal'); pg.click('.modal button[lang="es"]'); pg.wait_for_timeout(500)
    check('en.json bloqueado: se puede pasar a español', LOC['es']['menu.new'] in menu_texts(pg), menu_texts(pg)[:5])
    pg.click('.modal button[lang="en"]'); pg.wait_for_timeout(300)
    check('en.json bloqueado: y volver a inglés (sin claves)', LOC['en']['menu.new'] in menu_texts(pg) and not visible_keys(pg), menu_texts(pg)[:5])
    pg.context.close()

    # ---- 2. fallo puntual del archivo de español al arrancar: se reintenta y carga ----
    net = Net(); net.block['es'] = 2        # el primer intento (módulo + json) falla; el segundo ya pasa
    pg = page(b, 'es', net); pg.wait_for_selector('body[data-ready="1"]', timeout=20000); pg.wait_for_timeout(300)
    mt = menu_texts(pg)
    check('es con fallo puntual: tras el reintento el menú está en español', LOC['es']['menu.new'] in mt, mt[:6])
    check('es con fallo puntual: no sale ningún aviso de error de idioma', pg.evaluate("![...document.querySelectorAll('.toast')].some(t => /Español|Spanish|español/.test(t.textContent) && /(No se pudo|Could not)/.test(t.textContent))"), pg.evaluate("[...document.querySelectorAll('.toast')].map(t => t.textContent)"))
    check('es con fallo puntual: sin claves a la vista', not visible_keys(pg) and not leaks(pg), (visible_keys(pg), leaks(pg)[:3]))
    check('es con fallo puntual: el idioma activo es es', pg.evaluate("document.documentElement.lang") == 'es')
    pg.context.close()

    # ---- 3. español bloqueado del todo: inglés de reserva con aviso; desbloquear y volver a elegirlo funciona ----
    net = Net(); net.block['es'] = None
    pg = page(b, 'es', net, nav='es-ES'); pg.wait_for_selector('body[data-ready="1"]', timeout=30000); pg.wait_for_timeout(500)
    mt = menu_texts(pg)
    check('es bloqueado: el menú sale en inglés (no en claves)', LOC['en']['menu.new'] in mt, mt[:6])
    check('es bloqueado: sin claves a la vista ni textos sospechosos', not visible_keys(pg) and not leaks(pg), (visible_keys(pg), leaks(pg)[:3]))
    check('es bloqueado: t() no ha tenido que devolver ninguna clave inexistente', pg.evaluate("window.__HOUSE_TEST.missingKeys().length") == 0)
    toasts = pg.evaluate("[...document.querySelectorAll('.toast')].map(t => t.textContent)")
    check('es bloqueado: avisa de que no pudo cargar «Español» y que se muestra inglés', any('Español' in x and 'English' in x for x in toasts), toasts)
    check('es bloqueado: <html lang> es en (se muestra inglés)', pg.evaluate("document.documentElement.lang") == 'en')
    check('es bloqueado: lo elegido se conserva (para reintentarlo en el próximo arranque)', json.loads(pg.evaluate("localStorage.getItem('thaw.settings.v1')")).get('lang') == 'es')
    check('es bloqueado: se intentó más de una vez (reintentos)', net.count('es') >= 3, net.count('es'))
    net.block.pop('es')                      # vuelve la red
    pg.click('[data-act="settings"]'); pg.wait_for_selector('.modal'); pg.click('.modal button[lang="es"]'); pg.wait_for_timeout(600)
    check('es: al elegirlo otra vez con red, carga (menú en español)', LOC['es']['menu.new'] in menu_texts(pg), menu_texts(pg)[:5])
    check('es: sin claves a la vista tras recuperarse', not visible_keys(pg) and not leaks(pg), (visible_keys(pg), leaks(pg)[:3]))
    check('es: <html lang> es es', pg.evaluate("document.documentElement.lang") == 'es')
    pg.context.close()

    # ---- 4. cambiar de idioma en caliente con el destino roto, en cada idioma ----
    for lang in ['fr', 'de', 'eu']:
        net = Net(); pg = page(b, 'en', net); pg.wait_for_selector('body[data-ready="1"]', timeout=20000); pg.wait_for_timeout(200)
        net.block[lang] = None
        pg.click('[data-act="settings"]'); pg.wait_for_selector('.modal'); pg.click(f'.modal button[lang="{lang}"]'); pg.wait_for_timeout(2600)
        check(f'{lang} roto al cambiar en caliente: se queda en inglés con aviso y sin claves',
              LOC['en']['menu.new'] in menu_texts(pg) and not visible_keys(pg) and any('Could not load' in x for x in pg.evaluate("[...document.querySelectorAll('.toast')].map(t => t.textContent)")),
              (menu_texts(pg)[:4], visible_keys(pg)))
        net.block.pop(lang); pg.click(f'.modal button[lang="{lang}"]'); pg.wait_for_timeout(600)
        check(f'{lang}: al reintentarlo con red carga', LOC[lang]['menu.new'] in menu_texts(pg), menu_texts(pg)[:4])
        pg.context.close()

    # ---- 5. página de privacidad (modular) ----
    def legal(net, lang, nav='en-US'):
        pg = page(b, lang, net, path='/legal/privacy.html', observe=False, nav=nav); pg.wait_for_selector('#legal h1', timeout=15000); pg.wait_for_timeout(200); return pg
    legal_keys = lambda pg: pg.evaluate("(document.body.innerText.match(/\\blegal\\.[a-z0-9_.]+/g) || [])")
    net = Net(); net.block['en'] = 2
    pg = legal(net, 'en'); h1 = pg.text_content('#legal h1')
    check('privacidad con fallo puntual de en.json: tras el reintento sale el texto en inglés', h1 == LOC['en']['legal.title.privacy'] and not legal_keys(pg), (h1, legal_keys(pg)))
    pg.context.close()
    net = Net(); net.block['es'] = None
    pg = legal(net, 'es', nav='es-ES'); h1 = pg.text_content('#legal h1')
    check('privacidad con es bloqueado: sale en inglés, con aviso y sin claves', h1 == LOC['en']['legal.title.privacy'] and not legal_keys(pg) and 'Español' in pg.inner_text('#legal [role="status"]'), (h1, legal_keys(pg)))
    pg.context.close()
    net = Net(); net.block['es'] = None; net.block['en'] = None
    pg = page(b, 'es', net, path='/legal/privacy.html', observe=False, nav='es-ES'); pg.wait_for_selector('#legal button', timeout=20000); pg.wait_for_timeout(200)
    body = pg.inner_text('#legal')
    check('privacidad sin ningún idioma: mensaje claro con botón Reintentar (no claves)', 'Reintentar' in body and not legal_keys(pg), body[:120])
    net.block.clear(); pg.click('#legal button'); pg.wait_for_selector('#legal h1', timeout=15000)
    check('privacidad: tras volver la red, Reintentar muestra el texto en español', pg.text_content('#legal h1') == LOC['es']['legal.title.privacy'] and not legal_keys(pg), pg.text_content('#legal h1'))
    pg.context.close()
    net = Net(); pg = legal(net, 'en')
    for l in ['es', 'fr', 'de', 'eu', 'en']:
        pg.click(f'#legal button[lang="{l}"]'); pg.wait_for_timeout(250)
        check(f'privacidad: cambiar a {l} muestra el título traducido y sin claves', pg.text_content('#legal h1') == LOC[l]['legal.title.privacy'] and not legal_keys(pg), pg.text_content('#legal h1'))
    pg.context.close()

    # ---- 6. archivo único (file://): todo va dentro; nunca se piden locales/ ----
    single = (ROOT / 'dist' / 'the-house-always-watches.html').as_uri()
    ctx = b.new_context(viewport={'width': 1280, 'height': 720}, locale='en-US'); ctx.add_init_script(SETTINGS('en'))
    reqs = []; ctx.on('request', lambda r: reqs.append(r.url))
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(single); pg.wait_for_selector('body[data-ready="1"]', timeout=20000)
    check('archivo único: el menú en inglés tiene sus textos', LOC['en']['menu.new'] in menu_texts(pg), menu_texts(pg)[:5])
    for l in ['es', 'fr', 'de', 'eu', 'en']:
        pg.click('[data-act="settings"]'); pg.wait_for_selector('.modal'); pg.click(f'.modal button[lang="{l}"]'); pg.wait_for_timeout(250); pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
        check(f'archivo único: {l} sin claves a la vista', LOC[l]['menu.new'] in menu_texts(pg) and not pg.evaluate("!!document.body.innerText.match(/\\b(menu|ui|settings|howto)\\.[a-z_]+/)"), menu_texts(pg)[:4])
    check('archivo único: no pide ningún archivo de locales/', not [u for u in reqs if '/locales/' in u], [u for u in reqs if '/locales/' in u])
    check('archivo único: sin errores de página', not errs, errs[:2])
    ctx.close()
    b.close()

bad = [n for n, ok in res if not ok]
print(f'\n{len(res) - len(bad)} bien, {len(bad)} mal')
sys.exit(1 if bad else 0)
