#!/usr/bin/env python3
"""Auditoría del ALTO CONTRASTE en Chromium real: con el ajuste activado, todo texto visible debe tener contraste ≥ 7:1 (AAA) con su fondo
(≥ 3:1 si el control está desactivado) y los bordes de paneles y botones ≥ 3:1. Recorre las pantallas principales, los modales y las descripciones.
Calcula el fondo componiendo los colores de los ancestros (sin fiarse de la imagen de fondo: se supone en el peor caso un 12 % de blanco).
Uso: python3 tools/test-contrast.py [--url http://localhost:8080/index.html] [--langs es,eu] [--normal]   (--normal: mide SIN alto contraste, para comparar)"""
import sys, json
from playwright.sync_api import sync_playwright
URL = sys.argv[sys.argv.index('--url') + 1] if '--url' in sys.argv else 'http://localhost:8080/index.html'
LANGS = (sys.argv[sys.argv.index('--langs') + 1] if '--langs' in sys.argv else 'es').split(','); HC = '--normal' not in sys.argv
LOC = {'es': 'es-ES', 'en': 'en-US', 'fr': 'fr-FR', 'de': 'de-DE', 'eu': 'eu-ES'}
CHECK = r"""(opts) => {
  const parse = c => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return { r: 0, g: 0, b: 0, a: 0 }; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = c => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const over = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgCanvas = document.querySelector('#bg canvas'); const art = bgCanvas ? parseFloat(getComputedStyle(bgCanvas).opacity) : 0;
  const base = { r: 255 * art, g: 255 * art, b: 255 * art, a: 1 };   // peor caso: arte blanco con la opacidad del fondo
  function bgOf(el) { const layers = []; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const cs = getComputedStyle(e); const bg = parse(cs.backgroundColor); let a = bg.a; const o = parseFloat(cs.opacity); if (a > 0) layers.push({ r: bg.r, g: bg.g, b: bg.b, a: a }); if (a >= 1 && o >= 1) break; if (cs.backgroundImage !== 'none' && a < 1) layers.push({ r: 30, g: 30, b: 30, a: 0.0 }); } let c = base; for (const l of layers.reverse()) c = over(l, c); return c; }
  const opac = el => { let o = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity); return o; };
  const sel = el => { const p = []; for (let e = el, n = 0; e && e.nodeType === 1 && n < 4 && e.id !== 'stage'; e = e.parentElement, n++) p.unshift(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + [...e.classList].slice(0, 2).map(c => '.' + c).join('')); return p.join(' > '); };
  const st = document.querySelector('#stage').getBoundingClientRect(); const out = []; const seen = new Set();
  for (const el of document.querySelectorAll('#stage *, .tip-pop, .modal-back *')) {
    const direct = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim().length > 0).map(n => n.textContent.trim()).join(' '); if (!direct) continue;
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue; if (r.right < st.left || r.left > st.right || r.bottom < st.top || r.top > st.bottom) continue;
    if (el.closest('[hidden], .sr, [aria-hidden="true"], canvas, svg, script, style, option')) continue;
    if (el.closest('.fxbanner, .float, .ember, #whispers')) continue;   // efectos efímeros decorativos
    let fg = parse(cs.color); const bg = bgOf(el); const o = opac(el); fg.a = fg.a * o; const eff = over(fg, bg);
    const dis = !!el.closest(':disabled, [disabled], .off, .locked, .lost'); const need = dis ? 3 : (opts.need || 7);
    const rr = ratio(eff, bg); const key = sel(el) + '|' + direct.slice(0, 20);
    if (rr < need && !seen.has(key)) { seen.add(key); out.push({ kind: 'texto', sel: sel(el), text: direct.slice(0, 36), fg: [Math.round(eff.r), Math.round(eff.g), Math.round(eff.b)], bg: [Math.round(bg.r), Math.round(bg.g), Math.round(bg.b)], ratio: Math.round(rr * 100) / 100, need }); }
  }
  for (const el of document.querySelectorAll('#stage .panel, #stage .hands-panel, #stage .btn:not(:disabled), #stage .tag, #stage .stat, .tip-pop, .modal')) {
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue; const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || el.closest('[hidden]')) continue;
    const bw = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderLeftWidth); const bc = parse(cs.borderTopColor); const parentBg = el.parentElement ? bgOf(el.parentElement) : base; const own = over(parse(cs.backgroundColor), parentBg);
    const okBorder = bw > 0 && bc.a > 0 && ratio(over(bc, parentBg), parentBg) >= 3; const okFill = ratio(own, parentBg) >= 3;
    if (!okBorder && !okFill && !el.matches('.stat, .tag')) { const key = 'borde|' + sel(el); if (!seen.has(key)) { seen.add(key); out.push({ kind: 'borde', sel: sel(el), text: '', fg: [], bg: [], ratio: 0, need: 3 }); } }
  }
  return out; }"""

LEGAL_CHECK = r"""() => {
  const parse = c => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return { r: 0, g: 0, b: 0, a: 0 }; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = c => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const over = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgOf = el => { const layers = []; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const bg = parse(getComputedStyle(e).backgroundColor); if (bg.a > 0) layers.push(bg); if (bg.a >= 1) break; } let c = { r: 0, g: 0, b: 0, a: 1 }; for (const l of layers.reverse()) c = over(l, c); return c; };
  const out = [];
  for (const el of document.querySelectorAll('body *')) { const t = [...el.childNodes].filter(x => x.nodeType === 3 && x.textContent.trim()).map(x => x.textContent.trim()).join(' '); if (!t) continue;
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || el.closest('script, style, noscript')) continue; const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    const bg = bgOf(el), fg = over(parse(cs.color), bg), rr = ratio(fg, bg); if (rr < 7) out.push({ kind: 'texto', sel: el.tagName.toLowerCase() + '.' + el.className, text: t.slice(0, 36), fg: [Math.round(fg.r), Math.round(fg.g), Math.round(fg.b)], bg: [Math.round(bg.r), Math.round(bg.g), Math.round(bg.b)], ratio: Math.round(rr * 100) / 100, need: 7 }); }
  return out; }"""
PREP = """() => { const T = window.__HOUSE_TEST, G = T.G, st = T.st; st.settings.reduceEffects = true; st.settings.textSpeed = 'instant'; G.newGame(); G.introDone(); const m = st.gs.meta; m.tutorial.round = true; m.tutorial.duel = true; m.stats.anomalies = 1; m.hints = { map: 1, event: 1, merchant: 1, rest: 1, boss: 1, shield: 1, guide: 1 }; m.runsFinished = 4; m.wingsCleared = ['salon', 'pasillo', 'sotano']; for (const id of ['girl', 'chair', 'child', 'merchant', 'woman', 'drowned', 'archivist', 'nun', 'cook', 'nurse', 'puppet', 'pianist', 'prompter', 'usher', 'watcher', 'concierge']) T.FX.discoverCharacter(id); T.ACH.unlockEgg('real'); T.ACH.unlockEgg('ojos'); }"""
SET_HC = """async (on) => { const T = window.__HOUSE_TEST; T.st.settings.contrast = !!on; const { fx } = await import('/src/fx.js'); fx.applyDisplay(); }"""
bad_all = []
with sync_playwright() as p:
    b = p.chromium.launch()
    for lang in LANGS:
        ctx = b.new_context(viewport={'width': 1280, 'height': 720}, locale=LOC[lang]); pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'Failed to load' not in m.text else None)
        pg.goto(URL + '?test'); pg.wait_for_selector('body[data-ready="1"]', timeout=15000); pg.wait_for_timeout(300)
        pg.evaluate(PREP); pg.evaluate(SET_HC, HC); pg.wait_for_timeout(200)
        n = 0
        def step(name, code, wait='#view .scr', extra=None, ms=350):
            global n
            try:
                for _ in range(3): pg.keyboard.press('Escape'); pg.wait_for_timeout(50)   # cierra modales/descripciones abiertas
                pg.mouse.move(2, 2);
                pg.evaluate(code); pg.wait_for_selector(wait, timeout=4000); pg.wait_for_timeout(ms)
                if extra: extra()
                v = pg.evaluate(CHECK, {'need': 7}); n += 1
                for x in v: x['screen'] = name; x['lang'] = lang; bad_all.append(x)
                print(f'  {"ok  " if not v else "MAL "} [{lang}] {name:22s} {len(v)} fallos' + ('' if not v else '  p. ej. ' + json.dumps(v[0], ensure_ascii=False)[:200]), flush=True)
            except Exception as e: print(f'  ERROR [{lang}] {name}: {str(e)[:100]}', flush=True); bad_all.append({'screen': name, 'lang': lang, 'kind': 'error', 'sel': str(e)[:80], 'text': '', 'ratio': 0})
        step('menu', "() => { window.__HOUSE_TEST.G.toMenu(); }")
        step('wings', "() => { window.__HOUSE_TEST.G.chooseWing(); }", '.wing')
        step('map', "() => { const T = window.__HOUSE_TEST; T.G.beginRun('salon'); for (const id of ['bufon', 'as_manga', 'sonrisa']) T.FX.addJoker(id); T.G.showMap(); }", '.map-jokers')
        step('map+guía', "() => { const T = window.__HOUSE_TEST; T.st.gs.meta.hints = {}; T.G.showMap(); }", '.mapscr .sys-tip')
        step('map+misiones', "() => { window.__HOUSE_TEST.st.gs.meta.hints = { map: 1, guide: 1, shield: 1 }; window.__HOUSE_TEST.G.showMap(); setTimeout(() => document.querySelector('[data-act=\"map_missions\"]').click(), 60); }", '.miss')
        step('inventario', "() => { window.__HOUSE_TEST.G.showMap(); setTimeout(() => document.querySelector('#hud [data-act=\"inventory\"]').click(), 60); }", '.modal')
        step('mazo', "() => { window.__HOUSE_TEST.G.showMap(); setTimeout(() => document.querySelector('#hud [data-act=\"deck\"]').click(), 60); }", '.deck-modal .card', lambda: pg.hover('.deck-grid .card'))
        step('mesa', "() => { const T = window.__HOUSE_TEST; T.G.beginRun('salon'); T.FX.addJoker('bufon'); T.G.enterRound({ id: 'r1c0', row: 1, kind: 'game', opp: { id: 'prompter', rule: ['no_repeat', 'remember', 'mist'] } }); }", '.tbl .ruletag', lambda: pg.evaluate("() => { const ids = window.__HOUSE_TEST.G.G.R.hand.slice(0, 2).map(c => c.uid); ids.forEach(u => { const e = document.querySelector('.hand [data-arg=\"' + u + '\"]'); if (e) e.click(); }); }"))
        step('mesa+descripción', "() => { const T = window.__HOUSE_TEST; T.G.beginRun('salon'); T.FX.addJoker('bufon'); T.G.enterRound({ id: 'r1c0', row: 1, kind: 'game', opp: { id: 'prompter', rule: ['no_repeat', 'remember', 'mist'] } }); }", '.tbl .ruletag', lambda: (pg.hover('.tbl .ruletag'), pg.wait_for_timeout(200)))
        step('mesa+recurso', "() => { const T = window.__HOUSE_TEST; T.G.beginRun('salon'); T.st.gs.player.debt = 120; T.G.enterRound({ id: 'r1c0', row: 1, kind: 'game', opp: { id: 'dealer', rule: [] } }); }", '.tbl', lambda: (pg.hover('#hud .stat[data-k="debt"]'), pg.wait_for_timeout(200)))
        step('mesa+comodín', "() => { const T = window.__HOUSE_TEST; T.G.beginRun('salon'); T.FX.addJoker('bufon'); T.G.enterRound({ id: 'r1c0', row: 1, kind: 'game', opp: { id: 'dealer', rule: [] } }); }", '.tbl .jokerbar .joker[data-joker]', lambda: (pg.hover('.tbl .jokerbar .joker[data-joker]'), pg.wait_for_timeout(200)))
        step('mesa+guía', "() => { const T = window.__HOUSE_TEST; T.st.gs.meta.hints = {}; T.st.gs.meta.tutorial.round = false; T.G.enterRound({ id: 'r1c0', row: 1, kind: 'game', tutorial: true, opp: { id: 'dealer', rule: [] } }); }", '.felt .sys-tip')
        step('toasts', "() => { const T = window.__HOUSE_TEST; T.st.bus.emit('toast', { key: 'egg.unlocked', vars: { name: 'Prueba' }, kind: 'memory' }); T.st.bus.emit('toast', { key: 'ui.out.gamble_lost', kind: 'bad' }); T.st.bus.emit('toast', { key: 'ui.out.gamble_won', kind: 'good' }); }", '#toasts .toast')
        step('duelo-apuesta', "() => { window.__HOUSE_TEST.G.beginRun('salon'); window.__HOUSE_TEST.st.gs.player.money = 100; window.__HOUSE_TEST.G.enterDuelSetup({ id: 'r2c0', row: 2, kind: 'shotgun', opp: { id: 'gambler', look: 'gambler_d' } }); }", '.duelsetup .rest-opts')
        def duel_play():
            pg.click('[data-act="duel_stake"][data-arg="money"]'); pg.wait_for_selector('.drum .ch')
            pg.evaluate("() => { const D = window.__HOUSE_TEST.G.G.D; D.rng.chance = () => true; D.chambers[D.pos] = true; D.turn = 'p'; window.__HOUSE_TEST.st.gs.player.sanity = 80; }")
            pg.click('[data-act="duel_listen"]'); pg.wait_for_selector('.heard', timeout=8000); pg.wait_for_timeout(300)
            pg.click('[data-act="duel_shoot"][data-arg="table"]'); pg.wait_for_timeout(2500)
        step('duelo', "() => 0", '[data-act=\"duel_stake\"][data-arg=\"money\"]', duel_play, 200)
        for bs in ['girl', 'nun']:
            step('guardián ' + bs, "() => { const T = window.__HOUSE_TEST, G = T.G, st = T.st; G.beginRun('salon'); if ('" + bs + "' === 'nun') T.FX.learn('k_nun_name'); const run = st.gs.run; const bn = run.map.rows[run.map.rows.length - 1][0]; run.pos = bn.id; G.G.node = bn; G.enterBoss({ id: bn.id, row: bn.row, kind: 'boss', opp: { id: '" + bs + "' } }); }", '.bossscr .ruletag')
        step('tienda', "() => { const T = window.__HOUSE_TEST; T.G.beginRun('salon'); T.G.enterMerchant({ id: 'm1', row: 5, kind: 'merchant', links: [] }); }")
        step('descanso', "() => { const T = window.__HOUSE_TEST; T.G.beginRun('salon'); T.G.enterRest(); }")
        step('suceso', "() => { const T = window.__HOUSE_TEST; T.G.beginRun('salon'); T.G.debugEvent('nun_2'); }")
        step('suceso+resultado', "() => 0", '[data-act=\"ev_choose\"]', lambda: (pg.evaluate("() => { document.querySelector('[data-act=\"ev_choose\"][data-arg=\"a\"]').click(); }"), pg.wait_for_timeout(1800)))
        step('archivo', "() => { window.__HOUSE_TEST.G.openArchive(); }", '.archive')
        for tab in ['chars', 'eggs', 'know', 'stats']: step('archivo-' + tab, "() => { document.querySelector('[data-act=\"arc_tab\"][data-arg=\"" + tab + "\"]').click(); }", '.archive')
        step('ajustes', "() => { window.__HOUSE_TEST.G.toMenu(); setTimeout(() => document.querySelector('#view [data-act=\"settings\"]').click(), 60); }", '.modal')
        step('guía', "() => { window.__HOUSE_TEST.G.toMenu(); setTimeout(() => document.querySelector('#view [data-act=\"howto\"]').click(), 60); }", '.howto-modal', lambda: pg.evaluate("() => { const d = document.querySelector('.howto-modal details'); if (d) d.open = true; }"))
        print(f'[{lang}] {n} pantallas medidas · errores JS: {errs[:2]}', flush=True); ctx.close()
    # página «Privacidad y aviso» (otra página, mismo ajuste de alto contraste guardado en localStorage)
    LEGAL = URL.rsplit('/', 1)[0] + '/legal/privacy.html'
    for lang in LANGS:
        ctx = b.new_context(viewport={'width': 1280, 'height': 720}, locale=LOC[lang])
        ctx.add_init_script("localStorage.setItem('thaw.settings.v1', JSON.stringify({ lang: '%s', contrast: %s }));" % (lang, 'true' if HC else 'false'))
        pg = ctx.new_page(); pg.goto(LEGAL); pg.wait_for_selector('main h1, main h2', timeout=8000); pg.wait_for_timeout(400)
        v = pg.evaluate(LEGAL_CHECK)
        for x in v: x['screen'] = 'privacidad'; x['lang'] = lang; bad_all.append(x)
        print(f'  {"ok  " if not v else "MAL "} [{lang}] {"privacidad":22s} {len(v)} fallos' + ('' if not v else '  p. ej. ' + json.dumps(v[0], ensure_ascii=False)[:200]), flush=True); ctx.close()
    b.close()
by = {}
for x in bad_all: by.setdefault((x.get('kind'), x.get('sel')), []).append(x)
print(f'\n{"ALTO CONTRASTE" if HC else "SIN alto contraste"}: {len(bad_all)} incumplimientos en {len(by)} elementos distintos')
for (k, s), xs in sorted(by.items(), key=lambda kv: -len(kv[1]))[:60]:
    x = xs[0]; print(f'  [{k}] {s}  «{x.get("text", "")}»  ratio {x.get("ratio")} (necesita {x.get("need", 7)}) fg={x.get("fg")} bg={x.get("bg")}  · en {sorted({y["screen"] for y in xs})[:4]}')
sys.exit(1 if bad_all else 0)
