# THE HOUSE ALWAYS WATCHES

Roguelike de cartas con casino maldito, terror y pixel art procedural. **Vertical slice jugable en el navegador**: HTML + CSS + JavaScript, sin dependencias en tiempo de ejecución, **sin anuncios ni servicios de terceros** y sin archivos de imagen ni de audio (todo el arte y el sonido se generan por código).

> Versión 0.1.0. Es un vertical slice, no un juego terminado: ver «Límites y lo que no se ha probado» al final.

**▶ Jugar online:** <https://landerurrutiauni.github.io/The-House-Always-Watches/>

## Jugar

**Online (GitHub Pages).** El repositorio se sirve tal cual desde la rama `main` (carpeta raíz): `index.html` carga los módulos ES directamente, sin paso de compilación. Para actualizarlo basta con hacer `git push`.

**Un solo archivo.** Abre `dist/the-house-always-watches.html` con doble clic. Lleva todo incrustado y funciona desde `file://` o subido a cualquier hosting estático. Si quieres las páginas legales, sube también la carpeta `dist/legal/` (son autónomas).

**Proyecto modular en local.**

```bash
npm run serve        # = python3 -m http.server 8080
# abre http://localhost:8080
```

Los módulos ES necesitan HTTP: abrir `index.html` con doble clic **no** funciona (usa el archivo único).

Para regenerar el archivo único tras tocar el código: `npm install` (una vez, instala esbuild) y `npm run build`.

## Pantalla completa

- Botón **PANTALLA COMPLETA** en el menú, icono de esquinas en la barra superior durante la partida y una fila en **Ajustes**. Se sale con el mismo botón o con `Esc`; los botones se actualizan solos. `F11` (nativo del navegador) también sirve.
- En monitores grandes el juego se escala: texto, cartas, personajes, menú y mapa crecen en tres tramos (desde 1280×860, 1700×980 y 2300×1250).
- Los navegadores exigen un gesto de la persona para entrar en pantalla completa, así que no puede activarse sola al cargar.
- En iPhone, Safari no ofrece la API de pantalla completa a las páginas web: ahí el botón no aparece. El juego se declara como app web, así que «Compartir → Añadir a pantalla de inicio» debería abrirlo sin barras del navegador (no probado en iOS).

## Controles

| Dónde | Ratón / táctil | Teclado |
|---|---|---|
| Decisiones binarias (eventos) | Botones, o deslizar ← rechazar / → aceptar | `A` / ← rechazar · `D` / → aceptar · `H` opción oculta |
| Mesa de cartas | Tocar cartas (hasta 5), JUGAR / DESCARTAR / BOLSILLO / apuesta | `1`–`9` elegir carta · `Enter` jugar · `Retroceso` descartar |
| Duelo de la escopeta | DISPARAR AL RIVAL / TENTAR A LA MESA / ESCUCHAR | `F` disparar · `T` tentar a la mesa · `L` escuchar |
| Mapa | Tocar un nodo para ver qué es; tocarlo otra vez (o ENTRAR) para entrar | — |
| Cualquier panel | ✕ | `Esc` |

## Qué contiene

- 4 palos (Sangre, Ojo, Diente, Llave), 10 manos de póker más 6 combinaciones propias, 15 cartas especiales (5 malditas), modificadores de carta y apuestas (Salud, Cordura, Dinero o Deuda).
- Recursos: Dinero, Cordura, Deuda, Salud, Vidas y un Destino invisible. La Cordura baja distorsiona la pantalla en 4 niveles.
- Mapa de nodos procedural con 3 alas (Salón, Pasillo, Sótano), nodo secreto, tienda, descansos, 30 eventos (3 secretos), 10 reglas de oponente, 12 objetos y 5 herramientas.
- **Duelo de la escopeta ficticia**: 6 cámaras, anuncio que puede mentir, tentar a la Mesa o escuchar. Es una mecánica abstracta de «marcas»; no hay violencia explícita.
- 8 personajes, 5 jefes, 6 finales (5 + el final verdadero), La Puerta, 12 recuerdos permanentes y 13 piezas de conocimiento.
- Morir no es Game Over: pantalla DEUDA ACTUAL / RECUERDOS CONSERVADOS y nuevo descenso con meta-progresión.
- Tutorial integrado en la historia (el Crupier enseña jugando) e intro «¿Estás despierto?».
- Música dinámica por capas y efectos de sonido sintetizados con Web Audio.
- Idiomas es / en / fr / de al 100 % (794 claves × 4) con cambio en caliente.

## Estructura

```
index.html              punto de entrada (versión modular, la que sirve GitHub Pages)
assets/ui/game.css      maquetación, efectos, accesibilidad, pantallas grandes
src/                    lógica (state, cards, combat, shotgun, map, content, effects, game, save, i18n)
                        y capa web (sprites, audio, music, sfx, fx, fullscreen, ui, cookies, privacy, debug, main, screens/)
locales-src/*.txt       textos fuente: clave|es|en|fr|de
locales/*.json          generado por tools/build-locales.mjs (no editar a mano)
legal/                  páginas legales (PLANTILLAS, no son asesoramiento legal)
dist/                   generado: archivo único + páginas legales autónomas
tools/                  construcción y pruebas
```

Los textos se editan en `locales-src/` y se regeneran con `npm run i18n` (también comprueba que no falte ninguna clave ni variable `{x}` en ningún idioma).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run serve` | Servidor local en el puerto 8080 |
| `npm run build` | Regenera `locales/` y `dist/` (archivo único + legales) |
| `npm run i18n` | Fusiona textos y comprueba paridad es/en/fr/de |
| `npm run check` | i18n + tests de lógica + partidas simuladas sin interfaz |
| `npm run test:ui` | Bot que juega con clics reales en Chromium (necesita `npm run serve`, `pip install playwright` y `playwright install chromium`) |
| `npm run test:features` | Sin terceros, consentimiento opcional, persistencia, audio, accesibilidad, idiomas, pantalla completa y depuración en Chromium (necesita el servidor) |
| `npm run test:single` | Prueba el archivo único abierto como `file://` |
| `npm run balance` | Simulación de equilibrio con un bot voraz |

## Configuración

Sin tocar los módulos, define `window.HOUSE_CONFIG` **antes** de cargar el juego. En `index.html` hay un ejemplo comentado; en el archivo único, añade la etiqueta `<script>` en el `<head>` de `dist/the-house-always-watches.html` (o edita `index.html` y ejecuta `npm run build`). Las claves están documentadas en `src/config.js`.

## Sin anuncios ni servicios de terceros

- El juego **no incluye publicidad**: no hay huecos de anuncios, ni script de Google, ni señales de Consent Mode. Las pruebas comprueban que el arranque solo hace peticiones al propio origen y que el código y los textos no contienen restos de AdSense.
- Como no queda ningún servicio opcional, **no se muestra banner de cookies**. Lo único que se guarda es la partida y los ajustes, en `localStorage` de tu navegador (`thaw.save.v1` y `thaw.settings.v1`); el juego no envía datos a ningún servidor.
- Si algún día añades un servicio opcional (por ejemplo, analítica):
  1. Declara su categoría en `OPTIONAL_CATEGORIES` (p. ej. `['analytics']`; hacen falta las claves i18n `cookies.<categoría>.name` y `.desc`).
  2. Cárgalo siempre con `loadThirdParty(categoría, src)` de `src/privacy.js`: solo se inyecta si la persona lo aceptó.
  3. Con categorías declaradas vuelve a aparecer el banner (ACEPTAR TODAS / RECHAZAR OPCIONALES / CONFIGURAR) y los botones «Cookies» del menú y de Ajustes.
  4. Actualiza las páginas legales.
- Si volvieras a poner publicidad de Google en el EEE, Reino Unido o Suiza, Google exige un CMP certificado e integrado con el IAB TCF (<https://support.google.com/adsense/answer/13554020>); este banner propio no lo es.

## Privacidad y páginas legales

`legal/privacy.html`, `legal/cookies.html` y `legal/terms.html` son **PLANTILLAS con huecos `[entre corchetes]`**. **No son asesoramiento legal.** Sustitúyelas por textos revisados por un profesional antes de publicar el juego con fines serios. Se muestran en es/en/fr/de y llevan un aviso rojo de plantilla.

## Modo depuración (oculto)

Se activa con `?debug` en la URL, con `#debug`, escribiendo `debug` en cualquier momento, o pulsando 7 veces seguidas la versión del menú. Abre un panel y expone `window.HOUSE_DEBUG` con: `addMoney`, `addCard`, `addItem`, `setSanity`, `setDebt`, `setDestiny`, `unlockCharacter`, `unlockEnding`, `triggerEvent`, `killPlayer`, `setLanguage`, `clearCookieConsent`, `toggleMusic`.

## Accesibilidad, calidad y rendimiento

Ajustes: volumen de música / efectos / ambiente, silenciar, reducir sonidos intensos, tamaño de texto (100–150 %), alto contraste, **reducir efectos** (sin parpadeos ni sacudidas; se activa solo con `prefers-reduced-motion`), vibración, pantalla completa y calidad gráfica Alta / Media / Baja (en pantallas táctiles empieza en Media). Diseño adaptable (PC, tablet y móvil, vertical y apaisado, con zonas seguras). Los controles son botones reales (se pueden usar con Tab y Enter), hay atajos de teclado en eventos, mesa y duelo y etiquetas ARIA en los controles principales. **No se ha hecho una auditoría de accesibilidad ni se ha probado con lector de pantalla.**

## Cómo se probó

Todo en Chromium (Playwright) y en Node:

- 47 tests de lógica y partidas simuladas sin interfaz con varias semillas (llegan a 5 de los 6 finales; el final verdadero solo está cubierto por el test de lógica y por una comprobación forzando el estado, nunca jugado de principio a fin).
- Un bot que juega con clics reales (modo normal y aleatorio con teclas y clics al azar), en 1280×720, 1920×1080, 390×844, 360×640, 844×390 y 820×1180, en los 4 idiomas, sobre la versión modular y sobre el archivo único abierto como `file://`.
- 56 comprobaciones de funciones transversales (sin terceros, consentimiento opcional, persistencia, audio con medida de señal real a la salida, accesibilidad, cambio de idioma en caliente, pantalla completa, depuración) y 14 sobre el archivo único.

## Límites y lo que no se ha probado

- **Ningún humano ha jugado ni escuchado el juego.** El equilibrio solo se ha ajustado contra un bot voraz (victoria del 100 % en la primera sala al 54 % contra el jefe de ala); la dificultad real, el ritmo y la música no se han validado con personas.
- **Solo Chromium.** No se ha probado en Firefox ni Safari ni en dispositivos móviles reales (solo emulación táctil); la pantalla completa tampoco.
- El audio se verificó midiendo señal en la salida de un navegador sin pantalla, no escuchándolo.
- No hay licencia definida (por defecto, todos los derechos reservados): añade la que quieras.
