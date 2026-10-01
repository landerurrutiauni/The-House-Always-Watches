// Verifica i18n: paridad de claves entre idiomas, textos vacíos, variables {x} iguales,
// y cobertura de las claves que usa el código (literales t('x'), data-i18n y claves derivadas del contenido).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = ['es', 'en', 'fr', 'de'];
const L = Object.fromEntries(LANGS.map(l => [l, JSON.parse(fs.readFileSync(path.join(root, 'locales', l + '.json'), 'utf8'))]));
let errors = 0, warns = 0;
const err = m => { console.error('✗ ' + m); errors++; };
const warn = m => { console.warn('! ' + m); warns++; };

// 1) paridad
const all = new Set(LANGS.flatMap(l => Object.keys(L[l])));
for (const k of all) for (const l of LANGS) if (!(k in L[l])) err(`falta ${l}: ${k}`);
const vars = s => (s.match(/\{\w+\}/g) || []).sort().join(',');
for (const k of all) {
  for (const l of LANGS) { const v = L[l][k]; if (v === undefined) continue; if (!String(v).trim()) err(`vacío ${l}: ${k}`); if (/TODO:|FIXME|XXX|\?\?\?\?/.test(v) && !/^(menu\.secret|archive\.(title|unknown)|char\.unknown)$/.test(k)) warn(`marcador en ${l}: ${k}`); }
  const ref = vars(L.es[k] || ''); for (const l of LANGS) if (L[l][k] !== undefined && vars(L[l][k]) !== ref) err(`variables distintas en ${l}: ${k} (${vars(L[l][k])} ≠ ${ref})`);
}

// 2) claves que exige el contenido
const need = new Set();
const C = await import(pathToFileURL(path.join(root, 'src/content.js')));
const K = await import(pathToFileURL(path.join(root, 'src/cards.js')));
const CB = await import(pathToFileURL(path.join(root, 'src/combat.js')));
for (const [id, e] of Object.entries(C.EVENTS)) {
  ['title', 'text', 'a', 'b', 'ra', 'rb'].forEach(s => need.add(`event.${id}.${s}`));
  if (e.hid) { need.add(`event.${id}.h`); need.add(`event.${id}.rh`); }
}
C.ITEMS.forEach(i => { need.add(`item.${i}.name`); need.add(`item.${i}.desc`); });
Object.keys(C.TOOLS).forEach(i => { need.add(`tool.${i}.name`); need.add(`tool.${i}.desc`); });
K.SPECIAL_IDS.forEach(i => { need.add(`card.${i}.name`); need.add(`card.${i}.desc`); });
K.SUITS.forEach(s => { need.add('suit.' + s); need.add(`suit.${s}.fx`); });
K.MODS.forEach(m => { need.add(`mod.${m}.name`); need.add(`mod.${m}.desc`); });
Object.keys(K.HANDS).forEach(h => need.add('hand.' + h));
['mirada', 'ritual', 'deuda', 'puertas', 'cerradura', 'arcoiris'].forEach(c => { need.add(`combo.${c}.name`); need.add(`combo.${c}.desc`); });
CB.OPP_RULES.forEach(r => { need.add(`rule.${r}.name`); need.add(`rule.${r}.desc`); });
Object.keys(CB.STAKES).forEach(s => { need.add(`stake.${s}.name`); need.add(`stake.${s}.desc`); });
C.CHARACTERS.forEach(c => need.add('char.' + c));
['gambler_a', 'gambler_b', 'gambler_c'].forEach(g => need.add('opp.' + g));
Object.keys(C.BOSSES).forEach(b => ['a', 'w', 'l'].forEach(s => need.add(`boss.${b}.${s}`)));
Object.keys(C.MEMORIES).forEach(m => { need.add(`mem.${m}.name`); need.add(`mem.${m}.text`); });
C.KNOWLEDGE.forEach(k => { need.add(`know.${k}.name`); need.add(`know.${k}.text`); });
C.ENDING_ORDER.forEach(e => ['title', 'text', 'epi'].forEach(s => need.add(`ending.${e}.${s}`)));
Object.keys(C.WING_INFO).forEach(w => { need.add(`wing.${w}.name`); need.add(`wing.${w}.desc`); });
for (const k of need) if (!(k in L.en)) err(`el contenido exige la clave: ${k}`);

// 3) claves literales en el código y el HTML
const files = [];
const walk = d => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { if (f.name === 'node_modules' || f.name === 'dist') continue; const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.(js|html|mjs)$/.test(f.name) && !/^(test|sim|check|build)/.test(f.name)) files.push(p); } };
['src', 'legal'].forEach(d => fs.existsSync(path.join(root, d)) && walk(path.join(root, d)));
if (fs.existsSync(path.join(root, 'index.html'))) files.push(path.join(root, 'index.html'));
const dyn = new Set();
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8'), rel = path.relative(root, f);
  for (const m of s.matchAll(/\bt\(\s*(['"`])([^'"`$]+?)\1(?!\s*\+)/g)) if (!(m[2] in L.en) && /^[a-z0-9_]+(\.[a-zA-Z0-9_]+)+$/.test(m[2])) err(`${rel}: clave no definida ${m[2]}`);
  for (const m of s.matchAll(/data-i18n(?:-[a-z]+)?=["']([^"']+)["']/g)) if (!(m[1] in L.en)) err(`${rel}: data-i18n no definida ${m[1]}`);
  for (const m of s.matchAll(/\bt\(\s*(['"])([a-z0-9_.]+\.)\1\s*\+/g)) dyn.add(m[2]);
  for (const m of s.matchAll(/\bt\(\s*`([a-z0-9_.]+\.)\$\{/g)) dyn.add(m[1]);
}
for (const pre of dyn) if (![...all].some(k => k.startsWith(pre))) err(`prefijo dinámico sin claves: ${pre}*`);
console.log(`${all.size} claves · ${files.length} ficheros revisados · ${dyn.size} prefijos dinámicos`);
console.log(errors ? `✗ ${errors} error(es), ${warns} aviso(s)` : `✓ i18n correcto (${warns} aviso(s))`);
process.exit(errors ? 1 : 0);
