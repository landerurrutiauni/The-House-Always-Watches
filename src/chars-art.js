// chars-art.js — el dibujo de cada personaje (48×64, procedural). Cada entrada: { eye: {y, dx, w, h, kind}, draw(g) }.
// `eye` coloca los ojos que anima chars.js (siguen al cursor y parpadean): la cara debe dejarles su hueco. Todo se pinta con las primitivas de pixel.js.
import { PAL, hex, mix, mk, R, P, ell, ring, poly, BAYER, line, dots, over, behind, blitP, dgrad, dpoly, speckle, strand } from './pixel.js';
import { ramp, shade, shadeOut, shadeEll, shadeRect, skull, neck, brows, nose, mouth, wrinkle, bags, cheeks, hand, sleeve, strokes, bust } from './chars-kit.js';
import { mulberry32 } from './rng.js';
import { CHARS_B } from './chars-art-b.js';

const head = (g, cx, cy, rx, ry, base, shade) => { ell(g, cx, cy, rx, ry, shade); ell(g, cx - 1, cy - 1, rx - 1, ry - 1, base); };
const arms = (g, lc, rc, y0, y1, hand) => { R(g, 7, y0, 5, y1 - y0, lc); R(g, 36, y0, 5, y1 - y0, rc); R(g, 7, y1, 5, 4, hand); R(g, 36, y1, 5, 4, hand); };


// ---------------- Personajes hechos a mano (con detalle) ----------------
const SK = (b) => ramp(b);

// El Ahogado: «Pagó su deuda con agua. La Hermana lo bautizó demasiado tiempo y ahora vive abajo.»
// Un hombre hinchado y verdoso que reza con las manos juntas y el rosario enredado, la estola del bautizo hecha jirones, pelo pegado y algas;
// el agua le sale de la boca y de los dedos y medio cuerpo está hundido en un charco oscuro.
function drawDrowned(g) {
  const rnd = mulberry32(7771);
  const sk = SK('#8ea79d'), coat = ramp('#1d2928'), cloth = ramp('#d3ccb4'), hair = ramp('#18211f');
  const WEED = { a: '#2b4a2c', b: '#3f6e42', c: '#1b321d', hi: '#79b568' };
  const WATER = { deep: '#0e2429', base: '#1b424a', lite: '#2b6a72', spark: '#86bfbd', foam: '#d9f1ee' };
  // ---- cuerpo: hombros caídos, traje empapado ----
  shade(g, [[18, 28], [30, 28], [38, 31], [43, 38], [45, 64], [3, 64], [5, 38], [10, 31]], coat, { ax: 1.0, ay: 0.3 });
  strokes(g, [[9, 36, 13, 52], [38, 36, 35, 52], [14, 33, 17, 44], [33, 33, 31, 44]], coat.deep);
  // ---- camisa empapada (oscura, para que se lean las manos y la estola) ----
  shade(g, [[20, 28], [28, 28], [30, 50], [18, 50]], ramp('#2a3a3d'), { ax: 0.5, ay: 0.2, edge: 0.6 });
  for (const y of [33, 38]) P(g, 24, y, '#a9b7b1');
  // ---- estola del bautizo: dos bandas claras que caen de los hombros, rotas por abajo ----
  shade(g, [[13, 29], [19, 28], [20, 47], [18, 52], [16, 48], [14, 53], [13, 47]], cloth, { ax: 0.8, ay: 0.1, edge: 0.8 });
  shade(g, [[29, 28], [35, 29], [35, 47], [33, 53], [31, 48], [29, 51], [28, 46]], ramp('#bdb69e'), { ax: 0.8, ay: 0.1, edge: 0.8 });
  strokes(g, [[16, 30, 16, 47], [18, 31, 18, 45], [31, 31, 31, 47], [33, 31, 33, 45]], cloth.mid);
  for (const [x, y, w, c] of [[14, 40, 3, '#8f8c76'], [30, 38, 3, '#8c8974'], [18, 44, 2, '#a29e86']]) R(g, x, y, w, 2, c);
  dots(g, [[15, 52], [17, 53], [29, 52], [31, 54], [34, 50]], '#8a8670');
  // cruz bordada en la estola
  R(g, 16, 33, 1, 4, '#6d3a3a'); R(g, 15, 34, 3, 1, '#6d3a3a'); R(g, 32, 33, 1, 4, '#6d3a3a'); R(g, 31, 34, 3, 1, '#6d3a3a');
  // ---- cuello hinchado y cuello de camisa ----
  neck(g, { y0: 23, y1: 30, w: 9, sk });
  poly(g, [[19, 28], [24, 31], [24, 33], [18, 31]], '#d0d8d2'); poly(g, [[29, 28], [24, 31], [24, 33], [30, 31]], '#aab6ae');
  // ---- cabeza ----
  skull(g, { cx: 24, top: 8, w: 15, h: 18, jaw: 0.74, sk, ears: true });
  // hinchazón: mejillas y papada
  R(g, 18, 20, 3, 3, sk.hi); R(g, 28, 20, 3, 3, sk.mid); R(g, 20, 25, 9, 1, sk.lo);
  // ---- pelo pegado: casquete con raya, mechones sobre la frente y guedejas que caen ----
  shade(g, [[16, 18], [15, 12], [17, 8], [21, 6], [27, 6], [31, 8], [33, 12], [32, 18], [31, 12], [28, 10], [24, 9], [20, 10], [17, 13]], hair, { ax: 0.8, ay: 0.4 });
  line(g, 24, 7, 19, 11, hair.hi); line(g, 24, 7, 29, 11, hair.deep); line(g, 22, 7, 18, 10, hair.hi); line(g, 26, 7, 31, 10, hair.lo);
  shade(g, [[14, 11], [18, 11], [18, 24], [16, 30], [14, 26]], hair, { ax: 1.3 }); shade(g, [[30, 11], [34, 11], [34, 26], [32, 30], [31, 24]], hair, { ax: 1.3 });
  dots(g, [[14, 14], [15, 18], [15, 22], [33, 15], [32, 20], [33, 24]], hair.hi);
  dots(g, [[20, 11], [21, 12], [27, 11], [28, 12], [22, 12]], hair.base);
  // ---- rostro: cejas caídas, ojeras, mejillas hundidas, nariz azulada, boca con agua ----
  brows(g, { ey: 16, ew: 3, col: hair.deep, tilt: -1, thick: 2, gap: 1, len: 5 });
  bags(g, { ey: 16, eh: 3, ew: 3, col: sk.lo }); R(g, 19, 20, 3, 1, sk.mid); R(g, 27, 20, 3, 1, sk.mid);
  wrinkle(g, 18, 22, 2, sk.lo); wrinkle(g, 29, 22, 2, sk.lo);
  nose(g, { y0: 18, len: 3, sk, style: 'flat' });
  R(g, 21, 22, 7, 1, '#5f7683'); mouth(g, { y: 23, w: 7, style: 'open', sk: { ...sk, lo: '#4d6572' }, teeth: '#d5d6c4', tongue: '#3b3340' });
  dots(g, [[29, 24], [29, 25], [30, 26], [30, 27], [30, 28]], WATER.spark); dots(g, [[30, 29], [31, 31]], WATER.foam);
  over(g, () => { speckle(g, rnd, 17, 10, 15, 14, 14, sk.lo); speckle(g, rnd, 19, 21, 11, 4, 6, '#2c3d37'); speckle(g, rnd, 17, 12, 15, 8, 5, '#5f8a68'); });
  dots(g, [[20, 9], [21, 9], [26, 9]], sk.lite);
  // ---- manos juntas en oración (dedos hacia arriba), hinchadas y arrugadas; mangas empapadas debajo ----
  shade(g, [[18, 47], [30, 47], [31, 53], [17, 53]], coat, { ax: 0.6, ay: 0.4, edge: 0.8 }); R(g, 19, 47, 10, 1, '#7f918a');
  shadeOut(g, [[24, 35], [27, 38], [29, 42], [29, 48], [19, 48], [19, 42], [21, 38]], ramp('#8fb9a6'), '#0b1514', { ax: 1.1, ay: 0.3, edge: 1.1 });
  line(g, 24, 36, 24, 47, sk.deep); line(g, 25, 40, 25, 47, sk.lo); dots(g, [[22, 40], [22, 44], [26, 41], [26, 45], [27, 38]], sk.lo); dots(g, [[22, 38], [21, 41]], sk.lite);
  line(g, 20, 43, 23, 44, sk.mid); line(g, 28, 44, 25, 45, sk.deep); P(g, 23, 37, sk.lo);
  // rosario: del cuello a las manos y colgando hasta el agua, con la cruz
  for (let i = 0; i < 8; i++) { const t = i / 7, y = 30 + t * 12; P(g, Math.round(19 + t * 4), Math.round(y), i % 2 ? '#060505' : '#b02a2a'); P(g, Math.round(29 - t * 4), Math.round(y), i % 2 ? '#b02a2a' : '#060505'); }
  for (let i = 0; i < 3; i++) P(g, 24, 48 + i, i % 2 ? '#060505' : '#b02a2a'); R(g, 24, 51, 1, 6, PAL.g1); R(g, 22, 52, 5, 1, PAL.g1); P(g, 24, 52, '#f0d27a'); P(g, 23, 52, '#e0c068');
  // ---- mangas empapadas que cuelgan al agua, con las manos goteando ----
  for (const s2 of [-1, 1]) { const x = s2 < 0 ? 4 : 36; shade(g, [[x, 38], [x + 8, 38], [x + 9, 52], [x + 1, 52]], coat, { ax: 1.1, ay: 0.2 }); strokes(g, [[x + 2, 40, x + 2, 51], [x + 6, 41, x + 7, 51]], coat.deep); }
  hand(g, 5, 51, sk, 'claw'); hand(g, 38, 51, sk, 'claw', true);
  dots(g, [[7, 57], [7, 59], [40, 58], [40, 60]], WATER.foam); dots(g, [[8, 56], [39, 57]], WATER.spark);
  // ---- algas: del pelo a los hombros y brazos ----
  strand(g, 15, 8, 24, WEED.a, { amp: 1.4, freq: 0.5, w: 2, drift: -0.05 }); strand(g, 14, 12, 30, WEED.b, { amp: 1.1, freq: 0.62, phase: 1.3, drift: -0.02 }); strand(g, 17, 6, 12, WEED.c, { amp: 1.6, phase: 2.1 });
  strand(g, 11, 31, 22, WEED.a, { amp: 1.0, freq: 0.7, w: 2 }); strand(g, 13, 30, 15, WEED.hi, { amp: 0.9, freq: 0.7, phase: 1 }); strand(g, 35, 31, 14, WEED.b, { amp: 1.2, freq: 0.6, phase: 0.5, w: 2 });
  dots(g, [[13, 20], [15, 26], [14, 34], [10, 41], [12, 47], [36, 40], [35, 46]], WEED.hi); dots(g, [[19, 7], [21, 6], [26, 6]], WEED.b);
  // ---- charco: el cuerpo se hunde en el agua oscura ----
  const top = x => 56 + Math.round(Math.sin(x * 0.45 + 0.8) * 1.3 + Math.sin(x * 0.17) * 0.8);
  for (let x = 0; x < 48; x++) { const t0 = top(x), edge = Math.abs(x - 24) / 24, bot = 64 - Math.round(edge ** 3 * 3); for (let y = t0; y < bot; y++) P(g, x, y, ((y - t0) / (bot - t0) + (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.5) > 0.4 ? WATER.deep : WATER.base); }
  for (let x = 1; x < 47; x++) { const y = top(x); if ((x + (x >> 2)) % 3 === 0) P(g, x, y, WATER.spark); if (x % 7 === 0) P(g, x, y - 1, WATER.foam); }
  for (const [x, y, w] of [[6, 60, 7], [20, 61, 9], [32, 59, 8], [12, 63, 6], [27, 63, 8], [38, 62, 5]]) R(g, x, y, w, 1, WATER.lite);
  for (const [x, y, w] of [[3, 58, 4], [38, 58, 5], [16, 59, 3]]) R(g, x, y, w, 1, WATER.spark);
  R(g, 23, 58, 3, 1, WATER.foam); R(g, 22, 59, 5, 1, WATER.spark);
}

// El Hombre de la Silla: el fundador. Un anciano frágil, cosido a una butaca de madera tallada con correas en las muñecas, una vía de gotero,
// una manta sobre las rodillas y la cadena de un reloj de bolsillo parado. «La silla cruje.»
function drawChair(g) {
  const sk = SK('#cdbfa0'), wood = ramp('#6b4a33'), cloth = ramp('#3a3a42'), blanket = ramp('#6a3b36'), hair = ramp('#cfcabd');
  // ---- butaca: respaldo alto con remates, travesaño y patas ----
  shade(g, [[3, 10], [8, 10], [8, 64], [3, 64]], wood, { ax: 1.2 }); shade(g, [[40, 10], [45, 10], [45, 64], [40, 64]], wood, { ax: 1.2 });
  shade(g, [[3, 7], [45, 7], [45, 13], [3, 13]], ramp('#7a5538'), { ax: 0.6, ay: 0.6 });
  for (const x of [3, 41]) { ell(g, x + 2, 5, 3, 3, wood.hi); P(g, x + 1, 4, wood.lite); P(g, x + 3, 6, wood.lo); }
  for (let x = 10; x < 38; x += 4) { R(g, x, 13, 2, 14, wood.mid); P(g, x, 13, wood.base); }   // balaustres del respaldo, detrás de la cabeza
  shade(g, [[8, 44], [40, 44], [40, 49], [8, 49]], wood, { ax: 0.6, ay: 0.8 });
  strokes(g, [[4, 16, 4, 60], [5, 20, 5, 40], [42, 24, 42, 58]], wood.lo);
  dots(g, [[4, 9], [43, 9], [4, 30], [42, 36], [5, 52]], wood.deep);
  // ---- cuerpo: bata de hospital sobre el traje viejo, hombros caídos ----
  shade(g, [[19, 27], [29, 27], [37, 30], [40, 38], [40, 52], [8, 52], [8, 38], [11, 30]], cloth, { ax: 1.0, ay: 0.3 });
  poly(g, [[19, 27], [24, 36], [29, 27], [27, 27], [24, 31], [21, 27]], '#c9c2ae');                                  // solapas
  R(g, 22, 36, 4, 12, '#a8a28f'); line(g, 24, 36, 24, 47, '#7d7868');
  for (const y of [38, 42, 46]) P(g, 24, y, '#d6cfb8');
  strokes(g, [[12, 34, 15, 46], [36, 34, 33, 46], [16, 30, 18, 38], [32, 30, 30, 38]], cloth.deep);
  strokes(g, [[13, 33, 14, 40], [17, 29, 19, 36]], cloth.hi);
  // cadena del reloj
  for (let i = 0; i < 6; i++) P(g, 29 - i, 40 + Math.round(Math.sin(i * 0.9) * 1.6) + i * 0.3, PAL.g1); ell(g, 31, 41, 1.5, 1.5, '#e0c068'); P(g, 31, 41, '#403318');
  // ---- manta sobre las rodillas ----
  shade(g, [[8, 49], [40, 49], [42, 64], [6, 64]], blanket, { ax: 0.8, ay: 0.5 });
  for (let x = 9; x < 40; x += 4) line(g, x, 51, x - 1, 63, blanket.mid);
  line(g, 7, 56, 41, 56, blanket.lo); line(g, 7, 57, 41, 57, blanket.hi); dots(g, [[14, 60], [30, 59], [22, 62]], blanket.hi);
  // ---- brazos sobre los reposabrazos, con correas de cuero en las muñecas ----
  sleeve(g, { sx: 12, sy: 31, ex: 11, ey: 47, w: 7, rp: cloth, bend: -1 }); sleeve(g, { sx: 36, sy: 31, ex: 37, ey: 47, w: 7, rp: ramp('#2e2e36'), bend: 1 });
  for (const x of [8, 34]) { R(g, x, 46, 7, 3, '#4a2a1c'); R(g, x, 46, 7, 1, '#7a5238'); P(g, x + 3, 47, PAL.g1); R(g, x, 48, 7, 1, '#241008'); }
  hand(g, 8, 49, sk, 'claw'); hand(g, 35, 49, sk, 'claw', true);
  // ---- gotero: soporte a la derecha, bolsa, tubo hasta el brazo ----
  R(g, 45, 2, 1, 40, '#7d7a72'); R(g, 43, 2, 4, 1, '#a9a69a');
  shade(g, [[42, 6], [47, 6], [47, 17], [42, 17]], ramp('#bcd2cc'), { ax: 0.6 }); R(g, 43, 9, 3, 6, '#7aa8a0'); R(g, 44, 3, 1, 3, '#cfd8d2');
  for (let i = 0; i < 9; i++) P(g, 44 - Math.round(i * 0.9), 18 + i * 3 + (i > 5 ? 0 : 0), '#9cc4bc'); dots(g, [[44, 19], [43, 22], [42, 25], [41, 28], [40, 31], [39, 34], [38, 37], [38, 41], [38, 45]], '#b7d6ce');
  // ---- cuello flaco y cabeza ----
  neck(g, { y0: 24, y1: 29, w: 5, sk });
  skull(g, { cx: 24, top: 8, w: 15, h: 18, jaw: 0.66, sk, ears: true });
  // calva con cuatro pelos, pelo blanco a los lados, bigote y barba larga
  shade(g, [[17, 15], [16, 10], [18, 8], [20, 9], [19, 13]], hair, { ax: 1.2 }); shade(g, [[31, 15], [32, 10], [30, 8], [28, 9], [29, 13]], hair, { ax: 1.2 });
  shade(g, [[16, 14], [16, 24], [17, 28], [19, 24], [19, 15]], hair, { ax: 1.2 }); shade(g, [[32, 14], [32, 24], [31, 28], [29, 24], [29, 15]], hair, { ax: 1.2 });
  dots(g, [[22, 8], [24, 7], [26, 8], [23, 9], [25, 9]], hair.base);
  // cejas blancas y pobladas, ojeras, arrugas, nariz grande
  brows(g, { ey: 16, ew: 3, col: hair.base, tilt: -1, thick: 2, gap: 1, len: 6 });
  bags(g, { ey: 16, eh: 2, ew: 3, col: sk.lo }); wrinkle(g, 19, 11, 11, sk.mid); wrinkle(g, 20, 12, 3, sk.mid); wrinkle(g, 25, 12, 4, sk.mid);
  nose(g, { y0: 17, len: 4, sk, style: 'hook' });
  R(g, 22, 24, 5, 1, sk.deep);                                                            // la boca, apenas visible entre el bigote y la barba
  shade(g, [[18, 20], [30, 20], [30, 23], [24, 22], [18, 23]], hair, { ax: 0.9, ay: 0.4 });  // bigote
  shade(g, [[18, 25], [30, 25], [29, 29], [24, 34], [19, 29]], hair, { ax: 1.0, ay: 0.6 }); // barba
  strokes(g, [[21, 26, 20, 30], [24, 26, 24, 32], [27, 26, 28, 30]], hair.mid); dots(g, [[19, 26], [22, 31], [26, 30], [24, 33]], hair.lite);
  line(g, 20, 22, 17, 22, hair.mid); line(g, 28, 22, 31, 22, hair.mid);
  over(g, () => { speckle(g, mulberry32(33), 17, 9, 15, 13, 9, sk.mid); });
  dots(g, [[20, 10], [21, 10]], sk.lite);
}

// El Crupier: un esqueleto de esmoquin con visera roja, guantes blancos y una sonrisa de dientes de más. «La Casa siempre mira.»
function drawDealer(g) {
  const bone = ramp('#e6dfc9'), suit = ramp('#1d1b21', '#9aa4c0'), shirt = ramp('#ece7d6'), tie = ramp('#a3212a'), glove = ramp('#efe9d8');
  bust(g, { y0: 29, sw: 17, bw: 22, rp: suit, o: { ax: 1.0, ay: 0.3 } });
  strokes(g, [[10, 36, 8, 56], [38, 36, 40, 56], [14, 44, 12, 62], [34, 44, 36, 62]], suit.deep);
  // camisa de pechera con botones de nácar y solapas de raso
  shade(g, [[20, 29], [28, 29], [24, 49]], shirt, { ax: 0.6, ay: 0.3 });
  shade(g, [[14, 30], [20, 29], [24, 44], [19, 48], [14, 38]], suit, { ax: 1.4, ay: 0.2, bias: -0.3 }); shade(g, [[34, 30], [28, 29], [24, 44], [29, 48], [34, 38]], suit, { ax: 1.4, ay: 0.2, bias: -0.1 });
  line(g, 14, 31, 19, 46, suit.lite); line(g, 34, 31, 29, 46, suit.hi); dots(g, [[17, 29], [31, 29]], suit.hi);
  // corbata roja de nudo grande con alfiler dorado
  shade(g, [[22, 30], [26, 30], [27, 33], [21, 33]], tie, { ax: 1.0 }); shade(g, [[22, 33], [26, 33], [27, 41], [24, 49], [21, 41]], tie, { ax: 1.1, ay: 0.3 });
  line(g, 23, 35, 25, 44, tie.lo); R(g, 22, 38, 4, 1, PAL.g1); P(g, 23, 38, '#e8cf7a');
  // pañuelo rojo en el bolsillo y botón dorado
  poly(g, [[13, 41], [18, 41], [17, 38], [15, 39], [14, 38]], tie.base); R(g, 12, 41, 7, 1, suit.lo); P(g, 28, 46, PAL.g1); P(g, 29, 50, PAL.g1);
  // guantes blancos sobre la mesa: uno sostiene una carta
  sleeve(g, { sx: 10, sy: 35, ex: 8, ey: 53, w: 7, rp: suit, cuff: shirt, bend: -1 }); sleeve(g, { sx: 38, sy: 35, ex: 40, ey: 53, w: 7, rp: suit, cuff: shirt, bend: 1 });
  P(g, 7, 52, PAL.g1); P(g, 40, 52, PAL.g1);
  shadeOut(g, [[5, 54], [12, 54], [13, 61], [11, 63], [6, 63], [4, 60]], glove, '#15110f', { ax: 1.1 }); line(g, 7, 57, 7, 62, glove.lo); line(g, 9, 57, 9, 62, glove.lo); line(g, 11, 57, 11, 61, glove.mid);
  shadeOut(g, [[35, 54], [42, 54], [44, 60], [42, 63], [37, 63], [35, 61]], glove, '#15110f', { ax: 1.1 }); line(g, 37, 57, 37, 62, glove.lo); line(g, 39, 57, 39, 62, glove.lo); line(g, 41, 57, 41, 61, glove.mid);
  R(g, 38, 49, 5, 8, '#f3efe2'); R(g, 38, 49, 5, 1, '#c9c2ad'); R(g, 39, 51, 1, 1, '#b02828'); R(g, 41, 51, 1, 1, '#b02828'); R(g, 40, 52, 1, 2, '#b02828');   // la carta
  // columna de vértebras y cráneo
  shadeRect(g, 22, 23, 5, 7, bone, { ax: 1.0 }); for (const y of [25, 27, 29]) R(g, 22, y, 5, 1, bone.lo);
  skull(g, { cx: 24, top: 8, w: 15, h: 18, jaw: 0.62, sk: bone, ears: false });
  R(g, 17, 14, 2, 4, bone.hi); R(g, 30, 14, 2, 4, bone.mid);                         // sienes
  R(g, 18, 20, 3, 4, bone.lo); R(g, 28, 20, 3, 4, bone.deep); dots(g, [[19, 19], [20, 19], [28, 19], [29, 19]], bone.lite);   // pómulos hundidos
  dots(g, [[23, 19], [25, 19]], '#0a0807'); R(g, 23, 20, 3, 1, '#0a0807'); P(g, 24, 21, '#0a0807'); P(g, 24, 18, bone.mid);        // cavidad nasal
  mouth(g, { y: 23, w: 11, style: 'grin', sk: bone, col: '#0a0807', teeth: '#f4efde' });
  line(g, 18, 25, 21, 28, bone.lo); line(g, 30, 25, 27, 28, bone.lo); R(g, 22, 27, 5, 1, bone.mid);            // mandíbula
  wrinkle(g, 20, 11, 1, bone.lo, 'v'); wrinkle(g, 28, 12, 2, bone.mid, 'v'); dots(g, [[22, 9], [23, 9]], bone.lite);
  // visera de crupier: cinta elástica roja sobre la frente y una visera verde translúcida
  shade(g, [[14, 9], [34, 9], [34, 11], [14, 11]], ramp('#a3252b'), { ax: 0.8, ay: 0.8 }); line(g, 15, 9, 33, 9, '#d85a5a'); line(g, 15, 11, 33, 11, '#3a0a0c');
  P(g, 13, 10, '#3a0a0c'); P(g, 35, 10, '#3a0a0c');
  g.save(); g.globalAlpha = 0.6; poly(g, [[12, 11], [36, 11], [38, 13], [10, 13]], '#2c8a62'); g.restore(); line(g, 12, 11, 36, 11, '#7be0ae'); line(g, 10, 13, 38, 13, '#154633');
}

// La Chica del Ojo Cosido: pálida, con camisón de hospital, pelo largo y negro, el ojo izquierdo cosido con hilo rojo y una moneda que no deja de girar.
function drawGirl(g) {
  const sk = SK('#ddd1b8'), gown = ramp('#d8d5c9'), hair = ramp('#16120f', '#8a7a90');
  bust(g, { y0: 29, sw: 16, bw: 21, rp: gown, o: { ax: 0.9, ay: 0.3 } });
  strokes(g, [[12, 36, 10, 62], [36, 36, 38, 62], [17, 44, 15, 62], [31, 44, 33, 62], [24, 40, 24, 62]], gown.mid);
  strokes(g, [[14, 38, 13, 50], [34, 38, 35, 50]], gown.lo);
  for (const [x, y, w, h, c] of [[15, 50, 4, 3, '#a5473d'], [27, 56, 5, 2, '#8c4a3a'], [20, 45, 3, 2, '#b6a58a'], [31, 42, 3, 3, '#a5473d']]) R(g, x, y, w, h, c);
  // cuello del camisón con lazadas y bata abierta en V
  poly(g, [[19, 29], [29, 29], [24, 38]], sk.base); line(g, 19, 29, 24, 38, gown.lo); line(g, 29, 29, 24, 38, gown.lo); dots(g, [[19, 30], [29, 30]], gown.hi);
  line(g, 17, 31, 14, 36, gown.lo); line(g, 31, 31, 34, 36, gown.lo); P(g, 14, 37, gown.lo); P(g, 34, 37, gown.lo);
  neck(g, { y0: 24, y1: 30, w: 6, sk });
  // mano con la moneda
  sleeve(g, { sx: 10, sy: 34, ex: 9, ey: 54, w: 6, rp: gown, bend: -1 }); sleeve(g, { sx: 38, sy: 34, ex: 39, ey: 54, w: 6, rp: gown, bend: 1 });
  hand(g, 6, 54, sk, 'fist'); hand(g, 36, 54, sk, 'fist', true);
  ell(g, 40, 50, 3, 3, '#d8b560'); ell(g, 40, 50, 2, 2, '#9c7a2b'); P(g, 39, 49, '#fff0b8'); P(g, 42, 52, '#6e5418'); line(g, 38, 46, 42, 46, '#fff0b8');
  // pelo largo con raya al medio que cae a ambos lados del cuerpo
  skull(g, { cx: 24, top: 8, w: 15, h: 18, jaw: 0.68, sk, ears: false });
  shade(g, [[15, 20], [14, 12], [17, 7], [24, 5], [31, 7], [34, 12], [33, 20], [30, 12], [26, 10], [24, 9], [22, 10], [18, 12]], hair, { ax: 0.9 });
  shade(g, [[13, 12], [18, 11], [18, 30], [17, 44], [14, 52], [11, 47], [12, 30]], hair, { ax: 1.4, ay: 0.1 }); shade(g, [[30, 11], [35, 12], [36, 30], [37, 47], [34, 52], [31, 44], [30, 30]], hair, { ax: 1.4, ay: 0.1 });
  strokes(g, [[15, 14, 14, 44], [16, 16, 16, 34], [32, 16, 33, 44], [34, 14, 35, 30]], hair.hi); strokes(g, [[17, 18, 16, 48], [31, 18, 32, 48]], hair.deep);
  line(g, 24, 6, 19, 12, hair.hi); line(g, 24, 6, 29, 12, hair.lo); line(g, 21, 6, 16, 10, hair.hi);
  // cara: ojo derecho vivo; el izquierdo, cosido
  brows(g, { ey: 17, ew: 3, col: hair.lo, tilt: -1, thick: 1, gap: 2, len: 5 }); R(g, 27, 21, 3, 1, sk.lo);
  R(g, 18, 18, 5, 1, '#1a0b0b'); for (const x of [18, 20, 22]) { line(g, x, 15, x, 21, '#c0282c'); P(g, x, 15, '#7e1519'); P(g, x, 21, '#7e1519'); }
  R(g, 17, 16, 7, 1, sk.mid); R(g, 17, 20, 7, 1, sk.mid);
  line(g, 20, 22, 20, 36, '#9a1c22'); P(g, 20, 37, '#9a1c22'); P(g, 20, 38, '#c0282c'); dots(g, [[21, 27], [21, 33]], '#7e1519');
  nose(g, { y0: 18, len: 3, sk, style: 'small' }); mouth(g, { y: 23, w: 5, style: 'line', sk, col: '#7a2a2a' }); R(g, 22, 24, 3, 1, '#a35252');
  bags(g, { ey: 17, eh: 3, ew: 3, col: sk.mid }); dots(g, [[19, 12], [20, 12]], sk.lite);
}

// El Niño: vestido de cumpleaños y gorro de fiesta; dibuja puertas con tiza roja. Te recuerda mejor que tú a él.
function drawChild(g) {
  const sk = SK('#e2d3b4'), dress = ramp('#e8dcc0'), hair = ramp('#4a2e1f'), red = ramp('#a52b2b');
  // vestido con volantes y lunares
  shade(g, [[17, 41], [31, 41], [40, 64], [8, 64]], dress, { ax: 0.9, ay: 0.4 });
  for (let j = 0; j < 4; j++) for (let i = 0; i < 5; i++) { const x = 13 + i * 5 + (j & 1) * 2, y = 47 + j * 4; if (x > 11 && x < 37) { P(g, x, y, red.base); P(g, x + 1, y, red.lo); } }
  strokes(g, [[19, 44, 14, 63], [24, 44, 24, 63], [29, 44, 34, 63]], dress.mid);
  for (let x = 9; x < 40; x += 3) { P(g, x, 62, dress.lo); P(g, x + 1, 63, dress.lo); }
  // mangas abullonadas, brazos finos y manos con tiza roja
  shadeEll(g, 14, 44, 5, 4, dress, { ax: 1.0 }); shadeEll(g, 34, 44, 5, 4, dress, { ax: 1.0 });
  shade(g, [[11, 46], [16, 46], [15, 58], [11, 58]], sk, { ax: 1.0 }); shade(g, [[32, 46], [37, 46], [37, 58], [33, 58]], sk, { ax: 1.0 });
  hand(g, 10, 58, sk, 'fist'); hand(g, 33, 58, sk, 'fist', true); R(g, 38, 54, 2, 6, '#c53a3a'); R(g, 38, 54, 2, 1, '#e8786a');
  // cuello con lazo rojo y cuello de volante
  R(g, 22, 38, 5, 3, sk.mid);
  for (let x = 16; x < 33; x += 2) { R(g, x, 40, 2, 3, dress.lite); P(g, x, 42, dress.mid); }
  shade(g, [[17, 40], [22, 41], [22, 46], [16, 45]], red, { ax: 1.0 }); shade(g, [[31, 40], [26, 41], [26, 46], [32, 45]], red, { ax: 1.0 }); shadeRect(g, 22, 40, 5, 4, ramp('#7a1d1d'));
  // cabeza redonda con flequillo y coletas, mofletes y sonrisa torcida
  skull(g, { cx: 24, top: 17, w: 19, h: 21, jaw: 0.82, sk, ears: true });
  shade(g, [[14, 28], [13, 22], [16, 17], [24, 15], [32, 17], [35, 22], [34, 28], [32, 24], [30, 20], [24, 19], [18, 20], [16, 24]], hair, { ax: 0.9 });
  R(g, 13, 22, 3, 12, hair.base); R(g, 32, 22, 3, 12, hair.lo); strokes(g, [[14, 24, 14, 33], [33, 24, 33, 33]], hair.hi);
  strokes(g, [[19, 17, 17, 21], [24, 16, 21, 20], [29, 17, 31, 21]], hair.hi);
  cheeks(g, 31, '#d98a7e', 7); brows(g, { ey: 25, dx: 4, ew: 4, col: hair.lo, tilt: -1, thick: 1, gap: 3, len: 5 });
  nose(g, { y0: 27, len: 2, sk, style: 'small' }); mouth(g, { y: 33, w: 7, style: 'smile', sk, col: '#6a2a2a' }); P(g, 28, 33, '#6a2a2a');
  wrinkle(g, 20, 24, 1, sk.lo, 'v'); wrinkle(g, 28, 24, 1, sk.lo, 'v'); R(g, 20, 29, 3, 1, sk.mid); R(g, 26, 29, 3, 1, sk.mid);
  line(g, 15, 33, 22, 37, '#9f8e6a'); line(g, 33, 33, 26, 37, '#9f8e6a');       // goma del gorro bajo la barbilla
  // gorro de cumpleaños con rayas, pompón y guirnalda
  shade(g, [[16, 19], [32, 19], [26, 4], [22, 3]], ramp('#e8dcc0'), { ax: 0.9, ay: 0.4 });
  for (let i = 0; i < 4; i++) { const y = 7 + i * 3; poly(g, [[22 - i * 1.4 - 0.5, y], [26 + i * 1.3 + 0.5, y], [26 + i * 1.3 + 1.5, y + 1.5], [22 - i * 1.4 - 1.5, y + 1.5]], i % 2 ? red.base : '#2b6a8a'); }
  line(g, 16, 19, 32, 19, red.lo); ell(g, 24, 2, 2, 2, '#e8c24a'); P(g, 23, 1, '#fff2b0'); dots(g, [[21, 0], [27, 1], [25, 0]], '#e8c24a');
}

// El Vendedor: una capucha sin cara, dos ojos encendidos y un cinturón de frascos con recuerdos dentro.
function drawMerchant(g) {
  const cloak = ramp('#3a2a1e', '#a89070'), hood = ramp('#17110d', '#7a6a58'), jar = '#c9e4dc';
  shade(g, [[18, 26], [30, 26], [38, 31], [42, 40], [45, 64], [3, 64], [6, 40], [10, 31]], cloak, { ax: 1.0, ay: 0.3 });
  strokes(g, [[10, 36, 7, 62], [14, 40, 11, 62], [38, 36, 41, 62], [34, 40, 37, 62], [18, 34, 16, 50], [30, 34, 32, 50]], cloak.deep); strokes(g, [[12, 38, 10, 60], [36, 38, 38, 60]], cloak.hi);
  // remiendos
  R(g, 8, 48, 5, 5, '#5a4630'); R(g, 8, 48, 5, 1, '#8a7050'); for (let i = 0; i < 4; i++) P(g, 8 + i + 1, 49 + (i & 1) * 3, '#241810'); R(g, 35, 54, 6, 4, '#4a3a2a'); line(g, 35, 54, 40, 57, '#241810');
  for (let x = 4; x < 46; x += 4) { P(g, x, 63, cloak.deep); P(g, x + 1, 62, cloak.lo); }
  // capucha: óvalo oscuro y vacío, con bordes de tela
  shade(g, [[13, 25], [11, 15], [16, 7], [24, 3], [32, 7], [37, 15], [35, 25], [30, 28], [18, 28]], hood, { ax: 0.9, ay: 0.4 });
  shadeEll(g, 24, 19, 8, 10, ramp('#050403'), { ax: 0.1, ay: 0.2, edge: 0 }); strokes(g, [[15, 24, 15, 12], [33, 24, 33, 12]], hood.lite);
  line(g, 24, 3, 14, 12, hood.hi); line(g, 24, 3, 34, 12, hood.lo); dots(g, [[17, 8], [20, 5], [29, 5]], hood.lite);
  // sonrisa de dientes apenas visible dentro de la capucha
  for (let x = 18; x <= 30; x += 2) { P(g, x, 25, '#6b6458'); P(g, x + 1, 26, '#3a362e'); }
  // cinturón con frascos de recuerdos
  R(g, 5, 43, 38, 3, '#2a1c12'); R(g, 5, 43, 38, 1, '#6b4a33'); R(g, 22, 43, 4, 3, PAL.g1); P(g, 23, 44, '#241810');
  const GL = ['#e6803a', '#8fd0b0', '#d86a9a', '#8ab4f0', '#e8d060'];
  for (let i = 0; i < 5; i++) { const x = 7 + i * 7; R(g, x, 46, 5, 9, '#10211f'); R(g, x + 1, 47, 3, 7, GL[i]); R(g, x + 1, 47, 1, 6, '#fff6d8'); R(g, x + 3, 52, 1, 2, '#00000066'); R(g, x, 45, 5, 1, '#8a6a4a'); R(g, x + 1, 44, 3, 1, '#b08a5a'); P(g, x + 4, 54, '#0a1513'); }
  // manos largas y grises, una sosteniendo un frasco
  sleeve(g, { sx: 10, sy: 34, ex: 8, ey: 58, w: 6, rp: cloak, bend: -1 }); sleeve(g, { sx: 38, sy: 34, ex: 40, ey: 56, w: 6, rp: cloak, bend: 1 });
  const grey = ramp('#8a8f86'); hand(g, 5, 58, grey, 'claw'); hand(g, 37, 56, grey, 'claw', true);
  R(g, 41, 48, 5, 8, '#10211f'); R(g, 42, 49, 3, 6, '#d6b0f0'); R(g, 42, 49, 1, 5, '#fff'); R(g, 41, 47, 5, 1, '#8a6a4a');
}

// La Mujer de Rojo: baila con un vestido que ya no se quita; sostiene una rosa.
function drawWoman(g) {
  const sk = SK('#e6d6bc'), dress = ramp('#a31f26'), hair = ramp('#0d0a0b', '#7a6a80');
  bust(g, { y0: 30, sw: 16, bw: 21, rp: dress, o: { ax: 1.0, ay: 0.3 } });
  strokes(g, [[12, 40, 6, 62], [18, 44, 14, 62], [24, 46, 24, 62], [31, 44, 35, 62], [36, 40, 42, 62]], dress.deep); strokes(g, [[14, 42, 9, 62], [28, 46, 29, 62]], dress.hi);
  // escote en corazón con encaje, clavículas y collar
  poly(g, [[16, 30], [22, 30], [24, 33], [26, 30], [32, 30], [31, 40], [24, 46], [17, 40]], sk.base);
  shade(g, [[17, 31], [31, 31], [30, 40], [24, 45], [18, 40]], sk, { ax: 0.9, ay: 0.4 });
  poly(g, [[15, 30], [24, 35], [33, 30], [33, 33], [24, 38], [15, 33]], dress.base); line(g, 16, 32, 24, 37, dress.lo); line(g, 32, 32, 24, 37, dress.lo);
  for (let x = 16; x < 33; x += 2) P(g, x, 39 + Math.round(Math.abs(x - 24) * 0.2), '#f0e2d0');   // encaje
  line(g, 20, 31, 23, 32, sk.lo); line(g, 28, 31, 25, 32, sk.lo); dots(g, [[21, 31], [27, 31]], sk.lite);
  for (let i = 0; i < 7; i++) { const t = i / 6, x = 19 + t * 10, y = 31 + Math.sin(t * Math.PI) * 5; P(g, Math.round(x), Math.round(y), i % 3 === 1 ? '#f4eee0' : '#c8c0b0'); }
  neck(g, { y0: 24, y1: 31, w: 6, sk });
  // brazo con guante negro y una rosa roja
  sleeve(g, { sx: 12, sy: 36, ex: 11, ey: 52, w: 5, rp: dress, bend: -1 }); sleeve(g, { sx: 36, sy: 36, ex: 37, ey: 54, w: 5, rp: dress, bend: 1 });
  const gl = ramp('#15110f', '#8a7a8a'); hand(g, 8, 52, gl, 'fist'); hand(g, 34, 54, gl, 'fist', true);
  // pelo largo y ondulado, con un mechón sobre un ojo
  skull(g, { cx: 24, top: 8, w: 15, h: 18, jaw: 0.66, sk, ears: false });
  shade(g, [[15, 22], [14, 13], [17, 7], [24, 5], [31, 7], [34, 13], [33, 22], [31, 12], [26, 10], [24, 9], [21, 10], [17, 12]], hair, { ax: 0.9 });
  shade(g, [[12, 13], [18, 11], [18, 28], [16, 42], [11, 49], [9, 38], [11, 26]], hair, { ax: 1.4, ay: 0.1 }); shade(g, [[30, 11], [36, 13], [38, 26], [39, 38], [37, 49], [32, 42], [30, 28]], hair, { ax: 1.4, ay: 0.1 });
  for (const [x0, x1, y] of [[11, 14, 30], [10, 15, 40], [34, 38, 30], [34, 40, 40]]) line(g, x0, y, x1, y + 3, hair.hi);
  strokes(g, [[14, 14, 13, 40], [34, 14, 35, 38], [17, 16, 16, 30]], hair.hi); line(g, 24, 6, 18, 12, hair.hi); line(g, 24, 6, 30, 12, hair.lo);
  // maquillaje: sombra oscura, cejas finas y arqueadas, labios rojos, pendientes
  brows(g, { ey: 17, ew: 3, col: hair.base, tilt: 1, thick: 1, gap: 2, len: 6 }); R(g, 18, 14, 5, 1, '#3a2a40'); R(g, 26, 14, 5, 1, '#3a2a40');
  nose(g, { y0: 18, len: 3, sk, style: 'small' }); 
  R(g, 21, 22, 7, 1, '#b82a32'); P(g, 20, 22, '#7a1a20'); P(g, 28, 22, '#7a1a20'); R(g, 22, 23, 5, 1, '#4a0a10'); R(g, 22, 24, 5, 1, '#c83a42'); P(g, 24, 24, '#ea6a6e'); R(g, 23, 25, 3, 1, sk.mid);
  dots(g, [[17, 25], [31, 25]], '#e8c85a'); P(g, 17, 26, '#e8c85a'); P(g, 31, 26, '#e8c85a');
  // la rosa, por delante del pelo
  line(g, 9, 47, 9, 52, '#2d5a2d'); P(g, 10, 49, '#2d5a2d'); P(g, 8, 50, '#2d5a2d'); shadeEll(g, 9, 45, 3, 3, ramp('#c22a30'), { ax: 1.2 }); dots(g, [[9, 44], [8, 46], [10, 45]], '#6a0f14'); P(g, 8, 44, '#f08a8a');
}

// La Archivista: archiva todos los nombres y todas las puertas. Moño gris, gafas redondas con cadena, chaqueta de tweed y un libro mayor que no suelta.
function drawArchivist(g) {
  const sk = SK('#d6c7a6'), tweed = ramp('#5e4332'), hair = ramp('#a7a39a', '#fff8ee'), book = ramp('#7a1e22'), blouse = ramp('#e8e1cf');
  bust(g, { y0: 29, sw: 16, bw: 21, rp: tweed, o: { ax: 1.0, ay: 0.3 } });
  over(g, () => { for (let y = 30; y < 64; y += 2) for (let x = 3 + (y & 2); x < 46; x += 4) P(g, x, y, tweed.hi); for (let y = 31; y < 64; y += 4) for (let x = 4; x < 46; x += 4) P(g, x, y, tweed.deep); });
  strokes(g, [[10, 36, 8, 56], [38, 36, 40, 56]], tweed.deep);
  poly(g, [[19, 29], [29, 29], [24, 40]], blouse.base); line(g, 19, 29, 24, 40, blouse.lo); line(g, 29, 29, 24, 40, blouse.mid);
  shade(g, [[15, 30], [20, 29], [24, 38], [20, 46], [15, 38]], tweed, { ax: 1.4, bias: -0.25 }); shade(g, [[33, 30], [28, 29], [24, 38], [28, 46], [33, 38]], tweed, { ax: 1.4, bias: -0.1 });
  ell(g, 24, 38, 2, 2.5, PAL.g1); P(g, 23, 37, '#f0d79a'); ell(g, 24, 38, 1, 1.5, '#7a5a2a');       // camafeo
  neck(g, { y0: 24, y1: 30, w: 6, sk });
  // brazos con coderas de cuero, manos con dedos manchados de tinta
  sleeve(g, { sx: 11, sy: 36, ex: 9, ey: 50, w: 7, rp: tweed, cuff: blouse, bend: -1 }); sleeve(g, { sx: 37, sy: 36, ex: 39, ey: 50, w: 7, rp: tweed, cuff: blouse, bend: 1 });
  R(g, 8, 42, 4, 4, '#8a6a4a'); R(g, 37, 42, 4, 4, '#8a6a4a'); P(g, 9, 43, '#b08a5a'); P(g, 38, 43, '#b08a5a');
  // libro mayor: tapa de cuero con cantos dorados, hojas asomando y cinta roja
  shadeOut(g, [[11, 41], [37, 41], [38, 57], [10, 57]], book, '#1a0a0b', { ax: 0.9, ay: 0.5 });
  R(g, 13, 43, 22, 1, PAL.g1); R(g, 13, 55, 22, 1, PAL.g1); R(g, 13, 43, 1, 13, PAL.g1); R(g, 34, 43, 1, 13, PAL.g1); R(g, 18, 47, 12, 4, '#1a0a0b'); R(g, 19, 48, 10, 2, PAL.g1); dots(g, [[21, 49], [24, 49], [27, 49]], '#1a0a0b');
  R(g, 37, 43, 2, 13, '#efe6cf'); line(g, 38, 43, 38, 55, '#b8ae94'); R(g, 31, 57, 2, 6, '#c22a30'); P(g, 31, 63, '#7a1519');
  hand(g, 7, 49, sk, 'fist'); hand(g, 36, 49, sk, 'fist', true); dots(g, [[8, 52], [9, 52], [38, 52], [39, 52]], '#1b2a55');
  // cabeza larga con nariz fina, arrugas y gafas redondas
  skull(g, { cx: 24, top: 8, w: 15, h: 18, jaw: 0.62, sk, ears: true });
  shade(g, [[16, 16], [16, 10], [19, 7], [24, 6], [29, 7], [32, 10], [32, 16], [30, 11], [24, 9], [18, 11]], hair, { ax: 0.9 }); R(g, 15, 11, 2, 9, hair.base); R(g, 32, 11, 2, 9, hair.lo);
  shadeEll(g, 24, 5, 4.5, 3.5, hair, { ax: 1.0 }); strokes(g, [[21, 4, 27, 4], [21, 6, 27, 6], [22, 8, 19, 12], [26, 8, 29, 12]], hair.lo); dots(g, [[22, 3], [23, 3]], hair.lite);
  line(g, 33, 4, 36, 9, '#d8d4c4'); P(g, 36, 10, '#2b2b44');                                          // pluma de escribir tras la oreja
  brows(g, { ey: 16, ew: 3, col: hair.lo, tilt: 0, thick: 1, gap: 3, len: 5 });
  for (const x0 of [17, 25]) { R(g, x0 + 1, 14, 5, 1, '#6a4e2a'); R(g, x0 + 1, 19, 5, 1, '#6a4e2a'); R(g, x0, 15, 1, 4, '#6a4e2a'); R(g, x0 + 6, 15, 1, 4, '#6a4e2a'); P(g, x0 + 1, 14, '#e8cf8a'); }
  R(g, 24, 15, 1, 1, '#6a4e2a'); line(g, 16, 15, 14, 16, '#6a4e2a'); line(g, 32, 15, 34, 16, '#6a4e2a');
  wrinkle(g, 17, 19, 2, sk.mid); wrinkle(g, 30, 19, 2, sk.mid); bags(g, { ey: 16, eh: 2, ew: 3, col: sk.lo });
  nose(g, { y0: 18, len: 4, sk, style: 'long' }); R(g, 19, 22, 2, 2, sk.mid); R(g, 28, 22, 2, 2, sk.mid);
  mouth(g, { y: 24, w: 5, style: 'frown', sk, col: '#5a3a30' }); wrinkle(g, 20, 26, 1, sk.mid, 'v'); wrinkle(g, 28, 26, 1, sk.mid, 'v');
  // cadena de las gafas
  for (let i = 0; i < 8; i++) P(g, 15 - (i >> 2), 18 + i * 3 - (i > 5 ? 1 : 0), PAL.g1);
}

// La Hermana del Velo: hábito negro, toca blanca almidonada, crucifijo y rosario. Bautizó a alguien demasiado tiempo.
function drawNun(g) {
  const sk = SK('#e2d6bc'), habit = ramp('#17151a', '#8a90b0'), coif = ramp('#efeadc');
  // velo y hábito
  shade(g, [[24, 2], [32, 4], [38, 12], [40, 28], [47, 64], [1, 64], [8, 28], [10, 12], [16, 4]], habit, { ax: 1.0, ay: 0.4 });
  strokes(g, [[12, 14, 7, 62], [16, 26, 13, 62], [36, 14, 41, 62], [32, 26, 35, 62], [24, 4, 24, 12]], habit.deep); strokes(g, [[14, 12, 10, 40], [38, 16, 42, 50]], habit.hi);
  // toca: banda de frente, barbuquejo y babero blanco con pliegues
  shade(g, [[17, 8], [31, 8], [34, 14], [34, 27], [24, 31], [14, 27], [14, 14]], coif, { ax: 0.9, ay: 0.3, edge: 0.9 });
  shade(g, [[16, 30], [32, 30], [31, 46], [24, 49], [17, 46]], coif, { ax: 0.9, ay: 0.5, edge: 0.9 });
  strokes(g, [[19, 32, 19, 45], [22, 33, 22, 47], [26, 33, 26, 47], [29, 32, 29, 45]], coif.mid); strokes(g, [[16, 14, 15, 26], [32, 14, 33, 26]], coif.lo);
  // cara
  skull(g, { cx: 24, top: 11, w: 11, h: 17, jaw: 0.7, sk, ears: false });
  line(g, 18, 11, 30, 11, coif.lo); R(g, 17, 9, 15, 2, coif.hi); R(g, 17, 9, 15, 1, coif.lite);
  brows(g, { ey: 17, ew: 3, col: '#2b2420', tilt: 1, thick: 1, gap: 2, len: 5 }); bags(g, { ey: 17, eh: 2, ew: 3, col: sk.lo });
  nose(g, { y0: 18, len: 3, sk, style: 'long' }); mouth(g, { y: 24, w: 5, style: 'line', sk, col: '#5a2f2f' }); wrinkle(g, 20, 26, 1, sk.mid, 'v'); wrinkle(g, 28, 26, 1, sk.mid, 'v');
  dots(g, [[27, 24], [27, 26], [28, 28]], '#9ec5d0'); P(g, 28, 29, '#d9f1ee');          // gotas de agua: siempre está húmeda
  // escapulario negro encima del babero, con crucifijo dorado y cuentas del rosario
  shade(g, [[17, 30], [20, 30], [21, 62], [17, 62]], habit, { ax: 1.2, bias: -0.1 }); shade(g, [[31, 30], [28, 30], [27, 62], [31, 62]], habit, { ax: 1.2 });
  for (let i = 0; i < 12; i++) { const y = 32 + i * 2.4; P(g, Math.round(24 + Math.sin(i * 0.9) * 2.5), Math.round(y), i % 3 === 0 ? '#b02a2a' : '#2a0c0c'); }
  R(g, 23, 44, 3, 12, PAL.g1); R(g, 21, 47, 7, 2, PAL.g1); R(g, 23, 44, 1, 12, '#e8cf7a'); R(g, 21, 47, 7, 1, '#e8cf7a');
  // mangas anchas que se juntan: manos pálidas sobre el rosario
  shade(g, [[7, 38], [17, 44], [20, 57], [8, 62], [3, 56]], habit, { ax: 1.1 }); shade(g, [[41, 38], [31, 44], [28, 57], [40, 62], [45, 56]], habit, { ax: 1.1 });
  strokes(g, [[9, 42, 6, 58], [13, 46, 11, 60], [39, 42, 42, 58], [35, 46, 37, 60]], habit.deep);
  hand(g, 15, 54, sk, 'fist'); hand(g, 27, 54, sk, 'fist', true);
}

// El Cocinero: grande, sudoroso, con el delantal manchado; guarda recuerdos en tarros y siempre tiene un plato caliente para el Niño.
function drawCook(g) {
  const sk = SK('#dcb592'), white = ramp('#ece6d6'), hair = ramp('#2e2018');
  bust(g, { y0: 28, sw: 19, bw: 23, rp: white, o: { ax: 0.9, ay: 0.3 } });
  strokes(g, [[8, 38, 6, 62], [16, 42, 14, 62], [32, 42, 34, 62], [40, 38, 42, 62]], white.mid); strokes(g, [[12, 36, 10, 60]], white.hi);
  // casaca de doble botonadura, manchas de sangre y salsa, delantal
  for (const x of [19, 29]) for (let y = 36; y < 60; y += 6) { ell(g, x, y, 1.5, 1.5, '#cfc8b4'); P(g, x - 1, y - 1, '#fff'); P(g, x + 1, y + 1, '#8a8470'); }
  line(g, 24, 30, 24, 62, white.lo);
  for (const [x, y, w, h] of [[13, 40, 5, 3], [30, 48, 6, 4], [20, 54, 4, 3], [34, 38, 3, 4], [10, 52, 3, 2]]) { R(g, x, y, w, h, '#8a1c1c'); R(g, x, y, w, 1, '#c03a3a'); }
  dots(g, [[15, 45], [15, 46], [32, 53], [32, 54], [22, 58]], '#8a1c1c');
  shade(g, [[14, 46], [34, 46], [36, 64], [12, 64]], ramp('#d8cfb4'), { ax: 0.9, ay: 0.4, bias: 0.05 }); line(g, 14, 46, 34, 46, '#fff'); strokes(g, [[17, 48, 16, 63], [31, 48, 32, 63]], '#a89e84');
  for (const [x, y, w, h] of [[20, 55, 6, 3], [28, 51, 3, 3]]) { R(g, x, y, w, h, '#7a1818'); }
  neck(g, { y0: 24, y1: 29, w: 9, sk });
  // brazos remangados con antebrazos peludos; cuchillo de carnicero y un tarro con luz dentro
  sleeve(g, { sx: 8, sy: 35, ex: 7, ey: 48, w: 8, rp: white, bend: -1 }); sleeve(g, { sx: 40, sy: 35, ex: 41, ey: 48, w: 8, rp: white, bend: 1 });
  shade(g, [[4, 47], [11, 47], [11, 56], [4, 56]], sk, { ax: 1.0 }); shade(g, [[37, 47], [44, 47], [44, 56], [37, 56]], sk, { ax: 1.0 });
  for (let y = 49; y < 56; y += 2) { P(g, 5, y, '#7a5a40'); P(g, 9, y, '#7a5a40'); P(g, 39, y, '#7a5a40'); P(g, 42, y, '#7a5a40'); }
  hand(g, 3, 56, sk, 'fist'); hand(g, 38, 56, sk, 'fist', true);
  // cuchillo
  R(g, 42, 33, 3, 18, '#3a3028'); R(g, 43, 33, 1, 18, '#6b5a48'); shade(g, [[39, 38], [46, 38], [46, 52], [40, 52]], ramp('#b8bcc0'), { ax: 0.9 }); line(g, 40, 39, 40, 51, '#f4f8fa'); dots(g, [[44, 40], [44, 44]], '#3a3a3e');
  // cabeza redonda y colorada, mostacho, cejas pobladas y sudor
  skull(g, { cx: 24, top: 9, w: 17, h: 19, jaw: 0.8, sk, ears: true });
  cheeks(g, 21, '#c9786a', 6); R(g, 22, 19, 5, 3, '#d28676');
  brows(g, { ey: 17, ew: 3, col: hair.base, tilt: 1, thick: 2, gap: 2, len: 6 }); bags(g, { ey: 17, eh: 2, ew: 3, col: sk.lo });
  nose(g, { y0: 18, len: 4, sk: { ...sk, mid: '#c28a74' }, style: 'small' });
  shade(g, [[17, 23], [31, 23], [33, 25], [29, 26], [24, 25], [19, 26], [15, 25]], hair, { ax: 0.9 }); R(g, 22, 27, 5, 1, '#6a2a2a'); R(g, 21, 28, 7, 1, sk.mid);
  dots(g, [[19, 27], [20, 28], [28, 28], [29, 27], [22, 29], [26, 29]], '#6a4a38');
  dots(g, [[17, 12], [33, 14], [31, 21]], '#cfe6f0'); P(g, 17, 13, '#8ab8cc');
  // toca alta plisada
  shade(g, [[14, 9], [34, 9], [33, 4], [15, 4]], white, { ax: 0.7 }); shadeEll(g, 24, 4, 10, 4, white, { ax: 0.9 }); shadeEll(g, 17, 5, 5, 4, white, { ax: 1.0 }); shadeEll(g, 31, 5, 5, 4, white, { ax: 1.0 });
  strokes(g, [[17, 5, 17, 11], [20, 6, 20, 11], [24, 6, 24, 11], [28, 6, 28, 11], [31, 5, 31, 11]], white.mid); R(g, 14, 10, 20, 2, white.lo); R(g, 14, 10, 20, 1, white.hi);
}

// La Enfermera: cofia con cruz, mascarilla, jeringa enorme y aguja con hilo rojo (le cosió el ojo a la Chica).
function drawNurse(g) {
  const sk = SK('#e0d2b8'), white = ramp('#e6eaea', '#fff8ee', '#2a3a44'), hair = ramp('#3a2a22'), mask = ramp('#a8c4cc');
  bust(g, { y0: 29, sw: 16, bw: 21, rp: white, o: { ax: 0.9, ay: 0.3 } });
  strokes(g, [[10, 38, 8, 62], [38, 38, 40, 62], [16, 44, 14, 62], [32, 44, 34, 62]], white.mid);
  // cuello de pico, cruz roja en el pecho, estetoscopio y manchas
  poly(g, [[20, 29], [28, 29], [24, 38]], sk.base); line(g, 20, 29, 24, 38, white.lo); line(g, 28, 29, 24, 38, white.lo);
  R(g, 22, 42, 4, 12, '#b02a2a'); R(g, 18, 46, 12, 4, '#b02a2a'); R(g, 22, 42, 4, 1, '#e86a6a'); R(g, 18, 46, 12, 1, '#e86a6a'); R(g, 18, 49, 12, 1, '#7a1519');
  for (let i = 0; i < 14; i++) { const t = i / 13; P(g, Math.round(18 + t * 2 - Math.sin(t * Math.PI) * 3), Math.round(30 + t * 18), '#2a2a30'); P(g, Math.round(30 - t * 2 + Math.sin(t * Math.PI) * 3), Math.round(30 + t * 18), '#2a2a30'); }
  ell(g, 24, 50, 2, 2, '#8a8f94'); P(g, 23, 49, '#e0e4e6');
  for (const [x, y, w, h] of [[13, 56, 4, 3], [32, 38, 3, 4], [36, 56, 3, 2]]) { R(g, x, y, w, h, '#8a1c1c'); }
  neck(g, { y0: 24, y1: 30, w: 6, sk });
  // brazos: izquierdo con tablilla, derecho levantado con una jeringa
  sleeve(g, { sx: 11, sy: 36, ex: 9, ey: 52, w: 7, rp: white, cuff: ramp('#c9d0d0'), bend: -1 }); sleeve(g, { sx: 37, sy: 36, ex: 39, ey: 52, w: 7, rp: white, cuff: ramp('#c9d0d0'), bend: 1 });
  shadeOut(g, [[3, 38], [13, 38], [13, 53], [3, 53]], ramp('#8a6a4a'), '#1a1008', { ax: 0.9 }); R(g, 4, 40, 8, 11, '#efe9d8'); for (const y of [42, 44, 46, 48]) R(g, 5, y, 6, 1, '#6a645a'); R(g, 6, 38, 4, 2, '#a8a8a0');
  hand(g, 3, 52, sk, 'fist'); hand(g, 38, 52, sk, 'fist', true);
  R(g, 41, 30, 4, 22, '#cfe4e8'); R(g, 41, 30, 1, 22, '#fff'); R(g, 43, 38, 2, 12, '#b02a2a'); R(g, 40, 29, 6, 1, '#8a8f94'); R(g, 42, 24, 2, 5, '#8a8f94'); R(g, 41, 52, 4, 1, '#8a8f94'); R(g, 42, 53, 2, 5, '#c9d0d0'); P(g, 42, 58, '#ffffff');
  for (let i = 0; i < 4; i++) P(g, 41 + (i & 1), 31 + i * 5, '#8a8f94');
  // cabeza, pelo recogido, mascarilla y cofia
  skull(g, { cx: 24, top: 8, w: 15, h: 18, jaw: 0.68, sk, ears: false });
  shade(g, [[16, 18], [15, 11], [18, 8], [30, 8], [33, 11], [32, 18], [30, 11], [24, 10], [18, 11]], hair, { ax: 0.9 }); R(g, 14, 11, 3, 12, hair.base); R(g, 31, 11, 3, 12, hair.lo); strokes(g, [[15, 12, 15, 21], [20, 9, 18, 12]], hair.hi);
  brows(g, { ey: 17, ew: 3, col: hair.lo, tilt: 1, thick: 1, gap: 2, len: 5 }); bags(g, { ey: 17, eh: 2, ew: 3, col: sk.lo }); R(g, 19, 14, 3, 1, '#7a6a60'); R(g, 27, 14, 3, 1, '#7a6a60');
  shade(g, [[16, 21], [32, 21], [31, 27], [24, 30], [17, 27]], mask, { ax: 0.9, ay: 0.5, edge: 1.0 }); strokes(g, [[17, 23, 31, 23], [17, 25, 30, 25]], mask.lo); R(g, 16, 21, 17, 1, mask.hi);
  line(g, 16, 21, 13, 17, '#c9dde2'); line(g, 32, 21, 35, 17, '#c9dde2'); P(g, 13, 16, '#c9dde2'); P(g, 35, 16, '#c9dde2');
  shade(g, [[14, 8], [34, 8], [32, 3], [16, 3]], white, { ax: 0.8 }); R(g, 14, 8, 20, 1, white.lo); R(g, 23, 3, 2, 5, '#b02a2a'); R(g, 21, 5, 6, 2, '#b02a2a'); dots(g, [[23, 3], [21, 5]], '#e86a6a');
}

// El Muñeco: marioneta de madera con las mejillas pintadas y la boca articulada; lo mueven desde arriba, pero nadie se ve la mano.
function drawPuppet(g) {
  const wood = ramp('#b98a5c'), suit = ramp('#1d1a22', '#8892b0'), hair = ramp('#120d0a'), paint = ramp('#c22a30');
  // barra de control y cuerdas
  R(g, 6, 0, 36, 2, '#6b4a33'); R(g, 6, 0, 36, 1, '#9a7650'); R(g, 22, 0, 4, 3, '#4a3022'); for (const x of [12, 24, 36]) line(g, x, 2, x === 24 ? 24 : x < 24 ? 16 : 32, 12, '#cfc8b4');
  line(g, 8, 2, 8, 44, '#cfc8b4'); line(g, 40, 2, 40, 44, '#cfc8b4');
  // cuerpo: traje negro, camisa y pajarita
  shade(g, [[17, 38], [31, 38], [38, 42], [40, 64], [8, 64], [10, 42]], suit, { ax: 1.0, ay: 0.3 }); strokes(g, [[12, 46, 10, 62], [36, 46, 38, 62]], suit.deep);
  poly(g, [[19, 38], [29, 38], [24, 54]], '#e9e3d0'); line(g, 19, 38, 24, 54, suit.lo); line(g, 29, 38, 24, 54, suit.lo); dots(g, [[24, 42], [24, 46], [24, 50]], '#8a8470');
  shade(g, [[19, 38], [24, 40], [29, 38], [29, 43], [24, 41], [19, 43]], ramp('#a52b2b'), { ax: 1.0 }); ell(g, 24, 40, 1.5, 1.5, '#7a1519');
  // brazos de madera articulados con bisagras
  shade(g, [[8, 42], [13, 42], [13, 56], [8, 56]], suit, { ax: 1.0 }); shade(g, [[35, 42], [40, 42], [40, 56], [35, 56]], suit, { ax: 1.0 });
  shade(g, [[7, 56], [14, 56], [14, 62], [7, 62]], wood, { ax: 1.0 }); shade(g, [[34, 56], [41, 56], [41, 62], [34, 62]], wood, { ax: 1.0 }); for (const x of [8, 10, 12, 35, 37, 39]) line(g, x, 59, x, 62, wood.deep);
  ell(g, 10, 55, 2, 1.5, '#8a8f94'); ell(g, 37, 55, 2, 1.5, '#8a8f94');
  // cuello bisagra
  shadeRect(g, 21, 33, 6, 5, wood, { ax: 1.0 }); ell(g, 24, 36, 2, 2, '#8a8f94'); P(g, 23, 35, '#e8ecee');
  // cabeza de madera: veta, pelo pintado, ojos grandes con aro negro, mejillas rojas, boca con bisagras
  skull(g, { cx: 24, top: 12, w: 21, h: 22, jaw: 0.74, sk: wood, ears: false });
  over(g, () => { for (const [x, y, w] of [[16, 14, 6], [26, 16, 7], [15, 24, 5], [28, 27, 5], [19, 31, 8]]) { R(g, x, y, w, 1, wood.lo); R(g, x + 1, y + 1, w - 2, 1, wood.mid); } for (const [x, y] of [[22, 20], [32, 23], [17, 28]]) { P(g, x, y, wood.deep); P(g, x + 1, y, wood.lo); } });
  shade(g, [[14, 22], [13, 16], [17, 11], [24, 9], [31, 11], [35, 16], [34, 22], [32, 17], [24, 14], [16, 17]], hair, { ax: 0.9 }); strokes(g, [[17, 12, 14, 18], [21, 10, 16, 15], [28, 10, 33, 15]], hair.hi);
  ring(g, 19, 20, 4, 3.5, '#0a0807'); ring(g, 29, 20, 4, 3.5, '#0a0807');
  R(g, 14, 25, 4, 3, paint.base); R(g, 14, 25, 4, 1, paint.hi); R(g, 31, 25, 4, 3, paint.base); R(g, 31, 25, 4, 1, paint.hi); dots(g, [[15, 24], [33, 24]], paint.lo);
  shade(g, [[22, 22], [27, 22], [26, 27], [23, 27]], wood, { ax: 1.0 }); P(g, 24, 22, wood.hi); P(g, 24, 26, wood.deep);
  R(g, 16, 30, 17, 5, '#0a0807'); R(g, 17, 31, 15, 3, '#8f1d22'); R(g, 17, 31, 15, 1, '#c53a3a'); for (let x = 19; x < 32; x += 3) R(g, x, 31, 1, 3, '#0a0807'); P(g, 15, 31, wood.deep); P(g, 33, 31, wood.deep); P(g, 15, 33, wood.deep); P(g, 33, 33, wood.deep);
  R(g, 14, 30, 1, 5, wood.deep); R(g, 34, 30, 1, 5, wood.deep);
}

// El Pianista Sin Manos: frac, pajarita y los brazos terminados en muñones vendados que aún tocan. La Archivista guarda sus manos en un cajón.
function drawPianist(g) {
  const sk = SK('#ddd1b6'), suit = ramp('#17151b', '#8a92b0'), shirt = ramp('#ece7d8'), hair = ramp('#120e0c'), band = ramp('#e6dfca');
  bust(g, { y0: 28, sw: 16, bw: 21, rp: suit, o: { ax: 1.0, ay: 0.3 } });
  strokes(g, [[10, 36, 8, 54], [38, 36, 40, 54]], suit.deep);
  poly(g, [[19, 28], [29, 28], [27, 52], [21, 52]], shirt.base); shade(g, [[20, 28], [28, 28], [27, 52], [21, 52]], shirt, { ax: 0.6, ay: 0.4 });
  shade(g, [[14, 30], [20, 28], [22, 48], [16, 52], [13, 40]], suit, { ax: 1.4, bias: -0.3 }); shade(g, [[34, 30], [28, 28], [26, 48], [32, 52], [35, 40]], suit, { ax: 1.4, bias: -0.1 });
  line(g, 14, 31, 17, 48, suit.lite); line(g, 34, 31, 31, 48, suit.hi); dots(g, [[24, 36], [24, 41], [24, 46]], '#3a3a44');
  // pajarita roja
  shade(g, [[19, 29], [23, 31], [19, 34]], ramp('#a3212a'), { ax: 1.0 }); shade(g, [[29, 29], [25, 31], [29, 34]], ramp('#a3212a'), { ax: 1.0 }); R(g, 23, 30, 3, 3, '#7a1519');
  neck(g, { y0: 23, y1: 29, w: 6, sk });
  // brazos extendidos hacia el teclado, rematados por muñones vendados con manchas de sangre
  sleeve(g, { sx: 11, sy: 35, ex: 9, ey: 50, w: 7, rp: suit, cuff: shirt, bend: -1 }); sleeve(g, { sx: 37, sy: 35, ex: 39, ey: 50, w: 7, rp: suit, cuff: shirt, bend: 1 });
  for (const x0 of [5, 35]) { shadeOut(g, [[x0, 50], [x0 + 8, 50], [x0 + 8, 56], [x0 + 6, 58], [x0 + 2, 58], [x0, 56]], band, '#2a2018', { ax: 1.0, ay: 0.3 }); for (let y = 51; y < 58; y += 2) line(g, x0, y, x0 + 7, y + 1, band.lo); }
  R(g, 7, 54, 3, 3, '#a5282c'); P(g, 8, 57, '#7a1519'); R(g, 38, 53, 4, 3, '#a5282c'); P(g, 40, 56, '#7a1519'); dots(g, [[8, 58], [40, 57]], '#a5282c');
  // teclado con teclas negras
  shade(g, [[1, 58], [47, 58], [47, 64], [1, 64]], ramp('#efe9d8'), { ax: 0.4, ay: 0.4, edge: 0.5 }); R(g, 1, 58, 46, 1, PAL.k0); for (let x = 4; x < 47; x += 4) R(g, x, 59, 1, 5, '#b8b2a0');
  for (const x of [3, 7, 15, 19, 23, 31, 35, 43]) R(g, x, 58, 3, 4, PAL.k1);
  // cabeza: pelo engominado con raya, patillas, ojeras profundas y expresión de tristeza
  skull(g, { cx: 24, top: 8, w: 15, h: 18, jaw: 0.66, sk, ears: true });
  shade(g, [[16, 16], [16, 10], [19, 7], [28, 7], [32, 10], [32, 16], [30, 11], [26, 9], [20, 10], [18, 12]], hair, { ax: 0.9 }); R(g, 15, 10, 2, 9, hair.base); R(g, 31, 10, 2, 9, hair.lo);
  line(g, 21, 7, 17, 12, hair.hi); line(g, 22, 7, 19, 11, hair.hi); line(g, 27, 7, 31, 11, hair.lo); line(g, 23, 7, 22, 10, hair.deep);
  brows(g, { ey: 16, ew: 3, col: hair.base, tilt: -2, thick: 1, gap: 2, len: 5 }); bags(g, { ey: 16, eh: 2, ew: 3, col: sk.lo }); R(g, 19, 20, 3, 1, sk.mid); R(g, 27, 20, 3, 1, sk.mid);
  nose(g, { y0: 17, len: 4, sk, style: 'long' }); mouth(g, { y: 23, w: 5, style: 'frown', sk, col: '#6a3a3a' }); dots(g, [[22, 21], [23, 21], [25, 21], [26, 21]], hair.base);
  dots(g, [[19, 12], [20, 12]], sk.lite);
}

// ---------------- Personajes (48×64) ----------------
export const CHARS = {
  dealer: { lit: true, eye: { y: 15, dx: 4, w: 3, h: 3, kind: 'pit' }, draw: drawDealer },
  girl: { lit: true, eye: { y: 17, dx: 4, w: 3, h: 3, kind: 'white', skipL: true }, draw: drawGirl },
  chair: { lit: true, eye: { y: 16, dx: 4, w: 3, h: 2, kind: 'white', white: '#d9d6c4' }, draw: drawChair },
  child: { lit: true, eye: { y: 25, dx: 4, w: 4, h: 3, kind: 'white' }, draw: drawChild },
  merchant: { lit: true, eye: { y: 19, dx: 4, w: 2, h: 2, kind: 'glow' }, draw: drawMerchant },
  woman: { lit: true, eye: { y: 17, dx: 4, w: 3, h: 2, kind: 'white' }, draw: drawWoman },
  drowned: { lit: true, eye: { y: 16, dx: 4, w: 3, h: 3, kind: 'white', white: '#cfe0dc' }, draw: drawDrowned },
  archivist: { lit: true, eye: { y: 16, dx: 4, w: 3, h: 2, kind: 'white' }, draw: drawArchivist },
  nun: { lit: true, eye: { y: 17, dx: 4, w: 3, h: 2, kind: 'white' }, draw: drawNun },
  cook: { lit: true, eye: { y: 17, dx: 4, w: 3, h: 2, kind: 'white' }, draw: drawCook },
  nurse: { lit: true, eye: { y: 17, dx: 4, w: 3, h: 2, kind: 'white' }, draw: drawNurse },
  puppet: { lit: true, eye: { y: 19, dx: 5, w: 4, h: 4, kind: 'white' }, draw: drawPuppet },
  pianist: { lit: true, eye: { y: 16, dx: 4, w: 3, h: 2, kind: 'white' }, draw: drawPianist },
  ...CHARS_B
};
