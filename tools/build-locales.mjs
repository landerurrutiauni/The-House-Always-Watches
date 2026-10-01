// Fusiona locales-src/*.txt (líneas `clave|es|en|fr|de`) en locales/{es,en,fr,de}.json.
// Falla si una clave está duplicada con texto distinto o si una línea no tiene 4 traducciones.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'locales-src'), out = path.join(root, 'locales');
const LANGS = ['es', 'en', 'fr', 'de'];
const data = Object.fromEntries(LANGS.map(l => [l, {}]));
const owner = {}; let errors = 0, lines = 0;
for (const f of fs.readdirSync(src).filter(f => f.endsWith('.txt')).sort()) {
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
if (errors) { console.error(`\n${errors} error(es). No se escribe nada.`); process.exit(1); }
fs.mkdirSync(out, { recursive: true });
for (const l of LANGS) {
  const sorted = Object.fromEntries(Object.keys(data[l]).sort().map(k => [k, data[l][k]]));
  fs.writeFileSync(path.join(out, l + '.json'), JSON.stringify(sorted, null, 1) + '\n');
}
console.log(`✓ locales: ${Object.keys(owner).length} claves × ${LANGS.length} idiomas (${lines} líneas)`);
