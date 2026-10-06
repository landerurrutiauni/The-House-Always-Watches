// chars-art-b.js — los jugadores anónimos (gambler_a … gambler_h) y el reparto del Teatro y la Sala de Vigilancia. Mismo kit que chars-art.js.
import { PAL, R, P, ell, ring, poly, BAYER, line, dots, over, speckle, dgrad } from './pixel.js';
import { mulberry32 } from './rng.js';
import { ramp, shade, shadeOut, shadeEll, shadeRect, skull, headMask, neck, brows, nose, mouth, wrinkle, bags, cheeks, hand, sleeve, strokes, bust } from './chars-kit.js';

const SK = b => ramp(b);

// Jugador de corbata torcida: cansado, sin afeitar, con el cuello abierto y la corbata girada hacia un lado.
function drawGamblerA(g) {
  const sk = SK('#d9c3a2'), suit = ramp('#4b4640'), shirt = ramp('#ddd6c0'), hair = ramp('#4a3424'), tie = ramp('#a52b2b');
  bust(g, { y0: 29, sw: 17, bw: 22, rp: suit, o: { ax: 1.0, ay: 0.3 } });
  strokes(g, [[9, 38, 7, 60], [39, 38, 41, 60], [14, 44, 12, 62], [34, 44, 36, 62]], suit.deep); strokes(g, [[11, 36, 9, 58]], suit.hi);
  poly(g, [[19, 29], [29, 29], [24, 48]], shirt.base); shade(g, [[19, 29], [29, 29], [24, 48]], shirt, { ax: 0.6, ay: 0.5 });
  shade(g, [[14, 30], [20, 29], [24, 42], [18, 46], [14, 38]], suit, { ax: 1.4, bias: -0.3 }); shade(g, [[34, 30], [28, 29], [24, 42], [30, 46], [34, 38]], suit, { ax: 1.4, bias: -0.1 });
  poly(g, [[19, 29], [23, 29], [21, 33]], shirt.hi); poly(g, [[29, 29], [25, 29], [28, 33]], shirt.mid);
  // corbata girada: el nudo desplazado y la lengua cayendo en diagonal
  shade(g, [[24, 30], [28, 30], [28, 33], [23, 33]], tie, { ax: 1.0 }); shade(g, [[24, 33], [29, 33], [33, 44], [30, 51], [27, 44]], tie, { ax: 1.1 }); line(g, 28, 36, 31, 46, tie.lo);
  sleeve(g, { sx: 11, sy: 36, ex: 9, ey: 53, w: 7, rp: suit, cuff: shirt, bend: -1 }); sleeve(g, { sx: 37, sy: 36, ex: 39, ey: 53, w: 7, rp: suit, cuff: shirt, bend: 1 });
  hand(g, 6, 53, sk, 'fist'); hand(g, 36, 53, sk, 'fist', true);
  for (let i = 0; i < 3; i++) { R(g, 41, 56 - i * 2, 5, 2, i % 2 ? '#a52b2b' : '#d8d3c4'); R(g, 41, 56 - i * 2, 5, 1, '#fff'); }
  neck(g, { y0: 24, y1: 30, w: 7, sk });
  skull(g, { cx: 24, top: 8, w: 15, h: 18, jaw: 0.72, sk, ears: true });
  shade(g, [[16, 16], [15, 11], [18, 7], [24, 6], [30, 7], [33, 11], [32, 16], [30, 11], [24, 9], [19, 11]], hair, { ax: 0.9 }); R(g, 15, 11, 2, 7, hair.base); R(g, 32, 11, 2, 7, hair.lo);
  strokes(g, [[20, 8, 17, 12], [24, 7, 22, 11], [28, 8, 31, 12]], hair.hi); dots(g, [[18, 9], [29, 8]], hair.hi);
  brows(g, { ey: 17, ew: 3, col: hair.lo, tilt: -1, thick: 1, gap: 2, len: 5 }); bags(g, { ey: 17, eh: 2, ew: 3, col: sk.lo }); R(g, 18, 21, 3, 1, sk.mid); R(g, 28, 21, 3, 1, sk.mid);
  nose(g, { y0: 18, len: 4, sk, style: 'small' }); mouth(g, { y: 24, w: 5, style: 'frown', sk, col: '#6a3a30' });
  over(g, () => { speckle(g, mulberry32(11), 17, 21, 15, 7, 22, '#6f5a4a'); }); dots(g, [[16, 12], [32, 13]], '#cfe6f0');
}

// Jugadora sin reflejo: elegante, de negro y con perlas; sostiene un espejo de mano en el que no sale nadie.
function drawGamblerB(g) {
  const sk = SK('#e7dfca'), dress = ramp('#18151c', '#9aa0c0'), hair = ramp('#09070a', '#8a7a9a');
  bust(g, { y0: 29, sw: 16, bw: 21, rp: dress, o: { ax: 1.0, ay: 0.3 } });
  strokes(g, [[10, 38, 8, 62], [38, 38, 40, 62], [18, 44, 16, 62], [30, 44, 32, 62]], dress.deep); strokes(g, [[12, 36, 10, 60]], dress.hi);
  poly(g, [[17, 29], [31, 29], [29, 36], [24, 40], [19, 36]], sk.base); shade(g, [[18, 29], [30, 29], [28, 36], [24, 39], [20, 36]], sk, { ax: 0.9, ay: 0.5 });
  for (let i = 0; i < 11; i++) { const t = i / 10, x = 18 + t * 12, y = 31 + Math.sin(t * Math.PI) * 6; ell(g, x, y, 1, 1, '#f4efe2'); P(g, Math.round(x), Math.round(y), '#bdb6a2'); P(g, Math.round(x) - 1, Math.round(y) - 1, '#fff'); }
  neck(g, { y0: 24, y1: 30, w: 6, sk });
  sleeve(g, { sx: 11, sy: 36, ex: 9, ey: 54, w: 6, rp: dress, bend: -1 }); sleeve(g, { sx: 37, sy: 36, ex: 40, ey: 50, w: 6, rp: dress, bend: 1 });
  hand(g, 6, 54, sk, 'fist'); hand(g, 37, 50, sk, 'fist', true);
  // espejo de mano: marco dorado, luna oscura y vacía con un destello
  R(g, 38, 48, 4, 6, '#a5832f'); R(g, 38, 48, 1, 6, '#e0c068'); shadeEll(g, 40, 41, 7.5, 8.5, ramp('#c9a24a'), { ax: 1.0, ay: 0.4 }); shadeEll(g, 40, 41, 5.5, 6.5, ramp('#0e1316'), { ax: 0.6, edge: 0 }); line(g, 37, 38, 39, 36, '#5a7078'); line(g, 38, 41, 40, 39, '#34464c'); dots(g, [[36, 36], [44, 46], [34, 41]], '#f0d79a');
  skull(g, { cx: 24, top: 8, w: 15, h: 18, jaw: 0.66, sk, ears: false });
  shade(g, [[15, 24], [14, 14], [17, 8], [24, 6], [31, 8], [34, 14], [33, 24], [31, 14], [24, 10], [17, 14]], hair, { ax: 0.9 }); R(g, 14, 12, 3, 13, hair.base); R(g, 31, 12, 3, 13, hair.lo); strokes(g, [[15, 14, 15, 23], [18, 9, 16, 14]], hair.hi);
  shade(g, [[17, 12], [31, 12], [29, 14], [24, 13], [19, 14]], hair, { ax: 0.9 }); line(g, 20, 12, 23, 13, hair.hi);
  brows(g, { ey: 17, ew: 3, col: hair.base, tilt: 1, thick: 1, gap: 2, len: 6 }); R(g, 18, 15, 5, 1, '#241c2a'); R(g, 26, 15, 5, 1, '#241c2a'); R(g, 18, 20, 5, 1, '#c9bfb0'); R(g, 26, 20, 5, 1, '#c9bfb0');
  nose(g, { y0: 18, len: 3, sk, style: 'small' }); R(g, 21, 23, 7, 1, '#b02a30'); R(g, 22, 24, 5, 1, '#c83a42'); R(g, 22, 22, 2, 1, '#c83a42'); R(g, 25, 22, 2, 1, '#c83a42'); P(g, 24, 24, '#ea6a6e'); R(g, 23, 25, 3, 1, sk.mid);
}

// Jugador sin cara: la piel lisa donde deberían estar la nariz y la boca; solo quedan los ojos.
function drawGamblerC(g) {
  const sk = SK('#d8c9a8'), suit = ramp('#6a4d37'), shirt = ramp('#d8d2bc'), tie = ramp('#2b3a3a');
  bust(g, { y0: 29, sw: 17, bw: 22, rp: suit, o: { ax: 1.0, ay: 0.3 } });
  over(g, () => { for (let y = 30; y < 64; y += 2) for (let x = 4 + (y & 2); x < 46; x += 4) P(g, x, y, suit.hi); });
  strokes(g, [[9, 38, 7, 60], [39, 38, 41, 60], [14, 44, 12, 62], [34, 44, 36, 62]], suit.deep);
  poly(g, [[19, 29], [29, 29], [24, 46]], shirt.base); shade(g, [[19, 29], [29, 29], [24, 46]], shirt, { ax: 0.6 });
  shade(g, [[14, 30], [20, 29], [24, 42], [18, 46], [14, 38]], suit, { ax: 1.4, bias: -0.3 }); shade(g, [[34, 30], [28, 29], [24, 42], [30, 46], [34, 38]], suit, { ax: 1.4, bias: -0.1 });
  shade(g, [[22, 30], [26, 30], [27, 34], [24, 48], [21, 34]], tie, { ax: 1.0 }); R(g, 24, 33, 1, 12, '#4a6060');
  R(g, 11, 38, 4, 5, '#8a6a4a'); R(g, 33, 44, 5, 5, '#5a4030'); line(g, 11, 38, 14, 42, '#2a1c10');                // remiendos
  sleeve(g, { sx: 11, sy: 36, ex: 9, ey: 53, w: 7, rp: suit, cuff: shirt, bend: -1 }); sleeve(g, { sx: 37, sy: 36, ex: 39, ey: 53, w: 7, rp: suit, cuff: shirt, bend: 1 });
  hand(g, 6, 53, sk, 'fist'); hand(g, 36, 53, sk, 'fist', true); for (let i = 0; i < 4; i++) { R(g, 21, 58 - i * 2, 6, 2, i % 2 ? '#2b6a8a' : '#d8d3c4'); R(g, 21, 58 - i * 2, 6, 1, '#fff'); }
  neck(g, { y0: 24, y1: 30, w: 7, sk });
  // cabeza calva y lisa: un leve abultamiento donde iría la nariz, sin boca
  skull(g, { cx: 24, top: 7, w: 17, h: 20, jaw: 0.74, sk, ears: true });
  dots(g, [[22, 9], [23, 9], [21, 10], [20, 11]], sk.lite); dots(g, [[24, 20], [24, 21], [24, 22]], sk.hi); P(g, 25, 22, sk.mid); P(g, 25, 21, sk.mid);
  dots(g, [[17, 14], [31, 14], [17, 18], [32, 18]], sk.lo); 
}

// Tahúr de dedos largos: chistera con cinta roja, bigotito y unos dedos larguísimos que abren un abanico de cartas.
function drawGamblerD(g) {
  const sk = SK('#e0d2b6'), coat = ramp('#16141a', '#8a90b0'), lining = ramp('#8a1c1c'), hat = ramp('#0e0d11', '#8a90b0'), shirt = ramp('#efe9d8');
  bust(g, { y0: 29, sw: 17, bw: 22, rp: coat, o: { ax: 1.0, ay: 0.3 } });
  strokes(g, [[9, 38, 6, 62], [39, 38, 42, 62], [14, 44, 12, 62], [34, 44, 36, 62]], coat.deep);
  poly(g, [[19, 29], [29, 29], [24, 46]], shirt.base); shade(g, [[19, 29], [29, 29], [24, 46]], shirt, { ax: 0.6 });
  shade(g, [[13, 30], [20, 29], [24, 42], [17, 48], [12, 38]], lining, { ax: 1.2, bias: -0.1 }); shade(g, [[35, 30], [28, 29], [24, 42], [31, 48], [36, 38]], lining, { ax: 1.2, bias: 0.1 });
  shade(g, [[14, 29], [19, 29], [23, 41], [19, 45], [14, 36]], coat, { ax: 1.4, bias: -0.25 }); shade(g, [[34, 29], [29, 29], [25, 41], [29, 45], [34, 36]], coat, { ax: 1.4, bias: -0.05 });
  shade(g, [[21, 29], [27, 29], [26, 33], [22, 33]], ramp('#c22a30'), { ax: 1.0 }); ell(g, 24, 35, 1.5, 1.5, '#e8cf7a');   // pañuelo de cuello con alfiler
  neck(g, { y0: 24, y1: 30, w: 6, sk });
  sleeve(g, { sx: 10, sy: 36, ex: 11, ey: 48, w: 7, rp: coat, cuff: shirt, bend: -2 }); sleeve(g, { sx: 38, sy: 36, ex: 37, ey: 54, w: 7, rp: coat, cuff: shirt, bend: 1 });
  // mano izquierda: dedos larguísimos sosteniendo un abanico de cartas
  for (const [x0, y0, x1, y1, c] of [[2, 52, 0, 31, '#e9e3d2'], [4, 50, 5, 29, '#efe9d8'], [8, 49, 11, 29, '#e9e3d2'], [10, 48, 16, 31, '#f3eee0']]) { poly(g, [[x0 - 3, y0], [x0 + 3, y0], [x1 + 3, y1], [x1 - 3, y1]], c); line(g, x1 - 3, y1, x1 + 3, y1, '#0a0807'); line(g, x1 - 3, y1, x0 - 3, y0, '#9f9886'); }
  dots(g, [[1, 33], [5, 31], [10, 31], [14, 34]], '#a52b2b'); dots(g, [[1, 34], [5, 32], [10, 32]], '#a52b2b');
  shade(g, [[6, 48], [16, 48], [16, 54], [6, 54]], sk, { ax: 1.1 }); R(g, 6, 48, 10, 1, sk.lite);
  for (const dx of [0, 3, 6, 9]) { line(g, 8 + dx * 0.5, 50, 6 + dx, 58, sk.base); line(g, 9 + dx * 0.5, 50, 7 + dx, 58, sk.mid); }
  hand(g, 34, 54, sk, 'open', true); for (const x of [34, 36, 38, 40]) line(g, x, 59, x + (x > 37 ? 1 : -1), 63, sk.mid);
  skull(g, { cx: 24, top: 8, w: 15, h: 18, jaw: 0.62, sk, ears: true });
  // chistera con cinta roja
  shade(g, [[17, 12], [31, 12], [30, 1], [18, 1]], hat, { ax: 1.0, ay: 0.3 }); shade(g, [[10, 13], [38, 13], [36, 10], [12, 10]], hat, { ax: 1.0 }); R(g, 17, 9, 14, 3, '#a52b2b'); R(g, 17, 9, 14, 1, '#d85a5a'); R(g, 28, 9, 3, 3, '#c9a24a'); line(g, 18, 2, 18, 8, hat.hi);
  brows(g, { ey: 17, ew: 3, col: '#14100c', tilt: 2, thick: 1, gap: 2, len: 6 }); bags(g, { ey: 17, eh: 2, ew: 3, col: sk.lo });
  nose(g, { y0: 18, len: 4, sk, style: 'hook' }); line(g, 24, 22, 19, 22, '#14100c'); line(g, 24, 22, 29, 22, '#14100c'); P(g, 18, 23, '#14100c'); P(g, 30, 23, '#14100c');
  mouth(g, { y: 24, w: 7, style: 'smile', sk, col: '#6a2a2a' }); P(g, 24, 25, '#e8e0cc');
}

// Viuda de velo negro: sombrero de ala ancha con un velo de malla que le cubre la cara; guantes de encaje y un pañuelo.
function drawGamblerE(g) {
  const sk = SK('#e4dac2'), dress = ramp('#0f0d12', '#8a90b0'), hat = ramp('#0b0a0e', '#8a90b0');
  bust(g, { y0: 29, sw: 17, bw: 22, rp: dress, o: { ax: 1.0, ay: 0.3 } });
  strokes(g, [[9, 38, 6, 62], [39, 38, 42, 62], [14, 44, 11, 62], [34, 44, 37, 62], [24, 46, 24, 62]], dress.deep); strokes(g, [[11, 36, 8, 60]], dress.hi);
  // cuello alto de encaje con camafeo, botonadura de azabache
  shadeRect(g, 19, 28, 10, 5, ramp('#2a2630'), { ax: 1.0 }); for (let x = 19; x < 29; x += 2) { P(g, x, 32, '#9a96a6'); P(g, x + 1, 33, '#6a6676'); }
  ell(g, 24, 36, 2.5, 3, '#c9a24a'); ell(g, 24, 36, 1.5, 2, '#a52b2b'); P(g, 23, 35, '#e88a8a'); for (const y of [41, 45, 49, 53]) { ell(g, 24, y, 1, 1, '#3a3640'); P(g, 23, y - 1, '#7a7686'); }
  sleeve(g, { sx: 11, sy: 36, ex: 9, ey: 53, w: 7, rp: dress, bend: -1 }); sleeve(g, { sx: 37, sy: 36, ex: 39, ey: 53, w: 7, rp: dress, bend: 1 });
  const glove = ramp('#25222b', '#a0a6c0'); hand(g, 6, 53, glove, 'fist'); hand(g, 36, 53, glove, 'fist', true); over(g, () => { for (let y = 53; y < 59; y += 2) for (let x = 6; x < 12; x += 2) P(g, x + (y & 2) / 2, y, '#6a6676'); });
  R(g, 12, 50, 7, 6, '#efe9d8'); R(g, 12, 50, 7, 1, '#fff'); line(g, 12, 53, 18, 55, '#b8b2a0'); P(g, 15, 52, '#8a8470');   // pañuelo bordado
  neck(g, { y0: 24, y1: 29, w: 6, sk });
  skull(g, { cx: 24, top: 9, w: 15, h: 18, jaw: 0.66, sk, ears: false });
  brows(g, { ey: 18, ew: 3, col: '#2a2420', tilt: -1, thick: 1, gap: 2, len: 5 }); bags(g, { ey: 18, eh: 2, ew: 3, col: sk.lo }); nose(g, { y0: 19, len: 3, sk, style: 'small' });
  mouth(g, { y: 25, w: 5, style: 'frown', sk, col: '#5a2f30' }); dots(g, [[19, 22], [19, 24], [29, 23]], '#9ec5d0');
  // velo de malla (trama de puntos) cayendo desde el ala del sombrero hasta los hombros
  g.save(); g.globalAlpha = 0.3; poly(g, [[12, 11], [36, 11], [38, 30], [10, 30]], '#0a0910'); g.restore();
  over(g, () => { for (let y = 11; y < 31; y += 2) for (let x = 10 + ((y >> 1) & 1) * 1; x < 39; x += 3) P(g, x, y, '#1a1822'); });
  for (let x = 11; x < 38; x += 2) P(g, x, 30, '#4a465a');
  // sombrero de ala ancha con flor negra
  shade(g, [[6, 12], [42, 12], [40, 9], [8, 9]], hat, { ax: 1.0, ay: 0.6 }); shade(g, [[14, 10], [34, 10], [32, 2], [16, 2]], hat, { ax: 1.0 }); line(g, 8, 11, 40, 11, hat.hi); R(g, 14, 8, 20, 2, '#2a2630');
  ell(g, 33, 6, 3, 3, '#1c1a22'); ell(g, 33, 6, 1.5, 1.5, '#4a465a'); line(g, 30, 8, 28, 11, '#14121a'); dots(g, [[32, 5], [34, 7]], '#6a6676');
}

// Jugador del puro apagado: orondo, con chaleco tenso, cadena de reloj, sombrero hongo y un puro mordido que nunca se enciende.
function drawGamblerF(g) {
  const sk = SK('#dcb89a'), suit = ramp('#4e3a2a'), vest = ramp('#7a2a22'), shirt = ramp('#e0d8c2'), hair = ramp('#2a1c14'), hat = ramp('#3a2a1e');
  shade(g, [[17, 28], [31, 28], [40, 32], [46, 42], [47, 64], [1, 64], [2, 42], [8, 32]], suit, { ax: 1.0, ay: 0.3 });
  strokes(g, [[7, 40, 4, 62], [41, 40, 44, 62]], suit.deep);
  // barriga enorme con el chaleco al límite, botones y cadena de reloj
  shadeEll(g, 24, 48, 15, 15, vest, { ax: 1.0, ay: 0.4 }); poly(g, [[19, 29], [29, 29], [24, 38]], shirt.base);
  for (const [x, y] of [[24, 36], [24, 42], [24, 48], [24, 54], [24, 60]]) { ell(g, x, y, 1.6, 1.6, '#c9a24a'); P(g, x - 1, y - 1, '#f0d79a'); }
  for (const y of [38, 44, 50, 56]) { line(g, 20, y, 22, y + 1, vest.deep); line(g, 28, y, 26, y + 1, vest.deep); }
  for (let i = 0; i < 9; i++) P(g, 13 + i, 44 + Math.round(Math.sin(i * 0.38) * 3), PAL.g1); ell(g, 22, 49, 2, 2, '#e0c068'); P(g, 21, 48, '#fff2b0');
  R(g, 16, 29, 3, 8, '#2a2a30'); R(g, 29, 29, 3, 8, '#2a2a30');   // tirantes
  shade(g, [[12, 30], [19, 29], [21, 42], [15, 50], [10, 38]], suit, { ax: 1.3, bias: -0.3 }); shade(g, [[36, 30], [29, 29], [27, 42], [33, 50], [38, 38]], suit, { ax: 1.3, bias: -0.1 });
  sleeve(g, { sx: 9, sy: 36, ex: 7, ey: 52, w: 8, rp: suit, cuff: shirt, bend: -1 }); sleeve(g, { sx: 39, sy: 36, ex: 41, ey: 52, w: 8, rp: suit, cuff: shirt, bend: 1 });
  hand(g, 4, 52, sk, 'fist'); hand(g, 38, 52, sk, 'fist', true); R(g, 43, 55, 3, 2, '#e8d8a0');
  // cuello grueso, papada y cabeza redonda con patillas
  shadeRect(g, 18, 25, 12, 5, sk, { ax: 1.0 }); R(g, 18, 29, 12, 1, sk.lo);
  skull(g, { cx: 24, top: 9, w: 19, h: 19, jaw: 0.86, sk, ears: true });
  R(g, 20, 27, 9, 1, sk.mid); R(g, 21, 28, 7, 1, sk.lo); cheeks(g, 21, '#c9786a', 6); R(g, 15, 14, 2, 10, hair.base); R(g, 31, 14, 2, 10, hair.lo);
  brows(g, { ey: 18, ew: 3, col: hair.base, tilt: 1, thick: 2, gap: 2, len: 6 }); bags(g, { ey: 18, eh: 2, ew: 3, col: sk.lo });
  nose(g, { y0: 19, len: 4, sk: { ...sk, mid: '#c28a74' }, style: 'small' });
  // puro apagado, mordido hacia la derecha
  R(g, 24, 24, 11, 3, '#6a4528'); R(g, 24, 24, 11, 1, '#9a6a3c'); R(g, 33, 23, 3, 5, '#8a8f8a'); R(g, 34, 24, 2, 3, '#4a4a48'); R(g, 28, 24, 1, 3, '#c9a24a'); line(g, 22, 25, 25, 25, '#5a2f2f');
  // sombrero hongo
  shadeEll(g, 24, 7, 10, 7, hat, { ax: 1.0 }); shade(g, [[8, 12], [40, 12], [38, 9], [10, 9]], hat, { ax: 1.0 }); R(g, 14, 8, 20, 2, '#2a2a30'); R(g, 14, 8, 20, 1, '#4a4a54'); line(g, 10, 12, 38, 12, hat.hi);
  dots(g, [[19, 4], [20, 3], [21, 3]], hat.lite);
}

// Contable sin nombre: flaco, con visera verde, gafas redondas, manguitos y un libro de cuentas lleno de números.
function drawGamblerG(g) {
  const sk = SK('#d9c8a6'), vest = ramp('#2a2a32', '#9aa0c0'), shirt = ramp('#e6e0cc'), hair = ramp('#3a3028'), visor = ramp('#2f7a58', '#d8ffe8'), led = ramp('#7a2a26');
  bust(g, { y0: 29, sw: 16, bw: 20, rp: shirt, o: { ax: 0.9, ay: 0.3 } });
  strokes(g, [[10, 38, 8, 60], [38, 38, 40, 60]], shirt.mid);
  shade(g, [[16, 30], [21, 29], [22, 52], [14, 52], [13, 38]], vest, { ax: 1.2, ay: 0.2 }); shade(g, [[32, 30], [27, 29], [26, 52], [34, 52], [35, 38]], vest, { ax: 1.2, ay: 0.2 });
  R(g, 23, 30, 2, 22, '#1a1a1e'); for (const y of [36, 42, 48]) P(g, 22, y, '#9a96a0'); shade(g, [[22, 29], [26, 29], [25, 40], [23, 40]], ramp('#15151a'), { ax: 1.0 });
  sleeve(g, { sx: 11, sy: 36, ex: 9, ey: 52, w: 6, rp: shirt, bend: -1 }); sleeve(g, { sx: 37, sy: 36, ex: 39, ey: 52, w: 6, rp: shirt, bend: 1 });
  R(g, 6, 41, 6, 3, '#2a2a32'); R(g, 36, 41, 6, 3, '#2a2a32'); R(g, 6, 41, 6, 1, '#5a5a66');   // manguitos de contable
  // libro de cuentas con columnas de números
  shadeOut(g, [[9, 44], [39, 44], [40, 58], [8, 58]], led, '#140808', { ax: 0.8, ay: 0.4 }); R(g, 11, 46, 26, 10, '#efe9d8'); line(g, 24, 46, 24, 55, '#8a8470'); for (let y = 47; y < 55; y += 2) { for (let x = 12; x < 23; x += 3) P(g, x, y, '#4a4a58'); for (let x = 26; x < 36; x += 3) P(g, x, y, '#a52b2b'); }
  hand(g, 4, 52, sk, 'claw'); hand(g, 39, 52, sk, 'claw', true);
  neck(g, { y0: 24, y1: 30, w: 5, sk });
  skull(g, { cx: 24, top: 9, w: 15, h: 18, jaw: 0.62, sk, ears: true });
  shade(g, [[17, 15], [17, 11], [20, 9], [28, 9], [31, 11], [31, 15], [29, 12], [24, 11], [19, 12]], hair, { ax: 0.9 }); strokes(g, [[20, 10, 18, 13], [27, 10, 30, 13]], hair.hi);
  // gafas redondas finas
  for (const x0 of [17, 25]) { R(g, x0 + 1, 14, 5, 1, '#5a5a62'); R(g, x0 + 1, 19, 5, 1, '#5a5a62'); R(g, x0, 15, 1, 4, '#5a5a62'); R(g, x0 + 6, 15, 1, 4, '#5a5a62'); }
  R(g, 24, 15, 1, 1, '#5a5a62'); bags(g, { ey: 17, eh: 2, ew: 3, col: sk.lo }); nose(g, { y0: 18, len: 4, sk, style: 'long' }); mouth(g, { y: 24, w: 5, style: 'line', sk, col: '#5a3a30' }); wrinkle(g, 19, 22, 1, sk.mid, 'v'); wrinkle(g, 29, 22, 1, sk.mid, 'v');
  // visera verde y lápiz tras la oreja
  line(g, 15, 10, 33, 10, '#1f5a40'); line(g, 15, 9, 33, 9, '#2f7a58'); g.save(); g.globalAlpha = 0.7; shade(g, [[11, 11], [37, 11], [35, 14], [13, 14]], visor, { ax: 0.9, ay: 0.7 }); g.restore(); line(g, 11, 11, 37, 11, visor.lite); line(g, 13, 14, 35, 14, '#1f4a38');
  R(g, 32, 12, 1, 7, '#e8c24a'); P(g, 32, 19, '#2a2a30'); P(g, 32, 11, '#c0282c');
}

// Payaso que no ríe: cara blanca con rombos pintados, nariz roja, melenas rojas, la boca pintada hacia abajo y una lágrima negra.
function drawGamblerH(g) {
  const sk = SK('#f0eadc'), suit = ramp('#f0eadc'), red = ramp('#c22a2a'), hair = ramp('#c22a2a');
  shade(g, [[17, 30], [31, 30], [40, 34], [46, 64], [2, 64], [8, 34]], suit, { ax: 1.0, ay: 0.3 });
  // traje con parches rojos y negros, botones grandes
  for (const [x, y, c] of [[9, 44, red.base], [38, 52, '#14110f'], [14, 56, '#14110f'], [34, 42, red.base], [8, 58, red.base]]) { shadeEll(g, x, y, 3, 3, ramp(c), { ax: 1.0 }); }
  for (let i = 0; i < 4; i++) { shadeEll(g, 24, 36 + i * 7, 3, 3, ramp(i % 2 ? '#c22a2a' : '#14110f'), { ax: 1.0 }); P(g, 23, 35 + i * 7, '#9a9a9a'); }
  strokes(g, [[10, 40, 6, 62], [38, 40, 42, 62], [16, 46, 14, 62], [32, 46, 34, 62]], suit.mid);
  // gorguera blanca con pompones
  for (let i = 0; i < 9; i++) { const x = 12 + i * 3; shadeEll(g, x, 31 + (Math.abs(i - 4) > 2 ? 0 : 1), 2.5, 3, ramp('#e8e2d2'), { ax: 1.1 }); } for (let i = 0; i < 9; i++) { P(g, 12 + i * 3, 34 - (Math.abs(i - 4) > 2 ? 1 : 0), '#9a9484'); }
  sleeve(g, { sx: 10, sy: 38, ex: 8, ey: 54, w: 8, rp: suit, bend: -1 }); sleeve(g, { sx: 38, sy: 38, ex: 40, ey: 54, w: 8, rp: suit, bend: 1 });
  for (const x of [4, 36]) { R(g, x, 52, 8, 3, '#14110f'); R(g, x, 52, 8, 1, '#4a4a54'); } hand(g, 4, 55, ramp('#f6f0e2'), 'fist'); hand(g, 37, 55, ramp('#f6f0e2'), 'fist', true);
  // cabeza: pintura blanca, rombos rojos y negros en los ojos, nariz redonda, boca pintada hacia abajo, lágrima
  skull(g, { cx: 24, top: 9, w: 19, h: 20, jaw: 0.78, sk, ears: true });
  poly(g, [[16, 17], [20, 12], [24, 17], [20, 23]], '#c22a2a'); poly(g, [[32, 17], [28, 12], [24, 17], [28, 23]], '#c22a2a'); poly(g, [[16, 17], [20, 14], [22, 17], [20, 21]], '#14110f'); poly(g, [[32, 17], [28, 14], [26, 17], [28, 21]], '#14110f');
  line(g, 18, 12, 14, 10, '#14110f'); line(g, 30, 12, 34, 10, '#14110f'); line(g, 17, 24, 16, 28, '#14110f'); P(g, 16, 29, '#14110f'); P(g, 16, 30, '#3a3a44');
  shadeEll(g, 24, 22, 3.4, 3.4, ramp('#c22a2a'), { ax: 1.0, ay: 0.6 }); P(g, 23, 21, '#f08a8a'); P(g, 22, 22, '#f08a8a');
  R(g, 19, 27, 11, 1, '#c22a2a'); line(g, 19, 27, 17, 30, '#c22a2a'); line(g, 29, 27, 31, 30, '#c22a2a'); R(g, 20, 28, 9, 1, '#7a1519');
  // melenas rojas a los lados y moño central
  for (const s2 of [-1, 1]) { const cx = 24 + s2 * 10; shadeEll(g, cx, 11, 5, 6, hair, { ax: 1.0 }); shadeEll(g, cx + s2 * 2, 17, 3, 5, hair, { ax: 1.0 }); strokes(g, [[cx - 3, 8, cx - 3, 18], [cx + 1, 8, cx + 2, 20]], hair.hi); }
  shadeEll(g, 24, 8, 3, 2, hair, { ax: 1.0 });
}

// ---------------- El Teatro y la Sala de Vigilancia ----------------
// El Apuntador: oculto en su concha de madera a pie de escenario, iluminado desde abajo por una vela, susurrando las frases del guion.
function drawPrompter(g) {
  const wood = ramp('#4a3526'), sk = SK('#dccfb2'), hair = ramp('#120e0c'), page = ramp('#efe9d8'), dim = ramp('#c9bb9c');
  // concha: arco con nervaduras y remate dorado
  shade(g, [[1, 64], [1, 20], [8, 8], [24, 2], [40, 8], [47, 20], [47, 64]], wood, { ax: 0.8, ay: 0.7 });
  for (let i = 0; i < 7; i++) { const a = Math.PI * (0.18 + i * 0.105); line(g, 24, 62, Math.round(24 - Math.cos(a) * 28), Math.round(62 - Math.sin(a) * 58), wood.deep); line(g, 25, 62, Math.round(25 - Math.cos(a) * 28), Math.round(62 - Math.sin(a) * 58), wood.hi); }
  shade(g, [[6, 64], [6, 24], [11, 13], [24, 7], [37, 13], [42, 24], [42, 64]], ramp('#0d0a09'), { ax: 0.3, ay: 0.5, edge: 0 }); strokes(g, [[6, 24, 11, 13], [37, 13, 42, 24]], '#6b4a33');
  R(g, 20, 3, 8, 3, PAL.g1); R(g, 21, 3, 6, 1, '#f0d79a'); P(g, 24, 1, '#ffd24a'); P(g, 24, 2, '#e0c068');
  // la persona, medio en sombra, con el rostro iluminado desde abajo
  shade(g, [[12, 64], [14, 42], [24, 38], [34, 42], [36, 64]], ramp('#241f2a'), { ax: 1.0, ay: 0.3 }); poly(g, [[20, 38], [28, 38], [24, 46]], page.base);
  neck(g, { y0: 32, y1: 39, w: 6, sk: ramp('#a89a80') });
  skull(g, { cx: 24, top: 17, w: 15, h: 17, jaw: 0.64, sk: dim, bias: -0.15, ears: false });
  { const hm = headMask(24, 17, 15, 17, 0.64); for (let y = 25; y < 34; y++) for (let x = 16; x < 33; x++) if (hm.has(x, y) && (y - 25) / 9 > BAYER[(y & 3) * 4 + (x & 3)] / 16 * 0.9) P(g, x, y, y > 30 ? '#f0d9a6' : '#e2c98f'); }
  shade(g, [[16, 24], [16, 18], [19, 15], [29, 15], [32, 18], [32, 24], [30, 19], [24, 17], [18, 19]], hair, { ax: 0.9 }); R(g, 15, 19, 2, 8, hair.base); R(g, 31, 19, 2, 8, hair.lo); dots(g, [[19, 16], [21, 16]], hair.hi);
  brows(g, { ey: 22, ew: 3, col: hair.base, tilt: -1, thick: 1, gap: 2, len: 5 }); bags(g, { ey: 22, eh: 2, ew: 3, col: '#8a7a60' }); nose(g, { y0: 23, len: 3, sk: dim, style: 'small' });
  mouth(g, { y: 29, w: 5, style: 'open', sk: dim, teeth: '#e6dfc9' }); dots(g, [[30, 28], [31, 29]], '#cfe6f0');
  // gafitas, guion abierto con anotaciones y vela
  for (const x0 of [17, 25]) { R(g, x0 + 1, 19, 5, 1, '#6a5a3a'); R(g, x0 + 1, 24, 5, 1, '#6a5a3a'); R(g, x0, 20, 1, 4, '#6a5a3a'); R(g, x0 + 6, 20, 1, 4, '#6a5a3a'); }
  shadeOut(g, [[10, 46], [38, 46], [40, 60], [8, 60]], page, '#1a1208', { ax: 0.8, ay: 0.3 }); line(g, 24, 46, 24, 60, '#8a8470'); for (let y = 49; y < 59; y += 3) { R(g, 12, y, 10, 1, '#4a4a58'); R(g, 26, y, 10, 1, y % 2 ? '#a52b2b' : '#2b4a8a'); } P(g, 36, 55, '#a52b2b');
  hand(g, 6, 54, sk, 'fist'); hand(g, 37, 54, sk, 'fist', true);
  R(g, 5, 38, 3, 8, '#e8dcc0'); R(g, 5, 38, 1, 8, '#fff'); R(g, 6, 34, 1, 4, '#ffd24a'); P(g, 6, 33, '#fff2b0'); P(g, 6, 35, '#e8802a');
}

// La Acomodadora: uniforme granate con galones dorados, sombrerito de botones y una linterna que ilumina un camino que no existe.
function drawUsher(g) {
  const sk = SK('#e3d4ba'), unif = ramp('#7a1d24'), gold = ramp('#c9a24a'), hair = ramp('#3a2418');
  bust(g, { y0: 29, sw: 16, bw: 21, rp: unif, o: { ax: 1.0, ay: 0.3 } });
  strokes(g, [[10, 38, 8, 62], [38, 38, 40, 62], [16, 44, 14, 62], [32, 44, 34, 62]], unif.deep); strokes(g, [[12, 36, 10, 60]], unif.hi);
  // hombreras doradas con flecos, doble botonadura, cuello alto y pajarita negra
  for (const x of [8, 32]) { shade(g, [[x, 30], [x + 8, 30], [x + 9, 34], [x - 1, 34]], gold, { ax: 1.0 }); for (let i = 0; i < 4; i++) { P(g, x + i * 2, 35, gold.base); P(g, x + i * 2, 36, gold.lo); } }
  shadeRect(g, 19, 28, 10, 4, unif, { ax: 1.0 }); R(g, 19, 31, 10, 1, gold.base); shade(g, [[21, 31], [27, 31], [28, 34], [20, 34]], ramp('#14110f'), { ax: 1.0 });
  for (const x of [20, 28]) for (let y = 38; y < 60; y += 5) { ell(g, x, y, 1.5, 1.5, gold.base); P(g, x - 1, y - 1, gold.lite); }
  R(g, 12, 44, 6, 3, '#14110f'); R(g, 13, 45, 4, 1, '#d8c9a8');     // placa con nombre
  // linterna con haz de luz
  g.save(); g.globalAlpha = 0.4; poly(g, [[7, 52], [2, 40], [-6, 36], [-6, 64], [2, 62]], '#ffe9a0'); g.restore(); g.save(); g.globalAlpha = 0.25; poly(g, [[7, 52], [0, 44], [-4, 44], [-4, 58]], '#ffffff'); g.restore();
  sleeve(g, { sx: 11, sy: 36, ex: 10, ey: 50, w: 7, rp: unif, cuff: gold, bend: -1 }); sleeve(g, { sx: 37, sy: 36, ex: 38, ey: 52, w: 7, rp: unif, cuff: gold, bend: 1 });
  hand(g, 7, 50, sk, 'fist'); hand(g, 35, 52, sk, 'fist', true);
  shadeOut(g, [[2, 50], [8, 50], [8, 57], [2, 57]], ramp('#3a3a42'), '#0a0807', { ax: 1.0 }); R(g, 0, 48, 3, 11, '#ffe9a0'); R(g, 1, 49, 1, 9, '#fff'); R(g, 3, 56, 4, 2, '#b8b8b0');
  neck(g, { y0: 23, y1: 29, w: 6, sk });
  skull(g, { cx: 24, top: 9, w: 15, h: 17, jaw: 0.66, sk, ears: true });
  R(g, 14, 12, 4, 11, hair.base); R(g, 30, 12, 4, 11, hair.lo); strokes(g, [[15, 13, 15, 21], [32, 13, 32, 21]], hair.hi); shade(g, [[16, 14], [32, 14], [30, 12], [18, 12]], hair, { ax: 0.9 });
  brows(g, { ey: 17, ew: 3, col: hair.lo, tilt: 0, thick: 1, gap: 2, len: 5 }); bags(g, { ey: 17, eh: 2, ew: 3, col: sk.lo }); nose(g, { y0: 18, len: 3, sk, style: 'small' });
  R(g, 21, 22, 7, 1, '#b02a30'); R(g, 22, 23, 5, 1, '#8a1c22'); P(g, 20, 22, '#7a1a20'); P(g, 28, 22, '#7a1a20'); cheeks(g, 20, '#d9a090', 6);
  // sombrerito granate con galón dorado y botón
  shade(g, [[16, 10], [32, 10], [30, 3], [18, 3]], unif, { ax: 0.9, ay: 0.4 }); R(g, 16, 9, 16, 2, gold.base); R(g, 16, 9, 16, 1, gold.lite); ell(g, 24, 3, 2, 1.5, gold.base); P(g, 23, 2, gold.lite); line(g, 32, 9, 34, 15, '#d8c89a');
}

// El Vigilante: gorra con insignia, auricular, uniforme gris y una fila de pantallas que no dejan de mirar.
function drawWatcher(g) {
  const sk = SK('#cdbf9f'), unif = ramp('#454b52', '#cfe0f0'), cap = ramp('#2a2f36', '#cfe0f0'), gold = ramp('#c9a24a');
  bust(g, { y0: 29, sw: 17, bw: 22, rp: unif, o: { ax: 1.0, ay: 0.3 } });
  strokes(g, [[9, 38, 7, 58], [39, 38, 41, 58], [14, 44, 12, 58], [34, 44, 36, 58]], unif.deep); strokes(g, [[11, 36, 9, 56]], unif.hi);
  shade(g, [[14, 30], [20, 29], [24, 34], [20, 36], [14, 34]], ramp('#2a2f36'), { ax: 1.0 }); shade(g, [[34, 30], [28, 29], [24, 34], [28, 36], [34, 34]], ramp('#2a2f36'), { ax: 1.0 });
  R(g, 22, 28, 4, 8, '#14110f'); R(g, 23, 30, 2, 5, '#6a6a74');           // corbata y cuello
  // pantalla portátil en el pecho, radio en el hombro y placa
  shadeOut(g, [[17, 38], [31, 38], [31, 47], [17, 47]], ramp('#14181c'), '#05070a', { ax: 0.6, edge: 0.4 }); R(g, 18, 39, 12, 7, '#1f4f46'); R(g, 19, 40, 8, 1, '#4fd6b4'); R(g, 19, 42, 5, 1, '#4fd6b4'); R(g, 19, 44, 9, 1, '#2f7a6a'); R(g, 29, 40, 1, 5, '#7bf0d0');
  R(g, 10, 36, 4, 6, '#14181c'); R(g, 11, 37, 2, 1, '#e86a3a'); R(g, 36, 38, 5, 3, gold.base); R(g, 36, 38, 5, 1, gold.lite);
  sleeve(g, { sx: 11, sy: 36, ex: 9, ey: 51, w: 7, rp: unif, bend: -1 }); sleeve(g, { sx: 37, sy: 36, ex: 39, ey: 51, w: 7, rp: unif, bend: 1 });
  hand(g, 6, 51, sk, 'fist'); hand(g, 37, 51, sk, 'fist', true);
  // pantallas de vigilancia delante
  shadeOut(g, [[2, 52], [46, 52], [46, 64], [2, 64]], ramp('#20262c'), '#05070a', { ax: 0.6, ay: 0.6, edge: 0.5 });
  for (let i = 0; i < 4; i++) { const x = 4 + i * 10, c = i % 2 ? ['#12332e', '#4fd6b4', '#2f8a78'] : ['#141c34', '#7a9ad8', '#3f5aa0']; R(g, x, 54, 8, 8, '#05070a'); R(g, x + 1, 55, 6, 6, c[0]); for (let y = 56; y < 61; y += 2) R(g, x + 1, y, 6, 1, c[2]); R(g, x + 1 + (i * 2) % 4, 56 + (i % 3), 2, 2, c[1]); }
  neck(g, { y0: 24, y1: 30, w: 7, sk });
  skull(g, { cx: 24, top: 10, w: 15, h: 17, jaw: 0.78, sk, ears: true, bias: 0.05 });
  R(g, 16, 19, 3, 2, sk.mid); R(g, 30, 19, 3, 2, sk.lo); R(g, 20, 25, 9, 1, sk.mid); over(g, () => { speckle(g, mulberry32(5), 17, 22, 15, 5, 14, '#5a4a3a'); });
  brows(g, { ey: 19, ew: 2, col: '#2a2018', tilt: 2, thick: 2, gap: 3, len: 5 }); nose(g, { y0: 20, len: 3, sk, style: 'small' }); mouth(g, { y: 25, w: 5, style: 'line', sk, col: '#5a3a30' });
  // auricular con micro y gorra con visera e insignia
  line(g, 33, 16, 35, 20, '#14110f'); line(g, 35, 20, 33, 25, '#14110f'); R(g, 33, 16, 2, 4, '#2a2f36'); line(g, 33, 25, 30, 26, '#14110f'); P(g, 29, 26, '#6a6a74');
  shade(g, [[16, 11], [32, 11], [37, 3], [11, 3]], cap, { ax: 0.9, ay: 0.5 }); line(g, 11, 3, 37, 3, '#4a525c'); shade(g, [[15, 10], [33, 10], [33, 13], [15, 13]], ramp('#1c2026'), { ax: 0.9, ay: 0.5 }); line(g, 15, 10, 33, 10, gold.base); line(g, 15, 13, 33, 13, '#05070a');
  shadeEll(g, 24, 14, 9, 2, ramp('#0e1114'), { ax: 0.8, edge: 0.6 });
  R(g, 21, 5, 6, 5, gold.base); R(g, 22, 6, 4, 3, '#14110f'); P(g, 21, 5, gold.lite); P(g, 24, 7, gold.base); P(g, 23, 6, gold.lite);
}

// El Conserje: viejo, de pelo blanco y gafas doradas, con un manojo de llaves en cada mano; abre puertas que no están.
function drawConcierge(g) {
  const sk = SK('#d9c8a8'), unif = ramp('#5a4030'), gold = ramp('#c9a24a'), vest = ramp('#8a6a3a'), hair = ramp('#e2dccb', '#ffffff');
  bust(g, { y0: 29, sw: 17, bw: 22, rp: unif, o: { ax: 1.0, ay: 0.3 } });
  strokes(g, [[9, 38, 7, 62], [39, 38, 41, 62], [14, 44, 12, 62], [34, 44, 36, 62]], unif.deep); strokes(g, [[11, 36, 9, 60]], unif.hi);
  poly(g, [[19, 29], [29, 29], [24, 48]], '#e9e2cf'); shade(g, [[19, 29], [29, 29], [24, 48]], vest, { ax: 0.6 }); R(g, 23, 30, 2, 18, gold.base);
  for (const y of [34, 39, 44]) { ell(g, 24, y, 1.8, 1.8, gold.base); P(g, 23, y - 1, gold.lite); }
  shade(g, [[14, 30], [20, 29], [22, 44], [16, 50], [13, 38]], unif, { ax: 1.4, bias: -0.25 }); shade(g, [[34, 30], [28, 29], [26, 44], [32, 50], [35, 38]], unif, { ax: 1.4, bias: -0.05 });
  line(g, 14, 31, 16, 49, gold.lo); line(g, 34, 31, 32, 49, gold.lo); line(g, 19, 30, 22, 44, gold.base); line(g, 29, 30, 26, 44, gold.base);   // galón de las solapas
  R(g, 21, 30, 6, 2, '#a52b2b'); P(g, 24, 32, gold.base);
  // llaves: dos aros con llaves doradas colgando
  const key = (x, y, flip) => { ell(g, x, y, 4, 4, gold.base); ell(g, x, y, 2.5, 2.5, unif.base); P(g, x - 3, y - 3, gold.lite); for (const [dx, h] of [[-2, 10], [1, 8], [3, 11]]) { const kx = x + (flip ? -dx : dx); R(g, kx, y + 4, 2, h, gold.base); R(g, kx, y + 4, 1, h, gold.lite); R(g, kx - 1, y + 4 + h - 3, 4, 1, gold.base); R(g, kx + 1, y + 4 + h - 1, 2, 1, gold.lo); } };
  sleeve(g, { sx: 11, sy: 36, ex: 9, ey: 50, w: 7, rp: unif, cuff: gold, bend: -1 }); sleeve(g, { sx: 37, sy: 36, ex: 39, ey: 50, w: 7, rp: unif, cuff: gold, bend: 1 });
  key(7, 52, false); key(41, 52, true); hand(g, 5, 48, sk, 'claw'); hand(g, 37, 48, sk, 'claw', true);
  neck(g, { y0: 23, y1: 29, w: 6, sk });
  skull(g, { cx: 24, top: 8, w: 15, h: 18, jaw: 0.6, sk, ears: true });
  shade(g, [[16, 16], [16, 10], [19, 7], [24, 6], [29, 7], [32, 10], [32, 16], [30, 11], [24, 9], [18, 11]], hair, { ax: 0.9 }); R(g, 15, 10, 3, 8, hair.base); R(g, 31, 10, 3, 8, hair.lo); strokes(g, [[20, 8, 17, 12], [28, 8, 31, 12]], hair.lite);
  shade(g, [[20, 22], [28, 22], [27, 23], [24, 22], [21, 23]], hair, { ax: 0.9 }); R(g, 21, 24, 7, 1, sk.deep);
  brows(g, { ey: 17, ew: 3, col: hair.lo, tilt: -1, thick: 1, gap: 2, len: 6 }); bags(g, { ey: 17, eh: 2, ew: 3, col: sk.lo }); nose(g, { y0: 18, len: 4, sk, style: 'hook' }); wrinkle(g, 18, 21, 2, sk.mid); wrinkle(g, 29, 21, 2, sk.mid);
  mouth(g, { y: 24, w: 5, style: 'smile', sk, col: '#6a3a30' });
  // gafas redondas doradas con cadenilla
  for (const x0 of [17, 25]) { R(g, x0 + 1, 14, 5, 1, gold.base); R(g, x0 + 1, 19, 5, 1, gold.base); R(g, x0, 15, 1, 4, gold.base); R(g, x0 + 6, 15, 1, 4, gold.base); P(g, x0 + 1, 14, gold.lite); }
  R(g, 24, 15, 1, 1, gold.base); line(g, 16, 15, 14, 16, gold.base); line(g, 32, 15, 34, 16, gold.base); for (let i = 0; i < 6; i++) P(g, 14, 17 + i * 2, gold.lo);
}

export const CHARS_B = {
  gambler_a: { lit: true, eye: { y: 17, dx: 4, w: 3, h: 2, kind: 'white' }, draw: drawGamblerA },
  gambler_b: { lit: true, eye: { y: 17, dx: 4, w: 3, h: 2, kind: 'white' }, draw: drawGamblerB },
  gambler_c: { lit: true, eye: { y: 17, dx: 3, w: 2, h: 2, kind: 'pit' }, draw: drawGamblerC },
  gambler_d: { lit: true, eye: { y: 17, dx: 4, w: 3, h: 2, kind: 'white' }, draw: drawGamblerD },
  gambler_e: { lit: true, eye: { y: 18, dx: 4, w: 3, h: 2, kind: 'white' }, draw: drawGamblerE },
  gambler_f: { lit: true, eye: { y: 18, dx: 5, w: 3, h: 2, kind: 'white' }, draw: drawGamblerF },
  gambler_g: { lit: true, eye: { y: 17, dx: 4, w: 3, h: 2, kind: 'white' }, draw: drawGamblerG },
  gambler_h: { lit: true, eye: { y: 17, dx: 5, w: 3, h: 3, kind: 'white' }, draw: drawGamblerH },
  prompter: { lit: true, eye: { y: 22, dx: 4, w: 3, h: 2, kind: 'white' }, draw: drawPrompter },
  usher: { lit: true, eye: { y: 17, dx: 4, w: 3, h: 2, kind: 'white' }, draw: drawUsher },
  watcher: { lit: true, eye: { y: 19, dx: 4, w: 3, h: 2, kind: 'glow' }, draw: drawWatcher },
  concierge: { lit: true, eye: { y: 17, dx: 4, w: 3, h: 2, kind: 'white' }, draw: drawConcierge }
};
