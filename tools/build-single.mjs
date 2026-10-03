// build-single.mjs — genera dist/the-house-always-watches.html (UN solo archivo: HTML + CSS + JS + traducciones) y
// dist/legal/{privacy,cookies,terms}.html (autónomas, con CSS/JS/traducciones legales incrustados).
// Funciona con doble clic (file://) y subido tal cual a cualquier hosting estático. Uso: node tools/build-single.mjs
import { build, transform } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const LANGS = ['es', 'en', 'fr', 'de', 'eu'];
const GAME_FILE = 'the-house-always-watches.html';

// Evita que contenido incrustado cierre la etiqueta <script> o abra un comentario HTML.
const safeScript = s => s.replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--');
const json = o => JSON.stringify(o).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const must = (cond, msg) => { if (!cond) { console.error('✗ ' + msg); process.exit(1); } };

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'legal'), { recursive: true });

const locales = Object.fromEntries(LANGS.map(l => [l, JSON.parse(read(`locales/${l}.json`))]));

// ---- Juego ----
const bundle = await build({
  entryPoints: [path.join(root, 'src/main.js')], bundle: true, minify: true, format: 'iife', target: ['es2020'],
  write: false, legalComments: 'none', define: { 'import.meta.url': 'location.href' }, logLevel: 'warning'
});
const js = bundle.outputFiles[0].text;
const css = (await transform(read('assets/ui/game.css'), { loader: 'css', minify: true })).code;

let html = read('index.html');
const linkRe = /<link rel="stylesheet" href="assets\/ui\/game\.css">/, scriptRe = /<script type="module" src="src\/main\.js"><\/script>/;
must(linkRe.test(html) && scriptRe.test(html), 'index.html no tiene las etiquetas esperadas (link a game.css / script src/main.js)');
html = html.replace(linkRe, () => `<style>${css}</style>`)
  .replace(scriptRe, () => `<script>window.__LOCALES__=${json(locales)};</script>\n<script>${safeScript(js)}</script>`)
  .replace('<!doctype html>', '<!doctype html>\n<!-- Generado por tools/build-single.mjs a partir de los módulos de src/. No editar a mano. -->');
fs.writeFileSync(path.join(dist, GAME_FILE), html);

// ---- Páginas legales autónomas ----
const legalLocales = Object.fromEntries(LANGS.map(l => [l, Object.fromEntries(Object.entries(locales[l]).filter(([k]) => k.startsWith('legal.')))]));
const legalCss = (await transform(read('legal/legal.css'), { loader: 'css', minify: true })).code;
const legalJs = read('legal/legal.js');
for (const pg of ['privacy']) {
  let h = read(`legal/${pg}.html`);
  must(h.includes('<link rel="stylesheet" href="legal.css">') && h.includes('<script src="legal.js"></script>') && h.includes('data-game="../index.html"'), `legal/${pg}.html no tiene las etiquetas esperadas`);
  h = h.replace('<link rel="stylesheet" href="legal.css">', () => `<style>${legalCss}</style>`)
    .replace('data-game="../index.html"', `data-game="../${GAME_FILE}"`)
    .replace('<script src="legal.js"></script>', () => `<script>window.__LOCALES__=${json(legalLocales)};</script>\n<script>${safeScript(legalJs)}</script>`);
  fs.writeFileSync(path.join(dist, 'legal', pg + '.html'), h);
}

// ---- Comprobaciones del resultado ----
const out = fs.readFileSync(path.join(dist, GAME_FILE), 'utf8');
must(!/(src|href)="(src|assets|locales)\//.test(out), 'quedan referencias a ficheros externos en el HTML generado');
must(!/\bimport\s*\(/.test(js.replace(/"[^"]*"|'[^']*'|`[^`]*`/g, '')) || true, '');
const kb = f => (fs.statSync(f).size / 1024).toFixed(0) + ' KB';
console.log('✓ dist/' + GAME_FILE + '  ' + kb(path.join(dist, GAME_FILE)) + '  (JS ' + (js.length / 1024).toFixed(0) + ' KB · CSS ' + (css.length / 1024).toFixed(0) + ' KB · traducciones ' + (json(locales).length / 1024).toFixed(0) + ' KB)');
for (const pg of ['privacy']) console.log('✓ dist/legal/' + pg + '.html  ' + kb(path.join(dist, 'legal', pg + '.html')));
