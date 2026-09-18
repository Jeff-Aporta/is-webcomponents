### demo: mega-menu
#### Tests existentes (resumen, brevísimo)
- Cobertura básica previa limitada a render del markup, presencia de la etiqueta del componente y un click genérico sobre el trigger para verificar que el panel se abre.
#### Propuestas nuevas

1. **Apertura por click en trigger actualiza aria-expanded y muestra el panel** — [ARIA / a11y]
   - Setup: cargar la preview, esperar al componente, localizar el botón trigger del mega-menú.
   - Acción: hacer click una vez en el trigger.
   - Assertion: `aria-expanded` del trigger pasa de `false` a `true`; el panel asociado (sibling o descendiente controlado) aparece en el DOM visible (`getBoundingClientRect().height > 0`) y queda referenciado por `aria-controls` en el trigger.
   - Cobertura: contrato ARIA de un toggle de menú expandible y sincronía atributo ↔ DOM.

2. **Cierre por click sobre el mismo trigger alterna estado sin dejar focus residual** — [Interacción]
   - Setup: estado inicial con panel cerrado; foco en `<body>`.
   - Acción: click en trigger → panel abierto → click otra vez en el mismo trigger.
   - Assertion: `aria-expanded` vuelve a `false`, el panel se oculta (`hidden` o `display:none` o `visibility:hidden`/transform offscreen según implementación) y el foco activo al final sigue siendo el trigger (no salta al `<body>` ni queda atrapado en un nodo ya desmontado).
   - Cobertura: idempotencia toggle y contrato de "el dueño del foco al cerrar sigue siendo el disparador".

3. **Escape cierra el panel y devuelve foco al trigger** — [Teclado]
   - Setup: panel abierto mediante click o `Enter` en el trigger; foco sobre el primer item del panel.
   - Acción: pulsar `Escape` una sola vez.
   - Assertion: panel se cierra (`aria-expanded` en `false`, panel no visible), y `document.activeElement` vuelve a ser el botón trigger original. Ningún listener consume el evento de modo que un segundo `Escape` "robe" foco a otro componente.
   - Cobertura: contrato "Escape cancela y restaura" propio de menubar WAI-ARIA.

4. **Click fuera del panel y del trigger cierra el menú (outside click)** — [Interacción]
   - Setup: panel abierto; documento a viewport estándar.
   - Acción: con el puntero, hacer click en un punto neutro del documento (por ejemplo el `<main>` o un párrafo aleatorio fuera del shadow DOM del componente).
   - Assertion: el panel se cierra; `aria-expanded` del trigger pasa a `false`; el foco activo tras el click se queda donde lo dejó el navegador (no se restaura al trigger salvo que sea un patrón "modal-like" — verificar cuál aplica).
   - Cobertura: comportamiento de dismiss global típico de menús no modales.

5. **Tab cicla solo dentro del panel mientras está abierto (focus trap)** — [Teclado]
   - Setup: panel abierto con ≥3 columnas y varios enlaces por columna.
   - Acción: presionar `Tab` repetidamente desde el primer item del panel hasta que el foco abandone el último item.
   - Assertion: el foco nunca visita nodos fuera del subtree del mega-menú mientras el panel está abierto. El primer `Tab` desde un nodo previo al trigger lleva al primer item del panel, y el `Tab` posterior al último item del panel cierra el menú y devuelve el foco al trigger (o al siguiente elemento focuseable del documento si la especificación es no-modal — verificar el contrato exacto).
   - Cobertura: focus trap WAI-ARIA y comportamiento al borde.

6. **Shift+Tab desde el primer item cierra y devuelve foco al trigger** — [Teclado]
   - Setup: panel abierto; foco colocado manualmente sobre el primer item focuseable del panel.
   - Acción: pulsar `Shift+Tab` una vez.
   - Assertion: el foco salta al elemento focuseable inmediatamente anterior al trigger (o al propio trigger), no a un nodo intermedio fuera del menú, y el panel permanece en su estado actual hasta que se decida explícitamente cerrarlo (o se cierra según contrato del componente).
   - Cobertura: navegación inversa del trap.

7. **Arrow Down / Arrow Right navegan al siguiente item / columna respetando roving tabindex** — [Teclado]
   - Setup: panel abierto; foco en el primer item de la primera columna.
   - Acción: pulsar `ArrowDown` repetidamente hasta el final de la columna, luego `ArrowRight` para saltar a la primera fila de la siguiente columna.
   - Assertion: el foco recorre los items según un orden lógico (lectura natural: columna por columna o fila por fila); en cada movimiento el item activo recibe `tabindex="0"` y los demás items del panel quedan con `tabindex="-1"`. No se produce scroll horizontal de página; si el item sale del viewport del panel, hay scroll interno del contenedor.
   - Cobertura: roving tabindex y orientación de un menubar/menu multi-columna.

8. **Arrow Up / Arrow Left navegan al item anterior / columna anterior sin perder posición de scroll** — [Teclado]
   - Setup: panel abierto; foco en el segundo item de la segunda columna.
   - Acción: pulsar `ArrowUp` una vez (espera foco en el primer item de la segunda columna), después `ArrowLeft` (espera foco en el último item de la primera columna — comportamiento wrap-around o clamp según contrato).
   - Assertion: foco en el item esperado, el `tabindex` se ha movido correctamente, y `scrollTop` / `scrollLeft` del contenedor del panel no se han reseteado a 0 al cambiar de columna.
   - Cobertura: wrap-around vs clamp y persistencia de scroll.

9. **Home / End saltan al primer / último item del panel** — [Teclado]
   - Setup: panel abierto; foco en cualquier item intermedio.
   - Acción: pulsar `Home`; luego pulsar `End`.
   - Assertion: tras `Home` el foco está en el primer item del panel (no de la página); tras `End` está en el último. Cada salto actualiza `tabindex` correctamente y el contenedor hace scrollIntoView si el destino está fuera de vista.
   - Cobertura: atajos estándar de widgets ARIA `menu` / `menubar`.

10. **role="menubar" en el contenedor raíz y role="menu" en cada columna** — [ARIA / a11y]
    - Setup: cargar la preview; localizar el contenedor del mega-menú.
    - Acción: inspección del DOM (sin interacción).
    - Assertion: el contenedor superior de los triggers lleva `role="menubar"`; cada panel-columna lleva `role="menu"` (o `role="group"` si se anidan subniveles); los items focuseables llevan `role="menuitem"` o `role="menuitemcheckbox"` según corresponda. El atributo `aria-orientation` está presente (`horizontal` en menubar, `vertical` en cada columna) o se omite siguiendo el default del rol.
    - Cobertura: jerarquía de roles ARIA 1.2 para menús multi-nivel.

11. **aria-label / aria-labelledby en el panel cuando se abre** — [ARIA / a11y]
    - Setup: panel abierto; localizar el nodo con `role="menu"`.
    - Acción: inspección de atributos tras la apertura.
    - Assertion: el panel expone un nombre accesible — bien `aria-label="<título de la sección>"` o `aria-labelledby` apuntando al heading visible del panel. El nombre es el mismo tanto al abrir por click como por teclado.
    - Cobertura: nombre accesible para lectores de pantalla al entrar al submenú.

12. **Activación de un item con Enter y con Space ejecutan la acción del item** — [Teclado]
    - Setup: panel abierto; foco en un `menuitem` con `href` o con handler de click.
    - Acción: pulsar `Enter` sobre el item; repetir el escenario y pulsar `Space`.
    - Assertion: en ambos casos se dispara la navegación / el handler asociado (verificable por cambio de URL, por emisión de un `CustomEvent` `is-select`, o por invocación del listener de click registrado). El panel se cierra tras la selección, salvo que la doc del componente indique lo contrario.
    - Cobertura: contrato "Enter y Space activan `menuitem`" del patrón WAI-ARIA.

13. **Click en un item cierra el panel y propaga el evento al consumidor** — [Interacción]
    - Setup: panel abierto; montar un listener (`addEventListener('is-select', …)`) sobre el host antes de la interacción.
    - Acción: click con el puntero sobre un `menuitem` cualquiera del panel.
    - Assertion: el listener recibe el evento `is-select` exactamente una vez, el `detail` contiene el item seleccionado, y el panel se cierra. Verificar que el evento no se emite dos veces (no reentrancia por doble handler).
    - Cobertura: contrato de emisión de eventos del componente y anti-duplicación.

14. **Hover sobre trigger con panel ya cerrado abre el panel con un delay razonable** — [Interacción]
    - Setup: panel cerrado; cursor fuera del componente; viewport con tamaño conocido.
    - Acción: `mouse.move` al centro del trigger; esperar un tiempo `t < 100ms` y comprobar estado; esperar `t ≈ 300–500ms` y volver a comprobar.
    - Assertion: durante el periodo corto el panel permanece cerrado (no se abre por jitter); tras el periodo largo (configurado por la impl, típicamente ~250ms) el panel se abre. Si el contrato es "click-only", el panel debe permanecer cerrado en hover.
    - Cobertura: tiempo de apertura por hover y cumplimiento del contrato declarado.

15. **Hover sobre otro trigger cierra el panel actual y abre el nuevo** — [Interacción]
    - Setup: dos o más triggers en la barra; panel del primero abierto.
    - Acción: `mouse.move` al centro del segundo trigger (sin click).
    - Assertion: el panel del primer trigger se cierra y el del segundo se abre, sin parpadeo intermedio (o con una transición cross-fade coherente). `aria-expanded` refleja el cambio en ambos triggers. El foco de teclado queda intacto.
    - Cobertura: cambio de panel sin click — comportamiento típico de mega-menús horizontales.

16. **Cierre por blur (focus abandona el subárbol del menú)** — [Teclado]
    - Setup: panel abierto; foco en el último item.
    - Acción: tabular una vez para forzar el ciclo de salida del trap.
    - Assertion: si el contrato es "menú no modal", el panel se cierra y el foco pasa al siguiente elemento focuseable del documento; si es modal, el foco permanece dentro y el panel sigue abierto. Verificar y asertar el contrato real del componente.
    - Cobertura: comportamiento al borde del trap según semántica del componente.

17. **Anatomía de animación de apertura (duración, easing, propiedad animada)** — [Estados visuales y edge cases]
    - Setup: panel cerrado; capturar `getComputedStyle` del contenedor del panel en estado cerrado.
    - Acción: disparar apertura por click; muestrear estilos en `t=0`, `t≈mid`, `t=final` usando `requestAnimationFrame` o `await page.waitForTimeout` escalonado.
    - Assertion: la animación está acotada en duración (≤300ms idealmente, ≤500ms como techo de UX) y la propiedad animada es coherente (`opacity`, `transform: translateY`, o `height`/`clip-path`). Existe `prefers-reduced-motion: reduce` y bajo esa media query la animación se reduce a `duration: 0` o se salta directamente al estado final.
    - Cobertura: timing budget y accesibilidad de movimiento.

18. **Anatomía de animación de cierre (cleanup, sin parpadeo de contenido)** — [Estados visuales y edge cases]
    - Setup: panel abierto.
    - Acción: disparar cierre (click en trigger o Escape); capturar `getComputedStyle` en `t=0`, `t≈mid`, `t=final`.
    - Assertion: la duración de cierre es ≤ a la de apertura o equivalente; tras finalizar, el panel queda completamente fuera del flujo visible (no queda un sliver de 1px); `aria-hidden="true"` o `inert` aplicado durante la transición para evitar que screen readers anuncien elementos animados.
    - Cobertura: cleanup de animación y a11y durante transición.

19. **Estado vacío (sin columnas ni items renderizados)** — [Estados visuales y edge cases]
    - Setup: instanciar el componente con un slot o prop que produzca una estructura vacía (sin hijos en `default slot` y sin items en cada panel).
    - Acción: renderizar y abrir el panel.
    - Assertion: el panel se abre sin lanzar excepción; muestra un estado vacío explícito (texto "Sin opciones", un placeholder, o simplemente nada sin error en consola). El componente no debe petar por `null` en items ni por longitudes 0.
    - Cobertura: robustez con datos vacíos.

20. **Contenido muy largo: overflow y scroll interno del panel** — [Estados visuales y edge cases]
    - Setup: alimentar el panel con un número elevado de items por columna (p.ej. 50) o con un item que contenga texto sin espacios de longitud > 200 caracteres.
    - Acción: abrir el panel; hacer scroll vertical y horizontal dentro del panel; intentar seleccionar el último item.
    - Assertion: el panel tiene `overflow:auto` o `overflow:hidden` con scroll interno; no aparece scroll horizontal de la página; los items largos se truncan con `text-overflow: ellipsis` o se envuelven según contrato; el último item es focuseable por teclado y por click.
    - Cobertura: contención del scroll y manejo de overflow.

21. **Tema dark/light: contraste de tokens `--is-*` en panel y trigger** — [Estados visuales y edge cases]
    - Setup: renderizar el demo, capturar tokens CSS activos (`getComputedStyle` sobre `--is-color-bg`, `--is-color-text`, `--is-color-border`).
    - Acción: alternar el atributo `data-theme="dark"` / `data-theme="light"` en `<html>` o el equivalente que use el kit; reabrir el panel.
    - Assertion: el panel y los items usan tokens `--is-*` (no colores hardcodeados); el ratio de contraste entre el texto de un item y el fondo del panel es ≥ 4.5:1 (AA para texto normal) tanto en tema claro como oscuro; el estado `:focus-visible` del item es distinguible en ambos temas.
    - Cobertura: theming correcto y accesibilidad de contraste.

22. **Estado disabled de un item: pointer-events, aria-disabled y skip del foco** — [Estados visuales y edge cases]
    - Setup: configurar un item con `disabled` o `aria-disabled="true"`; abrir el panel.
    - Acción: intentar click con el puntero; intentar tabular hasta el item deshabilitado.
    - Assertion: el click no ejecuta la acción del item; el item deshabilitado no recibe foco por teclado (queda fuera del orden de tabulación) o, si el contrato lo permite, recibe foco pero `aria-disabled="true"` está presente. El item muestra un estilo diferenciado (opacidad reducida, cursor `not-allowed`, sin hover).
    - Cobertura: contrato `aria-disabled` vs `disabled` nativo y skip de foco.

23. **Re-apertura inmediata tras cierre sin carrera de eventos** — [Interacción]
   - Setup: panel cerrado.
   - Acción: ciclo rápido: click abrir → click cerrar → click abrir → Escape → click abrir, sin esperas explícitas.
   - Assertion: el estado final del panel es abierto; `aria-expanded` queda coherente con el último estado; no hay eventos `is-select` espurios; no quedan listeners duplicados que produzcan dos toggles por click.
   - Cobertura: anti-reentrancia y limpieza de timers pendientes entre aperturas/cierres sucesivos.

24. **Lectura por lector de pantalla del nombre del panel al entrar** — [ARIA / a11y]
   - Setup: panel cerrado; foco en trigger.
   - Acción: simular `Enter` (o click) para abrir; capturar la cadena accesible del panel (`aria-label`/`aria-labelledby` resuelto) y verificar orden del árbol accesible.
   - Assertion: al expandir, el primer elemento anunciado al entrar al panel es su nombre accesible, seguido por los nombres de los items (texto del `menuitem`). No se anuncia contenido decorativo (iconos sin `aria-label`) ni se duplica el nombre del trigger.
   - Cobertura: experiencia de lector de pantalla en `menubar → menu`.

25. **Manejo de item con submenú anidado (tercer nivel) — Arrow Right entra y Arrow Left sale** — [Teclado]
    - Setup: configurar un `menuitem` con `aria-haspopup="true"` que abra un sub-panel al activarse/hover.
    - Acción: con foco en el item padre, pulsar `ArrowRight` (o `Enter` según contrato); tras abrir el sub-panel, pulsar `ArrowLeft`.
    - Assertion: `ArrowRight` abre el sub-panel y mueve foco a su primer item; `ArrowLeft` cierra el sub-panel y devuelve foco al item padre. En ambos casos `aria-expanded` del item padre refleja el estado. El sub-panel lleva `role="menu"` anidado.
    - Cobertura: navegación multi-nivel y contratos `aria-haspopup`.
