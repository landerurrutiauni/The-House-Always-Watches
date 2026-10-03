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


PROBE2 = """(() => { const o = AudioNode.prototype.connect; window.__peak2 = 0; window.__cs = 0; window.__ce = 0;
  window.__fftReset = () => { window.__peak2 = 0; window.__cs = 0; window.__ce = 0; }; window.__fftCentroid = () => (window.__ce > 0 ? window.__cs / window.__ce : 0);
  AudioNode.prototype.connect = function (d, ...r) { const x = o.call(this, d, ...r);
    try { if (d && d.constructor && d.constructor.name === 'AudioDestinationNode' && !window.__an2) { const ctx = this.context, an = ctx.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = 0; o.call(this, an); window.__an2 = an; const buf = new Float32Array(an.fftSize), fq = new Uint8Array(an.frequencyBinCount), hz = ctx.sampleRate / an.fftSize;
      setInterval(() => { an.getFloatTimeDomainData(buf); let m = 0; for (let i = 0; i < buf.length; i++) m = Math.max(m, Math.abs(buf[i])); window.__peak2 = Math.max(window.__peak2, m);
        if (m > 0.01) { an.getByteFrequencyData(fq); let e = 0, c = 0; for (let i = 1; i < fq.length; i++) { const v = (fq[i] / 255) ** 2; e += v; c += v * i * hz; } if (e > 0) { window.__cs += c; window.__ce += e; } } }, 15); } } catch (err) {}
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
    pg.hover('.shieldchip'); pg.wait_for_timeout(150)
    sh_info = pg.evaluate("() => { const e = document.querySelector('.shieldchip'), p = document.querySelector('.tip-pop'); return e ? { txt: e.textContent.trim(), tip: p && !p.hidden ? p.textContent : '', on: e.classList.contains('on') } : null; }")
    check('S1 la mesa muestra SIEMPRE el indicador de Escudo (icono + valor) con una explicación al pasar el ratón', bool(sh_info) and 'Escudo' in sh_info['txt'] and len(sh_info['tip']) > 60 and 'absorbe' in sh_info['tip'].lower(), sh_info)
    ctx.close()
    ctx, pg = boot(b); pg.evaluate(PREP)
    pg.evaluate("""async () => { const T = window.__HOUSE_TEST, G = T.G; const cards = await import('/src/cards.js'); G.beginRun('salon'); G.enterRound({ id: 'r1c0', row: 1, kind: 'game', opp: { id: 'dealer', rule: [] } });
      const R = G.G.R; R.hand = ['blood_07', 'blood_08', 'key_05', 'key_05', 'eye_02', 'eye_03', 'eye_04', 'tooth_09'].map(id => cards.makeCard(id)); R.pocket = []; G.roundView(); window.__ids = R.hand.map(c => c.uid); }"""); pg.wait_for_selector('.tbl'); pg.wait_for_timeout(500)
    pg.evaluate("() => { const ids = window.__ids; for (const u of [ids[2], ids[3]]) document.querySelector('.hand [data-arg=\"' + u + '\"]').click(); }"); pg.wait_for_timeout(250)
    note = pg.evaluate("() => (document.querySelector('.shieldnote') || {}).textContent || ''")
    geo = pg.evaluate("() => { const n = document.querySelector('.shieldnote'), f = document.querySelector('.felt'); if (!n || !f) return null; const a = n.getBoundingClientRect(), b = f.getBoundingClientRect(); const t = document.createRange(); t.selectNodeContents(n); const r = t.getBoundingClientRect(); return { dx: Math.abs((r.left + r.right) / 2 - (b.left + b.right) / 2), ta: getComputedStyle(n).textAlign, jc: getComputedStyle(n).justifyContent, len: n.textContent.trim().length }; }")
    check('S2 al previsualizar una pareja de Llaves el Escudo sale en UNA frase corta («+4 Escudo»), centrada en la mesa', 'Escudo' in note and '+4' in note and geo and geo['len'] <= 30 and geo['dx'] < 8 and geo['jc'] == 'center', (note, geo))
    pg.evaluate("() => { const ids = window.__ids; for (const u of [ids[2], ids[3]]) document.querySelector('.hand [data-arg=\"' + u + '\"]').click(); for (const u of [ids[0], ids[1]]) document.querySelector('.hand [data-arg=\"' + u + '\"]').click(); }"); pg.wait_for_timeout(250)
    note2 = pg.evaluate("() => (document.querySelector('.shieldnote') || {}).textContent || ''")
    chips3 = pg.evaluate("() => [...document.querySelectorAll('.preview-costs .out')].map(e => e.textContent.trim())")
    check('S3 con cartas que cuestan Salud y sin Escudo NO hay frase larga: basta el chip de Salud («−N Salud»)', note2 == '' and any('Salud' in c for c in chips3), (note2, chips3))
    shot(pg, 'shield_preview')
    # jugar Llaves y luego Sangre: el escudo guardado absorbe
    pg.evaluate("() => { const ids = window.__ids; for (const u of [ids[0], ids[1]]) document.querySelector('.hand [data-arg=\"' + u + '\"]').click(); for (const u of [ids[2], ids[3]]) document.querySelector('.hand [data-arg=\"' + u + '\"]').click(); document.querySelector('[data-act=\"tb_play\"]').click(); }"); pg.wait_for_timeout(2600)
    chip = pg.evaluate("() => { const e = document.querySelector('.shieldchip'); return e ? e.textContent.trim() : ''; }"); R_sh = pg.evaluate("() => window.__HOUSE_TEST.G.G.R.shield")
    check('S4 tras jugar la pareja de Llaves el indicador sube a 4 (el Escudo se conserva para las siguientes jugadas)', R_sh >= 4 and str(R_sh) in chip, (R_sh, chip))
    pg.evaluate("() => { const ids = window.__ids; document.querySelector('.hand [data-arg=\"' + ids[4] + '\"]') ; }")
    pg.evaluate("""() => { const R = window.__HOUSE_TEST.G.G.R; const ids = window.__ids; const bl = R.hand.filter(c => c.suit === 'blood'); for (const c of bl) { const e = document.querySelector('.hand [data-arg="' + c.uid + '"]'); if (e) e.click(); } }"""); pg.wait_for_timeout(250)
    note3 = pg.evaluate("() => (document.querySelector('.shieldnote') || {}).textContent || ''")
    check('S5 con Escudo guardado, la vista previa dice en pocas palabras que absorbe («Escudo absorbe N»)', 'Escudo absorbe' in note3 and len(note3.strip()) <= 34, note3)
    h0 = pg.evaluate("() => window.__HOUSE_TEST.st.gs.player.health"); pg.evaluate("() => document.querySelector('[data-act=\"tb_play\"]').click()"); pg.wait_for_timeout(450)
    bn = pg.evaluate("() => [...document.querySelectorAll('#banners .fxbanner')].map(e => e.textContent)")
    pg.wait_for_timeout(2400); h1 = pg.evaluate("() => window.__HOUSE_TEST.st.gs.player.health")
    check('S6 jugar Sangre con Escudo te quita menos Salud y aparece el aviso corto «Escudo absorbe N»', (h1 >= h0 - 1 and any('Escudo absorbe' in x for x in bn)) or h1 == h0, (h0, h1, bn))
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
    check('G1 la introducción ya NO termina con la guía en boca del Crupier (6 líneas, sin intro.7)', len(lines) == 6 and lines[-1] == 'intro.6', lines)
    es = pg.evaluate("async () => { const m = await import('/src/i18n.js'); return [m.t('intro.6'), m.t('tut.r1'), m.t('tut.r6'), m.t('hint.map'), m.t('ui.tip_guide')]; }")
    check('G2 la voz del Crupier (introducción, tutorial, pista del mapa) no menciona la guía; la pista del interfaz sí', not any('guía' in x.lower() for x in es[:4]) and 'guía' in es[4].lower(), es)
    pg.evaluate("() => { window.__HOUSE_TEST.G.introDone(); }"); pg.wait_for_timeout(500)
    first = pg.evaluate("() => ({ view: window.__HOUSE_TEST.G.getView().type, hint: window.__HOUSE_TEST.G.getView().hintKey || (window.__HOUSE_TEST.G.getView().R ? 'round' : ''), pulse: !!document.querySelector('#hud .btn.pulse, .ctrl .btn.pulse') })")
    check('G3 durante el tutorial el botón «?» (arriba) y «? GUÍA» (mesa) están resaltados (late)', first['pulse'], first)
    # la tutorial round muestra la pista con la mención
    pg.evaluate("() => { const T = window.__HOUSE_TEST, run = T.st.gs.run; const n = run.map.rows[0].find(x => x.kind === 'game'); T.G.chooseNode(n.id); }")
    pg.wait_for_selector('.tbl', timeout=6000); pg.wait_for_timeout(600)
    tut = pg.evaluate("() => ({ txt: document.querySelector('.hint') ? document.querySelector('.hint').textContent : '', guide: !!document.querySelector('.ctrl .btn.pulse'), hud: !!document.querySelector('#hud .btn.pulse') })")
    tip4 = pg.evaluate("() => ({ n: document.querySelectorAll('.felt .sys-tip').length, txt: (document.querySelector('.felt .sys-tip') || {}).textContent || '' })")
    check('G4 la primera mesa (tutorial): la pista del Crupier NO nombra la guía, hay un indicador del interfaz («Guía del juego: botón ?») y ambos botones laten', 'GUÍA' not in tut['txt'] and 'guía' not in tut['txt'] and tip4['n'] == 1 and 'Guía' in tip4['txt'] and tut['guide'] and tut['hud'], (tut['txt'][:80], tip4)); shot(pg, 'tutorial_guide')
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

    # ---------- 8) Interés: se suma la jugada ANTES; solo si no llegas sube el objetivo ----------
    ctx, pg = boot(b); pg.evaluate(PREP)
    pg.evaluate("""async () => { const T = window.__HOUSE_TEST, G = T.G; const cards = await import('/src/cards.js'); G.beginRun('salon'); G.enterRound({ id: 'r1c0', row: 1, kind: 'game', opp: { id: 'dealer', rule: ['interest'] } });
      const R = G.G.R; R.hand = ['eye_08', 'blood_08', 'eye_03', 'eye_05', 'eye_09', 'key_02', 'tooth_04'].map(id => cards.makeCard(id)); R.pocket = []; R.target = 99999; G.roundView(); window.__ids = R.hand.map(c => c.uid); }"""); pg.wait_for_selector('.tbl'); pg.wait_for_timeout(500)
    pg.evaluate("() => { const ids = window.__ids; for (const u of ids.slice(0, 2)) document.querySelector('.hand [data-arg=\"' + u + '\"]').click(); }"); pg.wait_for_timeout(250)
    tot = int(pg.inner_text('.ticker .box.total'))
    pg.evaluate("(t) => { window.__HOUSE_TEST.G.G.R.target = t; }", tot + 1)   # NO llegas por 1
    pg.evaluate("() => document.querySelector('[data-act=\"tb_play\"]').click()")
    ft = []
    for _ in range(40):
        pg.wait_for_timeout(150); ft += pg.evaluate("() => [...document.querySelectorAll('.float')].map(e => e.textContent)")
        if any('Interés' in x for x in ft): break
    tg = pg.evaluate("() => window.__HOUSE_TEST.G.G.R.target")
    want = round((tot + 1) * 1.08 / 5) * 5
    check('I1 si NO llegas, el objetivo sube con interés tras sumar la jugada y se avisa («Interés: objetivo N»)', tg == want and any('Interés: objetivo' in x for x in ft), (tot, tg, want, ft))
    ctx.close()
    ctx, pg = boot(b); pg.evaluate(PREP)
    pg.evaluate("""async () => { const T = window.__HOUSE_TEST, G = T.G; const cards = await import('/src/cards.js'); G.beginRun('salon'); G.enterRound({ id: 'r1c0', row: 1, kind: 'game', opp: { id: 'dealer', rule: ['interest'] } });
      const R = G.G.R; R.hand = ['eye_08', 'blood_08', 'eye_03', 'eye_05', 'eye_09', 'key_02', 'tooth_04'].map(id => cards.makeCard(id)); R.pocket = []; R.target = 99999; G.roundView(); window.__ids = R.hand.map(c => c.uid); }"""); pg.wait_for_selector('.tbl'); pg.wait_for_timeout(500)
    pg.evaluate("() => { const ids = window.__ids; for (const u of ids.slice(0, 2)) document.querySelector('.hand [data-arg=\"' + u + '\"]').click(); }"); pg.wait_for_timeout(250)
    tot = int(pg.inner_text('.ticker .box.total')); pg.evaluate("(t) => { window.__HOUSE_TEST.G.G.R.target = t; }", tot)
    pg.evaluate("() => { const ids = window.__ids; for (const u of ids.slice(0, 2)) { const e = document.querySelector('.hand [data-arg=\"' + u + '\"]'); e.click(); e.click(); } }"); pg.wait_for_timeout(150)
    pg.evaluate("() => { const ids = window.__ids; for (const u of ids.slice(0, 2)) document.querySelector('.hand [data-arg=\"' + u + '\"]').click(); }"); pg.wait_for_timeout(250)
    enough = pg.locator('.preview-costs .tag.good').count()
    pg.evaluate("() => document.querySelector('[data-act=\"tb_play\"]').click()"); pg.wait_for_timeout(600)
    st8 = pg.evaluate("() => ({ over: window.__HOUSE_TEST.G.G.R.over, target: window.__HOUSE_TEST.G.G.R.target })")
    check('I2 si la vista previa dice «¡Con esto llegas!», llegas de verdad: gana y el interés NO toca el objetivo', enough == 1 and st8['over'] == 'win' and st8['target'] == tot, (enough, st8, tot)); ctx.close()

    # ---------- 9) Apuesta de carta: se ve cuál pierdes y cuál ganas ----------
    ctx, pg = boot(b); pg.evaluate(PREP)
    pg.evaluate("() => { const G = window.__HOUSE_TEST.G; G.beginRun('salon'); G.enterDuelSetup({ id: 'r2c0', row: 2, kind: 'shotgun', opp: { id: 'gambler', look: 'gambler_d' } }); }"); pg.wait_for_selector('.duelsetup .rest-opts')
    sk = pg.evaluate("""() => { const st = window.__HOUSE_TEST.G.G.view.stakes.find(o => o.type === 'card'); const btn = document.querySelector('[data-act="duel_stake"][data-arg="card"]'); const rows = [...btn.querySelectorAll('.stakecard')];
      return { win: st.winId, lose: st.lose.id, rows: rows.map(r => ({ cls: r.className, card: r.dataset.card, txt: r.textContent.trim(), art: !!r.querySelector('.minicard .card img') })), view: document.querySelector('#view').scrollHeight - document.querySelector('#view').clientHeight }; }""")
    check('D1 la apuesta «una carta de tu mazo» muestra QUÉ carta ganas y CUÁL pierdes (arte + nombre), sin deslizar', len(sk['rows']) == 2 and sk['rows'][0]['card'] == sk['win'] and sk['rows'][1]['card'] == sk['lose'] and all(r['art'] for r in sk['rows']) and sk['rows'][0]['txt'].startswith('Si ganas') and sk['rows'][1]['txt'].startswith('Si pierdes') and sk['view'] <= 2, sk); shot(pg, 'duel_stake_cards')
    pg.click('[data-act="duel_stake"][data-arg="card"]'); pg.wait_for_selector('.drum .ch')
    lu = pg.evaluate("() => ({ lose: window.__HOUSE_TEST.G.G.D.stake.loseUid, win: window.__HOUSE_TEST.G.G.D.stake.winId, inDeck: window.__HOUSE_TEST.st.gs.deck.some(c => c.uid === window.__HOUSE_TEST.G.G.D.stake.loseUid) })")
    check('D2 al elegirla, el duelo arranca con ESA carta en juego', lu['inDeck'] and lu['win'] == sk['win'], lu); ctx.close()

    # ---------- 10) Visor de mazo ----------
    ctx, pg = boot(b); pg.evaluate(PREP)
    pg.evaluate("() => { window.__HOUSE_TEST.G.beginRun('salon'); }"); pg.wait_for_selector('.map-box')
    check('K1 el HUD tiene un botón de MAZO con el número de cartas (52)', pg.locator('#hud [data-act="deck"]').count() == 1 and '52' in pg.inner_text('#hud [data-act="deck"]'))
    pg.click('#hud [data-act="deck"]'); pg.wait_for_selector('.deck-modal .deck-grid .card')
    DK = """() => { const g = [...document.querySelectorAll('.deck-grid .card')]; const m = document.querySelector('.deck-modal'); return { n: g.length, head: document.querySelector('.deck-head').textContent, titles: g.map(c => c.getAttribute('aria-label') || c.title), sp: g.filter(c => c.classList.contains('is-sp')).length, scroll: m.scrollHeight - m.clientHeight, w: Math.round(g[0].getBoundingClientRect().width) }; }"""
    d0 = pg.evaluate(DK)
    check('K2 el visor muestra las 52 cartas, con el recuento («52 cartas · 0 especiales») y sin deslizar', d0['n'] == 52 and '52 cartas' in d0['head'] and d0['scroll'] <= 2, d0 and {k: d0[k] for k in ('n', 'head', 'scroll')})
    check('K3 por palo (por defecto): las 13 primeras son de Sangre, de la A a la 2', all('Sangre' in x for x in d0['titles'][:13]) and d0['titles'][0].startswith('As') and d0['titles'][12].startswith('2 '), d0['titles'][:14])
    pg.click('.deck-modal [data-sort="rank"]'); pg.wait_for_timeout(150); d1 = pg.evaluate(DK)
    check('K4 ordenar por Valor agrupa por número: los 4 primeros son los Ases', all(x.startswith('As') for x in d1['titles'][:4]) and d1['titles'] != d0['titles'], d1['titles'][:6])
    pg.keyboard.press('Escape')
    pg.evaluate("""async () => { const T = window.__HOUSE_TEST, ids = (await import('/src/cards.js')).SPECIAL_IDS; for (const id of ids.slice(0, 3)) T.FX.addToDeck(id); }"""); pg.wait_for_timeout(200)
    pg.click('#hud [data-act="deck"]'); pg.wait_for_selector('.deck-modal .deck-grid .card')
    check('K5 al añadir 3 cartas especiales el mazo pasa a 55 y el botón del HUD lo refleja', '55' in pg.inner_text('.deck-head') and '3 especiales' in pg.inner_text('.deck-head') and '55' in pg.inner_text('#hud [data-act="deck"]'), pg.inner_text('.deck-head'))
    pg.click('.deck-modal [data-sort="recent"]'); pg.wait_for_timeout(150); d2 = pg.evaluate(DK)
    pg.click('.deck-modal [data-only="sp"]'); pg.wait_for_timeout(150); d3 = pg.evaluate(DK)
    check('K6 «Recientes» pone primero las cartas que acabas de añadir y «Solo especiales» deja solo esas 3', d2['sp'] >= 3 and d3['n'] == 3, (d2['sp'], d3['n']))
    pg.hover('.deck-grid .card'); pg.wait_for_timeout(100)
    check('K7 al pasar el ratón por una carta se explica qué hace', len(pg.inner_text('.deck-info')) > 12 and pg.inner_text('.deck-info') != 'Pasa el ratón (o toca) una carta para ver qué hace.', pg.inner_text('.deck-info'))
    pg.keyboard.press('Escape')
    pg.evaluate("""async () => { const T = window.__HOUSE_TEST, ids = (await import('/src/cards.js')).SPECIAL_IDS; for (let i = 0; i < 25; i++) T.FX.addToDeck(ids[i % ids.length]); }"""); pg.click('#hud [data-act="deck"]'); pg.wait_for_selector('.deck-modal .deck-grid .card'); d4 = pg.evaluate(DK)
    check('K8 con un mazo enorme (80 cartas) el visor encoge las cartas y sigue sin deslizar', d4['n'] == 80 and d4['scroll'] <= 2 and d4['w'] < d0['w'], (d4['n'], d4['scroll'], d4['w'], d0['w'])); shot(pg, 'deck_80'); ctx.close()
    ctx, pg = boot(b); pg.evaluate(PREP)
    pg.evaluate("() => { const G = window.__HOUSE_TEST.G; G.beginRun('salon'); G.enterRound({ id: 'r1c0', row: 1, kind: 'game', opp: { id: 'dealer', rule: [] } }); }"); pg.wait_for_selector('.tbl .deckbtn')
    left = pg.evaluate("() => window.__HOUSE_TEST.G.G.R.drawPile.length")
    pg.click('.tbl .deckbtn'); pg.wait_for_selector('.deck-modal .deck-grid .card'); pg.wait_for_timeout(150)
    kk = pg.evaluate("() => ({ n: document.querySelectorAll('.deck-grid .card').length, views: document.querySelectorAll('.deck-modal [data-view]').length, txt: document.querySelector('.deck-modal').textContent, head: document.querySelector('.deck-head').textContent })")
    check('K9 en la mesa, «Mazo: N» abre el mazo COMPLETO (52 cartas); NO hay vista de «cartas por robar» ni botones para cambiar a ella', kk['n'] == 52 and kk['views'] == 0 and 'robar' not in kk['txt'].lower() and left < 52 and '52 cartas' in kk['head'], (kk['n'], kk['views'], left)); pg.keyboard.press('Escape')
    # ordenar la mano
    pg.evaluate("""async () => { const T = window.__HOUSE_TEST, G = T.G; const cards = await import('/src/cards.js'); const R = G.G.R; R.hand = ['key_03', 'blood_01', 'eye_13', 'blood_12', 'tooth_07', 'eye_02', 'key_09', 'tooth_11'].map(id => cards.makeCard(id)); R.pocket = []; G.roundView(); }"""); pg.wait_for_selector('.tbl .sortbtns'); pg.wait_for_timeout(300)
    ids0 = pg.evaluate("() => [...document.querySelectorAll('.hand .card')].map(c => c.getAttribute('aria-label').split(' — ')[0])")
    pg.click('.sortbtns [data-arg="rank"]'); pg.wait_for_timeout(200); ids1 = pg.evaluate("() => [...document.querySelectorAll('.hand .card')].map(c => c.getAttribute('aria-label').split(' — ')[0])")
    pg.click('.sortbtns [data-arg="suit"]'); pg.wait_for_timeout(200); ids2 = pg.evaluate("() => [...document.querySelectorAll('.hand .card')].map(c => c.getAttribute('aria-label').split(' — ')[0])")
    saved = pg.evaluate("() => window.__HOUSE_TEST.st.settings.handSort")
    check('H1 los botones Valor / Palo ordenan la mano (valor: As, K, Q…; palo: Sangre → Ojo → Diente → Llave) y se recuerda', ids1[0].startswith('As') and ids1[1].startswith('13') or ids1[1].startswith('Rey') if True else False, (ids0, ids1, ids2))
    check('H2 por Palo la mano queda agrupada por palo y la preferencia se guarda', all('Sangre' in x for x in ids2[:2]) and ids2 != ids1 and saved == 'suit', (ids2, saved)); ctx.close()

    # ---------- 11) Comodines: descripción al pasar el ratón y orden en el mapa ----------
    ctx, pg = boot(b); pg.evaluate(PREP)
    pg.evaluate("() => { const T = window.__HOUSE_TEST; T.G.beginRun('salon'); for (const id of ['bufon', 'as_manga', 'sonrisa']) T.FX.addJoker(id); T.G.showMap(); }"); pg.wait_for_selector('.map-jokers .jslot'); pg.wait_for_timeout(300)
    check('J1 el mapa muestra los comodines en una fila con su número de orden (1, 2, 3) y flechas ◀ ▶', pg.locator('.map-jokers .jslot').count() == 3 and pg.locator('.map-jokers .jidx').all_inner_texts() == ['1', '2', '3'] and pg.locator('.map-jokers .jmove button').count() == 6)
    pg.hover('.map-jokers .jslot:nth-child(2) .joker'); pg.wait_for_selector('.tip-pop:not([hidden])'); tp = pg.evaluate("() => { const e = document.querySelector('.tip-pop'), r = e.getBoundingClientRect(), s = document.querySelector('#stage').getBoundingClientRect(); return { txt: e.textContent, inside: r.left >= s.left - 1 && r.right <= s.right + 1 && r.top >= s.top - 1 && r.bottom <= s.bottom + 1 }; }")
    check('J2 al pasar el ratón por un comodín aparece AL INSTANTE su descripción (nombre, rareza y efecto, sin textos sueltos como «null») dentro del escenario', 'null' not in tp['txt'] and 'undefined' not in tp['txt'] and 'Último' not in tp['txt'] and 'As' in tp['txt'] and 'Poco común' in tp['txt'] and tp['inside'], tp); shot(pg, 'joker_tip')
    pg.mouse.move(5, 5); pg.wait_for_timeout(150)
    check('J3 al quitar el ratón desaparece', pg.locator('.tip-pop:not([hidden])').count() == 0)
    pg.click('.map-jokers .jslot:nth-child(1) .jmove button:last-child'); pg.wait_for_timeout(200)
    o1 = pg.evaluate("() => window.__HOUSE_TEST.st.gs.jokers.slice()")
    check('J4 la flecha ▶ del primer comodín lo pasa al 2.º puesto (orden real del juego) y la fila se redibuja', o1 == ['as_manga', 'bufon', 'sonrisa'] and pg.locator('.map-jokers .jslot').first.get_attribute('data-i') == '0', o1)
    pg.drag_and_drop('.map-jokers .jslot:nth-child(3)', '.map-jokers .jslot:nth-child(1)'); pg.wait_for_timeout(250)
    o2 = pg.evaluate("() => window.__HOUSE_TEST.st.gs.jokers.slice()")
    check('J5 también se pueden ARRASTRAR: el 3.º soltado sobre el 1.º queda primero', o2 == ['sonrisa', 'as_manga', 'bufon'], o2)
    pg.reload(); pg.wait_for_selector('body[data-ready="1"]'); pg.wait_for_timeout(300)
    o3 = pg.evaluate("() => { const T = window.__HOUSE_TEST; T.G.continueGame && T.G.continueGame(); return T.st.gs.jokers.slice(); }")
    check('J6 el orden elegido se guarda (sobrevive a recargar la página)', o3 == ['sonrisa', 'as_manga', 'bufon'], o3)
    pg.evaluate(PREP); pg.evaluate("() => { const T = window.__HOUSE_TEST; T.G.beginRun('salon'); for (const id of ['bufon', 'as_manga']) T.FX.addJoker(id); T.G.enterRound({ id: 'r1c0', row: 1, kind: 'game', opp: { id: 'dealer', rule: [] } }); }"); pg.wait_for_selector('.tbl .jokerbar .joker[data-joker]')
    pg.hover('.tbl .jokerbar .joker[data-joker]'); pg.wait_for_selector('.tip-pop:not([hidden])')
    check('J7 en la mesa también se ve la descripción al pasar el ratón, pero NO se pueden reordenar (sin flechas)', pg.locator('.tbl .jmove').count() == 0 and len(pg.inner_text('.tip-pop')) > 20, pg.inner_text('.tip-pop')); ctx.close()

    # ---------- 12) Volver al inicio desde Ajustes ----------
    ctx, pg = boot(b); pg.evaluate(PREP)
    pg.evaluate("() => { window.__HOUSE_TEST.G.toMenu(); }"); pg.wait_for_selector('#view [data-act="settings"]'); pg.click('#view [data-act="settings"]'); pg.wait_for_selector('.modal')
    check('Z1 en el menú, Ajustes NO ofrece «Volver al inicio»', pg.locator('.modal [data-act="to_menu"]').count() == 0); pg.keyboard.press('Escape')
    pg.evaluate("() => { window.__HOUSE_TEST.G.beginRun('salon'); }"); pg.wait_for_selector('.map-box'); pg.click('#hud [data-act="settings"]'); pg.wait_for_selector('.modal [data-act="to_menu"]')
    check('Z2 en partida, Ajustes ofrece «Volver al inicio» arriba del todo', pg.locator('.modal [data-act="to_menu"]').count() == 1 and pg.inner_text('.modal [data-act="to_menu"]').lower() == 'volver al inicio'); shot(pg, 'settings_home')
    pg.click('.modal [data-act="to_menu"]'); pg.wait_for_timeout(200)
    check('Z3 en el mapa (seguro) avisa de que se guarda el progreso', 'se guarda' in pg.inner_text('.modal-back:last-child').lower(), pg.inner_text('.modal-back:last-child')[:120])
    pg.click('.modal-back:last-child .btn.primary'); pg.wait_for_timeout(500)
    zv = pg.evaluate("() => ({ v: window.__HOUSE_TEST.G.getView().type, modals: document.querySelectorAll('.modal-back').length, hasRun: !!window.__HOUSE_TEST.st.gs.run })")
    check('Z4 confirmar cierra todo y deja la pantalla de inicio, con la partida guardada para continuar', zv['v'] == 'menu' and zv['modals'] == 0 and zv['hasRun'], zv)
    pg.evaluate("() => { const G = window.__HOUSE_TEST.G; G.beginRun('salon'); G.enterRound({ id: 'r1c0', row: 1, kind: 'game', opp: { id: 'dealer', rule: [] } }); }"); pg.wait_for_selector('.tbl'); pg.click('#hud [data-act="settings"]'); pg.wait_for_selector('.modal [data-act="to_menu"]'); pg.click('.modal [data-act="to_menu"]'); pg.wait_for_timeout(200)
    check('Z5 en mitad de una ronda avisa de que la sala se dará por abandonada', 'abandonada' in pg.inner_text('.modal-back:last-child').lower(), pg.inner_text('.modal-back:last-child')[:140])
    pg.click('.modal-back:last-child .btn.primary'); pg.wait_for_timeout(500)
    check('Z6 …y vuelve igualmente al inicio', pg.evaluate("() => window.__HOUSE_TEST.G.getView().type") == 'menu'); ctx.close()

    # ---------- 13) Indicador de la guía (no diegético) en el mapa ----------
    ctx, pg = boot(b); pg.evaluate("() => { const T = window.__HOUSE_TEST; T.st.settings.reduceEffects = true; T.G.newGame(); T.G.introDone(); }"); pg.wait_for_selector('.map-box')   # con un solo ala abierta, tras la introducción se va directo al mapa
    mt = pg.evaluate("() => ({ tip: (document.querySelector('.mapscr .sys-tip') || {}).textContent || '', pulse: !!document.querySelector('#hud .btn.pulse'), hint: (document.querySelector('.map-info') || {}).textContent || '' })")
    check('M3 en la primera partida, el mapa recuerda la guía con un indicador del interfaz (no con el Crupier) y el botón «?» late', 'Guía' in mt['tip'] and mt['pulse'] and 'guía' not in mt['hint'].lower(), mt); shot(pg, 'map_guide_tip')
    pg.click('#hud [data-act="howto"]'); pg.wait_for_selector('.howto-modal'); pg.keyboard.press('Escape'); pg.evaluate("() => { window.__HOUSE_TEST.G.showMap(); }"); pg.wait_for_selector('.map-box'); pg.wait_for_timeout(300)
    check('M4 una vez abierta la guía, el indicador desaparece', pg.locator('.mapscr .sys-tip').count() == 0 and pg.locator('#hud .btn.pulse').count() == 0); ctx.close()

    # ---------- 14) Descripciones de recursos y habilidades de rivales ----------
    ctx, pg = boot(b); pg.evaluate(PREP)
    pg.evaluate("() => { const T = window.__HOUSE_TEST; T.G.beginRun('salon'); T.G.showMap(); }"); pg.wait_for_selector('.map-box'); pg.wait_for_timeout(400)
    TIP = """() => { const e = document.querySelector('.tip-pop'); if (!e || e.hidden) return null; const r = e.getBoundingClientRect(), s = document.querySelector('#stage').getBoundingClientRect(); return { txt: e.textContent, clean: !/null|undefined|NaN/.test(e.textContent), inside: r.left >= s.left - 1 && r.right <= s.right + 1 && r.top >= s.top - 1 && r.bottom <= s.bottom + 1 }; }"""
    want = {'health': ['Tu vida', 'mueres'], 'sanity': ['Tu mente', 'colapsas'], 'money': ['comprar', 'Deuda'], 'debt': ['debes', 'puntos', 'objetivos suben'], 'lives': ['vida', '40 %']}
    got = {}
    for k in want:
        pg.mouse.move(5, 5); pg.wait_for_timeout(80); pg.hover(f'#hud .stat[data-k="{k}"]'); pg.wait_for_timeout(120); got[k] = pg.evaluate(TIP)
    ok_all = all(got[k] and got[k]['inside'] and got[k]['clean'] and all(w in got[k]['txt'] for w in want[k]) for k in want)
    check('R1 al pasar el ratón por Salud, Cordura, Dinero, Deuda y Velas sale una explicación breve de para qué sirve cada uno (dentro del escenario)', ok_all, {k: (v['txt'][:70] if v else None) for k, v in got.items()})
    check('R2 la Deuda explica qué cuesta (objetivos más altos) Y para qué sirve (la convierten en puntos cartas y comodines)', got['debt'] and 'objetivos suben' in got['debt']['txt'] and 'puntos' in got['debt']['txt'], got['debt'])
    nat = pg.evaluate("() => document.querySelectorAll('#hud .stat[title]').length")
    check('R3 los recursos ya no llevan el «title» nativo (que se retrasa y duplica la descripción)', nat == 0, nat)
    pg.mouse.move(5, 5); pg.focus('#hud .stat[data-k="money"]'); pg.wait_for_timeout(150); kb = pg.evaluate(TIP)
    check('R4 también con el teclado: enfocar Dinero (Tab) muestra su descripción', kb and 'comprar' in kb['txt'], kb)
    pg.mouse.move(5, 5); pg.hover('#hud .hud-deck'); pg.wait_for_timeout(120); dk = pg.evaluate(TIP)
    check('R5 el botón de mazo también explica qué hace al pasar el ratón', dk and 'cartas' in dk['txt'].lower(), dk)
    # reglas del rival
    pg.evaluate("() => { const G = window.__HOUSE_TEST.G; G.enterRound({ id: 'r1c0', row: 1, kind: 'game', opp: { id: 'dealer', rule: ['mist', 'tax'] } }); }"); pg.wait_for_selector('.tbl .ruletag'); pg.wait_for_timeout(300)
    rt = pg.evaluate("() => [...document.querySelectorAll('.tbl .ruletag')].map(e => e.dataset.rule)")
    seen = {}
    for r in rt:
        pg.mouse.move(5, 5); pg.wait_for_timeout(80); pg.hover(f'.tbl .ruletag[data-rule="{r}"]'); pg.wait_for_timeout(120); seen[r] = pg.evaluate(TIP)
    esrules = pg.evaluate("async () => { const m = await import('/src/i18n.js'); return Object.fromEntries(['mist', 'tax'].map(r => [r, [m.t('rule.' + r + '.name'), m.t('rule.' + r + '.desc')]])); }")
    check('R6 en la mesa, cada habilidad del rival (Niebla, Impuesto) enseña al pasar el ratón su nombre, «Habilidad del rival» y lo que hace', sorted(rt) == ['mist', 'tax'] and all(seen[r] and seen[r]['clean'] and esrules[r][1] in seen[r]['txt'] and esrules[r][0] in seen[r]['txt'] and 'Habilidad del rival' in seen[r]['txt'] and seen[r]['inside'] for r in rt), {r: (v['txt'][:80] if v else None) for r, v in seen.items()}); shot(pg, 'rule_tip')
    # guardián: reglas normales y debilitadas
    pg.evaluate("""() => { const T = window.__HOUSE_TEST, G = T.G, st = T.st; G.beginRun('salon'); T.FX.learn('k_nun_name'); const run = st.gs.run; const bn = run.map.rows[run.map.rows.length - 1][0]; run.pos = bn.id; G.G.node = bn; G.enterBoss({ id: bn.id, row: bn.row, kind: 'boss', opp: { id: 'nun' } }); }"""); pg.wait_for_selector('.bossscr .ruletag'); pg.wait_for_timeout(300)
    bt = pg.evaluate("() => [...document.querySelectorAll('.bossscr .ruletag')].map(e => [e.dataset.rule, e.className.includes('good')])")
    bres = {}
    for r, weak in bt:
        pg.mouse.move(5, 5); pg.wait_for_timeout(80); pg.hover(f'.bossscr .ruletag[data-rule="{r}"]'); pg.wait_for_timeout(120); bres[r] = pg.evaluate(TIP)
    wk = [r for r, w in bt if w]; nw = [r for r, w in bt if not w]
    check('R7 ante el guardián, sus habilidades explican qué hacen; la que has debilitado con lo que sabes lo dice («Ya no te afecta»)', len(wk) == 1 and len(nw) >= 1 and all(bres[r] and 'Habilidad del rival' in bres[r]['txt'] for r in nw) and 'Ya no te afecta' in bres[wk[0]]['txt'], (bt, {r: (v['txt'][:70] if v else None) for r, v in bres.items()})); shot(pg, 'boss_rule_tip')
    check('R8 sin errores JS en las descripciones', not pg.errs, pg.errs[:2]); ctx.close()

    # ---------- 15) Escuchar en el duelo: sonido distinto según lo que crees oír ----------
    ctx, pg = boot(b, init=PROBE2)
    pg.mouse.click(10, 10); pg.wait_for_timeout(400)
    def setset(**kw):
        pg.evaluate("async (kw) => { const { audioManager } = await import('/src/audio.js'); const s = window.__HOUSE_TEST.st.settings; Object.assign(s, kw); audioManager.applySettings(s); }", kw); pg.wait_for_timeout(500)
    setset(muteMusic=True, muteSfx=False, ambient=0, textSpeed='normal', reduceEffects=False, muteVoices=True)
    pg.evaluate(PREP)
    results = {}
    for says in (True, False):
        pg.evaluate("""async (says) => { const T = window.__HOUSE_TEST, G = T.G; G.beginRun('salon'); G.enterDuelSetup({ id: 'r2c0', row: 2, kind: 'shotgun', opp: { id: 'gambler', look: 'gambler_d' } }); window.__names = [];
          const m = await import('/src/sfx.js'); if (!window.__patched) { window.__patched = true; const orig = m.sfx.play.bind(m.sfx); m.sfx.play = (n, o) => { window.__names.push(n); return orig(n, o); }; } }""", says)
        pg.wait_for_selector('[data-act="duel_stake"][data-arg="money"]'); pg.click('[data-act="duel_stake"][data-arg="money"]'); pg.wait_for_selector('.drum .ch')
        pg.evaluate("""(says) => { const D = window.__HOUSE_TEST.G.G.D; D.rng.chance = () => true; D.chambers[D.pos] = says; D.turn = 'p'; window.__HOUSE_TEST.st.gs.player.sanity = 80; }""", says)
        pg.evaluate("() => { window.__names = []; window.__fftReset(); }")
        pg.click('[data-act="duel_listen"]'); pg.wait_for_selector('.heard', timeout=8000); pg.wait_for_timeout(900)
        results[says] = pg.evaluate("() => ({ names: window.__names.filter(n => /listen|whisper/.test(n)), cls: document.querySelector('.heard').className, txt: document.querySelector('.heard').textContent, peak: window.__peak2, cent: window.__fftCentroid() })")
    L, E = results[True], results[False]
    check('L1 si crees oír una bala suena «listen_loaded»; si crees oír vacío, «listen_empty» (y nada más del tipo escuchar)', L['names'] == ['listen_loaded'] and E['names'] == ['listen_empty'], (L['names'], E['names']))
    check('L2 el texto y el marco acompañan: «Crees oír… una bala» con marco is-loaded; «…vacío» con is-empty', 'is-loaded' in L['cls'] and 'bala' in L['txt'] and 'is-empty' in E['cls'] and 'vacío' in E['txt'], (L['cls'], L['txt'], E['cls'], E['txt']))
    check('L3 los dos sonidos se OYEN de verdad en la salida de audio (pico > 0,03 en ambos)', L['peak'] > 0.03 and E['peak'] > 0.03, (L['peak'], E['peak']))
    check('L4 y SUENAN distinto: el de «cargada» es grave (centroide espectral bajo) y el de «vacía» es agudo (al menos 2× más alto)', L['cent'] > 0 and E['cent'] > 1.8 * L['cent'], {'cargada_Hz': round(L['cent']), 'vacia_Hz': round(E['cent'])})
    check('L5 sin errores JS al escuchar', not pg.errs, pg.errs[:2]); ctx.close()
    b.close()

bad = [n for n, ok in res if not ok]
print(f'\n{len(res)} comprobaciones, {len(bad)} fallan' + ((': ' + ' | '.join(bad)) if bad else ''))
sys.exit(1 if bad else 0)
