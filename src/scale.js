// scale.js — longitud de un descenso y equivalencia de dificultad. Sin dependencias.
// Un descenso tiene ROWS salas (filas del mapa). Las fórmulas de dificultad se escribieron para 8 filas (0..7): `eqRow` convierte la fila real
// a esa escala, de modo que el guardián final conserva su dificultad pero la curva sube más despacio y con más salas por el camino.
export const ROWS = 16;
export const eqRow = row => (row * 7) / (ROWS - 1);
