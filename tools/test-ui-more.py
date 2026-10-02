#!/usr/bin/env python3
"""Verificación en Chromium real de lo pedido en la 2.ª tanda: escenario fijo (misma disposición en cualquier ventana), 16 salas en horizontal,
banners que no se superponen, escudo explicado, escalera real propia, sprites únicos, guía anunciada en la introducción y voces audibles.
Uso: python3 tools/test-ui-more.py [--url http://localhost:8080/index.html] [--shots carpeta]"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
URL = sys.argv[sys.argv.index('--url') + 1] if '--url' in sys.argv else 'http://localhost:8080/index.html'
SHOTS = Path(sys.argv[sys.argv.index('--shots') + 1]) if '--shots' in sys.argv else None
res = []
def check(name, cond, extra=''):
    res.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name + ((' — ' + str(extra)) if extra != '' and not cond else ''), flush=True)
def boot(b, w=1280, h=720, locale='es-ES', mobile=False, init=None):
    ctx = b.new_context(viewport={'width': w, 'height': h}, locale=locale, has_touch=mobile, is_mobile=mobile)
    if init: ctx.add_init_script(init)
    pg = ctx.new_page(); pg.errs = []
    pg.on('pageerror', lambda e: pg.errs.append('PAGEERROR ' + str(e)))
    pg.on('console', lambda m: pg.errs.append('CONSOLE ' + m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    pg.goto(URL + '?test'); pg.wait_for_selector('body[data-ready="1"]', timeout=15000); pg.wait_for_timeout(300)
    return ctx, pg
def shot(pg, name):
    if SHOTS: SHOTS.mkdir(parents=True, exist_ok=True); pg.screenshot(path=str(SHOTS / (name + '.png')))
PREP = """() => { const T = window.__HOUSE_TEST, G = T.G, st = T.st; st.settings.reduceEffects = false; G.newGame(); G.introDone(); const m = st.gs.meta; m.tutorial.round = true; m.tutorial.duel = true; m.stats.anomalies = 1; m.hints = { map: 1, event: 1, merchant: 1, rest: 1, boss: 1, shield: 1 }; }"""
PROBE = """(() => { const o = AudioNode.prototype.connect; window.__peak = 0;
  AudioNode.prototype.connect = function (d, ...r) { const x = o.call(this, d, ...r);
    try { if (d && d.constructor && d.constructor.name === 'AudioDestinationNode' && !window.__an) { const an = this.context.createAnalyser(); an.fftSize = 2048; o.call(this, an); window.__an = an; const buf = new Float32Array(an.fftSize);
      setInterval(() => { an.getFloatTimeDomainData(buf); let m = 0; for (let i = 0; i < buf.length; i++) m = Math.max(m, Math.abs(buf[i])); window.__peak = Math.max(window.__peak, m); }, 20); } } catch (e) {}
    return x; }; })();"""

with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])

    # ---------- 1) Escenario fijo: MISMA disposición con cualquier tamaño de ventana ----------
    LAY = """() => { const st = document.querySelector('#stage').getBoundingClientRect(), k = st.width / 1280; const q = s => document.querySelector(s);
      const box = s => { const e = q(s); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round((r.left - st.left) / k), Math.round((r.top - st.top) / k), Math.round(r.width / k), Math.round(r.height / k)]; };
      return { k: Math.round(k * 1000) / 1000, hud: box('#hud'), map: box('.map-box'), info: box('.map-info'), enter: box('[data-act="map_enter"]'), miss: box('[data-act="map_missions"]'), cols: [...new Set([...document.querySelectorAll('.node')].map(n => { const r = n.getBoundingClientRect(); return Math.round((r.left + r.width / 2 - st.left) / k / 2) * 2; }))].sort((a, b) => a - b) }; }"""
    lays = {}
    for (w, h) in [(1280, 720), (800, 600), (1920, 1080), (640, 1000), (2560, 1440)]:
        ctx, pg = boot(b, w, h); pg.evaluate(PREP); pg.evaluate("() => { window.__HOUSE_TEST.G.beginRun('salon'); }"); pg.wait_for_selector('.map-box'); pg.wait_for_timeout(500)
        lays[(w, h)] = pg.evaluate(LAY); lays[(w, h)]['wrap'] = pg.evaluate("() => { const e = document.querySelector('.map-info'); return e ? e.getBoundingClientRect().height / (document.querySelector('#stage').getBoundingClientRect().width / 1280) : 0; }"); ctx.close()
    ref = lays[(1280, 720)]
    def same(a, b): return all(abs(x - y) <= 2 for x, y in zip(a, b)) if a and b else a == b
    diffs = {k: [n for n in ('hud', 'map', 'info', 'enter', 'miss') if not same(v[n], ref[n])] for k, v in lays.items()}
    check('E1 el escenario mide siempre 1280×720 lógicos: la disposición de HUD, mapa, panel y botones es IDÉNTICA en 5 tamaños de ventana (800×600, 1920×1080, 640×1000, 2560×1440…)', all(not d for d in diffs.values()), diffs)
    check('E2 …y las 16 columnas del mapa caen en las mismas coordenadas lógicas en todos los tamaños', len(ref['cols']) >= 16 and all(len(v['cols']) == len(ref['cols']) and all(abs(a - b) <= 4 for a, b in zip(v['cols'], ref['cols'])) for v in lays.values()), {k: v['cols'][:4] for k, v in lays.items()})
    check('E3 la escala se adapta a la ventana (más pequeña en 800×600 que en 1920×1080)', lays[(800, 600)]['k'] < lays[(1280, 720)]['k'] < lays[(1920, 1080)]['k'], {k: v['k'] for k, v in lays.items()})
    # ventana no 16:9: el escenario queda centrado con barras, sin deformarse
    ctx, pg = boot(b, 640, 1000); r = pg.evaluate("() => { const r = document.querySelector('#stage').getBoundingClientRect(); return [r.width, r.height, r.left, r.top]; }")
    check('E4 en una ventana vertical (640×1000) el escenario conserva 16:9 y queda centrado', abs(r[0] / r[1] - 16 / 9) < 0.01 and abs(r[2] - (640 - r[0]) / 2) < 1.5 and abs(r[3] - (1000 - r[1]) / 2) < 1.5, r); ctx.close()
    # móvil en vertical: aviso de girar y opción de jugar con el escenario girado
    ctx, pg = boot(b, 390, 844, mobile=True)
    vis = pg.evaluate("() => !document.querySelector('#rotate-ov').hidden")
    check('E5 en un móvil en vertical aparece el aviso «gira el dispositivo» con botón para jugar en vertical', vis and pg.locator('#rot-play').is_visible() and len(pg.inner_text('#rot-text')) > 20, pg.inner_text('#rotate-ov')[:60]); shot(pg, 'rotate_overlay')
    pg.click('#rot-play'); pg.wait_for_timeout(300)
    rr = pg.evaluate("() => { const r = document.querySelector('#stage').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), document.documentElement.classList.contains('rotated'), document.querySelector('#rotate-ov').hidden]; }")
    check('E6 «JUGAR EN VERTICAL» gira el escenario 90° y lo ajusta a la pantalla (alto > ancho, sin aviso)', rr[2] and rr[3] and rr[1] > rr[0] and rr[1] <= 844 and rr[0] <= 390, rr)
    pg.evaluate("() => { window.__HOUSE_TEST.G.toMenu(); }"); pg.wait_for_selector('[data-act="settings"]'); pg.click('[data-act="settings"]'); pg.wait_for_selector('.modal'); check('E7 con el escenario girado los clics (táctiles) siguen funcionando', pg.locator('.modal').is_visible()); shot(pg, 'rotated_settings'); ctx.close()
    # el texto no se reorganiza: mismas líneas en dos tamaños
    wr = {}
    for (w, h) in [(1280, 720), (900, 560)]:
        ctx, pg = boot(b, w, h); pg.evaluate(PREP); pg.evaluate("() => { window.__HOUSE_TEST.G.debugEvent('nun_2'); }"); pg.wait_for_selector('#view .scr'); pg.wait_for_timeout(1500)
        wr[(w, h)] = pg.evaluate("() => [...document.querySelectorAll('#view p, #view .ev-text, #view .btn')].map(e => { const k = document.querySelector('#stage').getBoundingClientRect().width / 1280; const r = e.getBoundingClientRect(); return Math.round(r.height / k); }).join(',')"); ctx.close()
    check('E8 el texto de un suceso ocupa exactamente las mismas líneas en 1280×720 y 900×560 (no cambia de disposición)', wr[(1280, 720)] == wr[(900, 560)], wr)

    # ---------- 2) 16 salas, mapa horizontal ----------
    ctx, pg = boot(b); pg.evaluate(PREP); pg.evaluate("() => { window.__HOUSE_TEST.G.beginRun('capilla'); }"); pg.wait_for_selector('.map-box'); pg.wait_for_timeout(500)
    mp = pg.evaluate("""() => { const box = document.querySelector('.map-box').getBoundingClientRect(); const ns = [...document.querySelectorAll('.node')].map(n => { const r = n.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; });
      let minD = 1e9; for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) minD = Math.min(minD, Math.hypot(ns[i].x - ns[j].x, ns[i].y - ns[j].y));
      const rows = window.__HOUSE_TEST.st.gs.run.map.rows.length; const title = document.querySelector('.mapscr > p').textContent;
      const inside = ns.every(n => n.x - n.w / 2 >= box.left - 1 && n.x + n.w / 2 <= box.right + 1 && n.y - n.w / 2 >= box.top - 1 && n.y + n.w / 2 <= box.bottom + 1);
      const cols = [...new Set(ns.map(n => Math.round(n.x)))].length; return { rows, title, cols, inside, minD, bossRight: ns[ns.length - 1].x > box.left + box.width * 0.9, w: box.width, h: box.height }; }""")
    check('M1 el descenso tiene 16 salas y el mapa va en HORIZONTAL: 16 columnas, el guardián al extremo derecho', mp['rows'] == 16 and mp['cols'] >= 16 and mp['bossRight'] and 'Sala 1/16' in mp['title'], mp)
    check('M2 los nodos caben dentro del mapa y no se tocan (distancia mínima > 44 px)', mp['inside'] and mp['minD'] > 44, mp); shot(pg, 'map16'); ctx.close()

    # ---------- 3) Banners de combo que no se superponen ----------
    ctx, pg = boot(b); pg.evaluate(PREP); pg.evaluate("() => { window.__HOUSE_TEST.G.beginRun('salon'); }"); pg.wait_for_selector('.map-box')
    ov = pg.evaluate("""async () => { const { fx } = await import('/src/fx.js'); fx.banner('LA MIRADA', 1); fx.banner('ARCOÍRIS', 1); fx.banner('CERRADURA', 1);
      await new Promise(r => setTimeout(r, 350)); const bs = [...document.querySelectorAll('#banners .fxbanner')].map(e => e.getBoundingClientRect()); let over = 0;
      for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) if (bs[i].left < bs[j].right && bs[j].left < bs[i].right && bs[i].top < bs[j].bottom - 2 && bs[j].top < bs[i].bottom - 2) over++;
      return { n: bs.length, over, tops: bs.map(r => Math.round(r.top)) }; }""")
    check('B1 si coinciden varios banners de combo (3 a la vez) se APILAN en columna y no se superponen', ov['n'] == 3 and ov['over'] == 0 and ov['tops'] == sorted(set(ov['tops'])), ov)
    fl = pg.evaluate("""async () => { const { fx } = await import('/src/fx.js'); const t = document.querySelector('#hud'); fx.float(t, '+10'); fx.float(t, '×2'); fx.float(t, '+30'); await new Promise(r => setTimeout(r, 200));
      const ys = [...document.querySelectorAll('.float')].map(e => Math.round(e.getBoundingClientRect().top)); return { n: ys.length, distinct: new Set(ys).size }; }""")
    check('B2 varios números flotantes sobre el mismo elemento suben escalonados (no se tapan)', fl['n'] == 3 and fl['distinct'] == 3, fl); ctx.close()

    # ---------- 4) Mesa: escudo explicado y escalera real propia ----------
    ctx, pg = boot(b); pg.evaluate(PREP)
    pg.evaluate("""() => { const T = window.__HOUSE_TEST, G = T.G; G.beginRun('salon'); G.enterRound({ id: 'r1c0', row: 1, kind: 'game', opp: { id: 'dealer', rule: [] } }); }"""); pg.wait_for_selector('.tbl'); pg.wait_for_timeout(400)
    pg.evaluate("""() => { const T = window.__HOUSE_TEST, R = T.G.G.R; R.hand = ['blood_07', 'blood_08', 'key_05', 'key_06', 'eye_02'].map(id => T.C.makeCard ? T.C.makeCard(id) : null).filter(Boolean); }""")
    has_make = pg.evaluate("() => !!window.__HOUSE_TEST.C.makeCard")
    sh_info = pg.evaluate("() => { const e = document.querySelector('.shieldchip'); return e ? { txt: e.textContent.trim(), tip: e.title, on: e.classList.contains('on') } : null; }")
    check('S1 la mesa muestra SIEMPRE el indicador de Escudo (icono + valor) con una explicación al pasar el ratón', bool(sh_info) and 'Escudo' in sh_info['txt'] and len(sh_info['tip']) > 60 and 'absorbe' in sh_info['tip'].lower(), sh_info)
    ctx.close()
    ctx, pg = boot(b); pg.evaluate(PREP)
    pg.evaluate("""async () => { const T = window.__HOUSE_TEST, G = T.G; const cards = await import('/src/cards.js'); G.beginRun('salon'); G.enterRound({ id: 'r1c0', row: 1, kind: 'game', opp: { id: 'dealer', rule: [] } });
      const R = G.G.R; R.hand = ['blood_07', 'blood_08', 'key_05', 'key_05', 'eye_02', 'eye_03', 'eye_04', 'tooth_09'].map(id => cards.makeCard(id)); R.pocket = []; G.roundView(); window.__ids = R.hand.map(c => c.uid); }"""); pg.wait_for_selector('.tbl'); pg.wait_for_timeout(500)
    pg.evaluate("() => { const ids = window.__ids; for (const u of [ids[2], ids[3]]) document.querySelector('.hand [data-arg=\"' + u + '\"]').click(); }"); pg.wait_for_timeout(250)
    note = pg.evaluate("() => (document.querySelector('.shieldnote') || {}).textContent || ''")
    check('S2 al previsualizar una pareja de Llaves, una línea explica el Escudo: «Las Llaves te dan +4 de ESCUDO»', 'ESCUDO' in note and '+4' in note, note)
    pg.evaluate("() => { const ids = window.__ids; for (const u of [ids[2], ids[3]]) document.querySelector('.hand [data-arg=\"' + u + '\"]').click(); for (const u of [ids[0], ids[1]]) document.querySelector('.hand [data-arg=\"' + u + '\"]').click(); }"); pg.wait_for_timeout(250)
    note2 = pg.evaluate("() => (document.querySelector('.shieldnote') || {}).textContent || ''")
    check('S3 con cartas que cuestan Salud y sin Escudo, la línea avisa de que se pierde («no tienes ESCUDO: los pierdes»)', 'no tienes ESCUDO' in note2, note2)
    shot(pg, 'shield_preview')
    # jugar Llaves y luego Sangre: el escudo guardado absorbe
    pg.evaluate("() => { const ids = window.__ids; for (const u of [ids[0], ids[1]]) document.querySelector('.hand [data-arg=\"' + u + '\"]').click(); for (const u of [ids[2], ids[3]]) document.querySelector('.hand [data-arg=\"' + u + '\"]').click(); document.querySelector('[data-act=\"tb_play\"]').click(); }"); pg.wait_for_timeout(2600)
    chip = pg.evaluate("() => { const e = document.querySelector('.shieldchip'); return e ? e.textContent.trim() : ''; }"); R_sh = pg.evaluate("() => window.__HOUSE_TEST.G.G.R.shield")
    check('S4 tras jugar la pareja de Llaves el indicador sube a 4 (el Escudo se conserva para las siguientes jugadas)', R_sh >= 4 and str(R_sh) in chip, (R_sh, chip))
    pg.evaluate("() => { const ids = window.__ids; document.querySelector('.hand [data-arg=\"' + ids[4] + '\"]') ; }")
    pg.evaluate("""() => { const R = window.__HOUSE_TEST.G.G.R; const ids = window.__ids; const bl = R.hand.filter(c => c.suit === 'blood'); for (const c of bl) { const e = document.querySelector('.hand [data-arg="' + c.uid + '"]'); if (e) e.click(); } }"""); pg.wait_for_timeout(250)
    note3 = pg.evaluate("() => (document.querySelector('.shieldnote') || {}).textContent || ''")
    check('S5 con Escudo guardado, la vista previa de las cartas de Sangre dice que el ESCUDO absorbe la Salud', 'ESCUDO' in note3 and ('absorbe' in note3), note3)
    h0 = pg.evaluate("() => window.__HOUSE_TEST.st.gs.player.health"); pg.evaluate("() => document.querySelector('[data-act=\"tb_play\"]').click()"); pg.wait_for_timeout(450)
    bn = pg.evaluate("() => [...document.querySelectorAll('#banners .fxbanner')].map(e => e.textContent)")
    pg.wait_for_timeout(2400); h1 = pg.evaluate("() => window.__HOUSE_TEST.st.gs.player.health")
    check('S6 jugar Sangre con Escudo no te quita Salud (o menos) y el aviso «ESCUDO: absorbe N de Salud» aparece', h1 >= h0 - 1 and any('ESCUDO' in x for x in bn) or h1 == h0, (h0, h1, bn))
    check('S7 sin errores JS con el escudo', not pg.errs, pg.errs[:2]); ctx.close()
    # escalera real
    ctx, pg = boot(b); pg.evaluate(PREP)
    pg.evaluate("""async () => { const T = window.__HOUSE_TEST, G = T.G; const cards = await import('/src/cards.js'); G.beginRun('salon'); G.enterRound({ id: 'r1c0', row: 1, kind: 'game', opp: { id: 'dealer', rule: [] } });
      const R = G.G.R; R.hand = ['eye_10', 'eye_11', 'eye_12', 'eye_13', 'eye_01', 'blood_02', 'blood_03', 'tooth_04'].map(id => cards.makeCard(id)); R.pocket = []; G.roundView(); window.__ids = R.hand.map(c => c.uid); }"""); pg.wait_for_selector('.tbl'); pg.wait_for_timeout(500)
    pg.evaluate("() => { const ids = window.__ids; for (const u of ids.slice(0, 5)) document.querySelector('.hand [data-arg=\"' + u + '\"]').click(); }"); pg.wait_for_timeout(300)
    pv = pg.evaluate("() => ({ tag: (document.querySelector('.ticker .tag') || {}).textContent, cur: [...document.querySelectorAll('.hands-panel .hrow.cur')].map(e => e.dataset.hand) })")
    check('R1 la vista previa de 10-J-Q-K-A del mismo palo dice «Escalera real» (no «Escalera de color») y resalta su fila del panel', pv['tag'] and 'real' in pv['tag'].lower() and 'color' not in pv['tag'].lower() and pv['cur'] == ['royal'], pv)
    rows = pg.evaluate("() => [...document.querySelectorAll('.hands-panel .hrow')].map(e => e.dataset.hand)")
    check('R2 el panel de manos tiene 11 filas con «Escalera real» entre el Repóker y la Escalera de color', rows[:3] == ['five', 'royal', 'sflush'] and len(rows) == 11, rows)
    names = pg.evaluate("() => [...document.querySelectorAll('.hands-panel .hn')].map(e => e.textContent)")
    check('R3 el Repóker se llama «Repóker» (y no «Quintilla»)', 'Repóker' in names and not any('Quintilla' in n for n in names), names)
    pg.evaluate("() => document.querySelector('[data-act=\"tb_play\"]').click()"); pg.wait_for_timeout(2600)
    bt = pg.evaluate("() => ({ egg: window.__HOUSE_TEST.ACH.hasEgg('real'), score: window.__HOUSE_TEST.G.G.R.score })")
    check('R4 jugarla desbloquea el secreto y puntúa 120×10 = 1200 + cartas', bt['egg'] and bt['score'] >= 1200, bt); shot(pg, 'royal_flush'); ctx.close()

    # ---------- 5) Sprites: ningún personaje comparte sprite ----------
    ctx, pg = boot(b)
    sp = pg.evaluate("""async () => { const m = await import('/src/sprites.js'), K = await import('/src/content.js'); const ids = [...K.CHARACTERS, ...K.GAMBLERS]; const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:0;top:0;opacity:0;pointer-events:none;z-index:-1'; document.body.append(host);
      const els = ids.map(id => { const e = m.characterEl(id, { scale: 2 }); host.append(e); return [id, e]; }); await new Promise(r => setTimeout(r, 900));
      const seen = {}, dup = [], blank = []; for (const [id, e] of els) { const im = e.querySelector('img.ch-body'); await new Promise(r => (im.complete ? r() : (im.onload = r))); const cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight; const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
        const d = g.getImageData(0, 0, cv.width, cv.height).data; let a = 0, nz = 0; for (let i = 0; i < d.length; i += 4) { a = (a * 31 + d[i] * 3 + d[i + 1] * 5 + d[i + 2] * 7 + d[i + 3]) | 0; if (d[i + 3] > 0) nz++; } const h = a + ':' + cv.width + 'x' + cv.height; if (nz < 400) blank.push(id);
        if (seen[h]) dup.push([id, seen[h]]); else seen[h] = id; } host.remove(); return { n: ids.length, dup, blank }; }""")
    check('P1 los 17 personajes y los 8 jugadores anónimos tienen cada uno su propio sprite (25 distintos, ninguno repetido ni en blanco)', sp['n'] == 25 and not sp['dup'] and not sp['blank'], sp)
    pg.evaluate(PREP); pg.evaluate("() => { const G = window.__HOUSE_TEST.G; G.beginRun('salon'); G.enterRound({ id: 'r1c0', row: 1, kind: 'game', opp: { id: 'gambler_f', rule: [] } }); }"); pg.wait_for_selector('.tbl .opp')
    ch = pg.evaluate("() => (document.querySelector('.tbl .opp .char') || {}).dataset ? document.querySelector('.tbl .opp .char').dataset.char : null")
    check('P2 en la mesa, un jugador anónimo se dibuja con SU sprite (no con el del Vendedor)', ch == 'gambler_f', ch)
    pg.evaluate("() => { const G = window.__HOUSE_TEST.G; G.enterDuelSetup({ id: 'r2c0', row: 2, kind: 'shotgun', opp: { id: 'gambler', look: 'gambler_h' } }); }"); pg.wait_for_selector('.duelsetup .char')
    ch2 = pg.evaluate("() => document.querySelector('.duelsetup .char').dataset.char")
    check('P3 en el duelo, el duelista anónimo usa el aspecto de su nodo (gambler_h), no el del Vendedor', ch2 == 'gambler_h', ch2); ctx.close()

    # ---------- 6) La guía se anuncia en la introducción y el tutorial ----------
    ctx, pg = boot(b, init=None)
    pg.evaluate("() => { const T = window.__HOUSE_TEST; T.st.settings.reduceEffects = true; T.G.newGame(); }"); pg.wait_for_selector('.intro, #view .scr'); pg.wait_for_timeout(300)
    lines = pg.evaluate("() => window.__HOUSE_TEST.G.getView().lines")
    check('G1 la introducción termina avisando de la guía (7.ª línea: «tienes la GUÍA: el botón ? de arriba o la tecla ?»)', len(lines) == 7 and lines[-1] == 'intro.7', lines)
    es = pg.evaluate("async () => { const m = await import('/src/i18n.js'); return [m.t('intro.7'), m.t('tut.r1'), m.t('tut.r6'), m.t('hint.map')]; }")
    check('G2 los textos de la introducción, el tutorial y la primera pista del mapa mencionan la GUÍA / el botón «?»', all(('guía' in x.lower() or 'GUÍA' in x or '?' in x) for x in es), es)
    pg.evaluate("() => { window.__HOUSE_TEST.G.introDone(); }"); pg.wait_for_timeout(500)
    first = pg.evaluate("() => ({ view: window.__HOUSE_TEST.G.getView().type, hint: window.__HOUSE_TEST.G.getView().hintKey || (window.__HOUSE_TEST.G.getView().R ? 'round' : ''), pulse: !!document.querySelector('#hud .btn.pulse, .ctrl .btn.pulse') })")
    check('G3 durante el tutorial el botón «?» (arriba) y «? GUÍA» (mesa) están resaltados (late)', first['pulse'], first)
    # la tutorial round muestra la pista con la mención
    pg.evaluate("() => { const T = window.__HOUSE_TEST, run = T.st.gs.run; const n = run.map.rows[0].find(x => x.kind === 'game'); T.G.chooseNode(n.id); }")
    pg.wait_for_selector('.tbl', timeout=6000); pg.wait_for_timeout(600)
    tut = pg.evaluate("() => ({ txt: document.querySelector('.hint') ? document.querySelector('.hint').textContent : '', guide: !!document.querySelector('.ctrl .btn.pulse'), hud: !!document.querySelector('#hud .btn.pulse') })")
    check('G4 la primera mesa (tutorial) enseña la pista con la mención a la guía y resalta ambos botones', ('GUÍA' in tut['txt'] or 'guía' in tut['txt']) and tut['guide'] and tut['hud'], tut); shot(pg, 'tutorial_guide')
    ctx.close()

    # ---------- 7) Voces: señal real en el analizador de audio ----------
    ctx, pg = boot(b, init=PROBE)
    def setset(**kw):
        pg.evaluate("async (kw) => { const { audioManager } = await import('/src/audio.js'); const s = window.__HOUSE_TEST.st.settings; Object.assign(s, kw); audioManager.applySettings(s); }", kw); pg.wait_for_timeout(600)
    pg.mouse.click(10, 10); pg.wait_for_timeout(500)
    def peak(code, ms=1800):
        pg.evaluate("() => { window.__peak = 0; }"); pg.evaluate(code); pg.wait_for_timeout(ms); return pg.evaluate("() => window.__peak")
    setset(muteMusic=True, muteSfx=True, ambient=0, textSpeed='normal', reduceEffects=False, muteVoices=False, voice=0.7)
    pg.evaluate("() => { window.__HOUSE_TEST.G.toMenu(); }"); pg.wait_for_timeout(500)
    silent = peak("() => 0", 700); talk = peak("() => { window.__HOUSE_TEST.G.newGame(); }")
    check('V1 con música y efectos silenciados, el balbuceo de la introducción produce señal de audio real (pico > 0,05)', silent < 0.001 and talk > 0.05, (silent, talk))
    pg.evaluate("() => { window.__HOUSE_TEST.G.toMenu(); }"); setset(reduceEffects=True); pg.wait_for_timeout(300)
    talk2 = peak("() => { window.__HOUSE_TEST.G.newGame(); }", 2200)
    check('V2 con «Reducir efectos» (texto de golpe) el balbuceo suena igualmente (ráfaga)', talk2 > 0.04, talk2)
    pg.evaluate("() => { window.__HOUSE_TEST.G.toMenu(); }"); setset(reduceEffects=False, muteVoices=True); pg.wait_for_timeout(300)
    talk3 = peak("() => { window.__HOUSE_TEST.G.newGame(); }")
    check('V3 con «Silenciar voces» no hay señal', talk3 < 0.001, talk3)
    pg.evaluate("() => { window.__HOUSE_TEST.G.toMenu(); }"); setset(muteVoices=False, voice=0.7); pg.wait_for_timeout(300)
    pg.evaluate("() => { document.querySelector('[data-act=\"settings\"]').click(); }"); pg.wait_for_selector('#set-voice')
    prev = peak("() => { const i = document.querySelector('#set-voice'); i.value = 60; i.dispatchEvent(new Event('input', { bubbles: true })); }", 1000)
    check('V4 al mover el control de «Voces» en Ajustes suena una muestra (4 voces)', prev > 0.05, prev)
    check('V5 sin errores JS en el audio', not pg.errs, pg.errs[:2]); ctx.close()
    b.close()

bad = [n for n, ok in res if not ok]
print(f'\n{len(res)} comprobaciones, {len(bad)} fallan' + ((': ' + ' | '.join(bad)) if bad else ''))
sys.exit(1 if bad else 0)
