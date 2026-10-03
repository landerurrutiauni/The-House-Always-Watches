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

- **Tutorial integrado en la historia.** La primera mesa de cartas que pisas es un tutorial guiado por el Crupier: mano preparada, objetivo bajo y perder no cuesta nada (puedes repetir). Da 5 pistas según juegas (elegir cartas, palos y combinaciones, costes, descartes/Bolsillo/apuestas, objetivo). Los primeros duelos de la escopeta traen 3 pistas más. **La guía no la menciona ningún personaje**: un indicador del interfaz («Guía del juego: botón ? de arriba») aparece en el primer mapa y en la primera mesa, y los botones «?» y «? GUÍA» laten, hasta que abres la guía una vez.
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

- **Baraja completa de 52 cartas** (A, 2–10, J, Q, K en 4 palos: Sangre, Ojo, Diente, Llave). Valor en fichas: As 11, figuras 10, el resto su número. Escaleras A-2-3-4-5 y 10-J-Q-K-A. **11 manos**: carta alta, pareja, doble pareja, trío, escalera, color, full, póker, escalera de color, **escalera real** (10-J-Q-K-A del mismo palo; es una mano propia en todo —puntuación, niveles, panel, guía, comodines, misiones—, vale 120×10 y se celebra con su propio banner) y **repóker** (cinco iguales, posible con comodines de valor). Además, 6 combinaciones propias, 15 cartas especiales (5 malditas), modificadores de carta y apuestas (Salud, Cordura, Dinero o Deuda).
- **Comodines** (19, estilo Balatro): hasta 5 a la vez, de rareza común / poco común / rara; se compran en la tienda, salen de recompensas y eventos, y se venden por la mitad. Cada comodín se enciende en la mesa cuando puntúa. **Al pasar el ratón (o tocar) se ve al instante qué hace.** Actúan **de izquierda a derecha** y el orden importa de verdad (cada ×Mult multiplica la Mult acumulada hasta ese punto, así que un +Mult antes de un ×Mult rinde más): en el **mapa**, al elegir sala, se ordenan arrastrándolos o con las flechas ◀ ▶, y el orden se guarda. En la mesa no se reordenan.
- **Panel de manos** a la izquierda de la mesa, siempre visible: nivel y fichas × multiplicador de cada mano; la que vas a formar se resalta.
- **Mazo a la vista, ordenable**: botón de mazo (con el número de cartas) en la barra superior, disponible en el mapa, las recompensas y la tienda, y «Mazo: N» en la mesa. Muestra siempre el mazo **completo** (con tus cartas especiales resaltadas); se ordena por palo, valor, especiales o recientes, con filtro «solo especiales», y se ajusta para que quepa sin deslizar aunque el mazo crezca. **No existe una vista de «cartas por robar»**: lo que queda en el mazo de robo no se puede consultar (solo lo que revelan los Ojos). La mano de la mesa se ordena con los botones **Valor** y **Palo**; **con Niebla, las cartas ocultas se quedan en su hueco** (solo se ordenan las visibles, así que ordenar nunca delata una carta oculta).
- **Puntuación con animación**: banners de combo (si coinciden varios se apilan en columna y no se pisan), multiplicadores que se «encienden» según crecen y jugadas devastadoras con destello y sacudida (todo se apaga con *Reducir efectos*).
- **Descripciones al pasar el ratón** (también al tocar o con Tab): cada recurso de la barra superior (Salud, Cordura, Dinero, Deuda, Velas) y el botón del mazo explican para qué sirven; el Escudo, los comodines y **las habilidades de los rivales** (en la mesa y ante el guardián, incluidas las que has debilitado) dicen qué hacen.
- **Escudo explicado y corto**: indicador permanente en la mesa (icono + valor, con explicación al pasar el ratón o tocarlo) y una frase breve y centrada en la vista previa («+4 Escudo», «Escudo absorbe 3»); si no tienes escudo no se dice nada, el chip de Salud ya muestra la pérdida. Sección propia, de cuatro líneas, en la guía.
- **Interés del Crupier** (y de los rivales con la regla Interés): primero se suma la jugada y **solo si no llegas** al objetivo este sube un 8 % (se avisa con «Interés: objetivo N»). Si la vista previa dice «¡Con esto llegas!», llegas de verdad.
- Recursos: Dinero, Cordura, Deuda, Salud, Vidas y un Destino invisible. La Cordura baja distorsiona la pantalla en 4 niveles.
- **8 alas** (Salón, Pasillo, Sótano, Capilla, Cocinas, Enfermería, **Teatro** y **Sala de Vigilancia**), cada una con su guardián, fondo, rivales y eventos propios. Las seis últimas se abren al progresar (descensos terminados / guardianes derrotados; la pantalla de alas indica cuánto falta). **Cada descenso tiene 16 salas** y el mapa se lee de izquierda a derecha hasta el guardián. Nodo secreto, tienda, descansos, **57 eventos** (3 secretos) con cadenas de historia por personaje, 10 reglas de oponente, 12 objetos y 5 herramientas.
- **17 personajes** con biografía en el Archivo (se revela al coincidir con ellos) y **8 jugadores anónimos** con aspecto, nombre y voz propios (ya no comparten sprite). Sus historias se cruzan: lo que descubres de unos cambia lo que dicen otros, y 22 piezas de conocimiento debilitan a algunos guardianes.
- **Misiones por ala** (3 en cada una, 24 en total): premios pequeños —recursos, una carta, una mejora, un nivel de mano o, raramente, un comodín—. Se ven y se siguen desde el botón **MISIONES** del mapa y se reinician en cada descenso.
- **Secretos**: el juego esconde logros que no se explican aquí. El Archivo anota los que has encontrado y da una pista de los que faltan.
- **Duelo de la escopeta ficticia**: 6 cámaras, anuncio que puede mentir, tentar a la Mesa o escuchar. Al **escuchar** hay un instante de suspense y suena algo distinto según lo que *creas* oír: un golpe grave y metálico si crees que hay una bala, un tic hueco y agudo si crees que está vacía (con rótulo y marco de color para quien no oiga). Cada turno se **narra paso a paso** (quién apunta, qué cámara, BANG o CLIC, marcas que cambian, recarga y a quién le toca) con el cargador y las marcas actualizándose a la vez que cada frase. La apuesta «una carta de tu mazo» **enseña antes de elegir qué carta concreta pierdes y cuál ganas** (con su arte), y se cumple exactamente esa. Es una mecánica abstracta de «marcas»; no hay violencia explícita.
- 17 personajes, 8 guardianes de ala más el Crupier, 6 finales (5 + el final verdadero), La Puerta, 12 recuerdos permanentes y 22 piezas de conocimiento.
- **Escenario fijo**: el juego se dibuja en un escenario de 1280×720 que se escala entero a la ventana, así que la disposición y los saltos de línea son siempre los mismos, con cualquier tamaño de ventana o pantalla completa. Los diálogos, los sucesos, los guardianes y el duelo (narración del turno + historial compacto de todos los disparos) caben sin deslizar; el Archivo se reparte en pestañas. En un móvil en vertical aparece un aviso para girar el dispositivo (o jugar con el escenario girado 90°).
- **Volver al inicio** desde Ajustes, en cualquier momento de la partida: en el mapa avisa de que se guarda el progreso; en mitad de una sala avisa de que esa sala se dará por abandonada.
- **Voces**: cada personaje «balbucea» al hablar (sintetizado con Web Audio, sin archivos de audio), también con *Reducir efectos* (ráfaga corta). Ajustes: volumen de voces (suena una muestra al moverlo), silenciarlas y velocidad del texto (normal / rápida / instantánea).
- Morir no es Game Over: pantalla DEUDA ACTUAL / RECUERDOS CONSERVADOS y nuevo descenso con meta-progresión.
- Intro «¿Estás despierto?», tutorial, pantalla «Cómo se juega» y pistas de una sola vez.
- Música dinámica por capas y efectos de sonido sintetizados con Web Audio.
- **Cinco idiomas al 100 %** (1249 claves × 5): español, inglés, francés, alemán y **euskera**, con cambio en caliente y detección del idioma del navegador. El secreto «La casa habla todos los idiomas» pide usar los cinco.

## Estructura

```
index.html              punto de entrada (versión modular, la que sirve GitHub Pages)
assets/ui/game.css      maquetación, efectos, accesibilidad, pantallas grandes
src/                    lógica (state, cards, combat, jokers, shotgun, map, content, effects, missions, achievements, game, save, i18n)
                        y capa web (sprites, audio, music, sfx, fx, fullscreen, ui, cookies, privacy, debug, main,
                        screens/: menu, run, table, duel, howto)
locales-src/*.txt       textos fuente: clave|es|en|fr|de
locales-src/*.eu.txt    euskera, aparte: clave|euskera (una línea por clave; el texto no puede llevar «|»)
locales/*.json          generado por tools/build-locales.mjs (no editar a mano)
legal/                  página «Privacidad y aviso» (única página legal)
dist/                   generado: archivo único + página de privacidad autónoma
tools/                  construcción y pruebas
```

Los textos se editan en `locales-src/` y se regeneran con `npm run i18n` (también comprueba que no falte ninguna clave ni variable `{x}` en ninguno de los cinco idiomas).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run serve` | Servidor local en el puerto 8080 |
| `npm run build` | Regenera `locales/` y `dist/` (archivo único + página de privacidad) |
| `npm run i18n` | Fusiona textos y comprueba paridad es/en/fr/de/eu |
| `npm run check` | i18n + tests de lógica, comodines, alas/personajes/secretos/misiones/dificultad y ayuda + partidas simuladas sin interfaz |
| `npm run test:wings` | Partidas completas del bot en cada una de las 8 alas |
| `npm run test:ui` | Bot que juega con clics reales en Chromium (necesita `npm run serve`, `pip install playwright` y `playwright install chromium`) |
| `npm run test:extras` | Mesa y panel de manos, comodines, duelo narrado con historial sin scroll, voces y ajustes, 8 alas, misiones, secretos y archivo por pestañas, en Chromium |
| `npm run test:more` | Mazo (visor, orden y mano), comodines (descripción y orden en el mapa), interés, apuesta de carta, volver al inicio, indicador de guía, escenario fijo (misma disposición en 5 tamaños de ventana, aviso y giro en móvil vertical), mapa de 16 salas, banners apilados, escudo, escalera real, sprites únicos, guía anunciada y voces con medida de señal de audio, en Chromium |
| `npm run test:contrast` | **Alto contraste**: con el ajuste activado mide en Chromium el contraste de TODO el texto (≥ 7:1; ≥ 3:1 si está desactivado) y de los bordes (≥ 3:1) en 28 pantallas, modales y descripciones, en uno o varios idiomas (`--langs es,eu`); `--normal` mide sin alto contraste para comparar (394 fallos sin él) |
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

`legal/privacy.html` es una única página corta, en es/en/fr/de/eu, que describe lo que el juego hace hoy: qué guarda en tu navegador, que no usa servicios de terceros ni cookies, que el alojamiento (GitHub Pages) puede registrar visitas por su cuenta, y el aviso de contenido (ficción de terror, dinero ficticio, efectos de parpadeo). **No incluye datos de contacto ni de titular.** Son afirmaciones sobre el comportamiento del juego, que las pruebas comprueban; **no las ha revisado ningún profesional**. Si cambias algo (analítica, anuncios, cuentas, formularios) o cambias de alojamiento, actualiza `locales-src/c-legal.txt`.

## Modo depuración (oculto)

Se activa con `?debug` en la URL, con `#debug`, escribiendo `debug` en cualquier momento, o pulsando 7 veces seguidas la versión del menú. Abre un panel y expone `window.HOUSE_DEBUG` con: `addMoney`, `addCard`, `addItem`, `setSanity`, `setDebt`, `setDestiny`, `unlockCharacter`, `unlockEnding`, `triggerEvent`, `killPlayer`, `setLanguage`, `clearCookieConsent`, `toggleMusic`.

## Accesibilidad, calidad y rendimiento

Ajustes: volumen de música / efectos / ambiente / voces, silenciar, reducir sonidos intensos, **alto contraste** (tema completo: todo el texto a ≥ 7:1 y los bordes a ≥ 3:1, también en el cuadro de manos, las descripciones, el historial del duelo y la página de privacidad), **reducir efectos** (sin parpadeos ni sacudidas; se activa solo con `prefers-reduced-motion`), vibración, pantalla completa y calidad gráfica Alta / Media / Baja (en pantallas táctiles empieza en Media). Escenario fijo 1280×720 escalado a la ventana (PC, tablet y móvil apaisado; móvil vertical con aviso para girar). Con un tamaño de texto superior al 100 % alguna pantalla puede necesitar deslizar (las comprobaciones de «sin deslizar» se hicieron al 100 %). Los controles son botones reales (se pueden usar con Tab y Enter), hay atajos de teclado en eventos, mesa y duelo y etiquetas ARIA en los controles principales. **No se ha hecho una auditoría de accesibilidad ni se ha probado con lector de pantalla.**

## Cómo se probó

Todo en Chromium (Playwright) y en Node:

- 56 tests de lógica, 27 de comodines (incluido que el orden importa), 49 de alas / personajes / historia / secretos / misiones / dificultad / interés / apuesta de carta / orden de cartas y comodines (y que con Niebla las cartas ocultas no se mueven ni delatan su valor al ordenar) / euskera / textos de recursos / tema de alto contraste (y que lo que dicen de la Deuda y las Velas es verdad), 34 de ayuda y pistas (en los 5 idiomas), y partidas simuladas sin interfaz con varias semillas y en cada una de las 8 alas (llegan a 5 de los 6 finales; el final verdadero solo está cubierto por el test de lógica y por una comprobación forzando el estado, nunca jugado de principio a fin).
- Un bot que juega con clics reales (modo normal y aleatorio con teclas y clics al azar), en 1280×720, 1920×1080, 390×844 (aceptando el aviso de girar), 360×640, 844×390 y 820×1180, en los 5 idiomas, en las 8 alas y hasta la última mano, sobre la versión modular y sobre el archivo único abierto como `file://`.
- Un auditor que abre 83 pantallas (alas, mapa, mapa con 5 comodines, indicador de guía, mesa, visor de mazo, duelo, 8 guardianes, tienda, descanso, Archivo por pestañas, ajustes, guía y los 57 eventos) en los 5 idiomas y en varios tamaños de ventana y comprueba que nada obliga a deslizar, queda recortado ni se sale del escenario.
- En navegador (Chromium): 70 comprobaciones de la ampliación de alas y personajes (mesa, comodines, duelo narrado con historial, voces y ajustes, alas, misiones, secretos, archivo), 86 de las últimas tandas (escenario fijo, 16 salas, Niebla (las ocultas no se ordenan), salir del duelo a media narración, banners, escudo, escalera real, sprites, guía fuera de la voz del Crupier, voces con medida de señal real, interés, apuesta de carta, visor de mazo y orden de la mano, comodines con descripción y orden, volver al inicio, descripciones de recursos y de habilidades de rivales sin textos sueltos, y los dos sonidos de escuchar medidos en la salida de audio: ambos suenan y el de «cargada» es claramente más grave) y 82 de funciones transversales (sin terceros ni cookies, consentimiento opcional, persistencia, audio con medida de señal real a la salida, accesibilidad —incluido que el tamaño del texto es fijo incluso con un ajuste antiguo guardado—, cambio de idioma en caliente incluido el euskera y su detección automática, pantalla completa, ayuda y pistas, depuración), 14 sobre el archivo único y una simulación de GitHub Pages bajo subruta.

## Límites y lo que no se ha probado

- **Ningún humano ha jugado ni escuchado el juego**, ni se ha probado el tutorial y las pistas con una persona nueva. El equilibrio solo se ha ajustado contra un bot voraz (en simulación gana entre ~37 y ~51 % contra cada guardián de ala sin comodines y ~80–86 % con ellos, con descensos de 16 salas y el orden de comodines ya significativo); la dificultad real, el ritmo de un descenso tan largo, la música, las voces (medidas con un analizador de audio, no escuchadas) y la duración de la narración del duelo no se han validado con personas.
- **El escenario fijo escala todo, incluido el texto, y el tamaño del texto NO se puede cambiar** (no hay ajuste: cualquier tamaño distinto rompería la garantía de que nada obliga a deslizar). Para verlo más grande: ventana más grande o pantalla completa, que escalan el escenario entero; en pantallas pequeñas (un móvil apaisado, una ventana muy pequeña) el texto se ve más pequeño, y en un móvil en vertical hay que girar el dispositivo o jugar con el escenario girado 90°. No hay un diseño distinto para vertical.
- **Euskera**: la traducción completa (1249 textos) la hizo el propio autor del código, no un traductor ni un hablante nativo: puede haber erratas, giros poco naturales o términos de juego discutibles (p. ej. «palu» para los palos, «mult» sin traducir). El inglés, el francés y el alemán nuevos de las últimas ampliaciones tampoco los ha revisado un nativo.
- Tras el tutorial no hay curva de aprendizaje: las reglas de los rivales salen al azar desde la primera sala; con las filas sube sobre todo el objetivo de puntos.
- **Solo Chromium.** No se ha probado en Firefox ni Safari ni en dispositivos móviles reales (solo emulación táctil); la pantalla completa tampoco.
- El audio (incluidas las voces) se verificó midiendo señal y eventos en un navegador sin pantalla, no escuchándolo.
- Los secretos con teclado (código de teclas) no se pueden activar en un móvil sin teclado; los demás funcionan con toques. Los secretos y las misiones se probaron con partidas simuladas y clics automáticos, no jugándolos.
- La historia nueva (Capilla, Cocinas, Enfermería, Teatro, Sala de Vigilancia, nueve personajes y sus cadenas) no ha sido leída ni revisada por nadie más que su autor.
- No hay licencia definida (por defecto, todos los derechos reservados): añade la que quieras.
