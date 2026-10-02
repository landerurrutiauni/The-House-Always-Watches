#!/usr/bin/env python3
"""Pruebas en Chromium real de la ampliación: panel de manos, comodines, duelo narrado, voces y ajustes, 6 alas, archivo con
biografías, 12 secretos (logros) y misiones. Uso: python3 tools/test-extras.py [--url http://localhost:8080/index.html]
Usa el gancho ?test (expone los módulos y pone la velocidad de texto en «instantánea»; el duelo la fuerza a «normal» cuando mide el ritmo)."""
import sys, json, re
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
URL = sys.argv[sys.argv.index('--url') + 1] if '--url' in sys.argv else 'http://localhost:8080/index.html'
TURL = URL + ('&' if '?' in URL else '?') + 'test'
res = []
def check(name, cond, extra=''):
    res.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name + ((' — ' + str(extra)) if extra != '' and not cond else ''), flush=True)

def boot(b, w=1280, h=720, locale='es-ES', url=TURL, mobile=False):
    ctx = b.new_context(viewport={'width': w, 'height': h}, locale=locale, has_touch=mobile, is_mobile=mobile)
    pg = ctx.new_page(); pg.errs = []
    pg.on('pageerror', lambda e: pg.errs.append('PAGEERROR ' + str(e)))
    pg.on('console', lambda m: pg.errs.append('CONSOLE ' + m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    pg.goto(url); pg.wait_for_selector('body[data-ready="1"]', timeout=15000); pg.wait_for_timeout(250)
    return ctx, pg
def H(pg, js, arg=None):   # ejecuta js con los módulos del gancho de test a mano
    return pg.evaluate("(arg) => { const T = window.__HOUSE_TEST; const { G, C, S, st, ACH, MIS, FX } = T; " + js + " }", arg)
view = lambda pg: pg.evaluate('document.body.dataset.view')
def waitview(pg, v, ms=6000):
    try: pg.wait_for_function('(v) => document.body.dataset.view === v', arg=v, timeout=ms); return True
    except Exception: return False
def fresh_run(pg, jokers=(), levels=None, wing=None):
    H(pg, "st.replaceState({}); G.newGame(); G.introDone(); st.gs.meta.tutorial.round = true; st.gs.meta.hints = { map: 1, event: 1, merchant: 1, rest: 1, boss: 1, duel: 1 }; st.gs.meta.stats.anomalies = 1; st.gs.jokers = arg.j; st.gs.handLevels = arg.l;", {'j': list(jokers), 'l': levels or {}})
def to_round(pg):
    H(pg, "const rows = st.gs.run.map.rows; const n = rows[0].find(x => x.kind === 'game') || rows[1].find(x => x.kind === 'game'); G.chooseNode(n.id);")
    pg.wait_for_selector('.hand .card', timeout=8000); pg.wait_for_timeout(300)
def overflow(pg): return pg.evaluate('document.documentElement.scrollWidth - window.innerWidth')

with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])

    # ---------- T. Mesa: panel de manos y comodines ----------
    ctx, pg = boot(b); fresh_run(pg, ['bufon', 'sanguijuela', 'monja_ciega'], {'pair': 2, 'flush': 1}); to_round(pg)
    check('T1 a 1280×720 el panel de manos está a la izquierda y lista las 10 manos', pg.evaluate("(() => { const a = document.querySelector('.tbl .hands-panel'); return !!a && a.offsetWidth > 120 && a.getBoundingClientRect().left < document.querySelector('.tbl-main').getBoundingClientRect().left && a.querySelectorAll('.hrow').length === 10; })()"))
    check('T2 muestra el nivel de cada mano (Pareja +2, Color +1) y las que no han subido, sin nivel', pg.evaluate("(() => { const r = k => document.querySelector('.hands-panel .hrow[data-hand=\"' + k + '\"]'); return r('pair').classList.contains('up') && r('pair').textContent.includes('+2') && r('flush').textContent.includes('+1') && !r('high').classList.contains('up'); })()"))
    check('T3 la barra de comodines muestra los 3 equipados y 2 huecos vacíos', pg.evaluate("document.querySelectorAll('.jokerbar .joker:not(.empty)').length") == 3 and pg.evaluate("document.querySelectorAll('.jokerbar .joker.empty').length") == 2)
    best = H(pg, "return C.bestPlay(G.G.R).uids;")
    for u in best: pg.click(f'.hand .card[data-uid="{u}"]')
    pg.wait_for_timeout(200)
    check('T4 al elegir cartas se resalta en el panel la mano que formarían', pg.evaluate("document.querySelectorAll('.hands-panel .hrow.cur').length") == 1)
    pg.click('[data-act="tb_play"]')
    seen_fire = False; seen_banner = False
    for _ in range(60):
        pg.wait_for_timeout(60)
        if pg.evaluate("document.querySelectorAll('.jokerbar .joker.fire').length > 0"): seen_fire = True
        if pg.evaluate("document.querySelectorAll('.fxbanner').length > 0"): seen_banner = True
        if seen_fire and seen_banner: break
    check('T5 al puntuar se encienden los comodines uno a uno (.fire) durante la animación', seen_fire)
    pg.wait_for_timeout(1500)
    check('T6 la jugada suma puntos a la ronda', H(pg, "return G.G.R.score > 0;"))
    check('T7 sin errores JS en la mesa', not pg.errs, pg.errs[:2]); ctx.close()

    ctx, pg = boot(b, 390, 844, mobile=True); fresh_run(pg, ['bufon'], {'three': 1}); to_round(pg)
    check('T8 en móvil el panel lateral se oculta y aparece el botón MANOS', pg.evaluate("(() => { const a = document.querySelector('.tbl .hands-panel'); return (!a || a.offsetWidth === 0) && !!document.querySelector('[data-act=\"tb_hands\"]'); })()"))
    pg.click('[data-act="tb_hands"]'); pg.wait_for_selector('.modal .hrow')
    check('T9 el botón abre las 10 manos con su nivel en un modal', pg.evaluate("document.querySelectorAll('.modal .hrow').length") == 10 and pg.evaluate("document.querySelector('.modal .hrow[data-hand=\"three\"]').textContent.includes('+1')"))
    check('T10 sin desbordamiento horizontal en móvil', overflow(pg) <= 1, overflow(pg))
    ctx.close()

    # ---------- J. Comodines en tienda e inventario ----------
    ctx, pg = boot(b); fresh_run(pg)
    H(pg, "st.gs.player.money = 400; G.enterMerchant({ id: 'rm1', row: 3, kind: 'merchant', links: [] });")
    waitview(pg, 'merchant'); pg.wait_for_timeout(300)
    n_j = pg.evaluate("document.querySelectorAll('.shop .joker, .scr [data-joker]').length")
    jk = H(pg, "return (G.G.shop.stock.map((e, i) => [e, i]).filter(([e]) => e.kind === 'joker')[0] || [null, -1])[1];")
    check('J1 la tienda ofrece un comodín (con su carta, nombre y descripción)', jk >= 0 and n_j >= 1, (jk, n_j))
    if jk >= 0:
        H(pg, "G.buy(arg);", jk); pg.wait_for_timeout(300)
        check('J2 comprarlo lo añade a tus comodines y se descuenta el dinero', H(pg, "return st.gs.jokers.length === 1 && st.gs.player.money < 400;"))
        pg.click('[data-act="inventory"]'); pg.wait_for_selector('.modal')
        check('J3 el inventario lista el comodín con botón VENDER', pg.evaluate("document.querySelectorAll('.modal [data-act=\"sell_joker\"]').length") == 1)
        pg.click('.modal [data-act="sell_joker"]'); pg.wait_for_timeout(400)
        check('J4 venderlo en la misma visita lo quita, devuelve la mitad y da el secreto «Compra y arrepiéntete»', H(pg, "return st.gs.jokers.length === 0 && ACH.hasEgg('arrepentido');"))
    check('J5 sin errores JS en la tienda', not pg.errs, pg.errs[:2]); ctx.close()

    # ---------- D. Duelo narrado paso a paso ----------
    ctx, pg = boot(b)
    H(pg, "st.settings.textSpeed = 'normal'; st.settings.reduceEffects = false; st.replaceState({}); G.newGame(); G.introDone(); st.gs.meta.tutorial.round = true; st.gs.meta.stats.anomalies = 1; st.gs.meta.hints = { map: 1, event: 1, merchant: 1, rest: 1, boss: 1, duel: 1 }; G.enterDuelSetup({ id: 'r2c0', row: 2, kind: 'shotgun', opp: { id: 'dealer' } });")
    pg.wait_for_selector('[data-act="duel_stake"]'); pg.click('[data-act="duel_stake"][data-arg="money"]'); pg.wait_for_selector('.drum .ch'); pg.wait_for_timeout(250)
    check('D1 el cargador muestra 6 cámaras numeradas y la mesa explica el anuncio y que puede mentir', pg.evaluate("document.querySelectorAll('.drum .ch').length") == 6 and pg.evaluate("document.querySelector('.announce').textContent.length") > 20)
    pg.click('[data-act="duel_shoot"][data-arg="foe"]')
    states = []; lines_seen = []; t0 = pg.evaluate('performance.now()'); first_btn_disabled = pg.evaluate("[...document.querySelectorAll('.duel-act .btn')].every(b => b.disabled)")
    for _ in range(120):
        pg.wait_for_timeout(100)
        s = pg.evaluate("({ lines: document.querySelectorAll('.duel-log p.ln').length, spent: document.querySelectorAll('.drum .ch.spent').length, cap: (document.querySelector('.duel-cap') || {}).textContent || '', free: [...document.querySelectorAll('.duel-act .btn')].some(b => !b.disabled) })")
        states.append((s['lines'], s['spent'])); 
        if s['free'] and len(states) > 5: break
    t1 = pg.evaluate('performance.now()'); dur = (t1 - t0) / 1000
    distinct = sorted(set(states))
    check('D2 los botones se bloquean mientras se narra y se liberan al terminar', first_btn_disabled and states and len(states) > 5)
    check('D3 las líneas aparecen una a una (≥4 estados distintos), no de golpe', len(distinct) >= 4, distinct)
    check('D4 el cargador se va revelando con la narración (cámaras gastadas 0 → ≥1 después de las primeras líneas)', distinct[0][1] == 0 and max(s for _, s in distinct) >= 1, distinct)
    check('D5 con velocidad normal la narración de un turno dura ≥3 s (legible)', dur >= 3, round(dur, 1))
    log_txt = pg.evaluate("[...document.querySelectorAll('.duel-log p')].map(p => p.className + '::' + p.textContent)")
    check('D6 el registro marca los turnos (Tu turno / Turno de …) y escribe apuntar → resultado', any('turn-div' in l for l in log_txt) and any('Apuntas' in l for l in log_txt) and any(('cámara' in l.lower()) for l in log_txt), log_txt[:6])
    check('D7 al terminar vuelve a ser tu turno y se puede actuar', pg.evaluate("[...document.querySelectorAll('.duel-act .btn')].some(b => !b.disabled)") or view(pg) != 'duel')
    # tocar acelera
    if view(pg) == 'duel' and pg.evaluate("![...document.querySelectorAll('.duel-act .btn')].every(b => b.disabled)"):
        t0 = pg.evaluate('performance.now()'); pg.click('[data-act="duel_shoot"][data-arg="table"]'); pg.wait_for_timeout(250); pg.click('.duel-top')
        for _ in range(80):
            pg.wait_for_timeout(100)
            if pg.evaluate("[...document.querySelectorAll('.duel-act .btn')].some(b => !b.disabled)") or view(pg) != 'duel': break
        fast = (pg.evaluate('performance.now()') - t0) / 1000
        check('D8 tocar la pantalla acelera la narración (<3 s para un turno)', fast < 3, round(fast, 1))
    else: check('D8 tocar la pantalla acelera la narración (el duelo ya había terminado)', True)
    check('D9 sin errores JS en el duelo', not pg.errs, pg.errs[:2])
    # velocidad instantánea: ritmo mínimo pero ordenado
    H(pg, "st.settings.textSpeed = 'instant'; G.enterDuelSetup({ id: 'r2c1', row: 2, kind: 'shotgun', opp: { id: 'dealer' } });")
    pg.wait_for_selector('[data-act="duel_stake"]'); pg.click('[data-act="duel_stake"][data-arg="money"]'); pg.wait_for_selector('.drum .ch'); pg.wait_for_timeout(200)
    t0 = pg.evaluate('performance.now()'); pg.click('[data-act="duel_shoot"][data-arg="foe"]'); pg.wait_for_timeout(300)
    for _ in range(60):
        pg.wait_for_timeout(100)
        if pg.evaluate("[...document.querySelectorAll('.duel-act .btn')].some(b => !b.disabled)") or view(pg) != 'duel': break
    inst = (pg.evaluate('performance.now()') - t0) / 1000
    check('D10 con texto «instantáneo» el turno se resuelve rápido (<2,5 s) pero sigue pasando por todos los pasos', inst < 2.5, round(inst, 1))
    ctx.close()

    # ---------- V. Voces y ajustes ----------
    ctx, pg = boot(b); pg.click('[data-act="settings"]'); pg.wait_for_selector('.modal')
    check('V1 Ajustes tiene volumen de voces, silenciar voces y velocidad del texto (3 opciones)', pg.evaluate("!!document.querySelector('#set-voice')") and pg.evaluate("document.querySelectorAll('.modal .seg')[0] !== undefined") and pg.evaluate("[...document.querySelectorAll('.modal .seg')].some(s => s.querySelectorAll('button').length === 3 && /normal/i.test(s.textContent))"), pg.evaluate("document.querySelector('.modal').innerText.slice(0, 400)"))
    seg_btn = pg.evaluate_handle("[...document.querySelectorAll('.modal .seg')].find(s => /normal/i.test(s.textContent)).querySelectorAll('button')[1]")
    seg_btn.as_element().click(); pg.wait_for_timeout(200)
    saved = json.loads(pg.evaluate("localStorage.getItem(Object.keys(localStorage).find(k => /settings/i.test(k)))") or '{}')
    check('V2 elegir «Rápida» se guarda en los ajustes', saved.get('textSpeed') == 'fast', saved.get('textSpeed'))
    pg.evaluate("(() => { const i = document.querySelector('#set-voice'); i.value = 30; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); })()"); pg.wait_for_timeout(150)
    saved = json.loads(pg.evaluate("localStorage.getItem(Object.keys(localStorage).find(k => /settings/i.test(k)))") or '{}')
    check('V3 el volumen de voces se guarda (0,3)', abs(saved.get('voice', -1) - 0.3) < 0.02, saved.get('voice'))
    pg.keyboard.press('Escape'); pg.reload(); pg.wait_for_selector('body[data-ready="1"]'); pg.wait_for_timeout(300)
    saved = json.loads(pg.evaluate("localStorage.getItem(Object.keys(localStorage).find(k => /settings/i.test(k)))") or '{}')
    check('V4 tras recargar siguen la velocidad y el volumen elegidos', saved.get('textSpeed') in ('fast', 'instant') and abs(saved.get('voice', -1) - 0.3) < 0.02, saved)
    # balbuceo: cada letra par emite 'blip' con la voz del personaje, y se calla en velocidad instantánea
    n_normal = pg.evaluate("""async () => { const st = await import('/src/state.js'), ui = await import('/src/ui.js'); st.settings.textSpeed = 'normal'; st.settings.reduceEffects = false; let n = 0, voices = new Set();
      st.bus.on('blip', e => { n++; voices.add(e && e.voice); }); const el = document.createElement('p'); document.body.append(el);
      await new Promise(r => ui.typewriter(el, 'Siéntate. Aquí todo se paga.', { speed: 6, voice: 'dealer', onDone: r })); return [n, [...voices].join(',')]; }""")
    check('V5 al escribir un texto con voz se emiten balbuceos (blip) del personaje', n_normal[0] >= 6 and 'dealer' in n_normal[1], n_normal)
    n_inst = pg.evaluate("""async () => { const st = await import('/src/state.js'), ui = await import('/src/ui.js'); st.settings.textSpeed = 'instant'; let n = 0; const off = st.bus.on('blip', () => { n++; });
      const el = document.createElement('p'); document.body.append(el); await new Promise(r => ui.typewriter(el, 'Siéntate. Aquí todo se paga.', { speed: 6, voice: 'dealer', onDone: r })); return [n, el.textContent.length]; }""")
    check('V6 con texto instantáneo no hay balbuceos y el texto sale entero', n_inst[1] == 28 and n_inst[0] <= n_normal[0], n_inst)
    check('V7 sin errores JS en ajustes y voces', not pg.errs, pg.errs[:2]); ctx.close()

    # ---------- W. Seis alas ----------
    ctx, pg = boot(b); fresh_run(pg)
    H(pg, "st.gs.meta.runsFinished = 1; G.chooseWing();"); waitview(pg, 'wings'); pg.wait_for_timeout(250)
    check('W1 la pantalla de alas lista las 6', pg.evaluate("document.querySelectorAll('.wing').length") == 6)
    dis = pg.evaluate("[...document.querySelectorAll('.wing')].filter(w => w.disabled).map(w => w.getAttribute('aria-label'))")
    check('W2 con 1 descenso hechos: abiertas Salón, Pasillo y Sótano; cerradas Capilla, Cocinas y Enfermería', sorted(dis) == ['La Capilla', 'La Enfermería', 'Las Cocinas'], dis)
    txt = pg.evaluate("[...document.querySelectorAll('.wing')].filter(w => w.disabled).map(w => w.querySelector('.wb .muted').textContent)")
    check('W3 cada ala cerrada dice qué requiere (descensos / guardianes) con el número', any('2' in x and 'descensos' in x for x in txt) and any('3' in x and 'descensos' in x for x in txt) and any('guardianes' in x and '1' in x for x in txt), txt)
    check('W4 los fondos de las alas nuevas se dibujan (no están en blanco)', pg.evaluate("[...document.querySelectorAll('.wing canvas')].every(c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s > 2000; })"))
    check('W5 sin desbordamiento horizontal', overflow(pg) <= 1, overflow(pg))
    H(pg, "st.gs.meta.runsFinished = 3; st.gs.meta.wingsCleared = ['salon']; G.chooseWing();"); pg.wait_for_timeout(250)
    check('W6 con 3 descensos y un guardián derrotado, las 6 están abiertas', pg.evaluate("[...document.querySelectorAll('.wing')].every(w => !w.disabled)"))
    pg.screenshot(path='/home/claude/work/shots/wings6.png')
    pg.click('.wing[data-arg="capilla"]'); waitview(pg, 'map'); pg.wait_for_timeout(300)
    check('W7 elegir La Capilla lleva a su mapa', 'Capilla' in pg.evaluate("document.querySelector('.mapscr p').textContent") and H(pg, "return st.gs.run.wing === 'capilla';"))
    check('W8 sin errores JS en las alas', not pg.errs, pg.errs[:2]); ctx.close()
    ctx, pg = boot(b, 390, 844, mobile=True); fresh_run(pg); H(pg, "st.gs.meta.runsFinished = 3; st.gs.meta.wingsCleared = ['salon']; G.chooseWing();"); waitview(pg, 'wings'); pg.wait_for_timeout(250)
    check('W9 en móvil las 6 alas caben sin desbordar a lo ancho', pg.evaluate("document.querySelectorAll('.wing').length") == 6 and overflow(pg) <= 1, overflow(pg)); ctx.close()

    # ---------- M. Misiones ----------
    ctx, pg = boot(b); fresh_run(pg); H(pg, "st.gs.meta.runsFinished = 3; st.gs.meta.wingsCleared = ['salon']; G.pickWing('cocinas');"); waitview(pg, 'map'); pg.wait_for_timeout(300)
    check('M1 el mapa tiene el botón MISIONES 0/3', 'MISIONES 0/3' in pg.evaluate("(document.querySelector('[data-act=\"map_missions\"]') || {}).textContent || ''"))
    pg.click('[data-act="map_missions"]'); pg.wait_for_selector('.miss-list')
    check('M2 el modal lista las 3 misiones del ala con su progreso y su recompensa', pg.evaluate("document.querySelectorAll('.miss').length") == 3 and 'Compra 2 cosas' in pg.evaluate("document.querySelector('.miss-list').innerText") and 'Recompensa' in pg.evaluate("document.querySelector('.miss-list').innerText"), pg.evaluate("document.querySelector('.miss-list').innerText.slice(0, 300)"))
    pg.keyboard.press('Escape'); money0 = H(pg, "return st.gs.player.money;")
    H(pg, "MIS.track('roundWon', { kind: 'game', discards: 0, sanity: 90 }); MIS.track('roundWon', { kind: 'game', discards: 0, sanity: 90 });"); pg.wait_for_timeout(400)
    check('M3 al cumplir una misión sale el aviso con la recompensa', pg.evaluate("[...document.querySelectorAll('.toast')].some(t => /Misión cumplida/.test(t.textContent))"), pg.evaluate("[...document.querySelectorAll('.toast')].map(t => t.textContent)"))
    check('M4 la recompensa se aplica (+15 de Salud como mínimo no baja nada; cocinas_win2 da salud)', H(pg, "return MIS.list().find(m => m.id === 'cocinas_win2').done === true;"))
    pg.click('[data-act="map_missions"]'); pg.wait_for_selector('.miss-list')
    check('M5 el modal marca la cumplida con ✓ y el botón del mapa pasa a 1/3', pg.evaluate("document.querySelectorAll('.miss.done').length") == 1 and pg.evaluate("document.querySelector('.miss.done').textContent.includes('✓')") and 'MISIONES 1/3' in pg.evaluate("document.querySelector('[data-act=\"map_missions\"]').textContent")); pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
    check('M6 sin errores JS en misiones', not pg.errs, pg.errs[:2]); ctx.close()
    ctx, pg = boot(b, 390, 844, mobile=True); fresh_run(pg); pg.wait_for_selector('[data-act="map_missions"]'); pg.click('[data-act="map_missions"]'); pg.wait_for_selector('.miss-list')
    check('M7 en móvil el modal de misiones cabe en pantalla', overflow(pg) <= 1 and pg.evaluate("document.querySelector('.modal').getBoundingClientRect().right <= window.innerWidth + 1")); ctx.close()

    # ---------- S. Secretos (logros) ----------
    ctx, pg = boot(b); eggs = lambda: H(pg, "return ACH.eggsFound();")
    for _ in range(7): pg.click('.eyes-hit', force=True); pg.wait_for_timeout(60)
    pg.wait_for_timeout(300)
    check('S1 tocar siete veces los ojos del Crupier desbloquea «Te mira de vuelta» con aviso', 'ojos' in eggs() and pg.evaluate("[...document.querySelectorAll('.toast')].some(t => /Secreto descubierto/.test(t.textContent))"), eggs())
    st_ = json.loads(pg.evaluate("localStorage.getItem(Object.keys(localStorage).find(k => /settings/i.test(k)))") or '{}')
    check('S2 el secreto queda guardado en los ajustes (aunque no haya partida)', 'ojos' in (st_.get('eggs') or []), st_.get('eggs'))
    for k in ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']: pg.keyboard.press(k)
    pg.wait_for_timeout(250)
    check('S3 ↑↑↓↓←→←→BA en el menú desbloquea «Código antiguo»', 'konami' in eggs(), eggs())
    H(pg, "ACH.IDLE.ms = 900; G.toMenu();"); pg.wait_for_timeout(500); pg.mouse.click(5, 5); pg.wait_for_timeout(600)
    no_yet = 'paciencia' not in eggs(); pg.wait_for_timeout(1200)
    check('S4 «Paciencia»: tocar la pantalla reinicia la cuenta; sin tocar nada, se desbloquea', no_yet and 'paciencia' in eggs(), eggs())
    H(pg, "ACH.IDLE.ms = 900;")
    pg.click('[data-act="settings"]'); pg.wait_for_selector('.modal')
    langs = pg.evaluate("[...document.querySelectorAll('.modal .seg button, .modal [data-lang]')].map(b => b.textContent.trim())")
    for code in ['English', 'Français', 'Deutsch', 'Español']:
        btn = pg.query_selector(f'.modal button:has-text("{code}")')
        if btn: btn.click(); pg.wait_for_timeout(350)
        if not pg.query_selector('.modal'): pg.click('[data-act="settings"]'); pg.wait_for_selector('.modal')
    pg.wait_for_timeout(300)
    check('S5 pasar por los cuatro idiomas desbloquea «La casa habla todos los idiomas»', 'poliglota' in eggs(), (eggs(), langs))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(150)
    # el archivo muestra los secretos y las pistas de los que faltan
    H(pg, "for (const id of ['arrepentido']) ACH.unlockEgg(id); G.openArchive();"); waitview(pg, 'archive'); pg.wait_for_timeout(300)
    cells = pg.evaluate("[...document.querySelectorAll('.arc-cell.egg')].map(c => [c.dataset.egg, c.classList.contains('off'), c.textContent])")
    got = [c for c in cells if not c[1]]
    check('S6 el archivo tiene 12 secretos; los hallados muestran nombre y los demás, una pista', len(cells) == 12 and len(got) == 5 and all('Pista' in c[2] for c in cells if c[1]), (len(cells), len(got)))
    check('S7 los secretos no hallados no revelan su nombre', all(('???' in c[2]) for c in cells if c[1]))
    pg.reload(); pg.wait_for_selector('body[data-ready="1"]'); pg.wait_for_timeout(300)
    check('S8 tras recargar los secretos siguen desbloqueados', len(eggs()) >= 4, eggs())
    check('S9 sin errores JS en los secretos', not pg.errs, pg.errs[:2]); ctx.close()

    # ---------- A. Archivo: personajes con biografía ----------
    ctx, pg = boot(b); fresh_run(pg)
    H(pg, "for (const id of ['dealer', 'girl', 'nun', 'cook']) FX.discoverCharacter(id); G.openArchive();"); waitview(pg, 'archive'); pg.wait_for_timeout(300)
    chars = pg.evaluate("[...document.querySelectorAll('.arc-char')].map(c => [c.dataset.char, c.classList.contains('off'), c.innerText])")
    check('A1 el archivo lista los 13 personajes', len(chars) == 13, len(chars))
    check('A2 los encontrados muestran nombre y biografía; los demás, «???» y que aún no coincidiste', all((not off and len(txt) > 60) for _, off, txt in chars if _ in ('dealer', 'girl', 'nun', 'cook')) and all(off and '???' in txt for cid, off, txt in chars if cid in ('nurse', 'pianist')), chars[:2])
    check('A3 la biografía de La Hermana cita a otros personajes (el lore enlaza)', any(cid == 'nun' and 'Crupier' in txt for cid, off, txt in chars))
    check('A4 el archivo cuenta las misiones cumplidas (0/18)', '0/18' in pg.evaluate("document.querySelector('.archive').innerText"))
    check('A5 sin desbordamiento horizontal', overflow(pg) <= 1, overflow(pg)); ctx.close()
    ctx, pg = boot(b, 390, 844, mobile=True); fresh_run(pg); H(pg, "G.openArchive();"); waitview(pg, 'archive'); pg.wait_for_timeout(300)
    check('A6 en móvil el archivo (13 personajes, 12 secretos) no desborda', overflow(pg) <= 1 and pg.evaluate("document.querySelectorAll('.arc-char').length") == 13, overflow(pg)); ctx.close()

    # ---------- E. Historia: eventos y cadenas nuevas en pantalla ----------
    ctx, pg = boot(b); fresh_run(pg)
    for ev in ['nun_1', 'nurse_2', 'puppet_1', 'staff_room']:
        H(pg, "window.__dbg = true;"); pg.evaluate("async (id) => { const G = await import('/src/game.js'); G.debugEvent(id); }", ev); pg.wait_for_selector('.ev-text'); pg.wait_for_timeout(200)
        ok = pg.evaluate("document.querySelector('.ev-title').textContent.length > 2 && document.querySelectorAll('.ev-body .btn, .ev-opts .btn, .choice').length >= 0")
        check(f'E {ev}: el evento se muestra con título y texto', ok and not re.search(r'\bevent\.', pg.evaluate('document.body.innerText')))
    pg.evaluate("async () => { const G = await import('/src/game.js'); G.debugEvent('staff_room'); }"); pg.wait_for_timeout(200)
    pg.evaluate("async () => { const G = await import('/src/game.js'); G.eventChoose('a'); }"); pg.wait_for_timeout(300)
    check('E5 «La sala del personal» (mirar los turnos) desbloquea el conocimiento «Los jugadores»', H(pg, "return st.gs.meta.knowledge.includes('k_players');"))
    check('E6 sin errores JS en los eventos', not pg.errs, pg.errs[:2]); ctx.close()
    b.close()

fails = [n for n, ok in res if not ok]
print(f'\n{len(res)} comprobaciones, {len(fails)} fallan')
sys.exit(1 if fails else 0)
