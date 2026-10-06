#!/usr/bin/env python3
"""Auditor de idiomas en Chromium real. Recorre TODO el juego en un idioma (por defecto inglés) y comprueba que ninguna cadena
que llega al DOM —texto, title, aria-label, avisos, pancartas, tooltips— es el nombre de una clave sin traducir, un {marcador}
sin sustituir, ni basura de programación (undefined / null / NaN / [object Object]); y que t() no ha tenido que devolver nunca
el nombre de una clave inexistente. Además informa de la cobertura: qué claves de locales/<idioma>.json se han pedido.
Uso: python3 tools/test-i18n.py [--lang en] [--langs en,es,fr,de,eu] [--url http://localhost:8080/index.html?test] [--min-cover 0.9]"""
import sys, json, re, os, argparse
from pathlib import Path
from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser()
ap.add_argument('--lang', default='en'); ap.add_argument('--langs', default='')
ap.add_argument('--url', default='http://localhost:8080/index.html?test'); ap.add_argument('--min-cover', type=float, default=0.0)
ap.add_argument('--verbose', action='store_true'); ap.add_argument('--dump-used', default='')
A = ap.parse_args()
ROOT = Path(__file__).resolve().parent.parent
LOC = {l: json.load(open(ROOT / 'locales' / (l + '.json'), encoding='utf-8')) for l in ['es', 'en', 'fr', 'de', 'eu']}
NS = sorted({k.split('.')[0] for k in LOC['en']})
OBS = (ROOT / 'tools' / 'i18n-observer.js').read_text(encoding='utf-8')
LOCALE_TAG = {'es': 'es-ES', 'en': 'en-US', 'fr': 'fr-FR', 'de': 'de-DE', 'eu': 'eu-ES'}
res = []
def check(name, cond, extra=''):
    res.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name + ((' — ' + str(extra)) if extra != '' and not cond else ''), flush=True)

def run_lang(b, lang):
    ctx = b.new_context(viewport={'width': 1280, 'height': 720}, locale=LOCALE_TAG[lang])
    ctx.add_init_script("localStorage.setItem('thaw.settings.v1', JSON.stringify(%s))" % json.dumps({'lang': lang, 'reduceEffects': True, 'muteMusic': True, 'muteSfx': True, 'quality': 'low'}))
    ctx.add_init_script('window.__KEY_NS__ = ' + json.dumps(NS) + ';'); ctx.add_init_script(OBS)
    pg = ctx.new_page(); pg.errs = []
    pg.on('pageerror', lambda e: pg.errs.append('PAGEERROR ' + str(e)))
    pg.on('console', lambda m: pg.errs.append('CONSOLE ' + m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    pg.set_default_timeout(5000)
    pg.goto(A.url); pg.wait_for_selector('body[data-ready="1"]', timeout=15000); pg.wait_for_timeout(300)
    T = lambda code, arg=None: pg.evaluate("async (arg) => { const T = window.__HOUSE_TEST; const G = T.G, CB = T.C, S = T.S, st = T.st, gs = T.st.gs; " + code + "}", arg)
    tag = f'[{lang}] '
    def leaks(phase):
        got = pg.evaluate("(() => { const a = [...window.__leaks.entries()]; window.__leaks.clear(); return a; })()")
        check(tag + phase + ': ningún texto sospechoso en pantalla', not got, got[:6])

    # ---------- 1. menú, ajustes, ayuda ----------
    leaks('arranque / menú')
    pg.click('[data-act="settings"]'); pg.wait_for_selector('.modal'); pg.wait_for_timeout(100)
    for i in range(pg.locator('.modal .seg button:not([lang])').count()): pg.locator('.modal .seg button:not([lang])').nth(i).click(); pg.wait_for_timeout(20)
    for i in range(pg.locator('.modal input[type=checkbox]').count()): pg.locator('.modal input[type=checkbox]').nth(i).click(); pg.locator('.modal input[type=checkbox]').nth(i).click()
    leaks('ajustes'); pg.keyboard.press('Escape')
    pg.click('[data-act="howto"]'); pg.wait_for_selector('.modal.howto-modal, .howto'); pg.wait_for_timeout(100)
    for d in pg.query_selector_all('.howto details'): d.evaluate('e => e.open = true')
    leaks('guía «cómo se juega»')
    pg.click('.modal .row .btn:not(.primary)'); pg.wait_for_timeout(150); leaks('guía de cartas'); pg.keyboard.press('Escape'); pg.keyboard.press('Escape')
    if pg.query_selector('[data-act="menu_archive"]'): pg.click('[data-act="menu_archive"]'); pg.wait_for_timeout(120); leaks('archivo bloqueado/abierto desde el menú'); T("G.toMenu()")

    # ---------- 2. archivo con TODO desbloqueado ----------
    T("""const C = await import('/src/content.js'), A = await import('/src/achievements.js');
         const m = gs.meta; m.endings = C.ENDING_ORDER.slice(); m.memories = C.MEMORY_ORDER.slice(); m.knowledge = C.KNOWLEDGE.slice(); gs.discoveredCharacters = C.CHARACTERS.slice(); gs.deaths = 3;
         m.tutorial.round = true; m.runsFinished = 9; m.wingsCleared = ['salon','pasillo','sotano','capilla','cocinas','enfermeria','teatro','vigilancia'];
         for (const id of A.EGGS) A.unlockEgg(id);
         G.openArchive();""")
    pg.wait_for_selector('.archive'); leaks('archivo')
    for tab in ['endings', 'chars', 'eggs', 'know', 'stats']:
        pg.click(f'[data-act="arc_tab"][data-arg="{tab}"]'); pg.wait_for_timeout(80)
        for _ in range(4):
            nxt = pg.query_selector('[data-act="arc_page"][data-arg$=":1"]:not([disabled])')
            if not nxt: break
            nxt.click(); pg.wait_for_timeout(50)
        leaks('archivo · ' + tab)
    T("G.toMenu()"); pg.wait_for_timeout(100)

    # ---------- 3. pantalla de alas + una partida por ala ----------
    T("""G.newGame(); G.introDone(); gs.meta.tutorial.round = true; gs.meta.runsFinished = 9; gs.meta.wingsCleared = ['salon','pasillo','sotano','capilla','cocinas','enfermeria','teatro','vigilancia']; gs.meta.stats.anomalies = 3; G.chooseWing();""")
    pg.wait_for_timeout(150); leaks('pantalla de alas')
    wings = T("const C = await import('/src/content.js'); return Object.keys(C.WING_INFO)")
    for w in wings:
        T("""const C = await import('/src/content.js'); const p = gs.player; G.beginRun(arg); p.maxHealth = 999; p.health = 999; p.sanity = 100; p.money = 900; gs.meta.tutorial.round = true;
             for (const id of C.ITEMS) if (!gs.inventory.includes(id)) gs.inventory.push(id); """, w)
        pg.wait_for_timeout(120); leaks('mapa · ' + w)
        for e in pg.query_selector_all('#view .node, #view .map-box [data-node]')[:3]: e.hover(); pg.wait_for_timeout(30)
        # cada nodo del mapa: su primera pantalla
        info = T("""const out = []; for (const row of gs.run.map.rows) for (const nd of row) out.push({ id: nd.id, kind: nd.kind, row: nd.row, opp: nd.opp ? nd.opp.id : null }); return out""")
        for nd in info:
            try:
                T("""const nd = gs.run.map.rows.flat().find(x => x.id === arg.id); G.G.node = nd; gs.run.pos = nd.id; gs.run.pending = nd.id;
                     if (nd.kind === 'game') G.enterRound(nd); else if (nd.kind === 'event' || nd.kind === 'secret') G.enterEvent(nd); else if (nd.kind === 'shotgun') G.enterDuelSetup(nd);
                     else if (nd.kind === 'merchant') G.enterMerchant(nd); else if (nd.kind === 'rest') G.enterRest(nd); else if (nd.kind === 'boss') G.enterBoss(nd);""", nd)
                pg.wait_for_timeout(40)
                for e in pg.query_selector_all('#view .ruletag, #view .joker, #hud .stat, #view .shieldchip'): e.hover(); pg.wait_for_timeout(15)
                pg.mouse.move(2, 2)
            except Exception as ex:
                pg.errs.append(f'{w}/{nd["kind"]}: {str(ex)[:200]}')
        leaks(f'nodos del ala {w} ({len(info)} nodos)')
        T("G.showMap()")

    # ---------- 4. todos los eventos, con todas sus opciones ----------
    evs = T("const C = await import('/src/content.js'); return Object.keys(C.EVENTS).map(id => [id, !!C.EVENTS[id].hid])")
    T("const p = gs.player; p.maxHealth = 999; p.health = 999; p.sanity = 100; p.money = 900; gs.deaths = 3;")
    for id, hid in evs:
        for k in ['a', 'b'] + (['h'] if hid else []):
            try:
                T("""const p = gs.player; p.maxHealth = 999; p.health = 999; p.sanity = 100; if (!gs.run) G.beginRun('salon'); gs.run.pending = null; G.debugEvent(arg.id);
                     if (arg.k === 'h') { for (const f of ['room13_hint', 'girl_trust']) gs.flags[f] = true; }
                     G.eventChoose(arg.k);""", {'id': id, 'k': k})
                pg.wait_for_timeout(25)
            except Exception as ex: pg.errs.append(f'evento {id}/{k}: {str(ex)[:200]}')
        # solo la pantalla de elección
        T("G.debugEvent(arg)", id); pg.wait_for_timeout(15)
    leaks(f'todos los eventos ({len(evs)}) con sus opciones')

    # ---------- 5. guardianes, final, puertas, finales, muerte ----------
    bosses = T("const C = await import('/src/content.js'); return Object.keys(C.BOSSES)")
    for bid in bosses:
        T("""const nd = { id: 'bx', row: 12, kind: 'boss', opp: { id: arg }, hidden: true }; G.G.node = nd; G.enterBoss(nd);""", bid); pg.wait_for_timeout(40)
        for e in pg.query_selector_all('#view .ruletag'): e.hover(); pg.wait_for_timeout(15)
        T("G.bossStart()"); pg.wait_for_timeout(60)
        for e in pg.query_selector_all('#view .ruletag, #view .joker, #hud .stat'): e.hover(); pg.wait_for_timeout(15)
        pg.mouse.move(2, 2)
    leaks(f'guardianes ({len(bosses)}) y sus mesas')
    T("""G.startFinale();"""); pg.wait_for_timeout(80); leaks('final · etapa 1')
    T("""gs.run.finalStage = 2; G.finaleContinue ? 0 : 0;""")
    T("""const C = await import('/src/content.js'); gs.inventory = C.ITEMS.slice(); gs.meta.endings = ['crupier','deuda','espectador','partida','puerta'];  G.showDoor();"""); pg.wait_for_timeout(80); leaks('puertas del final')
    ends = T("const C = await import('/src/content.js'); return C.ENDING_ORDER")
    for eid in ends:
        T("""const bus = (await import('/src/state.js')).bus; bus.emit('view', { type: 'ending', id: arg, first: true, memories: [], endingsSeen: gs.meta.endings.slice(), total: 6, trueOpen: true, music: 'victory' });""", eid); pg.wait_for_timeout(60)
    leaks('finales (%d)' % len(ends))
    T("""gs.player.health = 0; gs.pendingDeath = true; G.checkDeath();"""); pg.wait_for_timeout(120); leaks('pantalla de muerte')

    # ---------- 6. duelos: todos los rivales y herramientas ----------
    T("""G.newGame(); G.introDone(); gs.meta.tutorial.round = true; G.beginRun('salon'); const p = gs.player; p.maxHealth = 999; p.health = 999; p.sanity = 100; p.money = 900;""")
    foes = T("const C = await import('/src/content.js'); const F = [...C.DUEL_FOES, ...Object.values(C.WING_FOES || {}).flat()]; return [...new Set(F)]")
    looks = T("const C = await import('/src/content.js'); return C.GAMBLERS")
    for fid in foes:
        for look in (looks if fid == 'gambler' else [None]):
            try:
                T("""const nd = { id: 'dx', row: 6, kind: 'shotgun', opp: { id: arg.f, look: arg.l } }; gs.run.pending = 'dx'; G.G.node = nd; G.enterDuelSetup(nd);""", {'f': fid, 'l': look}); pg.wait_for_timeout(40)
                for st_ in ['money', 'sanity', 'debt', 'card']:
                    T("""const nd = { id: 'dx', row: 6, kind: 'shotgun', opp: { id: arg.f, look: arg.l } }; G.G.node = nd; G.enterDuelSetup(nd); G.duelStart(arg.s);""", {'f': fid, 'l': look, 's': st_}); pg.wait_for_timeout(120)
                    if pg.query_selector('[data-act="duel_listen"]:not([disabled])'): pg.click('[data-act="duel_listen"]'); pg.wait_for_timeout(60)
                    for e in pg.query_selector_all('#view .duel-tool, #view [data-act="duel_tool"]'): e.hover(); pg.wait_for_timeout(15)
                    if pg.query_selector('[data-act="duel_shoot"][data-arg="foe"]:not([disabled])'): pg.click('[data-act="duel_shoot"][data-arg="foe"]'); pg.wait_for_timeout(200)
            except Exception as ex: pg.errs.append(f'duelo {fid}: {str(ex)[:200]}')
    leaks('duelos (rivales × apuestas)')

    # ---------- 7. objetos, herramientas, jokers, cartas especiales, mejoras: inventario, mazo y tooltips ----------
    T("""const C = await import('/src/content.js'), K = await import('/src/cards.js'), J = await import('/src/jokers.js'), FX = T.FX;
         G.newGame(); G.introDone(); gs.meta.tutorial.round = true; G.beginRun('salon');
         gs.inventory = C.ITEMS.slice(); gs.tools = Object.keys(C.TOOLS).slice(0, 4); gs.jokers = Object.keys(J.JOKERS).slice(0, 5);
         for (const id of K.SPECIAL_IDS) FX.addToDeck(id); K.MODS.forEach((m, i) => gs.deck[i * 3].mods.push(m)); gs.handLevels = { pair: 2, flush: 1, royal: 3 };
         gs.player.debt = 120; G.showMap();""")
    pg.click('[data-act="inventory"]'); pg.wait_for_selector('.modal'); pg.wait_for_timeout(100)
    for e in pg.query_selector_all('.modal .joker'): e.hover(); pg.wait_for_timeout(20)
    leaks('inventario'); pg.keyboard.press('Escape')
    pg.click('[data-act="deck"]'); pg.wait_for_selector('.modal'); pg.wait_for_timeout(120)
    for e in pg.query_selector_all('.modal .card')[:80]: e.hover(); pg.wait_for_timeout(8)
    for k in ['rank', 'special', 'recent', 'suit']:
        b_ = pg.query_selector(f'.modal [data-sort="{k}"]')
        if b_: b_.click(); pg.wait_for_timeout(60)
    if pg.query_selector('.modal [data-only="sp"]'): pg.click('.modal [data-only="sp"]'); pg.wait_for_timeout(60)
    leaks('visor del mazo'); pg.keyboard.press('Escape')
    # cada comodín, objeto, carta especial y mejora «tal como se ve» (tooltip incluido)
    T("""const J = await import('/src/jokers.js'); const ui = await import('/src/ui.js'); const root = document.createElement('div'); root.id = 'audit-j'; root.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;display:flex;flex-wrap:wrap;width:1200px';
         for (const id of Object.keys(J.JOKERS)) root.appendChild(ui.jokerEl(id)); const K = await import('/src/cards.js');
         for (const id of K.SPECIAL_IDS) root.appendChild(ui.cardEl(gs.deck.find(c => c.id === id))); document.body.appendChild(root);""")
    for e in pg.query_selector_all('#audit-j .joker, #audit-j .card'): e.hover(); pg.wait_for_timeout(15)
    pg.mouse.move(2, 2); leaks('comodines y cartas especiales (tooltips y descripciones)')
    pg.evaluate("document.getElementById('audit-j').remove()")

    # ---------- 8. mesa de cartas: reglas, manos, combos, escudo, apuestas ----------
    rules = T("return CB.OPP_RULES")
    T("""const nd = { id: 'rx', row: 8, kind: 'game', opp: { id: 'gambler', rule: arg, look: 'gambler_d' } }; gs.run.pending = 'rx'; G.G.node = nd; G.enterRound(nd);""", rules[:2]); pg.wait_for_timeout(100)
    for r in rules:
        T("""const nd = { id: 'rx' + arg, row: 8, kind: 'game', opp: { id: 'gambler', rule: [arg], look: 'gambler_d' } }; gs.run.pending = nd.id; G.G.node = nd; G.enterRound(nd);""", r); pg.wait_for_timeout(60)
        for e in pg.query_selector_all('#view .ruletag, #view .jokerbar .joker, #view .shieldchip, #hud .stat'): e.hover(); pg.wait_for_timeout(15)
        for _ in range(3):
            best = T("const b = CB.bestPlay(G.G.R); return b ? b.uids : null")
            if not best or pg.evaluate("document.body.dataset.view") != 'round': break
            for u in best: pg.click(f'.hand .card[data-uid="{u}"], .pocketbar .card[data-uid="{u}"]')
            pg.click('[data-act="tb_play"]'); pg.wait_for_timeout(160)
            leaks('mesa · regla ' + r + ' · tras jugar')
            if pg.evaluate("document.body.dataset.view") == 'round_result': break
    T("""G.beginRun('salon');"""); pg.wait_for_timeout(50)
    pg.click('[data-act="help"]') if pg.query_selector('[data-act="help"]') else None; pg.wait_for_timeout(120); leaks('guía de la mesa'); pg.keyboard.press('Escape')

    # ---------- 9. cambio de idioma en caliente: todo sigue traducido ----------
    for other in [l for l in LOC if l != lang][:2]:
        T("await (await import('/src/i18n.js')).setLang(arg)", other); pg.wait_for_timeout(100)
        T("await (await import('/src/i18n.js')).setLang(arg)", lang); pg.wait_for_timeout(100)
    leaks('cambiar de idioma en caliente')

    # ---------- balance ----------
    mk = pg.evaluate('window.__HOUSE_TEST.missingKeys()')
    check(tag + 't() no devolvió nunca el nombre de una clave inexistente', not mk, mk[:15])
    used = set(pg.evaluate('window.__HOUSE_TEST.usedKeys()'))
    if A.dump_used: json.dump(sorted(used), open(A.dump_used, 'w'))
    allk = set(LOC[lang]); never = sorted(allk - used)
    cover = 1 - len(never) / len(allk)
    print(f'     cobertura de claves pedidas: {100 * cover:.1f} % ({len(allk) - len(never)}/{len(allk)})')
    if A.verbose: print('     sin pedir:', json.dumps(never))
    check(tag + f'cobertura de claves ≥ {A.min_cover:.0%}', cover >= A.min_cover, f'{cover:.1%}; ejemplos: {never[:25]}')
    check(tag + 'sin errores JS', not pg.errs, pg.errs[:6])
    ctx.close()
    return never

with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    langs = [l for l in (A.langs.split(',') if A.langs else [A.lang]) if l]
    for l in langs: run_lang(b, l)
    b.close()
bad = [n for n, ok in res if not ok]
print(f'\n{len(res) - len(bad)} ok, {len(bad)} fallos')
sys.exit(1 if bad else 0)
