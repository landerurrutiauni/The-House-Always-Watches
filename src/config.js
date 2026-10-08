// Configuración central del juego.
// Puedes sobreescribir cualquier valor definiendo window.HOUSE_CONFIG ANTES de cargar main.js
// (por ejemplo en un <script> de index.html), sin tocar los módulos.
const base = {
  VERSION: '0.2.2',
  GAME_TITLE: 'THE HOUSE ALWAYS WATCHES',
  SAVE_KEY: 'thaw.save.v1',
  SETTINGS_KEY: 'thaw.settings.v1',
  CONSENT_KEY: 'thaw.consent.v1',
  LANGS: ['es', 'en', 'fr', 'de', 'eu'],
  LANG_NAMES: { es: 'Español', en: 'English', fr: 'Français', de: 'Deutsch', eu: 'Euskara' },
  DEFAULT_LANG: 'en',

  // ---- Servicios opcionales de terceros ----
  // El juego NO usa ninguno (ni anuncios ni analítica), por eso no muestra banner de cookies.
  // Si añades uno: declara aquí su categoría (p. ej. ['analytics']; hacen falta las claves i18n cookies.<categoría>.name/.desc)
  // y cárgalo SIEMPRE con loadThirdParty(categoría, src) de src/privacy.js. Con categorías declaradas vuelve a aparecer el banner.
  OPTIONAL_CATEGORIES: [],
  CONSENT_VERSION: 1,

  DEBUG: false
};

export const CONFIG = Object.assign(base, (typeof window !== 'undefined' && window.HOUSE_CONFIG) || {});
