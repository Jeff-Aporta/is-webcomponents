# F0.3 propuesta UX/UI exhaustiva — overlays (1 demos: command-palette)

## Perfil del proyecto
**is-webcomponents** — librería de Web Components vanilla TypeScript con Shadow DOM, tokens `--is-*`, y un kit de 67 demos servidos desde GitHub Pages. Stack: Playwright 1.62.1 + Chromium headless para tests browser.

## Testables del grupo (categoría: overlays)

### Demos a auditar (1)
  - src/components/overlays/command-palette.preview.ts (behavior)

### JSON de cada demo (estructura + secciones)
  - src/components/overlays/command-palette.json (estructura)

---

### demo: command-palette

#### Tests existentes (resumen, brevísimo)
- Apertura/cierre básico del overlay mediante un disparador externo (botón en host).
- Renderizado de la lista inicial de comandos estáticos desde el JSON de la demo.
- Smoke test de selección por click sobre una opción.

#### Propuestas nuevas

1. **Atajo global de apertura Ctrl/Cmd+K desde cualquier punto de la página** — [Teclado]
   - Setup: Cargar la página del demo sin foco inicial en ningún control (`document.body`). Capturar `addEventListener('keydown', ...)` antes de la acción.
   - Acción: Pulsar `Control+K` (en macOS `Meta+K`) sobre `document`. Repetir pulsándolo sobre un `<input>` externo y sobre un `<button>` para confirmar captura global.
   - Assertion: El overlay (`is-command-palette` o equivalente en Shadow DOM) pasa de `hidden`/`aria-hidden="true"` a visible, el `<input>` interno recibe `focus` (verificable con `document.activeElement` atravesando ShadowRoot), y `aria-expanded` del trigger cambia a `true`.
   - Cobertura: Atajo documentado, captura cross-root, no-interferencia con campos de texto del documento anfitrión.

2. **Atajos alternativos documentados (Ctrl/Cmd+/ y Ctrl/Cmd+P) no rompen el flujo** — [Teclado]
   - Setup: Listener registrado para `keydown`. Estado inicial: paleta cerrada.
   - Acción: Probar secuencialmente `Ctrl+/`, `Ctrl+P`, `Ctrl+Shift+K` y `Escape` antes de abrir; también tras abrir la paleta, pulsar `Ctrl+P` para confirmar que NO abre un print dialog del navegador.
   - Assertion: Cada atajo documentado abre/cierra la paleta de forma idempotente; los atajos no documentados no producen efectos colaterales ni son `preventDefault`-eados.
   - Cobertura: Documentación de atajos, conflicto con shortcuts nativos del navegador.

3. **Focus trap dentro del overlay con Tab/Shift+Tab cíclico** — [Teclado] [ARIA/a11y]
   - Setup: Paleta abierta y `<input>` de búsqueda enfocado. Identificar primer y último elementos focuseables internos (input, botones de icono, flecha arriba, primer resultado, último resultado).
   - Acción: Pulsar `Tab` repetidamente hasta recorrer todos los focuseables; en el último, pulsar `Tab` una vez más. Repetir con `Shift+Tab` desde el primero.
   - Assertion: El foco queda confinado dentro del Shadow DOM del overlay; al ciclar, vuelve al input o al primer resultado según implementación, nunca escapa a elementos del documento anfitrión.
   - Cobertura: Focus trap robusto, navegación cíclica, no-fuga al árbol externo.

4. **Escape cierra la paleta y restaura el foco al elemento trigger original** — [Teclado] [Interacción]
   - Setup: Paleta cerrada. Enfocar el botón trigger y abrir la paleta con click. Capturar `document.activeElement` (atravesando ShadowRoot) que debe ser el input interno.
   - Acción: Pulsar `Escape` una vez; volver a abrir con atajo; pulsar `Escape` dos veces rápido.
   - Assertion: Tras `Escape`, el overlay se oculta, `aria-expanded="false"` en el trigger, y `document.activeElement` vuelve a ser el botón trigger original (no `document.body`).
   - Cobertura: Restauración de foco (focus return), comportamiento idempotente de Escape.

5. **Filtro difuso (fuzzy) sobre la lista de comandos al teclear** — [Interacción]
   - Setup: Paleta abierta, foco en input. Capturar la lista renderizada de items (atributos data o texto vía ShadowRoot).
   - Acción: Teclear secuencialmente `g`, `go`, `goto`, `goto-dash`, `GTD` (mayúsculas), y secuencias con typos como `gtp` (esperando coincidencia con "go to…"). Borrar con Backspace y confirmar reaparición.
   - Assertion: La lista se reduce progresivamente respetando coincidencias no contiguas y case-insensitive; los items no coincidentes se ocultan (no se eliminan del DOM con `display:none` inadecuado); el contador de resultados o `aria-live` se actualiza.
   - Cobertura: Algoritmo fuzzy, case-insensitive, tolerancia a typos, re-render al borrar.

6. **Navegación con flechas ↑/↓ entre resultados con highlighting visual y aria-selected** — [Teclado] [ARIA/a11y]
   - Setup: Paleta abierta con ≥5 items visibles. Foco inicial en input (no en lista).
   - Acción: Pulsar `ArrowDown` 3 veces; pulsar `ArrowUp` 1 vez; pulsar `ArrowDown` en el último item (debe ciclar al primero); pulsar `ArrowUp` en el primero (debe ciclar al último o volver al input).
   - Assertion: Cada item activo recibe una clase visual de selección (clase CSS tipo `.is-selected` o `data-active="true"`) y `aria-selected="true"`; los demás llevan `aria-selected="false"`; el item activo entra en viewport (scrollIntoView si overflow).
   - Cobertura: Cíclica, ARIA listbox/option, scroll automático.

7. **Activación con Enter ejecuta el comando seleccionado y cierra la paleta** — [Teclado] [Interacción]
   - Setup: Paleta abierta con item X seleccionado vía flechas. Capturar evento `command-palette:select` o equivalente con `page.exposeFunction`/`addEventListener` en `window`.
   - Acción: Pulsar `Enter`. Repetir abriendo la paleta, buscando "settings" y pulsando `Enter` sobre el resultado highlighted.
   - Assertion: Se emite el evento con `{ command, payload }` (o detalle análogo); el overlay se cierra; foco restaurado al trigger; no queda residuo de DOM ni `aria-modal` colgando.
   - Cobertura: Acción primaria del patrón combobox, side-effects del comando.

8. **Items recientes (recent items) aparecen arriba al abrir con input vacío** — [Interacción] [Estados visuales]
   - Setup: Ejecutar dos comandos distintos (cerrando la paleta entre ambos). Recargar la página (verificar persistencia en `localStorage` o `sessionStorage`).
   - Acción: Abrir la paleta sin teclear. Observar la sección de recientes. Pulsar `ArrowDown` una vez.
   - Assertion: Existe un separador/heading visible ("Recent" o aria-label equivalente), los items ejecutados previamente aparecen en orden LIFO/recencia, llevan marca visual distinta (timestamp, icono, opacidad reducida), y se pueden volver a ejecutar con `Enter`. Tras `localStorage.clear()`, la sección queda vacía con un estado vacío explícito.
   - Cobertura: Persistencia, dedupe, separación visual respecto a comandos completos.

9. **Resultados asíncronos: spinner/skeleton durante fetch y timeout configurable** — [Estados visuales]
   - Setup: Mockear el endpoint de búsqueda asíncrona con retardo de 600 ms y luego 5 s (vía `page.route`). Abrir la paleta.
   - Acción: Teclear un query que dispare fetch. Observar indicador. Esperar >5 s con el timeout configurado.
   - Assertion: Durante el fetch aparece `aria-busy="true"` en la región de resultados o un spinner visible (no decorativo, `role="status"` o `aria-live="polite"`). Tras el retardo, los resultados se renderizan. Tras el timeout, se muestra mensaje de error no bloqueante con opción "Retry".
   - Cobertura: Loading state, debounce/cancelación de requests en curso, error recuperable.

10. **Estado vacío (0 resultados) y query inválida ofrecen affordance clara** — [Estados visuales] [ARIA/a11y]
    - Setup: Paleta abierta, foco en input.
    - Acción: Teclear `zzzzzzzz` (sin coincidencias). Borrar a string vacío. Teclear solo espacios `"   "`. Borrar y dejar `""`.
    - Assertion: Con 0 resultados aparece mensaje "No commands match…" con icono y `role="status"` o equivalente; con query vacío la lista por defecto (o recientes) reaparece; la entrada de solo espacios se trata como vacía (no como filtro).
    - Cobertura: Empty state explícito, normalización de input, accesibilidad del mensaje.

11. **ARIA combobox/listbox: roles, IDs y aria-activedescendant coherentes** — [ARIA/a11y]
    - Setup: Paleta abierta. Inspeccionar el Shadow DOM del componente.
    - Acción: Verificar atributos estáticos y dinámicos mientras se navega con flechas. Probar con lector simulado (`page.accessibility.snapshot()`).
    - Assertion: El input tiene `role="combobox"` (o equivalente documentado), `aria-controls="<id-listbox>"`, `aria-expanded`, `aria-activedescendant="<id-opción-activa>"` actualizado al navegar con flechas; el contenedor de resultados es `role="listbox"`; cada item es `role="option"` con `id` único. Sin `aria-activedescendant` o `aria-selected` cuando aplica: violación detectable.
    - Cobertura: Contrato ARIA 1.2 para combobox, asociación por ID no rota tras re-render.

12. **Anuncios en vivo (aria-live) al cambiar selección, conteo y errores** — [ARIA/a11y]
    - Setup: Paleta abierta con VoiceOver/NVDA simulado o capturando `aria-live` regions.
    - Acción: Navegar 5 items con flechas; borrar input a vacío; forzar error de red en fetch.
    - Assertion: Existe una región `aria-live="polite"` que anuncia cambios discretos ("5 of 12 results" / "No results" / "Failed to load, retry"); NO usa `aria-live="assertive"` salvo errores críticos. No hay spam de anuncios en cada keystroke si el debounce es correcto.
    - Cobertura: UX para usuarios de lector de pantalla, throttling de anuncios.

13. **Hover sobre items muestra acción secundaria (atajo de teclado o descripción)** — [Interacción] [Estados visuales]
    - Setup: Paleta abierta, lista renderizada. Inspeccionar computed styles.
    - Acción: Hover sobre 3 items distintos con mouse y mediante `focus` con teclado (`:focus-visible`).
    - Assertion: Aparece tooltip o texto secundario ("Go to dashboard · Ctrl+G") sólo en hover/focus, no de forma permanente (mantiene lista compacta); tiene contraste suficiente en tokens `--is-*`. El tooltip desaparece al salir y al hacer click sin generar flicker.
    - Cobertura: Progressive disclosure, no saturación visual.

14. **Comportamiento responsivo: paleta usable en viewport 375×667 y 1920×1080** — [Estados visuales]
    - Setup: `page.setViewportSize` a mobile y desktop.
    - Acción: Abrir paleta en cada viewport. Probar scroll interno con lista de 50 items simulados. Rotar viewport con paleta abierta.
    - Assertion: En mobile ocupa ≥80% del ancho con padding seguro (no choca con bordes); en desktop aparece centrada con max-width (no >640px). La lista tiene scroll interno y la flecha↓ lleva al item visible inferior. Sin overflow horizontal del viewport.
    - Cobertura: Layout fluido, scroll interno, breakpoints.

15. **Cierre por click fuera del overlay (backdrop) y por click en el botón X** — [Interacción] [Teclado]
    - Setup: Paleta abierta. Listener para `command-palette:close`.
    - Acción: Click en zona del backdrop (fuera del card central). Click en botón de cierre (icon-only). Repetir tras buscar resultados (con backdrop + Escape para comparar).
    - Assertion: Ambos disparan cierre; el botón X tiene `aria-label="Close command palette"`; el backdrop lleva `aria-hidden` adecuado (no atrapa foco fuera); al reabrir, no queda estado residual (input limpio, sin selección colgada).
    - Cobertura: Múltiples vías de cierre, accesibilidad del icono, reset de estado.

16. **Historial de queries (↑ cuando input vacío muestra queries previas) tipo terminal** — [Interacción] [Teclado]
    - Setup: Paleta abierta. Ejecutar búsquedas `git`, `git status`, `git commit`. Cerrar y reabrir.
    - Acción: Con input vacío, pulsar `ArrowUp`. Repetir. Pulsar `ArrowDown` para volver al presente.
    - Assertion: Cada `ArrowUp` rellena el input con la query anterior (LIFO) y resalta el resultado correspondiente; `ArrowDown` desde la query más antigua devuelve el input a vacío sin lanzar resultados stale.
    - Cobertura: Atajo de productividad, navegación de historial, no persistencia accidental en `localStorage`.

17. **Carga inicial con foco automático y soporte para `prefill` programático** — [Interacción] [Teclado]
    - Setup: Disparar `command-palette:open` con `{ prefill: "sett" }` desde `window`. Repetir sin prefill.
    - Acción: Verificar que al abrir sin prefill el cursor queda en el input listo para teclear; al abrir con prefill, el texto aparece y la selección de resultados se posiciona en el primer match.
    - Assertion: Foco automático sin necesidad de click extra; con prefill, la lista ya viene filtrada y `ArrowDown` + `Enter` ejecuta la primera opción visible. Sin parpadeo perceptible (FOUC) en el filtro.
    - Cobertura: DX de integradores, automatización, deep-linking.

18. **Tematización con tokens `--is-*` en light/dark/high-contrast** — [Estados visuales]
   - Setup: Aplicar `data-theme="dark"` y `data-theme="high-contrast"` al `<html>` o host. Capturar computed styles.
   - Acción: Abrir paleta en cada tema. Verificar contraste de texto seleccionado, fondo del backdrop, focus ring.
   - Assertion: Contraste WCAG AA (≥4.5:1) para texto y ≥3:1 para el focus ring en los tres temas; el backdrop tiene opacidad consistente (no fully transparent en high-contrast); tokens custom del consumer no rompen el Shadow DOM.
   - Cobertura: Theming, aislamiento Shadow DOM, accesibilidad cromática.

19. **No regresión: pulsar atajo global dentro de un `<iframe>` o con foco en Web Component anidado** — [Teclado]
   - Setup: Página con un `<iframe>` interno que contiene un `<input>` con foco.
   - Acción: Llevar foco al iframe, pulsar `Ctrl+K`. Repetir con foco en otro Web Component (custom element) que capture `keydown`.
   - Assertion: El listener global sigue recibiendo el evento (composedPath, `event.composed` true) y abre la paleta; al cerrarla, el foco regresa al elemento previo tanto si era del documento como del iframe (con `blur`/`focus` chain).
   - Cobertura: Eventos composed, bubbling cross-shadow, restauración cross-root.

20. **Performance: apertura sub-100ms con lista de 500 items virtualizada** — [Estados visuales]
   - Setup: Mockear dataset con 500 comandos. Medir `performance.now()` antes y después del toggle de apertura.
   - Acción: Abrir y cerrar 5 veces; teclear 10 queries seguidos.
   - Assertion: Apertura sin freeze visible (<100ms en CI median); el filtrado no bloquea el hilo principal >16ms por keystroke (verificable con `PerformanceObserver({ entryTypes: ['longtask'] })`); sólo se renderizan los items en viewport + buffer (windowing/virtualization).
   - Cobertura: Escalabilidad, jank, virtualización.