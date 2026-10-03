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
AUDIO_PROBE = """(() => { const o = AudioNode.prototype.connect; window.__peak = 0;
  AudioNode.prototype.connect = function (d, ...r) { const x = o.call(this, d, ...r);
    try { if (d && d.constructor && d.constructor.name === 'AudioDestinationNode' && !window.__an) { const an = this.context.createAnalyser(); an.fftSize = 2048; o.call(this, an); window.__an = an; const buf = new Float32Array(an.fftSize);
      setInterval(() => { an.getFloatTimeDomainData(buf); let m = 0; for (let i = 0; i < buf.length; i++) m = Math.max(m, Math.abs(buf[i])); window.__peak = Math.max(window.__peak, m); }, 20); } } catch (e) {}
    return x; }; })();"""

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
        s = pg.evaluate("""() => ({ lines: document.querySelectorAll('.duel-narr-lines p.ln').length, hist: document.querySelectorAll('.duel-hist .hrow-d').length, spent: document.querySelectorAll('.drum .ch.spent').length, busy: document.querySelectorAll('.duel-act .btn:disabled').length, now: (document.querySelector('.duel-narr-lines p.ln:last-child')||{}).textContent || '', cap: (document.querySelector('.duel-cap')||{}).textContent || '' })""")
        samples.append(s)
        if s['now'] and (not texts or texts[-1] != s['now']): texts.append(s['now'])
        if k == 8: shot(pg, 'duel_mid')
        if k > 6 and s['busy'] == 0: break
    distinct = sorted(set((s['lines'], s['spent'], s['hist']) for s in samples))
    check('U2 el duelo NO aparece de golpe: se ven ≥4 estados distintos (líneas, cámaras reveladas, filas del historial) durante varios segundos', len(distinct) >= 4 and len(samples) >= 12, (len(distinct), len(samples)))
    check('U3 las frases salen una a una y en orden: apunta → cámara → resultado', len(texts) >= 4 and 'Apuntas' in texts[0], texts[:5])
    check('U4 aparece el rótulo de resultado (CLIC/BANG/SEGURO/REBOTE) en algún momento', any(('CLIC' in s['cap'] or 'BANG' in s['cap'] or 'SEGURO' in s['cap'] or 'REBOTE' in s['cap']) for s in samples), [s['cap'] for s in samples][:12])
    blips = pg.evaluate("() => window.__blips")
    check('U5 durante la narración suenan balbuceos de voz (bus blip)', blips > 5, blips)
    check('U6 al terminar el turno los botones vuelven a estar activos (o el duelo acabó)', pg.locator('.duel-act .btn:disabled').count() < pg.locator('.duel-act .btn').count() or pg.locator('[data-view="duel_result"], .duelres, .resscr').count() > 0 or pg.evaluate(f"() => !!{T}.G.G.D.over"))
    # tocar acelera
    if not pg.evaluate(f"() => {T}.G.G.D.over"):
        t0 = pg.evaluate("() => performance.now()"); pg.click('[data-act="duel_shoot"][data-arg="foe"]'); pg.wait_for_timeout(500); pg.mouse.click(640, 300)
        pg.wait_for_function("() => document.querySelectorAll('.duel-act .btn:disabled').length === 0 || !document.querySelector('.duel2')", timeout=6000)
        dt = pg.evaluate("(t0) => performance.now() - t0", t0)
        check('U7 tocar la pantalla acelera la narración (termina en <4 s)', dt < 4000, dt)
    else: check('U7 tocar la pantalla acelera la narración (duelo ya terminado)', True)
    scroll = pg.evaluate("""() => { const q = s => document.querySelector(s); const ex = e => e ? e.scrollHeight - e.clientHeight : 0; return { view: ex(q('#view')), narr: ex(q('.duel-narr-lines')), narrp: ex(q('.duel-narr')), hist: ex(q('.duel-hist')), histp: ex(q('.duel-histp')), scr: ex(q('.duel2')) }; }""")
    check('U8 sin deslizar: ni la pantalla del duelo, ni la narración, ni el historial tienen scroll', all(v <= 2 for v in scroll.values()), scroll)
    rows = pg.evaluate("() => ({ rows: [...document.querySelectorAll('.duel-hist .hrow-d')].filter(r => r.querySelector('.hk') && r.querySelector('.hk').textContent).length, shots: window.__HOUSE_TEST.G.G.D.shots })")
    check('U9 el historial muestra UNA fila por cada disparo del duelo (tuyos y del rival)', rows['rows'] == rows['shots'] and rows['shots'] >= 2, rows)
    check('U10 sin errores JS en el duelo', not pg.errs, pg.errs[:2]); ctx.close()

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

    # ---------------- 2b) Audio REAL: el balbuceo suena (analizador de Web Audio) ----------------
    ctx = b.new_context(viewport={'width': 1280, 'height': 720}); ctx.add_init_script(AUDIO_PROBE); pa = ctx.new_page(); pa.errs = []
    pa.on('pageerror', lambda e: pa.errs.append(str(e)))
    pa.goto(URL + '?test'); pa.wait_for_selector('body[data-ready="1"]', timeout=15000); pa.mouse.click(10, 10); pa.wait_for_timeout(500)
    def aset(**kw):
        pa.evaluate("(kw) => { const T = window.__HOUSE_TEST; Object.assign(T.st.settings, kw); T.audio.applySettings(T.st.settings); }", kw); pa.wait_for_timeout(700)
    def apeak(code, ms=1800):
        pa.evaluate("() => { window.__peak = 0; }"); pa.evaluate(code); pa.wait_for_timeout(ms); return pa.evaluate("() => window.__peak")
    aset(muteMusic=True, muteSfx=True, ambient=0, textSpeed='normal', reduceEffects=False, muteVoices=False, voice=0.7)
    pa.evaluate("() => window.__HOUSE_TEST.G.toMenu()"); pa.wait_for_timeout(400)
    quiet = apeak("() => 0", 700); talk = apeak("() => window.__HOUSE_TEST.G.newGame()")
    check('V6 el balbuceo SUENA de verdad (pico del analizador > 0,08 con las voces al 70 %; en silencio = 0)', quiet < 0.001 and talk > 0.08, {'silencio': round(quiet, 4), 'voz': round(talk, 4)})
    aset(muteMusic=False, muteSfx=False, muteVoices=False, voice=0.7)
    sfxp = apeak("() => { window.__HOUSE_TEST.st.bus.emit('sfx', { name: 'chip' }); }", 600)
    check('V7 el balbuceo se oye al menos tan fuerte como un efecto de sonido normal (antes sonaba a la mitad)', talk >= sfxp * 0.9, {'voz': round(talk, 4), 'efecto': round(sfxp, 4)})
    aset(muteMusic=True, muteSfx=True, muteVoices=True); pa.evaluate("() => window.__HOUSE_TEST.G.toMenu()"); pa.wait_for_timeout(300)
    muted = apeak("() => window.__HOUSE_TEST.G.newGame()")
    check('V8 con «silenciar voces» el mismo texto no produce sonido', muted < 0.005, round(muted, 4))
    aset(muteVoices=False, reduceEffects=True); pa.evaluate("() => window.__HOUSE_TEST.G.toMenu()"); pa.wait_for_timeout(300)
    burst = apeak("() => window.__HOUSE_TEST.G.newGame()")
    check('V9 con «reducir efectos» (texto de golpe) el balbuceo sigue sonando como ráfaga corta', burst > 0.04, round(burst, 4))
    check('V10 sin errores JS en las pruebas de audio', not pa.errs, pa.errs[:2]); ctx.close()

    # ---------------- 2c) La GUÍA se anuncia en la introducción y en el tutorial ----------------
    ctx, pg = boot(b)
    pg.evaluate("() => { window.__HOUSE_TEST.G.newGame(); }")
    iv = pg.evaluate("() => { const T = window.__HOUSE_TEST, v = T.G.getView(); return { lines: v.lines, last: T.t(v.lines[v.lines.length - 1]) }; }")
    check('G1 la introducción (voz del Crupier) YA NO menciona la guía: 6 líneas y la última es «Siéntate…»', iv['lines'][-1] == 'intro.6' and len(iv['lines']) == 6 and 'guía' not in iv['last'].lower(), iv)
    pg.evaluate("() => { const T = window.__HOUSE_TEST; T.G.introDone(); }"); pg.wait_for_selector('.mapscr'); pg.wait_for_timeout(400)
    mh = pg.evaluate("""() => { const T = window.__HOUSE_TEST, v = T.G.getView(); return { type: v.type, hint: v.hintKey || null, text: v.hintKey ? T.t(v.hintKey) : '', pulse: !!document.querySelector('#hud [data-act="howto"].pulse') }; }""")
    check('G2 el primer mapa: la pista del Crupier no nombra la guía, pero el botón «?» late y hay un indicador del interfaz', mh['type'] == 'map' and mh['hint'] == 'hint.map' and 'guía' not in mh['text'].lower() and mh['pulse'] and pg.locator('.mapscr .sys-tip').count() == 1, mh)
    pg.evaluate("() => { const T = window.__HOUSE_TEST; T.G.chooseNode('r0c0'); }"); pg.wait_for_selector('.tbl'); pg.wait_for_timeout(400)
    tv = pg.evaluate("""() => { const T = window.__HOUSE_TEST, v = T.G.getView(); return { type: v.type, hint: v.hintKey || null, tut: !!v.tutorial, text: v.hintKey ? T.t(v.hintKey) : '', btn: !!document.querySelector('[data-act="help"].pulse') }; }""")
    check('G3 la primera mesa (tutorial): la pista no nombra la guía, el botón «? GUÍA» late y el indicador del interfaz aparece en la mesa', tv['type'] == 'round' and tv['tut'] and 'guía' not in tv['text'].lower() and tv['btn'] and pg.locator('.felt .sys-tip').count() == 1, tv)
    pg.click('[data-act="help"]'); pg.wait_for_selector('.modal')
    check('G4 pulsar «? GUÍA» abre la guía de la mesa con las 11 manos', pg.locator('.modal .help-grid dt').count() >= 11, pg.locator('.modal .help-grid dt').count())
    pg.keyboard.press('Escape'); pg.wait_for_timeout(150)
    pg.click('#hud [data-act="howto"]'); pg.wait_for_selector('.modal')
    n_sec = pg.evaluate("() => document.querySelectorAll('.modal details, .modal .howto-sec, .modal h3').length")
    check('G5 el botón «?» de arriba abre «Cómo se juega» con sus 9 secciones (incluido el Escudo)', n_sec >= 9, n_sec)
    check('G6 sin errores JS en la guía', not pg.errs, pg.errs[:2]); ctx.close()

    # ---------------- 3) Alas (6) y archivo ----------------
    ctx, pg = boot(b)
    pg.evaluate("""() => { const T = window.__HOUSE_TEST, G = T.G, st = T.st; G.newGame(); G.introDone(); st.gs.meta.tutorial.round = true; st.gs.meta.runsFinished = 2; st.gs.meta.wingsCleared = []; G.chooseWing(); }""")
    pg.wait_for_selector('.wing')
    check('W1 la pantalla de alas lista las 8 alas', pg.locator('.wing').count() == 8, pg.locator('.wing').count())
    lock = pg.evaluate("() => [...document.querySelectorAll('.wing')].map(w => ({ id: w.dataset.arg, off: w.disabled, txt: w.querySelector('.muted').textContent }))")
    d = {x['id']: x for x in lock}
    check('W2 con 2 descensos: Salón, Pasillo, Sótano y Capilla abiertas; Cocinas, Enfermería, Teatro y Vigilancia cerradas', [d[k]['off'] for k in ['salon', 'pasillo', 'sotano', 'capilla', 'cocinas', 'enfermeria', 'teatro', 'vigilancia']] == [False, False, False, False, True, True, True, True], lock)
    check('W3 las cerradas dicen EL REQUISITO concreto (3 descensos / 1 guardián)', 'descensos' in d['cocinas']['txt'] and '3' in d['cocinas']['txt'] and 'guardi' in d['enfermeria']['txt'] and '1' in d['enfermeria']['txt'], (d['cocinas']['txt'], d['enfermeria']['txt']))
    blank = pg.evaluate("() => [...document.querySelectorAll('.wing canvas')].map(c => { const g = c.getContext('2d'); const a = g.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < a.length; i += 16) if (a[i] + a[i + 1] + a[i + 2] > 40) n++; return n; })")
    check('W4 las 8 miniaturas de ala se dibujan (no están en blanco)', len(blank) == 8 and all(n > 40 for n in blank), blank)
    shot(pg, 'wings_6')
    pg.evaluate("""() => { const st = window.__HOUSE_TEST.st; st.gs.meta.runsFinished = 3; st.gs.meta.wingsCleared = ['salon', 'pasillo', 'sotano']; window.__HOUSE_TEST.G.chooseWing(); }"""); pg.wait_for_selector('.wing')
    check('W5 con 3 descensos y 3 guardianes derrotados se abren las 8', pg.locator('.wing:not([disabled])').count() == 8, pg.locator('.wing:not([disabled])').count())
    sc = pg.evaluate("() => { const q = s => document.querySelector(s); const ex = e => e ? e.scrollHeight - e.clientHeight : 0; return { view: ex(q('#view')), list: ex(q('.wing-list')) }; }")
    check('W5b la pantalla de las 8 alas cabe entera sin deslizar', all(v <= 2 for v in sc.values()), sc)
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
    pg.evaluate("""() => { const T = window.__HOUSE_TEST; for (const id of ['girl', 'nun', 'pianist', 'prompter']) T.FX.discoverCharacter(id); T.ACH.unlockEgg('real'); T.G.openArchive(); }"""); pg.wait_for_selector('.archive')
    def arc_state():
        return pg.evaluate("""() => ({ tabs: [...document.querySelectorAll('.arc-tabs [data-act="arc_tab"]')].map(b => b.dataset.arg), h3: [...document.querySelectorAll('.archive h3')].map(x => x.textContent), view: (document.querySelector('#view').scrollHeight - document.querySelector('#view').clientHeight) })""")
    st0 = arc_state()
    check('A0 el archivo se reparte en pestañas (finales, personajes, secretos, conocimiento, estadísticas) y cada una cabe sin deslizar', st0['tabs'] == ['endings', 'chars', 'eggs', 'know', 'stats'] and st0['view'] <= 2, st0)
    pg.click('[data-act="arc_tab"][data-arg="chars"]'); pg.wait_for_selector('.arc-char')
    ch = pg.evaluate("""() => ({ n: document.querySelectorAll('.arc-char').length, off: document.querySelectorAll('.arc-char.off').length, nun: (document.querySelector('.arc-char[data-char="nun"]') || {}).textContent || '', h3: document.querySelector('.archive h3').textContent, pager: !!document.querySelector('.arc-pager'), view: document.querySelector('#view').scrollHeight - document.querySelector('#view').clientHeight })""")
    check('A1 la pestaña Personajes muestra 9 por página (17 en total, 4 conocidos con sus biografías)', ch['n'] == 9 and ch['pager'] and '4/17' in ch['h3'] and ch['view'] <= 2, ch)
    check('A2 un personaje conocido enseña su biografía (La Hermana)', 'Hermana' in ch['nun'] and 'confesión' in ch['nun'], ch['nun'][:90])
    pg.click('[data-act="arc_page"][data-arg="chars:1"]'); pg.wait_for_timeout(200)
    ch2 = pg.evaluate("() => ({ n: document.querySelectorAll('.arc-char').length, locked: [...document.querySelectorAll('.arc-char.off')].map(e => e.textContent)[0] || '', view: document.querySelector('#view').scrollHeight - document.querySelector('#view').clientHeight })")
    check('A3 la 2.ª página muestra los 8 personajes restantes y los no conocidos salen como «???»', ch2['n'] == 8 and ch2['locked'].startswith('???') and ch2['view'] <= 2, ch2)
    pg.click('[data-act="arc_tab"][data-arg="eggs"]'); pg.wait_for_selector('.arc-cell.egg')
    eg = pg.evaluate("""() => ({ n: document.querySelectorAll('.arc-cell.egg').length, on: document.querySelectorAll('.arc-cell.egg:not(.off)').length, hint: (document.querySelector('.arc-cell.egg.off') || {}).textContent || '', h3: document.querySelector('.archive h3').textContent, view: document.querySelector('#view').scrollHeight - document.querySelector('#view').clientHeight })""")
    check('A4 Secretos: 12 casillas, 1 descubierta; las demás «???» con pista, sin revelar el nombre; sin deslizar', eg['n'] == 12 and eg['on'] == 1 and eg['hint'].startswith('???') and 'Pista' in eg['hint'] and '1/12' in eg['h3'] and eg['view'] <= 2, eg)
    pg.click('[data-act="arc_tab"][data-arg="stats"]'); pg.wait_for_timeout(150)
    check('A4b la pestaña Estadísticas incluye las misiones cumplidas', 'Misiones cumplidas' in pg.inner_text('.archive'), pg.inner_text('.archive')[:120])
    pg.click('[data-act="arc_tab"][data-arg="know"]'); pg.wait_for_timeout(150)
    kn = pg.evaluate("() => ({ pager: !!document.querySelector('.arc-pager'), view: document.querySelector('#view').scrollHeight - document.querySelector('#view').clientHeight })")
    check('A4c Conocimiento (22 piezas) va paginado y cabe sin deslizar', kn['pager'] and kn['view'] <= 2, kn)
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
    for lang in ['en', 'fr', 'de', 'eu', 'es']:
        pg.evaluate("() => { document.querySelector('[data-act=\"settings\"]').click(); }"); pg.wait_for_selector('.modal')
        pg.evaluate("(l) => { const s = document.querySelector('.modal .seg-lang, .modal [data-lang=\"' + l + '\"]'); if (s) s.click(); else { const b = [...document.querySelectorAll('.modal button')].find(x => x.dataset.lang === l || x.textContent.trim().toLowerCase().startsWith({ en: 'english', fr: 'fran', de: 'deutsch', eu: 'euskara', es: 'espa' }[l])); if (b) b.click(); } }", lang)
        pg.wait_for_timeout(250); pg.keyboard.press('Escape'); pg.wait_for_timeout(120)
    langs = pg.evaluate("() => window.__HOUSE_TEST.st.settings.langsSeen")
    check('S6 usar los cinco idiomas (con el euskera) desbloquea «La casa habla todos los idiomas»', pg.evaluate("() => window.__HOUSE_TEST.ACH.hasEgg('poliglota')"), langs)
    check('S7 sin errores JS en los secretos', not pg.errs, pg.errs[:2])
    shot(pg, 'menu_eggs'); ctx.close()

    # ---------------- 5) Mesa: panel de manos, comodines, banners apilados, escudo ----------------
    ctx, pg = boot(b, 1280, 720)
    start_run(pg, 'salon')
    pg.evaluate("""() => { const T = window.__HOUSE_TEST; T.FX.addJoker('bufon'); T.FX.addJoker('sonrisa'); T.FX.addJoker('as_manga'); T.G.enterRound({ id: 'r1c0', row: 1, kind: 'game', opp: { id: 'dealer' } }); }""")
    pg.wait_for_selector('.tbl'); pg.wait_for_timeout(400)
    check('T1 el panel de manos (11 manos, con la escalera real) está a la izquierda y visible', pg.locator('.tbl > .hands-panel').is_visible() and pg.locator('.tbl > .hands-panel .hrow').count() == 11 and pg.locator('.tbl > .hands-panel').bounding_box()['x'] < pg.locator('.tbl-main').bounding_box()['x'], pg.locator('.hands-panel .hrow').count())
    check('T1b «Escalera real» aparece en el panel como mano propia, distinta de «Escalera de color»', pg.locator('.hrow[data-hand="royal"]').count() == 1 and pg.locator('.hrow[data-hand="sflush"]').count() == 1 and 'real' in pg.inner_text('.hrow[data-hand="royal"]').lower() and 'real' not in pg.inner_text('.hrow[data-hand="sflush"]').lower())
    check('T3 la barra de comodines muestra 3 comodines y 2 huecos vacíos', pg.locator('.jokerbar .joker[data-joker]').count() == 3 and pg.locator('.jokerbar .joker.empty').count() == 2, (pg.locator('.jokerbar .joker[data-joker]').count(), pg.locator('.jokerbar .joker.empty').count()))
    pg.hover('.shieldchip'); pg.wait_for_timeout(150); sht = pg.evaluate("() => { const p = document.querySelector('.tip-pop'); return p && !p.hidden ? p.textContent : ''; }")
    check('T3b el ESCUDO tiene un indicador permanente en la mesa con su explicación (al pasar el ratón)', pg.locator('.shieldchip').count() == 1 and len(sht) > 40, sht)
    # banners de combo: dos a la vez no se superponen
    pg.evaluate("() => { const f = window.__HOUSE_TEST.FXV || null; }")
    pg.evaluate("""async () => { const { fx } = await import('/src/fx.js'); fx.banner('LA MIRADA', 1); fx.banner('ESCALERA REAL', 3); fx.banner('CERRADURA', 1); }""")
    pg.wait_for_timeout(250)
    bb = pg.evaluate("() => [...document.querySelectorAll('#banners .fxbanner')].map(e => { const r = e.getBoundingClientRect(); return { t: e.textContent, top: Math.round(r.top), bottom: Math.round(r.bottom) }; })")
    ov = [(bb[k]['t'], bb[k + 1]['t']) for k in range(len(bb) - 1) if bb[k]['bottom'] > bb[k + 1]['top'] + 1]
    check('T4 tres banners de combo a la vez se APILAN en columna: ninguno se superpone con otro', len(bb) == 3 and not ov, (bb, ov))
    pg.wait_for_timeout(1600)
    # jugar una escalera real de verdad: banner propio y nombre propio
    pg.evaluate("""async () => { const T = window.__HOUSE_TEST, R = T.G.G.R; const { makeCard } = await import('/src/cards.js');
      const cs = ['eye_10', 'eye_11', 'eye_12', 'eye_13', 'eye_01'].map(i => makeCard(i)); R.hand = cs.concat(R.hand.slice(5)); R.pocket = []; T.G.roundView(); window.__royal = cs.map(c => c.uid); }""")
    pg.wait_for_selector('.hand .card'); pg.wait_for_timeout(300)
    for i in range(5): pg.evaluate("(i) => document.querySelectorAll('.hand .card')[i].click()", i)   # cada clic repinta la mano: se vuelve a consultar el DOM
    pg.wait_for_timeout(250)
    tk = pg.inner_text('.ticker')
    check('T5 la vista previa de 10-J-Q-K-A del mismo palo dice «Escalera real» (no «Escalera de color»)', 'real' in tk.lower() and 'color' not in tk.lower(), tk)
    pg.evaluate("() => { document.querySelector('[data-act=\"tb_play\"]').click(); }"); pg.wait_for_timeout(2600)
    check('T5b al jugarla se concede el secreto «Escalera real» y no hay errores JS', pg.evaluate("() => window.__HOUSE_TEST.ACH.hasEgg('real')") and not pg.errs, pg.errs[:2])
    shot(pg, 'table_desktop')
    # vender un comodín desde el inventario
    n0 = pg.evaluate("() => window.__HOUSE_TEST.st.gs.jokers.length")
    pg.evaluate("() => { window.__HOUSE_TEST.G.roundView && 0; document.querySelector('[data-act=\"inventory\"]').click(); }"); pg.wait_for_selector('.modal')
    sell = pg.locator('.modal [data-act="sell_joker"]')
    check('T6 el inventario lista los comodines con botón VENDER', sell.count() == n0 and n0 == 3, (sell.count(), n0))
    m0 = pg.evaluate("() => window.__HOUSE_TEST.st.gs.player.money"); sell.first.click(); pg.wait_for_timeout(300)
    check('T7 vender devuelve la mitad del precio y libera el hueco', pg.evaluate("() => window.__HOUSE_TEST.st.gs.jokers.length") == n0 - 1 and pg.evaluate("() => window.__HOUSE_TEST.st.gs.player.money") > m0)
    check('T8 sin errores JS en la mesa', not pg.errs, pg.errs[:2]); ctx.close()

    # ---------------- 6) ESCENARIO FIJO: la disposición no cambia con el tamaño de la ventana ----------------
    LAY = """() => { const st = document.querySelector('#stage').getBoundingClientRect(), k = st.width / 1280; const r = e => { const q = document.querySelector(e); if (!q) return null; const b = q.getBoundingClientRect(); return [Math.round((b.left - st.left) / k), Math.round((b.top - st.top) / k), Math.round(b.width / k), Math.round(b.height / k)]; };
      return { k: Math.round(k * 1000) / 1000, hands: r('.hands-panel'), main: r('.tbl-main'), opp: r('.opp'), felt: r('.felt'), hand: r('.hand'), ctrl: r('.ctrl'), hud: r('#hud'), jokers: r('.jokerbar'), view: document.querySelector('#view').scrollHeight - document.querySelector('#view').clientHeight }; }"""
    layouts = {}
    for (w, h, mobile) in [(1280, 720, False), (1920, 1080, False), (1024, 768, False), (800, 600, False), (844, 390, True), (2560, 1440, False)]:
        ctx, pg = boot(b, w, h, mobile=mobile)
        start_run(pg, 'salon'); pg.evaluate("""() => { const T = window.__HOUSE_TEST; T.FX.addJoker('bufon'); T.G.enterRound({ id: 'r1c0', row: 1, kind: 'game', opp: { id: 'dealer', rule: ['mist'] } }); }"""); pg.wait_for_selector('.tbl'); pg.wait_for_timeout(500)
        layouts[(w, h)] = pg.evaluate(LAY); shot(pg, f'stage_{w}x{h}'); ctx.close()
    base = layouts[(1280, 720)]
    diffs = {f'{w}x{h}': {k: v for k, v in L.items() if k not in ('k',) and v != base[k]} for (w, h), L in layouts.items() if {k: v for k, v in L.items() if k not in ('k',) and v != base[k]}}
    check('E1 la mesa tiene EXACTAMENTE la misma disposición (en px del escenario) a 1280×720, 1920×1080, 1024×768, 800×600, 2560×1440 y en un móvil horizontal 844×390', not diffs, diffs)
    check('E2 el escenario se escala entero a cada ventana (k = min(ancho/1280, alto/720))', all(abs(L['k'] - min(w / 1280, h / 720)) < 0.01 for (w, h), L in layouts.items()), {k: v['k'] for k, v in layouts.items()})
    check('E3 la mesa no necesita deslizar en ninguno de esos tamaños', all(L['view'] <= 2 for L in layouts.values()), {k: v['view'] for k, v in layouts.items()})
    # móvil en vertical: aviso de girar y escenario girado
    ctx, pg = boot(b, 390, 844, mobile=True)
    ov_on = pg.evaluate("() => !document.querySelector('#rotate-ov').hidden")
    check('E4 un móvil en vertical muestra el aviso de girar el dispositivo (con botón para jugar en vertical)', ov_on and pg.locator('#rot-play').count() == 1, ov_on)
    pg.click('#rot-play'); pg.wait_for_timeout(300)
    rb = pg.evaluate("() => { const r = document.querySelector('#stage').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), hidden: document.querySelector('#rotate-ov').hidden, rot: document.documentElement.classList.contains('rotated') }; }")
    check('E5 «JUGAR EN VERTICAL» gira el escenario 90° y lo ajusta a la pantalla (390 de ancho)', rb['hidden'] and rb['rot'] and rb['w'] <= 391 and rb['h'] <= 845, rb)
    pg.evaluate("() => { window.__HOUSE_TEST.G.toMenu(); }"); pg.wait_for_selector('[data-act="newgame"], [data-act="new_game"], .menu'); 
    r2 = pg.evaluate("() => { const b = document.querySelector('.menu .btn'); const r = b.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const el = document.elementFromPoint(x, y); return { inside: x > 0 && x < innerWidth && y > 0 && y < innerHeight, hit: !!el && (el === b || b.contains(el)) }; }")
    check('E6 con el escenario girado los botones siguen siendo pulsables en su sitio (el clic cae donde se ve)', r2['inside'] and r2['hit'], r2)
    check('E7 sin errores JS con el escenario girado', not pg.errs, pg.errs[:2]); ctx.close()
    b.close()

bad = [n for n, ok in res if not ok]
print(f'\n{len(res)} comprobaciones, {len(bad)} fallan' + ((': ' + ' | '.join(bad)) if bad else ''))
sys.exit(1 if bad else 0)
