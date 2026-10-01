// privacy.js — puerta de acceso a servicios de terceros. [capa B, escrita por A]
// El juego no usa ahora ninguno. Si añades uno, NUNCA lo cargues directamente: pasa por loadThirdParty(categoría, src),
// que solo inyecta el script si la persona consintió esa categoría (ver CONFIG.OPTIONAL_CATEGORIES). Todo intento queda registrado.
import { getConsent } from './cookies.js';
export const thirdPartyLog = { loaded: [], blocked: [] };
const _loaded = new Set();
export const isAllowed = cat => cat === 'necessary' || !!getConsent()[cat];
export function loadThirdParty(cat, src, attrs = {}) {
  if (!isAllowed(cat)) { thirdPartyLog.blocked.push({ cat, src }); return false; }
  if (_loaded.has(src) || typeof document === 'undefined') return true;
  _loaded.add(src);
  const s = document.createElement('script'); s.src = src; s.async = true;
  for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
  document.head.appendChild(s); thirdPartyLog.loaded.push({ cat, src });
  return true;
}
if (typeof window !== 'undefined') window.__thirdParty = thirdPartyLog;
