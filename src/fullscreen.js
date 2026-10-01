// fullscreen.js — pantalla completa (Fullscreen API con prefijo de Safari). Sin dependencias.
// En iPhone (Safari) la API no existe para páginas web: ahí no se muestran los botones (se puede «Añadir a pantalla de inicio»).
const doc = typeof document !== 'undefined' ? document : null;
export const fsSupported = () => !!doc && !!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled);
export const isFullscreen = () => !!doc && !!(doc.fullscreenElement || doc.webkitFullscreenElement);
export async function toggleFullscreen() {
  if (!fsSupported()) return false;
  try {
    if (isFullscreen()) { if (doc.exitFullscreen) await doc.exitFullscreen(); else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen(); }
    else { const el = doc.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen; if (req) await req.call(el, { navigationUI: 'hide' }); }
  } catch (e) { return false; }   // el navegador puede rechazarlo (p. ej. si no viene de un gesto de la persona)
  return true;
}
export function onFullscreenChange(cb) { if (!doc) return; doc.addEventListener('fullscreenchange', cb); doc.addEventListener('webkitfullscreenchange', cb); }
