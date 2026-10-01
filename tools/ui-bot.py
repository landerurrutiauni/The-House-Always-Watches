#!/usr/bin/env python3
"""Bot de interfaz: juega por clics reales en Chromium (Playwright), captura pantallas y detecta errores.
Uso: python3 tools/ui-bot.py [--url http://localhost:8766/index.html] [--steps 400] [--w 1280] [--h 720] [--seed 1]
                             [--shots DIR] [--lang es] [--mobile] [--no-cookies] [--fuzz]
Comprueba: sin errores JS/consola, sin claves i18n a la vista, sin botones muertos, sin atascos."""
import sys, re, random, argparse, json, os, time
from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser()
ap.add_argument('--url', default='http://localhost:8080/index.html?test'); ap.add_argument('--steps', type=int, default=300)
ap.add_argument('--w', type=int, default=1280); ap.add_argument('--h', type=int, default=720); ap.add_argument('--seed', type=int, default=1)
ap.add_argument('--shots', default=''); ap.add_argument('--lang', default=''); ap.add_argument('--mobile', action='store_true')
ap.add_argument('--fuzz', action='store_true', help='clics aleatorios sobre cualquier botón visible'); ap.add_argument('--consent', default='reject')
ap.add_argument('--fresh', action='store_true'); ap.add_argument('--jump', default='', help='finale | boss: salta a ese punto de la partida'); ap.add_argument('--budget', type=float, default=1e9, help='segundos máximos de juego'); ap.add_argument('--fast', action='store_true', help='sin animaciones (reduceEffects) y sin música: recorre partidas largas')
A = ap.parse_args(); rnd = random.Random(A.seed)
KEY_RE = re.compile(r'\b(?:ui|menu|table|duel|map|node|rest|shop|reward|result|boss|finale|door|ending|death|archive|hud|settings|cookies|ads|help|wings|event|card|suit|hand|combo|rule|stake|item|tool|char|opp|mem|know|wing|tut|dlg|log|fx|whisper|debug|legal)\.[a-z0-9_]+(?:\.[a-z0-9_]+)*\b')

def main():
    errors, seen = [], {}
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        ctx = b.new_context(viewport={'width': A.w, 'height': A.h}, has_touch=A.mobile, is_mobile=A.mobile, device_scale_factor=2 if A.mobile else 1, locale={'es': 'es-ES', 'en': 'en-US', 'fr': 'fr-FR', 'de': 'de-DE'}.get(A.lang, 'en-US'))
        init = {}
        if A.lang: init['lang'] = A.lang
        if A.fast: init.update(reduceEffects=True, muteMusic=True, muteSfx=True, quality='low')
        if init: ctx.add_init_script("if(!localStorage.getItem('thaw.settings.v1')) localStorage.setItem('thaw.settings.v1', JSON.stringify(%s))" % json.dumps(init))
        pg = ctx.new_page(); logs = []
        pg.on('console', lambda m: logs.append((m.type, m.text)) if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: errors.append('PAGEERROR: ' + str(e)))
        pg.on('requestfailed', lambda r: errors.append('REQFAIL: ' + r.url) if 'localhost' in r.url else None)
        pg.set_default_timeout(4000)
        pg.goto(A.url); pg.wait_for_selector('body[data-ready="1"]', timeout=15000); pg.wait_for_timeout(400)
        if A.shots: os.makedirs(A.shots, exist_ok=True)
        # consentimiento
        if A.consent != 'none':
            btn = pg.query_selector('.cookie-layer [data-ck="' + ('all' if A.consent == 'all' else 'none') + '"]')
            if btn: btn.click(); pg.wait_for_timeout(200)
        def view(): return pg.evaluate('document.body.dataset.view')
        def shot(tag):
            if A.shots and tag not in seen: pg.wait_for_timeout(450); pg.screenshot(path=os.path.join(A.shots, tag + '.png'))
        def check_dom(v):
            txt = pg.evaluate("document.body.innerText")
            for m in KEY_RE.findall(txt):
                if not re.match(r'^(v\d|\d)', m) and '.com' not in m and m not in ('legal.cookies',): errors.append(f'CLAVE i18n visible en {v}: {m}')
            dead = pg.evaluate("""() => [...document.querySelectorAll('#view button, #hud button')].filter(b => b.offsetParent && !b.disabled && !b.dataset.act && !b.onclick && !b.closest('.modal')).map(b => b.className + ':' + b.textContent.slice(0,20))""")
            for d in dead: errors.append(f'BOTÓN sin acción en {v}: {d}')
        G = lambda code, arg=None: pg.evaluate("async (arg) => { const T = window.__HOUSE_TEST; const G = T.G, C = T.C, S = T.S, st = T.st; " + code + "}", arg)
        if A.jump:
            pg.evaluate("""async (j) => { const T = window.__HOUSE_TEST; const G = T.G, st = T.st; G.newGame(); G.introDone(); const p = st.gs.player; st.gs.meta.tutorial.round = true; p.maxHealth = 999; p.health = 999; p.sanity = 100; p.money = 500;
              if (j === 'finale') { st.gs.inventory.push('llave_hueso'); G.startFinale(); } else if (j === 'boss') { const run = st.gs.run; const b = run.map.rows[run.map.rows.length - 1][0]; run.pos = b.id; G.G.node = b; G.enterBoss(b); } }""", A.jump)
            pg.wait_for_timeout(300)
        last, same = None, 0; t0 = time.time()
        for step in range(A.steps):
            if time.time() - t0 > A.budget: print('(presupuesto de tiempo agotado en el paso %d)' % step); break
            v = view()
            if step % 25 == 0: print(f'[{step}] vista={v} t={time.time()-t0:.0f}s errores={len(errors)}', flush=True)
            key = v + str(pg.evaluate('document.querySelector("#hud")?.innerText?.length||0'))
            shot('ui_' + v + ('_m' if A.mobile else '')); check_dom(v); seen[('ui_' + v + ('_m' if A.mobile else ''))] = 1; seen[v] = seen.get(v, 0) + 1
            if v == last: same += 1
            else: same = 0
            last = v
            if same > (150 if A.fuzz else 40):
                errors.append('ATASCADO en ' + v + ' :: ' + pg.evaluate('document.querySelector("#view").innerText.slice(0,300)').replace(chr(10), ' | ') + ' :: botones=' + str(pg.evaluate('[...document.querySelectorAll("#view button")].map(b=>(b.disabled?"x":"")+b.textContent.slice(0,14))')))
                break
            try:
                fz = A.fuzz and rnd.random() < 0.5
                # como un jugador: si hay un panel que tapa la pantalla (salvo en las acciones aleatorias del fuzz), se cierra
                if not fz:
                    if pg.query_selector('.cookie-layer.is-config'):
                        pg.keyboard.press('Escape'); pg.wait_for_timeout(80)
                        if pg.query_selector('.cookie-layer.is-config'): errors.append('PANEL de cookies no se cierra con Escape en ' + v); pg.click('.cookie-layer [data-ck="none"]')
                    elif pg.query_selector('.modal-back'):
                        pg.keyboard.press('Escape'); pg.wait_for_timeout(80)
                        if pg.query_selector('.modal-back'): errors.append('MODAL no se cierra con Escape en ' + v); pg.evaluate("document.querySelectorAll('.modal-back').forEach(e => e.remove())")
                if fz:
                    r = rnd.random()
                    if r < 0.12: pg.keyboard.press('Escape')
                    elif r < 0.35: pg.keyboard.press(rnd.choice(['a', 'd', 'h', 'Enter', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'f', 't', 'l', 'Backspace', ' ', 'ArrowLeft', 'ArrowRight']))
                    else:
                        els = [e for e in pg.query_selector_all('#view [data-act]:not([disabled]), #view .card, #hud button, .modal button, .cookie-box button') if e.is_visible()]
                        if els: rnd.choice(els).click(timeout=1500, force=True)
                    pg.wait_for_timeout(100); continue
                if v == 'menu':
                    if pg.query_selector('.secret-btn') and rnd.random() < 0.35:
                        pg.click('.secret-btn'); pg.wait_for_timeout(200); continue
                    pg.click('[data-act="menu_continue"]:not([disabled])' if pg.query_selector('[data-act="menu_continue"]:not([disabled])') else '[data-act="menu_new"]')
                    pg.wait_for_timeout(300)
                    if pg.query_selector('.modal'): pg.click('.modal .btn.primary, .modal .btn.danger')
                elif v == 'intro':
                    pg.click('.intro', position={'x': 10, 'y': 10}); pg.wait_for_timeout(120)
                elif v == 'wings': pg.click('.wing:not([disabled])')
                elif v == 'map':
                    cand = pg.query_selector_all('.node.avail'); pref = [c for c in cand if 'shotgun' in (c.get_attribute('class') or '') or 'secret' in (c.get_attribute('class') or '')]
                    (rnd.choice(pref) if pref and rnd.random() < 0.85 else rnd.choice(cand)).click(); pg.wait_for_timeout(80); shot('ui_map_sel' + ('_m' if A.mobile else ''))
                    if pg.query_selector('[data-act="map_enter"]'): pg.click('[data-act="map_enter"]')
                elif v == 'event':
                    if pg.query_selector('.choices'):
                        pg.wait_for_selector('.choices[style*="opacity: 1"]', timeout=8000)
                        opts = pg.query_selector_all('.choice'); rnd.choice(opts).click()
                    else: shot('ui_event_result' + ('_m' if A.mobile else '')); pg.click('[data-act="ev_continue"]')
                elif v == 'round':
                    for e in pg.query_selector_all('.hand .card.sel, .pocketbar .card.sel'): e.click()
                    best = G("const b = C.bestPlay(G.G.R); return b ? b.uids : null")
                    canDiscard = G("return G.G.R.discardsLeft > 0 && !G.G.R.tutorial")
                    if not best:
                        pg.click('.hand .card >> nth=0'); pg.click('[data-act="tb_play"]'); pg.wait_for_timeout(300)  # Niebla: se juega a ciegas
                    else:
                        if rnd.random() < 0.25 and canDiscard:
                            pg.click('.hand .card >> nth=0'); pg.click('[data-act="tb_discard"]'); pg.wait_for_timeout(200); continue
                        for u in best: pg.click(f'.hand .card[data-uid="{u}"], .pocketbar .card[data-uid="{u}"]')
                        shot('ui_round_sel' + ('_m' if A.mobile else ''))
                        pg.click('[data-act="tb_play"]'); pg.wait_for_timeout(350); shot('ui_round_anim' + ('_m' if A.mobile else ''))
                        pg.wait_for_function('document.body.dataset.view !== "round" || !document.querySelector(".ticker .total") || document.querySelector(".ctrl button:not([disabled])")', timeout=15000)
                elif v == 'round_result': pg.click('[data-act="result_continue"]')
                elif v == 'reward':
                    pg.click('.rcard >> nth=0')
                elif v == 'duel_setup': pg.click('[data-act="duel_stake"]:not([disabled])')
                elif v == 'duel':
                    if pg.query_selector('[data-act="duel_shoot"][data-arg="foe"]:not([disabled])'):
                        if rnd.random() < 0.3 and pg.query_selector('[data-act="duel_listen"]:not([disabled])'): pg.click('[data-act="duel_listen"]'); pg.wait_for_timeout(200)
                        pg.click('[data-act="duel_shoot"][data-arg="%s"]' % rnd.choice(['foe', 'foe', 'table']))
                        pg.wait_for_timeout(450 if A.fast else 1800)
                    else: pg.wait_for_timeout(500)
                elif v == 'duel_result': pg.click('[data-act="result_continue"]')
                elif v == 'merchant':
                    c = pg.query_selector_all('[data-act="shop_buy"]:not([disabled])')
                    if c and rnd.random() < 0.5: rnd.choice(c).click(); pg.wait_for_timeout(150)
                    else: pg.click('[data-act="shop_leave"]')
                elif v == 'rest':
                    if pg.query_selector('[data-act="rest_pick"]:not([disabled])') and rnd.random() < 0.8: pg.click('[data-act="rest_pick"]:not([disabled])')
                    else: pg.click('[data-act="rest_continue"]')
                elif v == 'boss_intro': pg.click('[data-act="boss_start"]')
                elif v == 'finale':
                    for _ in range(6): pg.click('.resscr', position={'x': 5, 'y': 5}); pg.wait_for_timeout(250)
                    pg.click('[data-act="finale_next"]')
                elif v == 'door': pg.click('[data-act="door_pick"]:not([disabled]) >> nth=' + str(rnd.randrange(1)))
                elif v == 'ending': pg.wait_for_timeout(800); pg.click('[data-act="ending_done"]')
                elif v == 'death': pg.click('[data-act="death_next"]')
                elif v == 'archive': pg.click('[data-act="archive_back"]')
                else: errors.append('vista desconocida ' + v); break
            except Exception as e:
                if 'not attached' in str(e) or 'detached' in str(e): pg.wait_for_timeout(150); continue   # el DOM se redibujó a mitad de clic: carrera del bot
                errors.append(f'EXC en {v} paso {step}: {str(e)[:1200]}'); pg.wait_for_timeout(300)
                if sum(1 for x in errors if x.startswith('EXC')) > 6: break
            pg.wait_for_timeout(80)
        for t, m in logs:
            if t == 'error' or 'Failed' in m: errors.append('CONSOLA ' + t + ': ' + m[:200])
        b.close()
    print('vistas vistas:', {k: v for k, v in seen.items() if not k.startswith('ui_')})
    uniq = list(dict.fromkeys(errors))
    if uniq:
        print('ERRORES (%d):' % len(uniq)); [print(' -', e) for e in uniq[:int(os.environ.get('NERR', '25'))]]; sys.exit(1)
    print('OK: sin errores de consola, sin claves i18n visibles, sin botones muertos')
main()
