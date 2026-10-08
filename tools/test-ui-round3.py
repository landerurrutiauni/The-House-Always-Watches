#!/usr/bin/env python3
"""Verificación en Chromium real de la 3.ª tanda: bolsillo con varias cartas de una vez, comodín de palo con asterisco y sprites más trabajados.
Uso: python3 tools/test-ui-round3.py [--url http://localhost:8080/index.html] [--shots carpeta]"""
import sys, json
from pathlib import Path
from playwright.sync_api import sync_playwright
URL = sys.argv[sys.argv.index('--url') + 1] if '--url' in sys.argv else 'http://localhost:8080/index.html'
SHOTS = Path(sys.argv[sys.argv.index('--shots') + 1]) if '--shots' in sys.argv else None
ROOT = Path(__file__).resolve().parent.parent
LOC = {l: json.load(open(ROOT / 'locales' / (l + '.json'), encoding='utf-8')) for l in ['es', 'en', 'fr', 'de', 'eu']}
res = []
def check(name, cond, extra=''):
    res.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name + ((' — ' + str(extra)) if extra != '' and not cond else ''), flush=True)
def boot(b, w=1280, h=720, locale='es-ES', lang=None):
    ctx = b.new_context(viewport={'width': w, 'height': h}, locale=locale)
    if lang: ctx.add_init_script("localStorage.setItem('thaw.settings.v1', JSON.stringify(%s))" % json.dumps({'lang': lang}))
    pg = ctx.new_page(); pg.errs = []
    pg.on('pageerror', lambda e: pg.errs.append('PAGEERROR ' + str(e)))
    pg.on('console', lambda m: pg.errs.append('CONSOLE ' + m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    pg.goto(URL + '?test'); pg.wait_for_selector('body[data-ready="1"]', timeout=15000); pg.wait_for_timeout(300)
    return ctx, pg
def shot(pg, name):
    if SHOTS: SHOTS.mkdir(parents=True, exist_ok=True); pg.screenshot(path=str(SHOTS / (name + '.png')))
PREP = """() => { const T = window.__HOUSE_TEST, G = T.G, st = T.st; st.settings.reduceEffects = false; G.newGame(); G.introDone(); const m = st.gs.meta; m.tutorial.round = true; m.tutorial.duel = true; m.stats.anomalies = 1; m.hints = { map: true, event: true, merchant: true, rest: true, boss: true }; }"""
def round_with(pg, ids, rule='[]'):
    pg.evaluate("""async ([ids, rule]) => { const T = window.__HOUSE_TEST, G = T.G; const cards = await import('/src/cards.js'); G.beginRun('salon'); G.enterRound({ id: 'r1c0', row: 1, kind: 'game', opp: { id: 'dealer', rule: JSON.parse(rule) } });
      const R = G.G.R; R.hand = ids.map(id => cards.makeCard(id)); R.pocket = []; R.hidden.clear(); R.target = 99999; G.roundView(); window.__ids = R.hand.map(c => c.uid); }""", [ids, rule])
    pg.wait_for_selector('.tbl'); pg.wait_for_timeout(400)
HAND = ['blood_07', 'blood_08', 'key_05', 'key_06', 'eye_02', 'eye_03', 'eye_04']   # 7 cartas = el tamaño de mano de una mesa normal
def click_card(pg, i): pg.evaluate("(i) => document.querySelector('.hand [data-arg=\"' + window.__ids[i] + '\"]').click()", i); pg.wait_for_timeout(120)
def stash_state(pg):
    return pg.evaluate("""() => { const b = document.querySelector('[data-act="tb_stash"]'), R = window.__HOUSE_TEST.G.G.R, u = document.querySelector('[data-act="tb_unstash"]');
      return { txt: b.textContent.trim(), dis: b.disabled, title: b.title || '', pocket: R.pocket.length, hand: R.hand.length, pcards: document.querySelectorAll('.pocketbar .card').length, bar: (document.querySelector('.pocketbar span') || {}).textContent || '',
               un: u ? u.textContent.trim() : null, untitle: u ? u.title : '', sel: document.querySelectorAll('.hand .card.sel, .pocketbar .card.sel').length }; }""")

with sync_playwright() as p:
    b = p.chromium.launch()

    # ============ BOLSILLO: varias cartas de golpe ============
    ctx, pg = boot(b); pg.evaluate(PREP); round_with(pg, HAND)
    s0 = stash_state(pg)
    check('P1 sin cartas elegidas el botón BOLSILLO está desactivado y explica qué hacer («Elige las cartas… caben 2 más»)', s0['dis'] and s0['txt'] == 'BOLSILLO' and 'Elige' in s0['title'] and '2' in s0['title'], s0)
    click_card(pg, 0); s1 = stash_state(pg)
    check('P2 con una carta elegida se activa y muestra cuántas guardará: «BOLSILLO (1)»', (not s1['dis']) and s1['txt'] == 'BOLSILLO (1)', s1)
    click_card(pg, 1); s2 = stash_state(pg)
    check('P3 con DOS cartas elegidas dice «BOLSILLO (2)» y su explicación habla de lo que cabe', (not s2['dis']) and s2['txt'] == 'BOLSILLO (2)' and 'caben 2' in s2['title'], s2)
    shot(pg, 'bolsillo_antes')
    hand_before = s2['hand']
    pg.click('[data-act="tb_stash"]'); pg.wait_for_timeout(300); s3 = stash_state(pg)
    check('P4 UN solo clic guarda las dos cartas: Bolsillo 2/2 con 2 cartas dentro', s3['pocket'] == 2 and s3['pcards'] == 2 and '2/2' in s3['bar'], s3)
    check('P5 la mano se repone en el mismo clic (mismo nº de cartas que antes) y no queda nada elegido', s3['hand'] == hand_before and s3['sel'] == 0, s3)
    check('P6 con el Bolsillo lleno BOLSILLO queda desactivado y lo explica («lleno»)', s3['dis'] and 'lleno' in s3['title'], s3)
    shot(pg, 'bolsillo_despues')
    ids = pg.evaluate("() => window.__HOUSE_TEST.G.G.R.hand.map(c => c.uid)"); pg.evaluate("(ids) => { window.__ids = ids; }", ids)
    click_card(pg, 0); s4 = stash_state(pg)
    check('P7 con el Bolsillo lleno, elegir otra carta no activa BOLSILLO', s4['dis'], s4)
    click_card(pg, 0)
    s5 = stash_state(pg)
    check('P8 «SACAR (2)» (sin elegir nada) indica que devolverá las dos', s5['un'] == 'SACAR (2)' and 'todas' in s5['untitle'], s5)
    pg.click('[data-act="tb_unstash"]'); pg.wait_for_timeout(300); s6 = stash_state(pg)
    check('P9 un clic en SACAR devuelve las dos a la mano (la mano pasa de 7 a 9) y el Bolsillo queda 0/2', s6['pocket'] == 0 and s6['pcards'] == 0 and s6['hand'] == hand_before + 2 and '0/2' in s6['bar'], s6)
    check('P10 sin errores JS en el flujo del Bolsillo', not pg.errs, pg.errs[:2]); ctx.close()

    # elegir más cartas de las que caben: entran las primeras elegidas
    ctx, pg = boot(b); pg.evaluate(PREP); round_with(pg, HAND)
    click_card(pg, 0); pg.click('[data-act="tb_stash"]'); pg.wait_for_timeout(250)
    ids = pg.evaluate("() => window.__HOUSE_TEST.G.G.R.hand.map(c => c.uid)"); pg.evaluate("(ids) => { window.__ids = ids; }", ids)
    pocket_uid = pg.evaluate("() => window.__HOUSE_TEST.G.G.R.pocket[0].uid")
    for i in (3, 1, 5): click_card(pg, i)
    s = stash_state(pg)
    check('P11 con un solo hueco y 3 cartas elegidas el botón avisa de lo que hará: «BOLSILLO (1)»', (not s['dis']) and s['txt'] == 'BOLSILLO (1)', s)
    expect = ids[3]
    pg.click('[data-act="tb_stash"]'); pg.wait_for_timeout(300)
    got = pg.evaluate("() => window.__HOUSE_TEST.G.G.R.pocket.map(c => c.uid)")
    check('P12 entra la primera de las elegidas (la 4.ª) y el Bolsillo queda 2/2', got == [pocket_uid, expect], (got, pocket_uid, expect))
    # SACAR con una carta del bolsillo elegida: solo esa
    pg.evaluate("() => { window.__ids = window.__HOUSE_TEST.G.G.R.hand.map(c => c.uid); }")
    pg.evaluate("(u) => document.querySelector('.pocketbar [data-arg=\"' + u + '\"]').click()", expect); pg.wait_for_timeout(150)
    s = stash_state(pg)
    check('P13 eligiendo UNA carta del Bolsillo, el botón dice «SACAR (1)»', s['un'] == 'SACAR (1)', s)
    pg.click('[data-act="tb_unstash"]'); pg.wait_for_timeout(300)
    got2 = pg.evaluate("() => window.__HOUSE_TEST.G.G.R.pocket.map(c => c.uid)")
    check('P14 solo sale esa carta; la otra se queda guardada', got2 == [pocket_uid], got2)
    check('P15 sin errores JS', not pg.errs, pg.errs[:2]); ctx.close()

    # cartas del Bolsillo: se pueden elegir y jugar; Niebla: las ocultas no se guardan
    ctx, pg = boot(b); pg.evaluate(PREP); round_with(pg, HAND)
    click_card(pg, 2); click_card(pg, 3); pg.click('[data-act="tb_stash"]'); pg.wait_for_timeout(250)
    pg.evaluate("() => { window.__ids = window.__HOUSE_TEST.G.G.R.hand.map(c => c.uid); }")
    for _ in range(2):      # cada clic repinta la barra: se vuelve a buscar la carta (la 1.ª, luego la que aún no está elegida)
        pg.evaluate("() => { const e = document.querySelector('.pocketbar .card:not(.sel)'); if (e) e.click(); }"); pg.wait_for_timeout(150)
    st = pg.evaluate("() => ({ play: document.querySelector('[data-act=\"tb_play\"]').textContent.trim(), dis: document.querySelector('[data-act=\"tb_play\"]').disabled, stash: document.querySelector('[data-act=\"tb_stash\"]').disabled })")
    check('P16 las cartas guardadas se eligen para jugar desde el Bolsillo: «JUGAR (2/5)» activo y BOLSILLO no se ofrece para ellas', st['play'].endswith('(2/5)') and not st['dis'] and st['stash'], st)
    pg.click('[data-act="tb_play"]'); pg.wait_for_timeout(2500)
    after = pg.evaluate("() => ({ pocket: window.__HOUSE_TEST.G.G.R.pocket.length, plays: window.__HOUSE_TEST.G.G.R.playsLeft })")
    check('P17 se juegan y salen del Bolsillo', after['pocket'] == 0, after)
    ctx.close()

    ctx, pg = boot(b); pg.evaluate(PREP); round_with(pg, HAND, '["mist"]')
    pg.evaluate("() => { const R = window.__HOUSE_TEST.G.G.R; R.hidden.clear(); R.hidden.add(R.hand[0].uid); R.hidden.add(R.hand[1].uid); window.__HOUSE_TEST.G.roundView(); window.__ids = R.hand.map(c => c.uid); }"); pg.wait_for_timeout(300)
    click_card(pg, 0); click_card(pg, 1); s = stash_state(pg)
    check('P18 con Niebla, las cartas ocultas no se pueden guardar: BOLSILLO desactivado y lo explica', s['dis'] and ('ocultas' in s['title'] or 'Niebla' in s['title']), s)
    click_card(pg, 4); s = stash_state(pg)
    check('P19 si además eliges una visible, solo entra esa: «BOLSILLO (1)»', (not s['dis']) and s['txt'] == 'BOLSILLO (1)', s)
    pg.click('[data-act="tb_stash"]'); pg.wait_for_timeout(300)
    got = pg.evaluate("() => ({ pocket: window.__HOUSE_TEST.G.G.R.pocket.length, hid: [...window.__HOUSE_TEST.G.G.R.hidden].length })")
    check('P20 queda 1/2 en el Bolsillo', got['pocket'] == 1, got)
    ctx.close()

    # Vigilado: sin bolsillo
    ctx, pg = boot(b); pg.evaluate(PREP); round_with(pg, HAND, '["watched"]')
    click_card(pg, 0); click_card(pg, 1); s = stash_state(pg)
    check('P21 con la regla «Vigilado» el Bolsillo no existe: botón desactivado con la explicación de la regla', s['dis'] and 'bolsillo' in s['title'].lower(), s)
    ctx.close()

    # distribución: el botón con contador cabe en la barra de controles en los 5 idiomas
    for lang, loc in [('es', 'es-ES'), ('en', 'en-US'), ('fr', 'fr-FR'), ('de', 'de-DE'), ('eu', 'eu-ES')]:
        ctx, pg = boot(b, locale=loc, lang=lang); pg.evaluate(PREP); round_with(pg, HAND)
        click_card(pg, 0); click_card(pg, 1)
        geo = pg.evaluate("""() => { const c = document.querySelector('.ctrl'), r = c.getBoundingClientRect(), bs = [...c.querySelectorAll('button')].map(b => b.getBoundingClientRect());
          const over = bs.some((x, i) => bs.some((y, j) => j > i && x.width && y.width && x.left < y.right - 1 && y.left < x.right - 1 && x.top < y.bottom - 1 && y.top < x.bottom - 1));
          const sb = document.querySelector('[data-act="tb_stash"]'); return { right: Math.max(...bs.map(x => x.right)), left: Math.min(...bs.map(x => x.left)), over, sw: c.scrollWidth - c.clientWidth, cut: sb.scrollWidth - sb.clientWidth, txt: sb.textContent.trim() }; }""")
        check(f'P22[{lang}] «{geo["txt"]}»: los botones de la mesa caben, no se pisan y el texto no se corta', geo['right'] <= 1280 and geo['left'] >= 0 and not geo['over'] and geo['sw'] <= 1 and geo['cut'] <= 1, geo)
        if lang in ('es', 'en'): shot(pg, 'bolsillo_boton_' + lang)
        ctx.close()
    # ============ COMODÍN DE PALO: asterisco donde va el palo ============
    ctx, pg = boot(b)
    WILD = ['#..#..#', '.#.#.#.', '..###..', '#######', '..###..', '.#.#.#.', '#..#..#']
    def mask(id, x, y, w, h):
        return pg.evaluate("""async ([id, x, y, w, h]) => { const S = await import('/src/sprites.js'), K = await import('/src/cards.js');
          const img = new Image(); img.src = S.cardURL(K.makeCard(id)); await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
          const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(x, y, w, h).data; const rows = [];
          for (let j = 0; j < h; j++) { let r = ''; for (let i = 0; i < w; i++) { const k = (j * w + i) * 4, lum = 0.299 * d[k] + 0.587 * d[k + 1] + 0.114 * d[k + 2]; r += d[k + 3] > 0 && lum < 110 ? '#' : '.'; } rows.push(r); }
          return rows; }""", [id, x, y, w, h])
    def has_all(m, pat):      # todos los píxeles del patrón están en tinta
        return all(m[j][i] == '#' for j, row in enumerate(pat) for i, ch in enumerate(row) if ch == '#')
    for cid in ('dado_trucado', 'la_mujer'):
        tl, br, ce = mask(cid, 5, 15, 7, 7), mask(cid, 28, 34, 7, 7), mask(cid, 17, 24, 7, 7)
        # (las 2 últimas columnas de la esquina las pisa el sigilo del centro de la carta, igual que con cualquier palo: se compara el resto)
        check(f'W1[{cid}] el palo de la esquina superior izquierda es un ASTERISCO', [r[:5] for r in tl] == [r[:5] for r in WILD], tl)
        check(f'W2[{cid}] el de la esquina inferior derecha (girada) también', br == WILD, br)
        check(f'W3[{cid}] y el del hueco central de la carta', has_all(ce, WILD), ce)
    r1, r2 = mask('la_mujer', 5, 6, 5, 7), mask('sombra', 5, 6, 5, 7)
    check('W4 «La Mujer» (palo y rango comodín) lleva «*» también en el número (igual que «Sombra»)', has_all(r1, r2) and sum(row.count('#') for row in r2) >= 7, (r1, r2))
    sh_suit = mask('sombra', 5, 15, 9, 7)
    check('W5 «Sombra» (solo rango comodín) sigue con su ojo de palo, NO con asterisco', sh_suit != WILD and not has_all(sh_suit, WILD), sh_suit)
    for cid in ('key_06', 'eye_06', 'blood_06', 'tooth_06'):
        m = mask(cid, 5, 15, 9, 9)
        check(f'W6[{cid}] una carta normal no lleva asterisco en el palo', not has_all([r[:7] for r in m[:7]], WILD), m)
    # el Dado Trucado en la mesa: se ve el asterisco en la carta de la mano (mismo dibujo)
    ctx2, pg2 = boot(b); pg2.evaluate(PREP); round_with(pg2, ['dado_trucado', 'blood_07', 'key_05', 'key_06', 'eye_02', 'eye_03', 'eye_04'])
    src_die = pg2.evaluate("() => document.querySelector('.hand .card img').src")
    same = pg2.evaluate("""async (src) => { const S = await import('/src/sprites.js'), K = await import('/src/cards.js'); return S.cardURL(K.makeCard('dado_trucado')) === src; }""", src_die)
    check('W7 la carta del Dado Trucado de la mano usa el dibujo con asterisco', same)
    shot(pg2, 'dado_en_mano'); ctx2.close(); ctx.close()

    # ============ SPRITES: más trabajados (detalle, únicos y con los ojos en su sitio) ============
    ctx, pg = boot(b)
    sp = pg.evaluate("""async () => { const S = await import('/src/sprites.js'), A = await import('/src/chars-art.js'); const out = { ids: S.characterIds(), info: {}, eyeBad: [], hashes: {} };
      for (const id of out.ids) { const el = S.characterEl(id, { scale: 1 }); const im = el.querySelector('img.ch-body'); await new Promise(r => (im.complete ? r() : (im.onload = r)));
        const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const g = c.getContext('2d'); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data;
        let n = 0; const cols = new Set(); let h = 0; for (let i = 0; i < d.length; i += 4) { if (d[i + 3] > 0) { n++; cols.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]); } h = (h * 31 + d[i] + d[i + 1] * 3 + d[i + 2] * 7 + d[i + 3]) | 0; }
        out.info[id] = { w: c.width, h: c.height, px: n, cols: cols.size }; out.hashes[id] = h;
        const e = A.CHARS[id].eye; for (const sd of [-1, 1]) { if ((sd < 0 && e.skipL) || (sd > 0 && e.skipR)) continue; const x0 = Math.round(24 + sd * e.dx - e.w / 2); let hole = 0;
          for (let y = e.y - 1; y <= e.y + e.h; y++) for (let x = x0 - 1; x <= x0 + e.w; x++) if (d[(y * c.width + x) * 4 + 3] < 200) hole++; if (hole) out.eyeBad.push(id + ':' + sd); } }
      return out; }""")
    ids = sp['ids']; info = sp['info']
    check('S1 hay 25 sprites de personaje, todos de 48×64', len(ids) == 25 and all(v['w'] == 48 and v['h'] == 64 for v in info.values()), ids)
    check('S2 ninguno se repite (25 imágenes distintas)', len(set(sp['hashes'].values())) == 25)
    poor = [k for k, v in info.items() if v['cols'] < 28 or v['px'] < 1400]
    check('S3 todos son detallados: ≥ 28 colores y ≥ 1400 píxeles (antes: 10–24 colores)', not poor, {k: info[k] for k in poor})
    check('S4 El Ahogado y El Hombre de la Silla (los que no convencían) tienen ≥ 60 colores y más de 1900 píxeles', all(info[k]['cols'] >= 60 and info[k]['px'] > 1900 for k in ('drowned', 'chair')), {k: info[k] for k in ('drowned', 'chair')})
    check('S5 los ojos que se animan quedan sobre la cara (cuenca opaca en cada ojo, ninguno flotando en el vacío)', not sp['eyeBad'], sp['eyeBad'])
    check('S6 sin errores JS al dibujar y animar todos los personajes', not pg.errs, pg.errs[:2])
    pg.evaluate("""async () => { const S = await import('/src/sprites.js'); document.body.innerHTML = ''; document.body.style.cssText = 'background:#2a2420;display:grid;grid-template-columns:repeat(9,auto);gap:6px;padding:8px;overflow:visible;height:auto'; for (const id of S.characterIds()) document.body.appendChild(S.characterEl(id, { scale: 3 })); }""")
    pg.wait_for_timeout(300); shot(pg, 'sprites_todos')
    ctx.close()

    # ============ ARCHIVO: sigue abierto al salir y volver a entrar ============
    ctx, pg = boot(b); pg.evaluate(PREP)
    pg.evaluate("""async () => { const T = window.__HOUSE_TEST, G = T.G; G.beginRun('salon'); const FX = await import('/src/effects.js'); FX.registerDeath(); G.saveGame(); G.toMenu(); }""")
    pg.reload(); pg.wait_for_selector('body[data-ready="1"]'); pg.wait_for_timeout(500)
    st = pg.evaluate("() => ({ locked: !!document.querySelector('[data-act=\"menu_archive_locked\"]'), open: !!document.querySelector('[data-act=\"menu_archive\"]') })")
    check('A1 tras morir una vez, cerrar y volver a abrir el juego, el botón ARCHIVO sigue abierto', st['open'] and not st['locked'], st)
    ctx.close()
    ctx, pg = boot(b)
    st = pg.evaluate("() => ({ locked: !!document.querySelector('[data-act=\"menu_archive_locked\"]') })")
    check('A2 con una partida nueva el Archivo sigue bloqueado', st['locked'], st)
    ctx.close()
    b.close()

bad = [n for n, ok in res if not ok]
print(f'\n{len(res)} comprobaciones, {len(bad)} fallan' + ((': ' + ' | '.join(bad)) if bad else ''))
sys.exit(1 if bad else 0)
