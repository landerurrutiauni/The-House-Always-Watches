// Fusiona locales-src/*.txt (líneas `clave|es|en|fr|de`) y locales-src/*.eu.txt (líneas `clave|euskera`) en locales/{es,en,fr,de,eu}.json.
// Falla si una clave está duplicada con texto distinto, si una línea no tiene 4 traducciones o si una clave del euskera no existe en el resto.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'locales-src'), out = path.join(root, 'locales');
const LANGS = ['es', 'en', 'fr', 'de'];
const ALL = [...LANGS, 'eu'];
const data = Object.fromEntries(ALL.map(l => [l, {}]));
const owner = {}; let errors = 0, lines = 0;
for (const f of fs.readdirSync(src).filter(f => f.endsWith('.txt') && !f.endsWith('.eu.txt')).sort()) {
  fs.readFileSync(path.join(src, f), 'utf8').split(/\r?\n/).forEach((ln, i) => {
    if (!ln.trim() || ln.startsWith('#')) return;
    const p = ln.split('|');
    if (p.length !== 5) { console.error(`✗ ${f}:${i + 1} tiene ${p.length - 1} traducciones (se esperaban 4): ${p[0]}`); errors++; return; }
    const key = p[0].trim(); lines++;
    const vals = p.slice(1).map(s => s.trim().replace(/\\n/g, '\n'));
    if (owner[key]) {
      if (LANGS.some((l, k) => data[l][key] !== vals[k])) { console.error(`✗ clave duplicada con texto distinto: ${key} (${owner[key]} / ${f}:${i + 1})`); errors++; }
      return;
    }
    owner[key] = f + ':' + (i + 1);
    LANGS.forEach((l, k) => { data[l][key] = vals[k]; });
  });
}
// Euskera: una línea `clave|texto` por clave (el texto no puede contener «|»)
let euN = 0;
for (const f of fs.readdirSync(src).filter(f => f.endsWith('.eu.txt')).sort()) {
  fs.readFileSync(path.join(src, f), 'utf8').split(/\r?\n/).forEach((ln, i) => {
    if (!ln.trim() || ln.startsWith('#')) return;
    const k = ln.indexOf('|'); const key = ln.slice(0, k).trim(), val = ln.slice(k + 1).trim().replace(/\\n/g, '\n');
    if (k < 0 || !val || val.includes('|')) { console.error(`✗ ${f}:${i + 1} línea de euskera mal formada: ${key}`); errors++; return; }
    if (!owner[key]) { console.error(`✗ ${f}:${i + 1} clave de euskera que no existe en el resto de idiomas: ${key}`); errors++; return; }
    if (key in data.eu) { console.error(`✗ ${f}:${i + 1} clave de euskera repetida: ${key}`); errors++; return; }
    data.eu[key] = val; euN++;
  });
}
if (errors) { console.error(`\n${errors} error(es). No se escribe nada.`); process.exit(1); }
fs.mkdirSync(out, { recursive: true });
for (const l of ALL) {
  const sorted = Object.fromEntries(Object.keys(data[l]).sort().map(k => [k, data[l][k]]));
  fs.writeFileSync(path.join(out, l + '.json'), JSON.stringify(sorted, null, 1) + '\n');
  // Mismo contenido como módulo ES: el juego lo carga con import() (inglés, de forma estática). Un import() comparte la vía de carga del
  // propio código del juego, así que no depende de fetch() ni de CORS y se reintenta igual que cualquier módulo.
  fs.writeFileSync(path.join(out, l + '.js'), '// Generado por tools/build-locales.mjs a partir de locales-src/. No editar a mano.\nexport default ' + JSON.stringify(sorted).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029') + ';\n');
}
console.log(`✓ locales: ${Object.keys(owner).length} claves × ${ALL.length} idiomas (${lines} líneas; euskera: ${euN}/${Object.keys(owner).length})`);
