// Verifica i18n: paridad de claves entre idiomas, textos vacíos, variables {x} iguales, valores que parecen nombres de clave,
// que locales/<l>.js (el que carga el juego) sea idéntico a locales/<l>.json, y cobertura de las claves que usa el código
// (literales t('x'), espacios de nombres, familias dinámicas completas, y que cada t('x', {…}) aporte las variables que pide el texto).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = ['es', 'en', 'fr', 'de', 'eu'];
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

// 1b) ningún texto puede ser el nombre de una clave (ni un {marcador} suelto): es justo lo que se vería como «menu.new» en pantalla
const KEYLIKE = /^[a-z][a-z0-9_]*(\.[a-zA-Z0-9_]+)+$/;
for (const l of LANGS) for (const [k, v] of Object.entries(L[l])) {
  if (v === k || KEYLIKE.test(String(v).trim())) err(`el texto de ${l}:${k} parece el nombre de una clave: ${JSON.stringify(v)}`);
  if (/^\{\w+\}$/.test(String(v).trim())) err(`el texto de ${l}:${k} es solo un marcador: ${v}`);
  if ((String(v).match(/\{/g) || []).length !== (String(v).match(/\}/g) || []).length) err(`llaves descuadradas en ${l}:${k}`);
}
// 1c) lo que carga el juego (locales/<l>.js) debe ser idéntico a lo que se edita/valida (locales/<l>.json)
for (const l of LANGS) {
  const f = path.join(root, 'locales', l + '.js');
  if (!fs.existsSync(f)) { err(`falta locales/${l}.js (npm run build lo genera)`); continue; }
  const M = (await import(pathToFileURL(f).href + '?x=' + Date.now())).default;
  const a = Object.keys(M), b = Object.keys(L[l]);
  if (a.length !== b.length || a.some(k => M[k] !== L[l][k])) err(`locales/${l}.js no coincide con locales/${l}.json (ejecuta npm run build)`);
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
const MIS = await import('../src/missions.js'), ACHV = await import('../src/achievements.js');
MIS.MISSION_IDS.forEach(id => need.add(`mission.${id}`));
ACHV.EGGS.forEach(id => { need.add(`egg.${id}.name`); need.add(`egg.${id}.text`); need.add(`egg.${id}.hint`); });
C.CHARACTERS.forEach(id => { need.add(`char.${id}`); need.add(`bio.${id}`); });
// 2b) familias de claves que el código construye con un id (t('x.' + id + '.name')): cada miembro del dominio, con todos sus sufijos
const JK = await import(pathToFileURL(path.join(root, 'src/jokers.js')));
const fam = (prefix, ids, sufs = ['']) => ids.forEach(i => sufs.forEach(s => need.add(prefix + i + s)));
fam('joker.', JK.JOKER_IDS, ['.name', '.desc']);
fam('rarity.', [...new Set(Object.values(JK.JOKERS).map(j => j.rarity))]);
fam('opp.', C.GAMBLERS);
fam('shop.', ['heal', 'level', 'remove', 'loan'], ['.name', '.desc']);
fam('rest.', ['heal', 'calm', 'pay', 'study'], ['.name', '.desc']); fam('rest.done.', ['heal', 'calm', 'pay', 'study']);
fam('node.', ['game', 'event', 'merchant', 'rest', 'shotgun', 'secret', 'boss']); fam('map.info.', ['event', 'merchant', 'rest', 'secret']);
fam('hud.', ['health', 'sanity', 'money', 'debt', 'lives', 'deck'], ['.tip']);
fam('door.req.', C.ENDING_ORDER);
fam('duel.stake.', ['money', 'sanity', 'debt', 'card'], ['.name', '.win', '.lose']); fam('duel.h.', ['title', 'p_foe', 'p_table', 'f_p', 'f_table', 'cham', 'skip']);
fam('mission.reward.', ['money', 'sanity', 'health', 'card', 'mod', 'level', 'joker']);
fam('whisper.', [1, 2, 3, 4, 5, 6, 7, 8]); fam('finale.stage', [1, 2]);
const SRT = await import(pathToFileURL(path.join(root, 'src/sorting.js')));
fam('rank.', [1, 11, 12, 13]); fam('deck.sort.', SRT.SORT_MODES);
for (const id of MIS.MISSION_IDS) need.add(`mission.${id}`);
// los reward de las misiones salen de los datos: cada tipo de recompensa usado debe tener su texto
for (const w of Object.values(MIS.MISSIONS)) for (const m of w) for (const [k] of m.reward) need.add('mission.reward.' + k);
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

// 4) cada t('clave', { … }) con literal debe aportar TODAS las variables {x} que pide el texto; t('clave') a secas no puede pedir ninguna.
//    (si no, la persona vería «{name}» en pantalla). Llamadas con variables ya construidas (t(k, v)) o con ...spread no se pueden comprobar.
const NSET = new Set(Object.keys(L.en).map(k => k.split('.')[0]));
function balanced(str, i, open, close) {          // devuelve el índice del cierre que equilibra str[i] === open
  let d = 0, q = null;
  for (let j = i; j < str.length; j++) {
    const c = str[j];
    if (q) { if (c === '\\') j++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c === open) d++; else if (c === close) { d--; if (d === 0) return j; }
  }
  return -1;
}
function topKeys(body) {                          // nombres de propiedad de primer nivel de un literal de objeto «{ a: 1, b, c: f(x, y) }»
  const keys = []; let d = 0, q = null, start = 0, spread = false;
  const flush = end => { const seg = body.slice(start, end).trim(); if (!seg) return; if (seg.startsWith('...')) { spread = true; return; } const m = seg.match(/^(?:\[[^\]]*\]|['"]?([A-Za-z_$][\w$]*)['"]?)\s*(?::|$|\()/); if (m && m[1]) keys.push(m[1]); else spread = true; };
  for (let j = 0; j < body.length; j++) {
    const c = body[j];
    if (q) { if (c === '\\') j++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if ('([{'.includes(c)) d++; else if (')]}'.includes(c)) d--;
    else if (c === ',' && d === 0) { flush(j); start = j + 1; }
  }
  flush(body.length);
  return { keys, spread };
}
let callSites = 0;
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8'), rel = path.relative(root, f);
  if (rel.startsWith('legal')) continue;                       // la página de privacidad tiene su propio t() y sustituye {lang} con .replace()
  for (const m of s.matchAll(/(?<![\w$.])t\(\s*(['"])([a-z0-9_]+(?:\.[a-zA-Z0-9_]+)+)\1\s*([,)])/g)) {
    const key = m[2]; if (!(key in L.en)) { if (!NSET.has(key.split('.')[0])) err(`${rel}: t('${key}') usa un espacio de nombres que no existe`); continue; }
    const need_ = [...new Set((L.en[key].match(/\{(\w+)\}/g) || []).map(x => x.slice(1, -1)))]; callSites++;
    if (m[3] === ')') { if (need_.length) err(`${rel}: t('${key}') sin variables pero el texto pide {${need_.join('}, {')}}`); continue; }
    const after = s.slice(m.index + m[0].length).trimStart();
    if (!after.startsWith('{')) continue;                         // variables que vienen de otra parte
    const open = s.indexOf('{', m.index + m[0].length), close = balanced(s, open, '{', '}'); if (close < 0) continue;
    const { keys, spread } = topKeys(s.slice(open + 1, close)); if (spread) continue;
    const missingV = need_.filter(v => !keys.includes(v));
    if (missingV.length) err(`${rel}: t('${key}', {…}) no aporta {${missingV.join('}, {')}} (aporta: ${keys.join(', ') || 'nada'})`);
  }
}
console.log(`${all.size} claves · ${files.length} ficheros revisados · ${dyn.size} prefijos dinámicos · ${need.size} claves exigidas por el contenido · ${callSites} llamadas t() con variables comprobadas`);
console.log(errors ? `✗ ${errors} error(es), ${warns} aviso(s)` : `✓ i18n correcto (${warns} aviso(s))`);
process.exit(errors ? 1 : 0);
