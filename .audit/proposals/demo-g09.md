# F0.3 propuesta UX/UI exhaustiva — helpers (6 demos: format-date, mutation-observer, observer, relative-time, resize-observer, ui)

## Perfil del proyecto
**is-webcomponents** — librería de Web Components vanilla TypeScript con Shadow DOM, tokens `--is-*`, y un kit de 67 demos servidos desde GitHub Pages. Stack: Playwright 1.62.1 + Chromium headless para tests browser.

## Notas de enfoque (helpers)
- Énfasis en **lifecycle** (connectedCallback / disconnectedCallback / attributeChangedCallback).
- Énfasis en **cleanup** (disconnect, unobserve, cancel scheduled frames).
- Énfasis en **debounce / throttle** (interval, microtask coalescing).
- **Edge cases de tiempo**: DST, zonas horarias, años bisiestos, medianoche, fin de mes.
- **Datos grandes**: miles de nodos / entries, performance de render.
- **Disconnect cleanup**: sin fugas, sin observers colgando tras navegar fuera del demo.

---

### demo: format-date

#### Tests existentes (resumen, brevísimo)
- Render básico de una fecha formateada con locale por defecto.
- Cambio de formato predefinido (short/medium/long/full).
- Cambio de locale entre dos valores.

#### Propuestas nuevas

1. **Re-render al mutar atributo `value` con una fecha distinta** — [interacción]
   - Setup: cargar la página con `value="2025-01-15"`.
   - Acción: cambiar el atributo a `value="2026-12-31T23:59:59Z"` y dispatchar `MutationObserver` simulando cambio externo.
   - Assertion: el nodo de texto actualizado refleja el nuevo año y mes sin necesidad de re-mount; no hay flash de estado vacío.
   - Cobertura: attributeChangedCallback con string ISO 8601 completo.

2. **Cambio de `format` mientras la fecha es la misma** — [interacción]
   - Setup: cargar con `format="medium"` y `value="2025-03-15"`.
   - Acción: alternar entre `short`, `medium`, `long`, `full`.
   - Assertion: el texto se reformatea manteniendo el mismo instante temporal; no se reintroducen zonas horarias distintas.
   - Cobertura: re-render idempotente, sin parpadeo visible.

3. **Tab navega por todos los controles de configuración visibles** — [teclado]
   - Setup: cargar el demo con sus controles (select de formato, locale, value).
   - Acción: pulsar Tab repetidamente.
   - Assertion: cada control recibe foco en orden DOM lógico, no se salta el `<select>` ni los inputs nativos; el outline `--is-focus-ring` aparece y desaparece limpio.
   - Cobertura: orden de focus en controles nativos que envuelve un Shadow Root.

4. **Atajo Alt+F para abrir el `<select>` de formato** — [teclado]
   - Setup: focus en el body del demo.
   - Acción: pulsar `Alt+F` si el demo documenta atajo.
   - Assertion: el `<select>` recibe foco y ArrowDown abre el menú nativo.
   - Cobertura: atajos documentados vs no documentados.

5. **Lectura por screen reader del atributo `aria-label` cuando el formato es custom** — [aria]
   - Setup: cargar con `format="EEEE, d MMMM y"` (custom pattern).
   - Acción: inspeccionar `aria-label` o el contenido del `slot`.
   - Assertion: el texto visible y el `aria-label` son coherentes y describen la fecha de forma natural.
   - Cobertura: patrones custom no documentados en `aria-label`.

6. **`aria-live="polite"` cuando la fecha cambia por interacción** — [aria]
   - Setup: cargar con `value="2025-01-15"` y un botón "avanzar 1 día" del demo.
   - Acción: pulsar el botón varias veces.
   - Assertion: el contenedor del resultado anuncia cada cambio sin interrumpir (`aria-live="polite"`, no `assertive`).
   - Cobertura: regiones dinámicas en updates silenciosos.

7. **Formato de fecha inválido degrada a texto crudo sin crashear** — [estado/edge]
   - Setup: cargar con `value="no es una fecha"`.
   - Acción: esperar render.
   - Assertion: el componente no lanza excepción JS; muestra el string original o un placeholder legible; no aparece layout roto en Shadow DOM.
   - Cobertura: branch de validación `Date.parse` → NaN.

8. **Salto de zona horaria al cruzar DST** — [estado/edge]
   - Setup: fijar locale `en-US`, timezone `America/Madrid`, fecha `2025-03-30T01:30:00` (justo en el cambio DST).
   - Acción: formatear la fecha.
   - Assertion: el resultado respeta la hora local tras el salto (01:30 → 02:30 o 02:30 → 01:30 según reglas EU); no se desfasa 1h.
   - Cobertura: DST spring-forward.

9. **Año bisiesto en formato `d MMMM`** — [estado/edge]
   - Setup: `value="2024-02-29"`.
   - Acción: formatear.
   - Assertion: aparece `29 febrero 2024`, no `29 marzo` ni `1 marzo`.
   - Cobertura: edge case de calendario.

10. **Texto muy largo (formato `full`) con locale `de-DE` no desborda su contenedor** — [estado/edge]
    - Setup: viewport 320×800; `value="2025-12-31"` con `format="full"` y locale `de-DE` (`Mittwoch, 31. Dezember 2025`).
    - Acción: medir scrollWidth vs clientWidth del host.
    - Assertion: no hay overflow horizontal; el texto hace wrap si el demo lo permite o `text-overflow: ellipsis` con `title` legible.
    - Cobertura: i18n largo en mobile.

11. **Toggle dark/light actualiza el color heredando `color-scheme`** — [estado/edge]
    - Setup: cambiar `prefers-color-scheme` a dark vía emulación.
    - Acción: cambiar formato y locale.
    - Assertion: el texto del componente hereda `currentColor` o el token `--is-text`; el contraste cumple WCAG AA en ambos modos.
    - Cobertura: tokens `--is-*` consumidos correctamente.

12. **Cambio de atributo rápido (throttle/coalescing) no produce layout thrashing** — [performance]
    - Setup: cargar con `value="2025-01-15"`.
    - Acción: en un loop, mutar `value` 200 veces en 1s (a fechas aleatorias).
    - Assertion: el navegador no realiza más de ~60 reflows; el último valor pintado coincide con el último valor asignado (coalescing).
    - Cobertura: batched re-render.

13. **Cleanup al desconectar el host del DOM** — [lifecycle]
    - Setup: instanciar el componente y verificar render.
    - Acción: `host.remove()`.
    - Assertion: no quedan listeners residuales; el `IntersectionObserver`/`ResizeObserver` interno si existe queda `disconnect()`; el GC puede reclamar el nodo.
    - Cobertura: disconnectedCallback limpio.

14. **Foco programático y teclado sin trampas en Shadow DOM** — [teclado/a11y]
    - Setup: tabular hasta entrar al Shadow Root del demo.
    - Acción: pulsar Tab / Shift+Tab.
    - Assertion: la secuencia de foco dentro del shadow sigue el orden visual y no queda atrapada.
    - Cobertura: delegación de foco a través de Shadow Root.

15. **Locale no soportado cae al locale por defecto con `Intl`** — [estado/edge]
    - Setup: `locale="xx-YY"` (inválido).
    - Acción: renderizar.
    - Assertion: el componente no rompe; muestra el fallback `en-US` o el locale pasado por atributo `lang` del host.
    - Cobertura: branch de fallback de `Intl.DateTimeFormat`.

---

### demo: mutation-observer

#### Tests existentes (resumen, brevísimo)
- Observa cambios en un `<div>` target.
- Muestra un log de mutaciones detectadas (added/removed/attributes).
- Botón para añadir nodos hijos.

#### Propuestas nuevas

1. **Añadir 1 nodo hijo registra exactamente 1 mutación de tipo `childList`** — [interacción]
   - Setup: target vacío con log limpio.
   - Acción: clic en "Añadir nodo" una vez.
   - Assertion: el log incrementa en 1 entrada con `addedNodes.length === 1` y `removedNodes.length === 0`.
   - Cobertura: branch happy path `childList`.

2. **Eliminar el último nodo hijo registra mutación `childList` con `removedNodes` no vacío** — [interacción]
   - Setup: target con 1 nodo.
   - Acción: clic en "Eliminar nodo".
   - Assertion: el log muestra la mutación con `removedNodes[0]` referenciando el nodo borrado.
   - Cobertura: `removedNodes` populado.

3. **Modificar `textContent` de un hijo dispara mutación `characterData`** — [interacción]
   - Setup: target con un nodo que tiene texto.
   - Acción: clic en "Cambiar texto" del demo (si existe) o asignar `node.textContent = "..."`.
   - Assertion: log incluye `type: "characterData"` con `oldValue` (si se configuró) o al menos `target` apuntando al nodo texto.
   - Cobertura: `subtree: false` + `characterData: true`.

4. **Cambiar atributo `class` dispara `attributes`** — [interacción]
   - Setup: target con un nodo con clase.
   - Acción: `node.setAttribute('class', 'nuevo')`.
   - Assertion: log incluye `type: "attributes"`, `attributeName: "class"`.
   - Cobertura: filtro por nombre de atributo (`attributeFilter`).

5. **`attributeFilter` ignora atributos no listados** — [estado/edge]
   - Setup: observer configurado con `attributeFilter: ['data-x']`.
   - Acción: cambiar `class`, `id` y `data-x`.
   - Assertion: solo el cambio en `data-x` aparece en el log.
   - Cobertura: filtro estricto.

6. **`subtree: true` recoge mutaciones en nietos** — [estado/edge]
   - Setup: observer con `subtree: true`.
   - Acción: añadir un nieto dentro del target.
   - Assertion: la mutación aparece aunque el nodo modificado no sea hijo directo.
   - Cobertura: observación profunda.

7. **Disparar 1000 mutaciones rápidas coalescing en micro-batches** — [performance]
   - Setup: log con buffer virtual.
   - Acción: en un bucle sincrónico añadir 1000 nodos uno a uno.
   - Assertion: el navegador entrega las mutaciones en ≤ ~16 lotes (uno por frame), no en 1000 callbacks separados; no se pierde ninguna.
   - Cobertura: throttle/coalescing interno del UA.

8. **`disconnect()` detiene inmediatamente el log** — [lifecycle]
   - Setup: observer activo.
   - Acción: clic en "Detener" (`observer.disconnect()`); luego añadir 5 nodos.
   - Assertion: el log queda congelado en su estado previo; no aparecen nuevas entradas.
   - Cobertura: cleanup correcto.

9. **`reconectar tras disconnect reanuda el log desde cero** — [lifecycle]
   - Setup: observer desconectado tras 3 mutaciones.
   - Acción: clic en "Reanudar" (`observer.observe(target, opts)`).
   - Assertion: nuevas mutaciones se registran; el log no muestra las antiguas repetidas.
   - Cobertura: ciclo disconnect/reobserve.

10. **Remover el `<div>` target del DOM no rompe el observer** — [lifecycle]
    - Setup: observer observando target.
    - Acción: `target.remove()` y volver a añadirlo.
    - Assertion: el observer sigue activo sobre el nuevo target; las mutaciones se registran de nuevo.
    - Cobertura: reattach de target.

11. **Mutaciones en Shadow DOM interno del target** — [estado/edge]
    - Setup: target contiene un custom element con Shadow Root.
    - Acción: modificar `textContent` dentro del Shadow Root del custom element hijo.
    - Assertion: el observer del target, con `subtree: false`, NO ve el cambio; con `subtree: true` SÍ lo ve (porque subtree cruza Shadow boundary? verificar comportamiento real; documentar esperado).
    - Cobertura: borde de Shadow DOM.

12. **Botón "Limpiar log" vacía el buffer visual sin desconectar el observer** — [interacción]
    - Setup: log con N entradas.
    - Acción: clic en "Limpiar log".
    - Assertion: el `<pre>` o `<ul>` de log queda vacío; nuevas mutaciones siguen apareciendo.
    - Cobertura: separación estado UI vs estado observer.

13. **Foco accesible en botones "Añadir" / "Eliminar" / "Pausar"** — [teclado/a11y]
    - Setup: cargar el demo.
    - Acción: tabular.
    - Assertion: cada botón recibe foco y Enter/Space lo activa; hay `aria-label` legible si el botón es de icono.
    - Cobertura: focus traversal y activation.

14. **`aria-live="polite"` en el contenedor del log** — [aria]
    - Setup: log visible.
    - Acción: añadir nodo.
    - Assertion: el screen reader anuncia "1 mutación detectada" o equivalente sin interrumpir.
    - Cobertura: región dinámica bien configurada.

15. **100 mutaciones con `attributes` y `childList` mixtas mantienen orden cronológico** — [estado/edge]
    - Setup: observer con todas las opciones.
    - Acción: script que alterna entre `setAttribute` e `appendChild` 100 veces.
    - Assertion: el log respeta el orden de emisión del UA; no hay entradas duplicadas ni perdidas.
    - Cobertura: orden de mutaciones.

---

### demo: observer

#### Tests existentes (resumen, brevísimo)
- Patrón genérico (probablemente `IntersectionObserver`).
- Demo visual de un card entrando/saliendo del viewport al hacer scroll.

#### Propuestas nuevas

1. **Hacer scroll del card fuera del viewport dispara callback con `isIntersecting=false`** — [interacción]
   - Setup: viewport 800×600; card a 200px del top.
   - Acción: `window.scrollTo(0, 800)`.
   - Assertion: log marca "salió del viewport"; `intersectionRatio === 0`.
   - Cobertura: branch out-of-view.

2. **Card vuelve a entrar al hacer scroll up** — [interacción]
   - Setup: card fuera de viewport tras paso anterior.
   - Acción: `window.scrollTo(0, 0)`.
   - Assertion: log marca "entró al viewport"; `isIntersecting=true`; `intersectionRatio > 0`.
   - Cobertura: branch in-view.

3. **`threshold: [0, 0.5, 1]` genera 3 entradas por transición completa** — [estado/edge]
   - Setup: observer con thresholds múltiples.
   - Acción: scroll lento cruzando el 50% y luego el 100%.
   - Assertion: el log contiene 3 entradas con ratios crecientes.
   - Cobertura: thresholds múltiples.

4. **`rootMargin: '-50px'` reduce el rectángulo efectivo** — [estado/edge]
   - Setup: observer con rootMargin negativo.
   - Acción: scroll que con margen 0 dispararía `isIntersecting=true`, pero con `-50px` no.
   - Assertion: la entrada no se reporta; demuestra el efecto shrink.
    - Cobertura: rootMargin shrink.

5. **`unobserve(target)` detiene la observación de un card específico** — [lifecycle]
   - Setup: 3 cards observados.
   - Acción: clic en "Dejar de observar card 2".
   - Assertion: el card 2 no aparece más en el log; los otros sí.
   - Cobertura: unobselectivo.

6. **`disconnect()` detiene TODOS los targets** — [lifecycle]
   - Setup: 3 cards observados.
   - Acción: clic en "Detener todo".
   - Assertion: ningún card entra/sale del log tras desconectar; no quedan listeners.
    - Cobertura: cleanup global.

7. **Redimensionar la ventana dispara nuevas intersecciones** — [interacción]
   - Setup: card en el borde del viewport.
   - Acción: `window.resizeTo(600, 400)`.
   - Assertion: si el card pasa a estar fuera, se registra; si pasa a estar dentro, también.
    - Cobertura: re-evaluación por resize.

8. **Carga lazy de imagen al entrar en viewport** — [estado/edge]
   - Setup: imagen con `data-src` y `loading="lazy"`.
   - Acción: scroll hasta que entre en viewport.
   - Assertion: el `src` se hidrata con `data-src`; la imagen carga; hay fallback `noscript`.
    - Cobertura: caso de uso real de IO.

9. **Cambiar `threshold` en caliente actualiza el comportamiento sin re-mount** — [interacción]
   - Setup: observer con `threshold: 0`.
   - Acción: cambiar a `threshold: 1` vía UI del demo.
   - Assertion: solo se reportan entradas con `intersectionRatio === 1`.
    - Cobertura: reconfiguración dinámica.

10. **Performance: 100 cards observados simultáneamente** — [performance]
    - Setup: renderizar 100 cards en una grilla.
    - Acción: scroll largo.
    - Assertion: el navegador entrega las intersecciones en ≤ 30 callbacks por frame; FPS permanece ≥ 50.
    - Cobertura: scalability.

11. **Cleanup completo al remover el host del demo del DOM** — [lifecycle]
    - Setup: observer activo.
    - Acción: navegar fuera del demo (routing) o `host.remove()`.
    - Assertion: no quedan callbacks colgados; el GC puede reclamar; no hay warnings de "Observer callback fired after disconnect".
    - Cobertura: leak prevention.

12. **Accesibilidad: el card observado expone `role` y texto alternativo si es imagen** — [aria]
    - Setup: card con `<img>` dentro.
    - Acción: inspeccionar el árbol accesible.
    - Assertion: la imagen tiene `alt`; el card no introduce landmarks duplicados.
    - Cobertura: a11y del target.

13. **Throttle del UA: 10 scrolls rápidos en 100ms no generan 10 callbacks** — [performance]
    - Setup: log de intersecciones.
    - Acción: dispatchar 10 eventos `scroll` consecutivos.
    - Assertion: el navegador entrega 1-2 callbacks por frame, no 10.
    - Cobertura: throttle nativo.

14. **`root: null` usa el viewport como root** — [estado/edge]
    - Setup: observer con `root: null`.
    - Acción: cualquier scroll.
    - Assertion: los ratios se calculan respecto al viewport, no a un contenedor scrollable.
    - Cobertura: default root.

15. **`root` como contenedor scrollable interno** — [estado/edge]
    - Setup: observer con `root: unDiv.scrollContainer`.
    - Acción: scroll dentro del contenedor.
    - Assertion: las intersecciones se evalúan contra el contenedor, no contra el viewport.
    - Cobertura: root custom.

---

### demo: relative-time

#### Tests existentes (resumen, brevísimo)
- Render de "hace 5 minutos" / "dentro de 2 horas" con un input de fecha.
- Cambio de locale.

#### Propuestas nuevas

1. **Configurar fecha futura y leer "dentro de X" en español** — [interacción]
   - Setup: `value="2030-01-01T00:00:00Z"`, locale `es-ES`.
   - Acción: renderizar.
   - Assertion: el texto contiene "dentro de" y un número de años (no "hace").
    - Cobertura: branch futuro.

2. **Fecha pasada hace 30 segundos se actualiza automáticamente cada segundo** — [interacción]
   - Setup: `value=Date.now() - 30_000`.
   - Acción: esperar 3s sin interacción.
   - Assertion: el texto cambia de "hace 30 segundos" a "hace 33 segundos" o similar; el `setInterval` interno sigue corriendo.
    - Cobertura: auto-refresh.

3. **Auto-refresh se detiene al `disconnectedCallback`** — [lifecycle]
   - Setup: demo con timer interno.
   - Acción: remover el host del DOM; esperar 5s.
   - Assertion: si se re-monta, el contador NO muestra +5s extra (es decir, el timer se canceló y se reinició limpio).
    - Cobertura: cleanup de `setInterval`.

4. **Cambiar locale de `en-US` a `es-ES` reformatea sin cambiar el instante** — [interacción]
   - Setup: `value=Date.now() - 3_600_000` (1h atrás).
   - Acción: alternar locale.
   - Assertion: pasa de "1 hour ago" a "hace 1 hora" sin alterar el número.
    - Cobertura: i18n.

5. **`Intl.RelativeTimeFormat` con `numeric: "auto"` muestra "ayer" en lugar de "hace 1 día"** — [estado/edge]
   - Setup: `value=ayer 12:00`.
   - Acción: renderizar.
   - Assertion: aparece "ayer" / "yesterday" en lugar de "hace 1 día".
    - Cobertura: branch numeric=auto.

6. **Fecha justo en el futuro lejano (10 años) usa `numeric: "always"`** — [estado/edge]
   - Setup: `value=now + 10*365*24*3600*1000`.
   - Acción: renderizar.
   - Assertion: aparece "dentro de 10 años" / "in 10 years" (no "next decade").
    - Cobertura: pluralización larga.

7. **Atributo `refresh` controla la frecuencia de actualización** — [interacción]
   - Setup: atributo `refresh="5000"` (ms).
   - Acción: esperar 6s.
   - Assertion: el texto se actualiza al menos una vez; el número de callbacks de timer es ≤ 2 en 6s.
    - Cobertura: throttle configurable.

8. **Edge case: fecha exactamente `now`** — [estado/edge]
   - Setup: `value=Date.now()`.
   - Acción: renderizar.
   - Assertion: muestra "ahora mismo" / "just now" o "hace 0 segundos"; no rompe con cero segundos.
    - Cobertura: zero diff.

9. **Edge case: fecha hace 1 segundo vs hace 1 minuto vs hace 1 hora cambian el bucket** — [estado/edge]
   - Setup: tres instancias con cada valor.
   - Acción: renderizar lado a lado.
   - Assertion: cada uno usa su unidad correcta (segundos, minutos, horas).
    - Cobertura: branching por magnitud.

10. **Texto muy largo con locale `ar-SA` (RTL) fluye correctamente** — [estado/edge]
    - Setup: locale `ar-SA`, contenedor estrecho.
    - Acción: renderizar.
    - Assertion: el `dir="rtl"` se aplica al texto; no hay overflow horizontal; el número se muestra con dígitos arabizados si la demo lo soporta.
    - Cobertura: RTL + i18n.

11. **`aria-label` semánticamente rico vs texto visible corto** — [aria]
    - Setup: `value=hace 5 minutos`.
    - Acción: inspeccionar `aria-label`.
    - Assertion: el `aria-label` es "hace 5 minutos, 14:23" o timestamp completo para screen readers; el texto visible puede ser la versión corta.
    - Cobertura: a11y de tiempo relativo.

12. **Cambio rápido de `value` no acumula timers viejos** — [performance]
    - Setup: 50 mutaciones consecutivas del atributo `value` en 2s.
    - Acción: medir número de timers activos.
    - Assertion: solo 1 timer activo (el último); los anteriores se cancelaron con `clearInterval`.
    - Cobertura: leak prevention de timers.

13. **Modo "static" sin auto-refresh** — [interacción]
    - Setup: atributo `static` o `live="off"`.
    - Acción: esperar 5s.
    - Assertion: el texto NO se actualiza aunque haya pasado tiempo; útil para SSR o tests deterministas.
    - Cobertura: branch live=off.

14. **Foco y teclado: el host es focuseable si tiene `tabindex=0`** — [teclado/a11y]
    - Setup: demo con tabindex.
    - Acción: tabular.
    - Assertion: el host recibe foco; Enter no hace nada destructivo; hay `aria-live="off"` (no es interactivo) o `aria-live="polite"` si anuncia refresh.
    - Cobertura: focus semantics.

15. **Dark mode: contraste del texto relativo** — [estado/edge]
    - Setup: `prefers-color-scheme: dark`.
    - Acción: medir contraste del texto del componente.
    - Assertion: contraste WCAG AA ≥ 4.5:1 en ambos modos.
    - Cobertura: theming.

---

### demo: resize-observer

#### Tests existentes (resumen, brevísimo)
- Observa un box cuyo tamaño cambia al arrastrar.
- Muestra `contentRect.width` y `.height` en vivo.

#### Propuestas nuevas

1. **Arrastrar el handle de resize reporta nuevos `width`/`height`** — [interacción]
   - Setup: box 200×200 con handle visible.
   - Acción: simular arrastre desde el handle hasta 400×300.
   - Assertion: el log actualiza `width: 400, height: 300` (con tolerancia ±1px por subpixel rounding).
   - Cobertura: branch resize básico.

2. **`box: 'border-box'` vs `'content-box'` reporta dimensiones distintas** — [estado/edge]
   - Setup: box con padding 20px y borde 5px.
   - Acción: alternar `box` entre `'border-box'` y `'content-box'`.
   - Assertion: `contentRect.width` difiere exactamente por `2*padding + 2*border`; documentar esperado.
   - Cobertura: box option.

3. **Resize de 0×0 (elemento colapsado) no lanza error** — [estado/edge]
   - Setup: box colapsable.
   - Acción: colapsar a 0×0.
   - Assertion: callback se dispara con `{width: 0, height: 0}`; sin excepciones en consola.
    - Cobertura: zero size.

4. **Redimensionar la ventana afecta a un box con `width: 50%`** — [interacción]
   - Setup: box con width 50%.
   - Acción: `window.resizeTo(800, 600)` (de 1200 a 800).
   - Assertion: callback se dispara con nuevo width proporcional.
    - Cobertura: responsive resize.

5. **`unobserve(box)` detiene el log de ese box** — [lifecycle]
   - Setup: 2 boxes observados.
   - Acción: `unobserve(box1)`, luego redimensionar ambos.
   - Assertion: box1 no aparece más en el log; box2 sí.
    - Cobertura: unobserve selectivo.

6. **`disconnect()` detiene todos los boxes** — [lifecycle]
   - Setup: 3 boxes.
   - Acción: disconnect; luego redimensionar.
   - Assertion: log queda congelado.
    - Cobertura: cleanup global.

7. **100 resize events rápidos coalescen en ≤ N callbacks por frame** — [performance]
   - Setup: box único.
   - Acción: script que cambia `style.width` 100 veces en 1 frame.
   - Assertion: RO entrega 1 callback al final del frame (coalescing nativo).
    - Cobertura: throttle UA.

8. **Resize dentro de Shadow DOM es observado** — [estado/edge]
   - Setup: custom element con Shadow Root que contiene el box.
   - Acción: redimensionar el host.
   - Assertion: el observer del box interior recibe el callback.
    - Cobertura: RO en Shadow DOM.

9. **`entry.target` apunta al box correcto entre varios** — [estado/edge]
   - Setup: 3 boxes A, B, C.
   - Acción: redimensionar solo B.
   - Assertion: log marca `target === B`; A y C no aparecen.
    - Cobertura: target identity.

10. **`devicePixelContentBoxSize` vs `contentRect` en HiDPI** — [estado/edge]
    - Setup: emulación `devicePixelRatio: 2`.
    - Acción: redimensionar.
    - Assertion: si se observa `entry.devicePixelContentBoxSize`, width es 2× el CSS width; `contentRect` mantiene unidades CSS.
    - Cobertura: HiDPI.

11. **A11y: el handle de resize es focuseable y operable con teclado** — [teclado/a11y]
    - Setup: handle `role="separator"` `aria-orientation`.
    - Acción: tabular y usar Arrow keys.
    - Assertion: ArrowRight/Left aumenta/disminuye el ancho en pasos discretos; hay `aria-valuenow`/`aria-valuemin`/`aria-valuemax`.
    - Cobertura: keyboard operability.

12. **`aria-live="polite"` en el readout de dimensiones** — [aria]
    - Setup: readout mostrando `width x height`.
    - Acción: redimensionar.
    - Assertion: el screen reader anuncia cada cambio sin interrumpir; no hay spam (idealmente throttle).
    - Cobertura: región dinámica.

13. **Cleanup: desconectar el box del DOM antes de `unobserve` no rompe** — [lifecycle]
    - Setup: box observado.
    - Acción: `box.remove()` sin llamar unobserve.
    - Assertion: el RO no lanza excepciones; `disconnect()` global limpia todo correctamente.
    - Cobertura: edge cleanup.

14. **Redimensionar 100 boxes simultáneamente** — [performance]
    - Setup: 100 boxes en grid.
    - Acción: cambiar tamaño del contenedor padre.
    - Assertion: RO entrega callbacks agrupados; FPS ≥ 50; no se duplican entradas por box.
    - Cobertura: scalability.

15. **Mostrar dimensiones como `inline-size` / `block-size` lógicos en RTL** — [estado/edge]
    - Setup: `dir="rtl"`.
    - Acción: redimensionar.
    - Assertion: las dimensiones reportadas son las lógicas (inline, block) y no las físicas (width, height) — verificar soporte del navegador.
    - Cobertura: logical properties.

---

### demo: ui

#### Tests existentes (resumen, brevísimo)
- Mix de componentes UI (botones, toasts, modales, inputs).
- Demostración de tokens `--is-*` y temas.

#### Propuestas nuevas

1. **Clic en cada botón del demo ejecuta su acción documentada** — [interacción]
   - Setup: inventario de botones visibles.
   - Acción: clic uno a uno.
   - Assertion: cada botón cambia el DOM (abre modal, lanza toast, togglea clase) y emite el evento esperado (p. ej. `is-click`).
    - Cobertura: cada handler wired.

2. **Toast aparece con animación y desaparece tras `duration` ms** — [interacción]
   - Setup: botón "Mostrar toast".
   - Acción: clic; observar.
   - Assertion: toast entra con animación (fade/slide), permanece el tiempo configurado, sale con animación; `aria-live="polite"` o `assertive` según severidad.
    - Cobertura: lifecycle de toast.

3. **Toast de error usa `aria-live="assertive"` vs `polite` del info** — [aria]
   - Setup: dos botones "Toast info" / "Toast error".
   - Acción: clic en cada uno.
   - Assertion: la región del toast tiene `aria-live` distinto (info: polite, error: assertive); el screen reader interrumpe solo en error.
    - Cobertura: severidad accesible.

4. **Modal abre con focus-trap dentro del Shadow Root** — [interacción/teclado]
   - Setup: botón "Abrir modal".
   - Acción: clic; tabular repetidamente.
   - Assertion: el foco se queda dentro del modal (no escapa al documento detrás); Shift+Tab desde el primer control vuelve al último.
    - Cobertura: focus trap.

5. **Escape cierra el modal y restaura el foco al botón disparador** — [teclado]
   - Setup: modal abierto.
   - Acción: pulsar Escape.
   - Assertion: el modal se desmonta (o `hidden`); el foco vuelve al botón que lo abrió; la región detrás queda `inert` o `aria-hidden`.
    - Cobertura: dismiss + focus restore.

6. **Click en el backdrop cierra el modal pero click dentro NO** — [interacción]
   - Setup: modal abierto.
   - Acción: clic en el backdrop; luego clic dentro del contenido.
   - Assertion: backdrop cierra; clic interno no cierra (no hay burbujeo al backdrop).
    - Cobertura: event bubbling.

7. **Input numérico con `min`/`max` rechaza valores fuera de rango** — [estado/edge]
   - Setup: input con `min=1`, `max=10`.
   - Acción: asignar valor `99`; dispatchar `input`/`change`.
   - Assertion: el componente marca `aria-invalid="true"`, muestra mensaje de error; el valor no se commitea al modelo interno.
    - Cobertura: validación.

8. **Botón deshabilitado: `aria-disabled="true"`, sin pointer-events, sin foco** — [estado/edge]
   - Setup: botón con atributo `disabled`.
   - Acción: clic y tabular.
   - Assertion: clic no dispara handler; Tab lo salta; el botón tiene `aria-disabled="true"`; el estilo aplica opacidad reducida.
    - Cobertura: estado disabled.

9. **Botón con `loading` muestra spinner y bloquea interacción** — [estado/edge]
   - Setup: botón "Async" que tarda 2s.
   - Acción: clic; intentar clic de nuevo durante los 2s.
   - Assertion: aparece spinner; segundo clic no encola otra promesa; al terminar, spinner desaparece y se vuelve a habilitar.
    - Cobertura: loading state.

10. **Skeletons aparecen mientras carga contenido async** — [estado/edge]
    - Setup: sección "Lista" con fetch simulado de 1s.
    - Acción: forzar reload.
    - Assertion: aparecen placeholders animados (`<is-skeleton>` o similar) y se reemplazan al recibir datos.
    - Cobertura: loading UX.

11. **Lista con 10 000 items virtualizada (solo renderiza visibles)** — [performance]
    - Setup: lista masiva.
    - Acción: scrollear; inspeccionar DOM.
    - Assertion: el número de nodos en el DOM permanece < 50; el scroll es fluido (FPS ≥ 50).
    - Cobertura: virtualization.

12. **Grid con ArrowKeys navega entre celdas** — [teclado]
    - Setup: grid 4×4 con `role="grid"`.
    - Acción: tabular hasta entrar; ArrowRight/Down/Left/Up.
    - Assertion: el foco se mueve a la celda contigua; Home/End van al inicio/fin de fila; Ctrl+Home a la primera celda.
    - Cobertura: keyboard grid.

13. **Tooltip aparece al hacer hover y se mantiene al hacer focus** — [interacción]
    - Setup: botón con `title` o `<is-tooltip>`.
    - Acción: hover; tabular al botón.
    - Assertion: tooltip aparece en hover; también aparece en focus; desaparece tras 200ms de blur o mouseleave.
    - Cobertura: dual trigger.

14. **Dropdown menu con `aria-expanded` correcto** — [aria]
    - Setup: botón toggle de menú.
    - Acción: clic; clic fuera.
    - Assertion: `aria-expanded="true"` al abrir, `"false"` al cerrar; ArrowDown mueve foco al primer item; Escape cierra y restaura foco.
    - Cobertura: menu semantics.

15. **Cambio de tema dark/light aplica vía atributo `data-theme`** — [estado/edge]
    - Setup: toggle "Tema".
    - Acción: alternar.
    - Assertion: el atributo `data-theme="dark"` se aplica al `<html>` o al host; los tokens `--is-*` resuelven a la paleta dark; no hay parpadeo (FOUC) en el cambio.
    - Cobertura: theming sin flicker.

16. **Notificación toast acumulada: máx N visibles, el resto se apila o descarta** — [estado/edge]
    - Setup: botón que lanza 5 toasts en 2s.
    - Acción: clic rápido.
    - Assertion: el contenedor limita a máx 3 visibles (configurable); los extras se enqueuean o se descartan según política.
    - Cobertura: rate-limit de notificaciones.

17. **Drag & drop de un item de lista reordena el array interno** — [interacción]
    - Setup: lista de 5 items.
    - Acción: arrastrar item 1 al slot del item 4; soltar.
    - Assertion: el DOM se reordena visualmente; se emite `is-reorder` con índices old/new; foco se mantiene accesible.
    - Cobertura: drag & drop con a11y.

18. **Componente sin datos (lista vacía) muestra estado vacío** — [estado/edge]
    - Setup: lista con 0 items.
    - Acción: renderizar.
    - Assertion: aparece mensaje "No hay elementos" + CTA para añadir; el estado vacío tiene `role="status"`.
    - Cobertura: empty state.

19. **Cleanup: navegar fuera de la página descarta timers, observers, listeners** — [lifecycle]
    - Setup: demo activo con toasts, modales, observers.
    - Acción: SPA navigation away.
    - Assertion: `disconnectedCallback` se invoca; no quedan timers activos (`clearInterval`/`clearTimeout`); no hay memory leaks detectables con `performance.memory`.
    - Cobertura: leak prevention global.

20. **Mensaje de error inline con `aria-describedby` apunta al `<span>` de help** — [aria]
    - Setup: input con texto de ayuda.
    - Acción: enfocar input.
    - Assertion: el input tiene `aria-describedby="help-text-id"` y el screen reader lee la ayuda al tabular.
    - Cobertura: a11y de forms.

---

## Resumen cuantitativo
- **format-date**: 15 propuestas.
- **mutation-observer**: 15 propuestas.
- **observer**: 15 propuestas.
- **relative-time**: 15 propuestas.
- **resize-observer**: 15 propuestas.
- **ui**: 20 propuestas.
- **Total**: 95 propuestas (≥ 72 requerido). ✅
