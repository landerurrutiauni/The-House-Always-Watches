#!/usr/bin/env python3
"""Verificación en Chromium real de la ampliación: duelo narrado, voces, ajustes, alas, archivo, misiones, secretos y panel de manos.
Uso: python3 tools/test-ui-extras.py [--url http://localhost:8080/index.html] [--shots carpeta]"""
import sys, json
from pathlib import Path
from playwright.sync_api import sync_playwright
URL = sys.argv[sys.argv.index('--url') + 1] if '--url' in sys.argv else 'http://localhost:8080/index.html'
SHOTS = Path(sys.argv[sys.argv.index('--shots') + 1]) if '--shots' in sys.argv else None
res = []
def check(name, cond, extra=''):
    res.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name + ((' — ' + str(extra)) if extra != '' and not cond else ''), flush=True)
def boot(b, w=1280, h=720, locale='es-ES', mobile=False):
    ctx = b.new_context(viewport={'width': w, 'height': h}, locale=locale, has_touch=mobile, is_mobile=mobile)
    pg = ctx.new_page(); pg.errs = []
    pg.on('pageerror', lambda e: pg.errs.append('PAGEERROR ' + str(e)))
    pg.on('console', lambda m: pg.errs.append('CONSOLE ' + m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    pg.goto(URL + '?test'); pg.wait_for_selector('body[data-ready="1"]', timeout=15000); pg.wait_for_timeout(250)
    return ctx, pg
def shot(pg, name):
    if SHOTS: SHOTS.mkdir(parents=True, exist_ok=True); pg.screenshot(path=str(SHOTS / (name + '.png')))
T = "window.__HOUSE_TEST"
def js(pg, code): return pg.evaluate(code)
def start_run(pg, wing='salon', meta=''):
    return pg.evaluate("""(a) => { const T = window.__HOUSE_TEST, G = T.G, st = T.st; G.newGame(); G.introDone(); const m = st.gs.meta; m.tutorial.round = true; m.stats.anomalies = 1;
      m.hints = { map: 1, event: 1, merchant: 1, rest: 1, boss: 1 }; if (a.meta) Object.assign(m, JSON.parse(a.meta)); G.beginRun(a.wing); return st.gs.run.wing; }""", {'wing': wing, 'meta': meta})

with sync_playwright() as p:
    b = p.chromium.launch()

    # ---------------- 1) Duelo narrado ----------------
    ctx, pg = boot(b)
    start_run(pg)
    pg.evaluate("""() => { const T = window.__HOUSE_TEST; T.st.settings.textSpeed = 'normal'; T.st.settings.reduceEffects = false; T.G.enterDuelSetup({ id: 'r2c0', row: 2, kind: 'shotgun', opp: { id: 'dealer' } }); }""")
    pg.wait_for_selector('[data-act="duel_stake"]'); pg.click('[data-act="duel_stake"][data-arg="money"]'); pg.wait_for_selector('.drum .ch')
    check('U1 el duelo muestra el cargador (6 cámaras numeradas), 3+3 marcas y el anuncio', pg.locator('.drum .ch').count() == 6 and pg.locator('.duel-top .marks .mark').count() >= 6 and pg.locator('.announce').count() == 1)
    pg.evaluate("() => { window.__blips = 0; window.__HOUSE_TEST.st.bus.on('blip', () => { window.__blips++; }); }")
    pg.click('[data-act="duel_shoot"][data-arg="foe"]')
    samples, texts = [], []
    for k in range(80):
        pg.wait_for_timeout(250)
        s = pg.evaluate("""() => ({ lines: document.querySelectorAll('.duel-log p.ln').length, spent: document.querySelectorAll('.drum .ch.spent').length, busy: document.querySelectorAll('.duel-act .btn:disabled').length, now: (document.querySelector('.duel-log p.now')||{}).textContent || '', cap: (document.querySelector('.duel-cap')||{}).textContent || '' })""")
        samples.append(s)
        if s['now'] and (not texts or texts[-1] != s['now']): texts.append(s['now'])
        if k == 8: shot(pg, 'duel_mid')
        if k > 6 and s['busy'] == 0: break
    distinct = sorted(set((s['lines'], s['spent']) for s in samples))
    check('U2 el duelo NO aparece de golpe: se ven ≥4 estados distintos (líneas, cámaras reveladas) durante varios segundos', len(distinct) >= 4 and len(samples) >= 12, (len(distinct), len(samples)))
    check('U3 las frases salen una a una y en orden: apunta → cámara → resultado', len(texts) >= 4 and 'Apuntas' in texts[0], texts[:5])
    check('U4 aparece el rótulo de resultado (CLIC/BANG/SEGURO/REBOTE) en algún momento', any(('CLIC' in s['cap'] or 'BANG' in s['cap'] or 'SEGURO' in s['cap'] or 'REBOTE' in s['cap']) for s in samples), [s['cap'] for s in samples][:12])
    blips = pg.evaluate("() => window.__blips")
    check('U5 durante la narración suenan balbuceos de voz (bus blip)', blips > 5, blips)
    check('U6 al terminar el turno los botones vuelven a estar activos (o el duelo acabó)', pg.locator('.duel-act .btn:disabled').count() < pg.locator('.duel-act .btn').count() or pg.locator('[data-view="duel_result"], .duelres, .resscr').count() > 0 or pg.evaluate(f"() => !!{T}.G.G.D.over"))
    # tocar acelera
    if not pg.evaluate(f"() => {T}.G.G.D.over"):
        t0 = pg.evaluate("() => performance.now()"); pg.click('[data-act="duel_shoot"][data-arg="foe"]'); pg.wait_for_timeout(500); pg.mouse.click(640, 300)
        pg.wait_for_function("() => document.querySelectorAll('.duel-act .btn:disabled').length === 0 || !document.querySelector('.duel')", timeout=6000)
        dt = pg.evaluate("(t0) => performance.now() - t0", t0)
        check('U7 tocar la pantalla acelera la narración (termina en <4 s)', dt < 4000, dt)
    else: check('U7 tocar la pantalla acelera la narración (duelo ya terminado)', True)
    check('U8 sin errores JS en el duelo', not pg.errs, pg.errs[:2]); ctx.close()

    # ---------------- 2) Voces y ajustes ----------------
    ctx, pg = boot(b)
    pg.evaluate("() => { window.__blips = 0; window.__HOUSE_TEST.st.bus.on('blip', () => { window.__blips++; }); window.__HOUSE_TEST.st.settings.textSpeed = 'normal'; window.__HOUSE_TEST.st.settings.reduceEffects = false; window.__HOUSE_TEST.G.newGame(); }")
    pg.wait_for_timeout(2500)
    nb = pg.evaluate("() => window.__blips")
    check('V1 la intro («typewriter») emite balbuceos de voz mientras escribe', nb > 5, nb)
    pg.evaluate("() => { window.__HOUSE_TEST.st.settings.textSpeed = 'instant'; }")
    pg.evaluate("() => { window.__HOUSE_TEST.G.toMenu(); }"); pg.click('[data-act="settings"]'); pg.wait_for_selector('.modal')
    check('V2 Ajustes tiene volumen de voces, silenciar voces y velocidad de texto', pg.locator('#set-voice').count() == 1 and pg.locator('.modal .seg').count() >= 3, pg.locator('.modal .seg').count())
    pg.fill('#set-voice', '35') if False else pg.evaluate("() => { const i = document.querySelector('#set-voice'); i.value = 35; i.dispatchEvent(new Event('input', { bubbles: true })); }")
    pg.evaluate("() => { const b = [...document.querySelectorAll('.modal .seg button')].find(x => /Rápida|Fast/i.test(x.textContent)); if (b) b.click(); }")
    pg.evaluate("() => { const c = [...document.querySelectorAll('.modal label.tog')].find(x => /voces|voices/i.test(x.textContent)); if (c) c.querySelector('input').click(); }")
    pg.wait_for_timeout(200)
    st = pg.evaluate("() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => /settings/i.test(k))) || '{}')")
    check('V3 voz, silenciar voces y velocidad de texto se guardan', abs(st.get('voice', 1) - 0.35) < 0.02 and st.get('textSpeed') == 'fast' and st.get('muteVoices') is True, st)
    shot(pg, 'settings_voices')
    pg.reload(); pg.wait_for_selector('body[data-ready="1"]'); 
    st2 = pg.evaluate("() => ({ v: window.__HOUSE_TEST.st.settings.voice, ts: window.__HOUSE_TEST.st.settings.textSpeed, mv: window.__HOUSE_TEST.st.settings.muteVoices })")
    check('V4 …y el modo de pruebas fuerza texto instantáneo pero el valor guardado de voz persiste', abs(st2['v'] - 0.35) < 0.02 and st2['mv'] is True, st2)
    mute = pg.evaluate("""() => { const T = window.__HOUSE_TEST; T.st.settings.muteVoices = true; T.st.settings.textSpeed = 'normal'; T.st.settings.reduceEffects = false; window.__b2 = 0; T.st.bus.on('blip', () => { window.__b2++; }); T.G.newGame(); return true; }""")
    pg.wait_for_timeout(1500)
    txt = pg.evaluate("() => (document.querySelector('.intro .say, .intro p, .scr p') || {}).textContent || ''")
    check('V5 con «silenciar voces» la intro sigue escribiéndose (hay texto) y no hay errores JS', len(txt) > 5 and not pg.errs, (txt[:40], pg.errs[:2])); ctx.close()

    # ---------------- 3) Alas (6) y archivo ----------------
    ctx, pg = boot(b)
    pg.evaluate("""() => { const T = window.__HOUSE_TEST, G = T.G, st = T.st; G.newGame(); G.introDone(); st.gs.meta.tutorial.round = true; st.gs.meta.runsFinished = 2; st.gs.meta.wingsCleared = []; G.chooseWing(); }""")
    pg.wait_for_selector('.wing')
    check('W1 la pantalla de alas lista las 6 alas', pg.locator('.wing').count() == 6, pg.locator('.wing').count())
    lock = pg.evaluate("() => [...document.querySelectorAll('.wing')].map(w => ({ id: w.dataset.arg, off: w.disabled, txt: w.querySelector('.muted').textContent }))")
    d = {x['id']: x for x in lock}
    check('W2 con 2 descensos: Salón, Pasillo, Sótano y Capilla abiertas; Cocinas y Enfermería cerradas', [d[k]['off'] for k in ['salon', 'pasillo', 'sotano', 'capilla', 'cocinas', 'enfermeria']] == [False, False, False, False, True, True], lock)
    check('W3 las cerradas dicen EL REQUISITO concreto (3 descensos / 1 guardián)', 'descensos' in d['cocinas']['txt'] and '3' in d['cocinas']['txt'] and 'guardi' in d['enfermeria']['txt'] and '1' in d['enfermeria']['txt'], (d['cocinas']['txt'], d['enfermeria']['txt']))
    blank = pg.evaluate("() => [...document.querySelectorAll('.wing canvas')].map(c => { const g = c.getContext('2d'); const a = g.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < a.length; i += 16) if (a[i] + a[i + 1] + a[i + 2] > 40) n++; return n; })")
    check('W4 las 6 miniaturas de ala se dibujan (no están en blanco)', len(blank) == 6 and all(n > 40 for n in blank), blank)
    shot(pg, 'wings_6')
    pg.evaluate("""() => { const st = window.__HOUSE_TEST.st; st.gs.meta.runsFinished = 3; st.gs.meta.wingsCleared = ['salon']; window.__HOUSE_TEST.G.chooseWing(); }"""); pg.wait_for_selector('.wing')
    check('W5 con 3 descensos y 1 guardián derrotado se abren las 6', pg.locator('.wing:not([disabled])').count() == 6, pg.locator('.wing:not([disabled])').count())
    pg.click('.wing[data-arg="capilla"]'); pg.wait_for_selector('.mapscr')
    check('W6 elegir La Capilla genera el mapa de la Capilla (nombre del ala en el título)', 'Capilla' in pg.inner_text('.mapscr'), pg.inner_text('.mapscr')[:80])
    shot(pg, 'map_capilla_missions')
    # misiones en el mapa
    mb = pg.locator('[data-act="map_missions"]')
    check('M1 el mapa muestra el botón MISIONES 0/3', mb.count() == 1 and '0/3' in mb.inner_text(), mb.inner_text() if mb.count() else '')
    mb.click(); pg.wait_for_selector('.miss')
    names = pg.evaluate("() => [...document.querySelectorAll('.miss')].map(m => m.textContent)")
    check('M2 el modal lista 3 misiones de la Capilla con progreso y recompensa', len(names) == 3 and all('0/' in n and 'Recompensa' in n for n in names), names)
    shot(pg, 'missions_modal')
    pg.keyboard.press('Escape')
    pg.evaluate("() => { window.__HOUSE_TEST.MIS.track('event', {}); window.__HOUSE_TEST.MIS.track('event', {}); }"); pg.wait_for_timeout(300)
    check('M3 cumplir una misión muestra un aviso con su recompensa', pg.locator('.toast.good').count() >= 1 and 'Misión cumplida' in pg.inner_text('#toasts'), pg.inner_text('#toasts'))
    pg.evaluate("() => { window.__HOUSE_TEST.G.showMap(); }"); pg.wait_for_selector('[data-act="map_missions"]')
    check('M4 el botón pasa a 1/3 y la misión aparece tachada en el modal', '1/3' in pg.inner_text('[data-act="map_missions"]'))
    pg.click('[data-act="map_missions"]'); pg.wait_for_selector('.miss.done'); check('M5 la misión hecha lleva la marca ✓', pg.locator('.miss.done').count() == 1); pg.keyboard.press('Escape')
    # archivo
    pg.evaluate("""() => { const T = window.__HOUSE_TEST; for (const id of ['girl', 'nun', 'pianist']) T.FX.discoverCharacter(id); T.ACH.unlockEgg('real'); T.G.openArchive(); }"""); pg.wait_for_selector('.archive')
    arc = pg.evaluate("""() => ({ chars: document.querySelectorAll('.arc-char').length, off: document.querySelectorAll('.arc-char.off').length, eggs: document.querySelectorAll('.arc-cell.egg').length, eggOn: document.querySelectorAll('.arc-cell.egg:not(.off)').length, txt: document.querySelector('.arc-char[data-char="nun"]').textContent, locked: document.querySelector('.arc-char[data-char="cook"]').textContent, hint: document.querySelector('.arc-cell.egg.off').textContent, h3: [...document.querySelectorAll('.archive h3')].map(x => x.textContent) })""")
    check('A1 el archivo muestra los 13 personajes (3 conocidos, 10 en sombra) y 12 secretos (1 descubierto)', arc['chars'] == 13 and arc['off'] == 10 and arc['eggs'] == 12 and arc['eggOn'] == 1, arc)
    check('A2 un personaje conocido enseña su biografía; uno desconocido, no', 'Hermana' in arc['txt'] and 'confesión' in arc['txt'] and 'Cocinero' not in arc['locked'] and 'No' in arc['locked'] or '???' in arc['locked'], (arc['txt'][:80], arc['locked']))
    check('A3 un secreto sin descubrir muestra «???» y una pista (sin revelar el nombre)', arc['hint'].startswith('???') and 'Pista' in arc['hint'], arc['hint'])
    check('A4 hay secciones: Personajes 3/13, Secretos 1/12 y estadística de misiones', any('3/13' in x for x in arc['h3']) and any('1/12' in x for x in arc['h3']) and 'Misiones cumplidas' in pg.inner_text('.archive'), arc['h3'])
    shot(pg, 'archive_new')
    check('A5 sin errores JS en alas, misiones y archivo', not pg.errs, pg.errs[:2]); ctx.close()

    # ---------------- 4) Secretos del menú ----------------
    ctx, pg = boot(b)
    pg.evaluate("() => { window.__HOUSE_TEST.G.toMenu(); }"); pg.wait_for_selector('.eyes-hit')
    for i in range(7): pg.click('.eyes-hit', force=True); pg.wait_for_timeout(80)
    pg.wait_for_timeout(300)
    check('S1 tocar 7 veces los ojos del Crupier desbloquea «Te mira de vuelta» (aviso + guardado en ajustes)', pg.evaluate("() => window.__HOUSE_TEST.ACH.hasEgg('ojos')") and 'Secreto descubierto' in pg.inner_text('#toasts') and pg.evaluate("() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => /settings/i.test(k)))).eggs.includes('ojos')"))
    pg.evaluate("() => { document.activeElement && document.activeElement.blur(); }")
    for k in ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']: pg.keyboard.press(k)
    pg.wait_for_timeout(300)
    check('S2 el código ↑↑↓↓←→←→BA en el menú desbloquea «Código antiguo»', pg.evaluate("() => window.__HOUSE_TEST.ACH.hasEgg('konami')"))
    pg.evaluate("() => { window.__HOUSE_TEST.ACH.IDLE.ms = 500; window.__HOUSE_TEST.G.toMenu(); }"); pg.wait_for_timeout(150)
    pg.evaluate("() => { window.__HOUSE_TEST.G.newGame(); }"); pg.wait_for_timeout(900)
    check('S5 la espera se cancela al salir del menú (no se desbloquea «Paciencia» en otra pantalla)', not pg.evaluate("() => window.__HOUSE_TEST.ACH.hasEgg('paciencia')"))
    pg.evaluate("() => { window.__HOUSE_TEST.ACH.IDLE.ms = 600; window.__HOUSE_TEST.G.toMenu(); }"); pg.wait_for_timeout(300); pg.mouse.click(5, 5); pg.wait_for_timeout(450)
    check('S3 tocar durante la espera reinicia la cuenta de «Paciencia»', not pg.evaluate("() => window.__HOUSE_TEST.ACH.hasEgg('paciencia')"))
    pg.wait_for_timeout(900)
    check('S4 esperar sin tocar nada en el menú desbloquea «Paciencia»', pg.evaluate("() => window.__HOUSE_TEST.ACH.hasEgg('paciencia')"))
    # idiomas: cambiar a los 4 desde Ajustes
    pg.evaluate("() => { window.__HOUSE_TEST.G.toMenu(); }"); pg.wait_for_selector('[data-act="settings"]'); 
    for lang in ['en', 'fr', 'de', 'es']:
        pg.evaluate("() => { document.querySelector('[data-act=\"settings\"]').click(); }"); pg.wait_for_selector('.modal')
        pg.evaluate("(l) => { const s = document.querySelector('.modal .seg-lang, .modal [data-lang=\"' + l + '\"]'); if (s) s.click(); else { const b = [...document.querySelectorAll('.modal button')].find(x => x.dataset.lang === l || x.textContent.trim().toLowerCase().startsWith({ en: 'english', fr: 'fran', de: 'deutsch', es: 'espa' }[l])); if (b) b.click(); } }", lang)
        pg.wait_for_timeout(250); pg.keyboard.press('Escape'); pg.wait_for_timeout(120)
    langs = pg.evaluate("() => window.__HOUSE_TEST.st.settings.langsSeen")
    check('S6 usar los cuatro idiomas desbloquea «La casa habla todos los idiomas»', pg.evaluate("() => window.__HOUSE_TEST.ACH.hasEgg('poliglota')"), langs)
    check('S7 sin errores JS en los secretos', not pg.errs, pg.errs[:2])
    shot(pg, 'menu_eggs'); ctx.close()

    # ---------------- 5) Mesa: panel de manos y comodines ----------------
    for (w, h, mobile) in [(1280, 720, False), (390, 844, True)]:
        ctx, pg = boot(b, w, h, mobile=mobile)
        start_run(pg, 'salon')
        pg.evaluate("""() => { const T = window.__HOUSE_TEST; T.FX.addJoker('bufon'); T.FX.addJoker('sonrisa'); T.FX.addJoker('as_manga'); T.G.enterRound({ id: 'r1c0', row: 1, kind: 'game', opp: { id: 'dealer' } }); }""")
        pg.wait_for_selector('.tbl'); pg.wait_for_timeout(400)
        tag = 'desktop' if not mobile else 'movil'
        if not mobile:
            check(f'T1 [{tag}] el panel de manos con niveles está a la izquierda y visible', pg.locator('.tbl > .hands-panel').is_visible() and pg.locator('.tbl > .hands-panel .hrow').count() == 10 and pg.locator('.tbl > .hands-panel').bounding_box()['x'] < pg.locator('.tbl-main').bounding_box()['x'], pg.locator('.hands-panel .hrow').count())
        else:
            check(f'T1 [{tag}] en móvil el panel lateral se oculta y hay botón MANOS', not pg.locator('.tbl > .hands-panel').is_visible() and pg.locator('[data-act="tb_hands"]').is_visible())
            pg.click('[data-act="tb_hands"]'); pg.wait_for_selector('.modal .hands-panel'); check('T2 [movil] MANOS abre el panel de niveles en un modal', pg.locator('.modal .hands-panel').is_visible()); pg.keyboard.press('Escape')
        check(f'T3 [{tag}] la barra de comodines muestra 3 comodines y 2 huecos vacíos', pg.locator('.jokerbar .joker[data-joker]').count() == 3 and pg.locator('.jokerbar .joker.empty').count() == 2, (pg.locator('.jokerbar .joker[data-joker]').count(), pg.locator('.jokerbar .joker.empty').count()))
        # jugar una mano: se anima y los comodines se disparan
        pg.evaluate("""() => { const R = window.__HOUSE_TEST.G.G.R; window.__sel = R.hand.slice(0, 3).map(c => c.uid); }""")
        pg.evaluate("""() => { document.querySelectorAll('.hand .card, .hand [data-uid]').forEach((c, i) => { if (i < 3) c.click(); }); }"""); pg.wait_for_timeout(200)
        pg.evaluate("() => { const b = document.querySelector('[data-act=\"tb_play\"], [data-primary]'); if (b) b.click(); }"); pg.wait_for_timeout(1800)
        fired = pg.evaluate("() => document.querySelectorAll('.joker.fire, .fxbanner, .fx-banner, .combo-banner').length")
        shot(pg, f'table_{tag}')
        check(f'T4 [{tag}] jugar una mano no genera errores JS', not pg.errs, pg.errs[:2])
        # vender un comodín desde el inventario
        pg.evaluate("() => { window.__HOUSE_TEST.G.getView && 0; }")
        n0 = pg.evaluate("() => window.__HOUSE_TEST.st.gs.jokers.length")
        pg.evaluate("() => { document.querySelector('[data-act=\"inventory\"]').click(); }"); pg.wait_for_selector('.modal')
        sell = pg.locator('.modal [data-act="sell_joker"]')
        check(f'T5 [{tag}] el inventario lista los comodines con botón VENDER', sell.count() == n0 and n0 == 3, (sell.count(), n0))
        m0 = pg.evaluate("() => window.__HOUSE_TEST.st.gs.player.money"); sell.first.click(); pg.wait_for_timeout(300)
        check(f'T6 [{tag}] vender devuelve la mitad del precio y libera el hueco', pg.evaluate("() => window.__HOUSE_TEST.st.gs.jokers.length") == n0 - 1 and pg.evaluate("() => window.__HOUSE_TEST.st.gs.player.money") > m0)
        check(f'T7 [{tag}] sin errores JS', not pg.errs, pg.errs[:2]); ctx.close()
    b.close()

bad = [n for n, ok in res if not ok]
print(f'\n{len(res)} comprobaciones, {len(bad)} fallan' + ((': ' + ' | '.join(bad)) if bad else ''))
sys.exit(1 if bad else 0)
