# THE HOUSE ALWAYS WATCHES

Roguelike de cartas con casino maldito, terror y pixel art procedural. **Vertical slice jugable en el navegador**: HTML + CSS + JavaScript, sin dependencias en tiempo de ejecución, **sin anuncios ni servicios de terceros** y sin archivos de imagen ni de audio (todo el arte y el sonido se generan por código).

> Versión 0.1.0. Es un vertical slice, no un juego terminado: ver «Límites y lo que no se ha probado» al final.

**▶ Jugar online:** <https://landerurrutiauni.github.io/The-House-Always-Watches/>

## Jugar

**Online (GitHub Pages).** El repositorio se sirve tal cual desde la rama `main` (carpeta raíz): `index.html` carga los módulos ES directamente, sin paso de compilación. Para actualizarlo basta con hacer `git push`.

**Un solo archivo.** Abre `dist/the-house-always-watches.html` con doble clic. Lleva todo incrustado y funciona desde `file://` o subido a cualquier hosting estático. Si quieres la página de privacidad, sube también la carpeta `dist/legal/` (es autónoma).

**Proyecto modular en local.**

```bash
npm run serve        # = python3 -m http.server 8080
# abre http://localhost:8080
```

Los módulos ES necesitan HTTP: abrir `index.html` con doble clic **no** funciona (usa el archivo único).

Para regenerar el archivo único tras tocar el código: `npm install` (una vez, instala esbuild) y `npm run build`.

## Ayuda y tutorial

- **Tutorial integrado en la historia.** La primera mesa de cartas que pisas es un tutorial guiado por el Crupier: mano preparada, objetivo bajo y perder no cuesta nada (puedes repetir). Da 5 pistas según juegas (elegir cartas, palos y combinaciones, costes, descartes/Bolsillo/apuestas, objetivo). Los primeros duelos de la escopeta traen 3 pistas más.
- **Pantalla «Cómo se juega».** Botón **CÓMO SE JUEGA** en el menú, icono **?** en la barra superior durante la partida y la tecla `?`. Explica el objetivo, el mapa, los recursos (Salud, Cordura, Dinero, Deuda, Escudo), las mesas de cartas, los sucesos, el duelo, la tienda y los descansos, y qué pasa al morir. Son secciones plegables; desde ahí se abre también la guía de manos y palos.
- **Guía de cartas.** Botón **? GUÍA** en cada mesa: objetivo, puntuación, tabla de manos con tus niveles, palos, combinaciones y apuestas.
- **Pistas de una sola vez.** La primera vez que aparece un mapa, un suceso, una tienda, un descanso o un Guardián, el Crupier añade una pista corta. Se marcan como vistas cuando se muestran de verdad y se guardan en el perfil: no vuelven al morir ni con NUEVA PARTIDA; REINICIAR PROGRESO las restablece.

## Pantalla completa

- Botón **PANTALLA COMPLETA** en el menú, icono de esquinas en la barra superior durante la partida y una fila en **Ajustes**. Se sale con el mismo botón o con `Esc`; los botones se actualizan solos. `F11` (nativo del navegador) también sirve.
- En monitores grandes el juego se escala: texto, cartas, personajes, menú y mapa crecen en tres tramos (desde 1280×860, 1700×980 y 2300×1250).
- Los navegadores exigen un gesto de la persona para entrar en pantalla completa, así que no puede activarse sola al cargar.
- En iPhone, Safari no ofrece la API de pantalla completa a las páginas web: ahí el botón no aparece. El juego se declara como app web, así que «Compartir → Añadir a pantalla de inicio» debería abrirlo sin barras del navegador (no probado en iOS).

## Controles

| Dónde | Ratón / táctil | Teclado |
|---|---|---|
| Decisiones binarias (eventos) | Botones, o deslizar ← rechazar / → aceptar | `A` / ← rechazar · `D` / → aceptar · `H` opción oculta |
| Mesa de cartas | Tocar cartas (hasta 5), JUGAR / DESCARTAR / BOLSILLO / apuesta; botón **MANOS** (en pantallas estrechas) con el nivel de cada mano | `1`–`9` elegir carta · `Enter` jugar · `Retroceso` descartar |
| Duelo de la escopeta | DISPARAR AL RIVAL / TENTAR A LA MESA / ESCUCHAR; **tocar la pantalla acelera la narración** | `F` disparar · `T` tentar a la mesa · `L` escuchar |
| Mapa | Tocar un nodo para ver qué es; tocarlo otra vez (o ENTRAR) para entrar; botón **MISIONES** | — |
| Inventario | Comodines con botón VENDER (la mitad de su precio) | — |
| Ayuda «Cómo se juega» | Botón del menú o **?** de la barra superior | `?` |
| Cualquier panel | ✕ | `Esc` |

## Qué contiene

- **Baraja completa de 52 cartas** (A, 2–10, J, Q, K en 4 palos: Sangre, Ojo, Diente, Llave). Valor en fichas: As 11, figuras 10, el resto su número. Escaleras A-2-3-4-5 y 10-J-Q-K-A. 10 manos de póker más 6 combinaciones propias, 15 cartas especiales (5 malditas), modificadores de carta y apuestas (Salud, Cordura, Dinero o Deuda).
- **Comodines** (19, estilo Balatro): hasta 5 a la vez, de rareza común / poco común / rara; se compran en la tienda, salen de recompensas y eventos, y se venden por la mitad. Cada comodín se enciende en la mesa cuando puntúa.
- **Panel de manos** a la izquierda de la mesa (en pantallas anchas) con el nivel y las fichas × multiplicador de cada mano; la que vas a formar se resalta. En pantallas estrechas, botón **MANOS**.
- **Puntuación con animación**: banners de combo, multiplicadores que se «encienden» según crecen y jugadas devastadoras con destello y sacudida (todo se apaga con *Reducir efectos*).
- Recursos: Dinero, Cordura, Deuda, Salud, Vidas y un Destino invisible. La Cordura baja distorsiona la pantalla en 4 niveles.
- **6 alas** (Salón, Pasillo, Sótano, Capilla, Cocinas, Enfermería), cada una con su guardián, fondo, rivales y eventos propios. Las tres últimas se abren al progresar (descensos terminados / guardianes derrotados; la pantalla de alas indica cuánto falta). Nodo secreto, tienda, descansos, **47 eventos** (3 secretos) con cadenas de historia por personaje, 10 reglas de oponente, 12 objetos y 5 herramientas.
- **13 personajes** con biografía en el Archivo (se revela al coincidir con ellos). Sus historias se cruzan: lo que descubres de unos cambia lo que dicen otros, y 18 piezas de conocimiento debilitan a algunos guardianes.
- **Misiones por ala** (3 en cada una, 18 en total): premios pequeños —recursos, una carta, una mejora, un nivel de mano o, raramente, un comodín—. Se ven y se siguen desde el botón **MISIONES** del mapa y se reinician en cada descenso.
- **Secretos**: el juego esconde logros que no se explican aquí. El Archivo anota los que has encontrado y da una pista de los que faltan.
- **Duelo de la escopeta ficticia**: 6 cámaras, anuncio que puede mentir, tentar a la Mesa o escuchar. Cada turno se **narra paso a paso** (quién apunta, qué cámara, BANG o CLIC, marcas que cambian, recarga y a quién le toca) con el cargador y las marcas actualizándose a la vez que cada frase. Es una mecánica abstracta de «marcas»; no hay violencia explícita.
- 13 personajes, 6 guardianes de ala más el Crupier, 6 finales (5 + el final verdadero), La Puerta, 12 recuerdos permanentes y 18 piezas de conocimiento.
- **Voces**: cada personaje «balbucea» al hablar (sintetizado con Web Audio, sin archivos de audio). Ajustes: volumen de voces, silenciarlas y velocidad del texto (normal / rápida / instantánea).
- Morir no es Game Over: pantalla DEUDA ACTUAL / RECUERDOS CONSERVADOS y nuevo descenso con meta-progresión.
- Intro «¿Estás despierto?», tutorial, pantalla «Cómo se juega» y pistas de una sola vez.
- Música dinámica por capas y efectos de sonido sintetizados con Web Audio.
- Idiomas es / en / fr / de al 100 % (1094 claves × 4) con cambio en caliente.

## Estructura

```
index.html              punto de entrada (versión modular, la que sirve GitHub Pages)
assets/ui/game.css      maquetación, efectos, accesibilidad, pantallas grandes
src/                    lógica (state, cards, combat, jokers, shotgun, map, content, effects, missions, achievements, game, save, i18n)
                        y capa web (sprites, audio, music, sfx, fx, fullscreen, ui, cookies, privacy, debug, main,
                        screens/: menu, run, table, duel, howto)
locales-src/*.txt       textos fuente: clave|es|en|fr|de
locales/*.json          generado por tools/build-locales.mjs (no editar a mano)
legal/                  página «Privacidad y aviso» (única página legal)
dist/                   generado: archivo único + página de privacidad autónoma
tools/                  construcción y pruebas
```

Los textos se editan en `locales-src/` y se regeneran con `npm run i18n` (también comprueba que no falte ninguna clave ni variable `{x}` en ningún idioma).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run serve` | Servidor local en el puerto 8080 |
| `npm run build` | Regenera `locales/` y `dist/` (archivo único + página de privacidad) |
| `npm run i18n` | Fusiona textos y comprueba paridad es/en/fr/de |
| `npm run check` | i18n + tests de lógica, comodines, alas/personajes/secretos/misiones y ayuda + partidas simuladas sin interfaz |
| `npm run test:wings` | Partidas completas del bot en cada una de las 6 alas |
| `npm run test:ui` | Bot que juega con clics reales en Chromium (necesita `npm run serve`, `pip install playwright` y `playwright install chromium`) |
| `npm run test:extras` | Mesa y panel de manos, comodines en tienda/inventario, duelo narrado (ritmo y orden), voces y ajustes, 6 alas, misiones, secretos, archivo e historia, en Chromium |
| `npm run test:features` | Sin terceros ni cookies, consentimiento opcional, persistencia, audio, accesibilidad, idiomas, pantalla completa, ayuda y pistas, y depuración en Chromium (necesita el servidor) |
| `npm run test:single` | Prueba el archivo único abierto como `file://` |
| `npm run balance` | Simulación de equilibrio con un bot voraz (`-- 500 --boss=cook --jokers` para probar un guardián y/o con comodines) |

## Configuración

Sin tocar los módulos, define `window.HOUSE_CONFIG` **antes** de cargar el juego. En `index.html` hay un ejemplo comentado; en el archivo único, añade la etiqueta `<script>` en el `<head>` de `dist/the-house-always-watches.html` (o edita `index.html` y ejecuta `npm run build`). Las claves están documentadas en `src/config.js`.

## Sin anuncios ni servicios de terceros

- El juego **no incluye publicidad**: no hay huecos de anuncios, ni script de Google, ni señales de Consent Mode. Las pruebas comprueban que ni el arranque ni una partida hacen peticiones fuera del propio origen, que no se escriben cookies y que el código y los textos no contienen restos de AdSense.
- Como no queda ningún servicio opcional, **no se muestra banner de cookies**. Lo único que se guarda es la partida y los ajustes, en `localStorage` de tu navegador (`thaw.save.v1` y `thaw.settings.v1`); el juego no envía datos a ningún servidor.
- Si algún día añades un servicio opcional (por ejemplo, analítica):
  1. Declara su categoría en `OPTIONAL_CATEGORIES` (p. ej. `['analytics']`; hacen falta las claves i18n `cookies.<categoría>.name` y `.desc`).
  2. Cárgalo siempre con `loadThirdParty(categoría, src)` de `src/privacy.js`: solo se inyecta si la persona lo aceptó.
  3. Con categorías declaradas vuelve a aparecer el banner (ACEPTAR TODAS / RECHAZAR OPCIONALES / CONFIGURAR) y los botones «Cookies» del menú y de Ajustes.
  4. Actualiza la página «Privacidad y aviso».
- Si volvieras a poner publicidad de Google en el EEE, Reino Unido o Suiza, Google exige un CMP certificado e integrado con el IAB TCF (<https://support.google.com/adsense/answer/13554020>); el banner propio no lo es.

## Privacidad y aviso

`legal/privacy.html` es una única página corta, en es/en/fr/de, que describe lo que el juego hace hoy: qué guarda en tu navegador, que no usa servicios de terceros ni cookies, que el alojamiento (GitHub Pages) puede registrar visitas por su cuenta, y el aviso de contenido (ficción de terror, dinero ficticio, efectos de parpadeo). **No incluye datos de contacto ni de titular.** Son afirmaciones sobre el comportamiento del juego, que las pruebas comprueban; **no las ha revisado ningún profesional**. Si cambias algo (analítica, anuncios, cuentas, formularios) o cambias de alojamiento, actualiza `locales-src/c-legal.txt`.

## Modo depuración (oculto)

Se activa con `?debug` en la URL, con `#debug`, escribiendo `debug` en cualquier momento, o pulsando 7 veces seguidas la versión del menú. Abre un panel y expone `window.HOUSE_DEBUG` con: `addMoney`, `addCard`, `addItem`, `setSanity`, `setDebt`, `setDestiny`, `unlockCharacter`, `unlockEnding`, `triggerEvent`, `killPlayer`, `setLanguage`, `clearCookieConsent`, `toggleMusic`.

## Accesibilidad, calidad y rendimiento

Ajustes: volumen de música / efectos / ambiente, silenciar, reducir sonidos intensos, tamaño de texto (100–150 %), alto contraste, **reducir efectos** (sin parpadeos ni sacudidas; se activa solo con `prefers-reduced-motion`), vibración, pantalla completa y calidad gráfica Alta / Media / Baja (en pantallas táctiles empieza en Media). Diseño adaptable (PC, tablet y móvil, vertical y apaisado, con zonas seguras). Los controles son botones reales (se pueden usar con Tab y Enter), hay atajos de teclado en eventos, mesa y duelo y etiquetas ARIA en los controles principales. **No se ha hecho una auditoría de accesibilidad ni se ha probado con lector de pantalla.**

## Cómo se probó

Todo en Chromium (Playwright) y en Node:

- 56 tests de lógica, 26 de comodines, 31 de alas / personajes / historia / secretos / misiones, 31 de ayuda y pistas, y partidas simuladas sin interfaz con varias semillas y en cada ala (llegan a 5 de los 6 finales; el final verdadero solo está cubierto por el test de lógica y por una comprobación forzando el estado, nunca jugado de principio a fin).
- Un bot que juega con clics reales (modo normal y aleatorio con teclas y clics al azar), en 1280×720, 1920×1080, 390×844, 360×640, 844×390 y 820×1180, en los 4 idiomas, sobre la versión modular y sobre el archivo único abierto como `file://`.
- 49 comprobaciones en navegador de lo añadido (mesa, comodines, duelo narrado con medida de ritmo, voces y ajustes, alas, misiones, secretos, archivo, eventos) y 77 de funciones transversales (sin terceros ni cookies, consentimiento opcional, persistencia, audio con medida de señal real a la salida, accesibilidad, cambio de idioma en caliente, pantalla completa, ayuda y pistas, depuración), 14 sobre el archivo único y una simulación de GitHub Pages bajo subruta.

## Límites y lo que no se ha probado

- **Ningún humano ha jugado ni escuchado el juego**, ni se ha probado el tutorial y las pistas con una persona nueva. El equilibrio solo se ha ajustado contra un bot voraz (en simulación gana ~50 % contra cada guardián de ala sin comodines y ~85 % con ellos); la dificultad real, el ritmo, la música, las voces y la duración de la narración del duelo no se han validado con personas.
- Tras el tutorial no hay curva de aprendizaje: las reglas de los rivales salen al azar desde la primera sala; con las filas sube sobre todo el objetivo de puntos.
- **Solo Chromium.** No se ha probado en Firefox ni Safari ni en dispositivos móviles reales (solo emulación táctil); la pantalla completa tampoco.
- El audio (incluidas las voces) se verificó midiendo señal y eventos en un navegador sin pantalla, no escuchándolo.
- Los secretos con teclado (código de teclas) no se pueden activar en un móvil sin teclado; los demás funcionan con toques. Los secretos y las misiones se probaron con partidas simuladas y clics automáticos, no jugándolos.
- La historia nueva (Capilla, Cocinas, Enfermería, cinco personajes y sus cadenas) no ha sido leída ni revisada por nadie más que su autor; los textos en inglés, francés y alemán no han pasado por un hablante nativo.
- No hay licencia definida (por defecto, todos los derechos reservados): añade la que quieras.
