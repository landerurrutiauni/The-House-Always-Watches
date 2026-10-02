// stage.js — el juego se dibuja en un ESCENARIO FIJO de 1280×720 que se escala entero (como una imagen) a la ventana.
// Así la disposición, los saltos de línea y el tamaño relativo del texto son SIEMPRE los mismos, sea cual sea el tamaño de la ventana.
// En móviles en vertical (no caben 16:9) se avisa y se puede jugar girando el escenario 90°.
export const STAGE = { w: 1280, h: 720, k: 1, rotated: false };
let accepted = false;
const $ = s => document.querySelector(s);

export function fitStage() {
  const el = $('#stage'); if (!el) return STAGE;
  const W = window.innerWidth || STAGE.w, H = window.innerHeight || STAGE.h;
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const needRot = coarse && H > W && W < 900;
  const ov = $('#rotate-ov'); if (ov) ov.hidden = !(needRot && !accepted);
  const rot = needRot && accepted;
  const k = rot ? Math.min(H / STAGE.w, W / STAGE.h) : Math.min(W / STAGE.w, H / STAGE.h);
  STAGE.k = k; STAGE.rotated = rot;
  el.style.transform = 'translate(-50%,-50%) ' + (rot ? 'rotate(90deg) ' : '') + 'scale(' + k + ')';
  const root = document.documentElement; root.style.setProperty('--k', String(k)); root.classList.toggle('rotated', rot);
  return STAGE;
}
export function acceptRotated() { accepted = true; fitStage(); }
export function initStage() {
  fitStage();
  window.addEventListener('resize', fitStage);
  window.addEventListener('orientationchange', () => setTimeout(fitStage, 120));
  document.addEventListener('fullscreenchange', () => setTimeout(fitStage, 60));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fitStage);
}
// Coordenadas de pantalla (clientX/Y, getBoundingClientRect) → coordenadas del escenario (px lógicos 1280×720)
export function toStage(X, Y) {
  const el = $('#stage'); if (!el) return [X, Y];
  const r = el.getBoundingClientRect(), k = STAGE.k || 1, cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  if (STAGE.rotated) return [STAGE.w / 2 + (Y - cy) / k, STAGE.h / 2 - (X - cx) / k];
  return [STAGE.w / 2 + (X - cx) / k, STAGE.h / 2 + (Y - cy) / k];
}
