# F0.3 propuesta UX/UI exhaustiva — isp

Librería **is-webcomponents** (Web Components vanilla TypeScript + Shadow DOM). Categoría `isp` agrupa primitives de layout, controles base y overlays. Foco del grupo: layout shifts, focus traps, scroll lock, dismiss mechanisms, deep nested interactions, keyboard nav en árbol, modal ARIA y dispatch de domain events.

Cada demo: ≥12 propuestas. Categorías marcadas entre corchetes: `[Interacción]`, `[Teclado]`, `[ARIA/a11y]`, `[Estado visual / Edge case]`, `[Layout shift]`, `[Focus trap]`, `[Scroll lock]`, `[Domain event]`, `[Dismiss]`, `[Deep nesting]`, `[Reducción motion / prefers-*]`.

---

### demo: block-layout
#### Tests existentes (resumen, brevísimo)
- Render básico del contenedor, padding/margin/gap aplicados según props, dirección vertical/horizontal.
#### Propuestas nuevas

1. **Cambio dinámico de dirección `vertical` ↔ `horizontal` provoca shift de altura visible** — [Layout shift]
   - Setup: cargar demo con `direction="vertical"`; capturar bounding box del contenedor padre (`getBoundingClientRect`).
   - Acción: emitir atributo `direction="horizontal"` (o prop); esperar 1 frame.
   - Assertion: altura del contenedor se reduce al ancho del contenido apilado; CLS-like delta registrado (heightDelta > 0 cuando vertical → horizontal con bloques largos).
   - Cobertura: branch de cambio de eje principal, recalc de `flex-direction`/equivalent.

2. **Inserción de un bloque hijo adicional no debe empujar fuera del viewport** — [Layout shift]
   - Setup: render con `gap=16`, viewport 1280×720.
   - Acción: añadir dinámicamente 20 bloques hijo vía API pública del demo.
   - Assertion: el contenedor activa scroll interno; ningún hijo queda con `top`/`left` > `viewport - 16px`; aparece scrollbar vertical u horizontal solo cuando necesario.

3. **Resize del viewport no debe producir overflow horizontal silencioso** — [Layout shift]
   - Setup: viewport 1280×720.
   - Acción: cambiar a 320×568 (mobile pequeño); observar contenedor raíz.
   - Assertion: `document.documentElement.scrollWidth <= viewport.width + 1px`; en caso contrario, marcar como bug con screenshot.

4. **Focus visible recorre los bloques en orden DOM** — [Teclado]
   - Setup: focus al primer focusable del documento.
   - Acción: pulsar Tab N veces hasta alcanzar el contenedor.
   - Assertion: cada Tab mueve el focus al siguiente control interno (o sale del bloque si no hay focusables internos) en orden DOM ascendente; outline 2px visible sobre `*:focus-visible`.

5. **Modo `inline` vs `stack` debe distinguirse por role ARIA** — [ARIA/a11y]
   - Setup: snapshot del árbol accesibilidad.
   - Acción: alternar entre `inline` y `stack`.
   - Assertion: container expone `role="group"` con `aria-orientation` correcto (`vertical`/`horizontal`); cambia al alternar.

6. **`prefers-reduced-motion: reduce` desactiva transiciones de reflow** — [Reducción motion / prefers-*]
   - Setup: emular `prefers-reduced-motion: reduce` en Playwright.
   - Acción: cambiar `gap` de 8 → 32 → 8.
   - Assertion: `getComputedStyle().transitionDuration === '0s'` o equivalente; sin animación perceptible en `requestAnimationFrame` samples.

7. **Estado disabled de hijos no debe propagarse al contenedor** — [Estado visual / Edge case]
   - Setup: marcar un hijo como disabled.
   - Acción: consultar `aria-disabled`/`inert` en contenedor raíz y en ancestros.
   - Assertion: contenedor permanece interactuable; solo el hijo afectado tiene pointer-events:none.

8. **Token `--is-block-padding` faltante cae a `var(--is-space-3, 16px)`** — [Estado visual / Edge case]
   - Setup: override CSS en `:root` borrando `--is-block-padding`.
   - Acción: render.
   - Assertion: padding computado es 16px (fallback), no `0` ni `undefined`.

9. **Block como wrapper de un `<dialog>` abierto preserva a11y tree** — [ARIA/a11y]
   - Setup: demo con `<is-block>` envolviendo `<dialog open>`.
   - Acción: snapshot.
   - Assertion: el `<dialog>` sigue siendo el landmark top-layer; block-layout no añade roles espurios.

10. **Cambio de `align` (start/center/end/stretch) recalcula altura de hijos** — [Layout shift]
    - Setup: 3 bloques hijos con alturas desiguales; `align="stretch"`.
    - Acción: cambiar a `align="start"`.
    - Assertion: alturas de hijos se conservan; contenedor se encoge a la altura del hijo más alto (no se estira al `align` previo).

11. **Hot reload del demo no duplica listeners de resize** — [Estado visual / Edge case]
    - Setup: contar listeners `resize` en `window` antes (`getEventListeners` via debug API).
    - Acción: recargar el bloque 5 veces en sesión.
    - Assertion: número de listeners crece linealmente con instancias activas, no exponencialmente; cleanup en `disconnectedCallback`.

12. **Anidación de 5 niveles de `is-block` mantiene orden de pintado** — [Deep nesting]
    - Setup: 5 niveles anidados con bordes distintos.
    - Acción: hover sobre el nivel más interno.
    - Assertion: `:hover` se propaga correctamente hasta el root; `elementsFromPoint(x,y)` devuelve orden ancestro→descendiente.

13. **Bloque con `min-height: 0` permite colapso correcto en grid** — [Layout shift]
    - Setup: `is-block` dentro de `display: grid; grid-template-rows: auto 1fr`.
    - Acción: añadir contenido largo al bloque.
    - Assertion: el bloque respeta `min-height: 0` interno; el área 1fr no se expande; scroll interno del bloque se activa.

14. **Dispatch de evento `is-block-layout-change` con detalle `oldSize/newSize`** — [Domain event]
    - Setup: suscribirse con `addEventListener('is-block-layout-change', ...)`.
    - Acción: forzar cambio de layout (resize/toggle).
    - Assertion: evento disparado una vez por cambio (no múltiples); `detail` contiene `{ width, height, prevWidth, prevHeight }`; `composed: true` para cruzar Shadow DOM.

---

### demo: btn-ref
#### Tests existentes (resumen, brevísimo)
- Render del botón con texto/icono; emite `click`.
#### Propuestas nuevas

1. **Doble click no dispara dos eventos `is-btn-activate` consecutivos** — [Interacción]
   - Setup: botón con `is-btn-activate` listener.
   - Acción: doble click rápido (`{ clickCount: 2 }`).
   - Assertion: un único evento por gesto simple; el segundo click solo si fue intencionado (300ms+ gap).

2. **Click derecho abre menú contextual sin disparar handler principal** — [Interacción]
   - Setup: listener principal `click`.
   - Acción: `page.click({ button: 'right' })`.
   - Assertion: handler principal NO invocado; `contextmenu` event emitido; menú nativo del browser aparece (o menú custom si está implementado).

3. **Long-press (700ms) abre menú de acciones secundarias** — [Interacción]
   - Setup: botón con prop `longPressEnabled`.
   - Acción: `mouse.down()` + esperar 700ms + `mouse.up()`.
   - Assertion: aparece popover con acciones; `pointercancel` se respeta si el dedo sale del botón.

4. **Focus visible con outline de 2px y offset 2px cumple WCAG 2.4.7** — [Teclado]
   - Setup: navegar al botón con Tab.
   - Acción: focus y leer `getComputedStyle(:focus-visible)`.
   - Assertion: `outline-width >= 2px`; `outline-offset >= 2px`; contraste ≥ 3:1 con fondo adyacente.

5. **Enter activa el botón (keypress sintético)** — [Teclado]
   - Setup: focus al botón.
   - Acción: `page.keyboard.press('Enter')`.
   - Assertion: handler click invocado una vez; `keydown` previene scroll de space en `Space` (no aplica aquí porque no es checkbox).

6. **`aria-disabled="true"` vs `disabled` attribute: comportamiento distinto** — [ARIA/a11y]
   - Setup: dos botones, uno `disabled`, otro `aria-disabled="true"`.
   - Acción: intentar click/Enter/focus sobre cada uno.
   - Assertion: `disabled` no recibe focus; `aria-disabled` sí recibe focus pero no activa; distinción visible en código.

7. **Estado loading: spinner reemplaza label, `aria-busy="true"`** — [Estado visual / Edge case]
   - Setup: disparar `loading` prop.
   - Acción: snapshot.
   - Assertion: spinner visible; label oculto (`visibility: hidden` mantiene ancho); `aria-busy="true"`; `aria-live="polite"` anuncia "Cargando".

8. **Texto del botón extremadamente largo (200+ chars) no rompe layout** — [Estado visual / Edge case]
   - Setup: `<is-btn-ref label="Lorem ipsum..." length=300>`.
   - Acción: medir.
   - Assertion: botón hace wrap a 2 líneas con `min-height` preservado; sin overflow horizontal del contenedor.

9. **`prefers-reduced-motion` desactiva ripple/animación de press** — [Reducción motion / prefers-*]
   - Setup: emular reduce.
   - Acción: click y observar `animation-name`.
   - Assertion: `animation: none` o `transition-duration: 0s`.

10. **Botón con icono-only debe tener `aria-label` accesible** — [ARIA/a11y]
    - Setup: `<is-btn-ref icon="trash">` sin label visible.
    - Acción: snapshot a11y.
    - Assertion: `accessibleName` no está vacío; warning si solo tiene `title` sin `aria-label`.

11. **Focus se restaura al elemento previo tras click que abre modal** — [Focus trap]
    - Setup: btn-ref abre un modal; guardar `document.activeElement` antes.
    - Acción: abrir modal y cerrarlo con Escape.
    - Assertion: `document.activeElement === btnRefOriginal`.

12. **`is-btn-activate` es `composed: true` y cruza Shadow DOM boundary** — [Domain event]
    - Setup: listener en `document` externo al componente.
    - Acción: click.
    - Assertion: evento capturado fuera del Shadow Root; `event.composed === true`; `event.detail` contiene `{ source: 'btn-ref', action, timestamp }`.

13. **Botón disabled hereda `cursor: not-allowed` y `opacity: 0.5`** — [Estado visual / Edge case]
    - Setup: `disabled` prop.
    - Acción: hover.
    - Assertion: `cursor: not-allowed` aplicado; `opacity` entre 0.4 y 0.6; sin cambio de color de fondo.

14. **Variantes `primary`/`secondary`/`ghost` exponen clase CSS hook estable** — [Estado visual / Edge case]
    - Setup: 3 botones con cada variante.
    - Acción: leer `classList`.
    - Assertion: cada uno tiene una clase específica (`is-btn--primary`, etc.); tests pueden targeting sin selectores por color.

---

### demo: catalogo-gen
#### Tests existentes (resumen, brevísimo)
- Render de catálogo desde JSON, búsqueda, paginación básica.
#### Propuestas nuevas

1. **Búsqueda con acentos y mayúsculas debe ser case/diacritic insensitive** — [Interacción]
   - Setup: catálogo con items "Árbol", "Avión", "niño".
   - Acción: escribir "arbol", "AVION", "nino" en input búsqueda.
   - Assertion: filtro devuelve los items esperados; `normalize('NFD').replace(/\p{Diacritic}/gu, '')` se aplica en el motor.

2. **Búsqueda con regex especial (`.*`, `(`, `)`) no rompe el motor** — [Estado visual / Edge case]
   - Setup: input búsqueda.
   - Acción: escribir `(test.*`.
   - Assertion: resultado = lista vacía sin throw; input no queda en estado bloqueado; sin `console.error`.

3. **Paginación con 0 resultados muestra empty state accesible** — [Estado visual / Edge case]
   - Setup: catálogo con 100 items.
   - Acción: buscar string inexistente.
   - Assertion: aparece "No se encontraron resultados" con `role="status"` `aria-live="polite"`; focus queda en input búsqueda.

4. **Cambio de página preserva foco en el control de paginación** — [Teclado]
   - Setup: focus en botón "Siguiente" de paginación.
   - Acción: `Enter` o click.
   - Assertion: nueva página renderiza; foco permanece en el control; `aria-current="page"` actualizado en el indicador de página activa.

5. **Ordenamiento por columna expone `aria-sort` correcto** — [ARIA/a11y]
   - Setup: tabla/lista con columnas sortables.
   - Acción: click en header "Nombre".
   - Assertion: `aria-sort="ascending"`; segundo click → `descending`; tercero → `none`.

6. **Items de catálogo extensos (1000+) virtualizan o paginan sin jank** — [Estado visual / Edge case]
   - Setup: catálogo con 5000 items.
   - Acción: scroll rápido al final.
   - Assertion: FPS ≥ 30 durante scroll; memoria DOM estable (≤ 200 nodos visibles a la vez si usa virtualización).

7. **`is-catalogo-filter` event lleva payload completo** — [Domain event]
   - Setup: listener en `document`.
   - Acción: aplicar filtro.
   - Assertion: evento emitido con `detail: { query, matchedCount, totalCount, appliedFilters }`; `composed: true`.

8. **Selección múltiple con Shift+Click selecciona rango continuo** — [Interacción]
   - Setup: lista con checkboxes.
   - Acción: click en item 1, Shift+Click en item 5.
   - Assertion: items 1-5 marcados; `aria-selected="true"` en cada uno; `is-catalogo-select` event con `{ range: [1,5] }`.

9. **Filtro por facetas (categoría, precio) combina con búsqueda textual** — [Interacción]
   - Setup: facetas visibles.
   - Acción: seleccionar categoría "Electrónica" + escribir "laptop".
   - Assertion: resultado = intersección; URL/hash refleja ambos filtros; `is-catalogo-filter` con ambos.

10. **Modo oscuro del catálogo hereda tokens `--is-*` correctamente** — [Estado visual / Edge case]
    - Setup: toggle dark mode.
    - Acción: comparar `getComputedStyle` de card.
    - Assertion: fondo y texto usan `var(--is-surface-1)`, `var(--is-text-1)`; contraste ≥ 4.5:1.

11. **Tecla Escape limpia búsqueda y restaura lista completa** — [Teclado]
    - Setup: filtro activo.
    - Acción: focus en input + Escape.
    - Assertion: input vacío; lista = todos los items; `is-catalogo-clear` event emitido.

12. **Drag & drop para reordenar items actualiza índice interno** — [Interacción]
    - Setup: lista draggable.
    - Acción: drag item 3 a posición 1.
    - Assertion: DOM reordenado; `is-catalogo-reorder` event con `{ from, to, itemId }`; foco sigue al item movido.

13. **Empty state de facetas (0 categorías) no rompe layout** — [Estado visual / Edge case]
    - Setup: catálogo sin facetas.
    - Acción: render.
    - Assertion: panel de facetas muestra mensaje o se oculta limpiamente; sin altura 0 sin explicación.

14. **Atajo Ctrl+F enfoca el input de búsqueda** — [Teclado]
    - Setup: foco en body.
    - Acción: `Ctrl+F`.
    - Assertion: input de búsqueda recibe focus; comportamiento nativo de browser prevenido o coexistente.

---

### demo: flex-layout
#### Tests existentes (resumen, brevísimo)
- Render con `flex-direction`, `justify`, `align-items`, `gap` aplicados.
#### Propuestas nuevas

1. **`flex-wrap: wrap` no produce gaps huérfanos en última fila** — [Layout shift]
   - Setup: 7 items en fila, contenedor ancho para 3 por fila.
   - Acción: render y medir.
   - Assertion: últimas 2 filas alineadas a la izquierda sin `margin-right` fantasma; `justify-content` se aplica correctamente.

2. **`align-items: stretch` en cross-axis requiere `align-self` override por hijo** — [Layout shift]
   - Setup: 3 hijos, uno con `align-self="center"`.
   - Acción: medir alturas.
   - Assertion: hijos stretch salvo el override; el override queda centrado verticalmente; sin stretching forzado.

3. **`order` CSS no interfiere con orden de foco del teclado** — [Teclado]
   - Setup: 4 hijos con `order: 3, 1, 4, 2` (reordenados visualmente).
   - Acción: tabular.
   - Assertion: Tab sigue orden DOM original; `aria-flowto` o equivalente NO sugerido para reordenar foco (sería bug a11y).

4. **Cambio de `flex-direction: column → row` causa layout shift medible** — [Layout shift]
   - Setup: 5 items en columna, viewport 1024×768.
   - Acción: cambiar a row.
   - Assertion: `getBoundingClientRect` del contenedor cambia; CLS registrado; contenido permanece visible (no clipped).

5. **Flex item con `flex-basis: 0` y `flex-grow: 1` distribuye equitativamente** — [Estado visual / Edge case]
   - Setup: 3 items en row, contenedor 900px.
   - Acción: medir anchos.
   - Assertion: cada item = 300px (con gap restado); mínimo de redondeo ±1px aceptable.

6. **`flex-shrink: 0` previene colapso de item crítico (logo)** — [Layout shift]
   - Setup: header con logo + nav + button; viewport 320px.
   - Acción: medir.
   - Assertion: logo mantiene `min-width` original; nav se trunca con ellipsis o scroll horizontal; botón siempre visible.

7. **`gap` no se aplica si solo hay 1 hijo** — [Estado visual / Edge case]
   - Setup: flex con 1 item, `gap=24`.
   - Acción: medir.
   - Assertion: sin espacio extra superior/inferior visible; `getComputedStyle` reporta gap pero no afecta layout monohijo.

8. **`prefers-reduced-motion` omite transición al reorder** — [Reducción motion / prefers-*]
   - Setup: emular reduce.
   - Acción: cambiar `justify-content`.
   - Assertion: cambio instantáneo, sin `transition` de flex-basis.

9. **Anidación 4 niveles de flex con diferentes `flex-direction`** — [Deep nesting]
   - Setup: row > column > row > column.
   - Acción: hover y focus traverse.
   - Assertion: cada nivel respeta su dirección; `elementsFromPoint` en hijo profundo devuelve toda la cadena; sin overflows ocultos.

10. **`is-flex-layout-resize` event al cambiar tamaño interno** — [Domain event]
    - Setup: listener en document.
    - Acción: insertar/eliminar hijo.
    - Assertion: evento emitido con `{ newSize, itemCount }`; throttled a 1 por frame (16ms).

11. **Flex dentro de container con `display: contents` rompe grid en algunos browsers** — [Estado visual / Edge case]
    - Setup: padre `display: contents`.
    - Acción: renderizar.
    - Assertion: si aplica polyfill o fallback; documentar si hay bug cross-browser (Firefox vs Chromium).

12. **`min-width: 0` necesario en items para permitir shrink con contenido largo** — [Layout shift]
    - Setup: item con texto "AAAA..." de 1000 chars.
    - Acción: viewport 320px.
    - Assertion: item colapsa al ancho disponible con ellipsis; sin `min-width: auto` por defecto que rompa shrink.

13. **`align-content: space-between` con 1 sola fila no produce espacios** — [Estado visual / Edge case]
    - Setup: 3 items, `flex-wrap: nowrap`.
    - Acción: medir.
    - Assertion: items alineados a la izquierda sin espacio extra; `align-content` no aplica con una sola línea.

14. **Flex layout como slotted child mantiene distribución correcta** — [Deep nesting]
    - Setup: `<is-flex-layout>` dentro de slot de otro componente.
    - Acción: medir distribución.
    - Assertion: ancho y dirección respetan contenedor slotted, no viewport.

---

### demo: flex-options
#### Tests existentes (resumen, brevísimos)
- Render de panel de opciones con grupos, estado seleccionado.
#### Propuestas nuevas

1. **Navegación con flechas ↑/↓ entre opciones actualiza `aria-activedescendant`** — [Teclado]
   - Setup: focus al contenedor de opciones (role=listbox).
   - Acción: ArrowDown, ArrowUp.
   - Assertion: `aria-activedescendant` apunta al item correcto; scroll-into-view automático si opción fuera de viewport.

2. **Home/End saltan a primera/última opción** — [Teclado]
   - Setup: listbox con 10 items.
   - Acción: End, Home.
   - Assertion: focus se mueve respectivamente; `aria-selected` actualizado.

3. **Type-ahead filtra por primera letra** — [Teclado]
   - Setup: opciones "Apple", "Banana", "Cherry".
   - Acción: presionar "B".
   - Assertion: Banana resaltada; timeout 500ms resetea buffer; "BC" busca "Blackberry" o "Banana Cherry" secuencial.

4. **Selección múltiple con Space marca/desmarca sin cerrar** — [Teclado]
   - Setup: `multiple` prop.
   - Acción: ArrowDown + Space.
   - Assertion: item marcado con check; listbox NO cierra; `aria-multiselectable="true"` presente.

5. **Cierre con Escape restaura selección previa si `revertOnEscape`** — [Dismiss]
   - Setup: cambiar selección, no confirmar.
   - Acción: Escape.
   - Assertion: valor emitido al cerrar = valor original; focus vuelve al trigger.

6. **Click fuera del panel cierra y confirma selección** — [Dismiss]
   - Setup: panel abierto.
   - Acción: click en zona neutra.
   - Assertion: panel cierra; `is-flex-options-change` con valor actual; sin confirm modal.

7. **Desplazamiento con scroll interno preserva posición relativa** — [Scroll lock]
   - Setup: 50 opciones, viewport pequeño.
   - Acción: scroll al item 40, click.
   - Assertion: scroll position se mantiene o regresa al top con animación suave; no salta al inicio abruptamente.

8. **Opciones disabled no son focuseables ni seleccionables** — [ARIA/a11y]
   - Setup: 3 opciones, una `disabled`.
   - Acción: ArrowDown sobre ella.
   - Assertion: focus la salta; `aria-disabled="true"`; cursor `not-allowed` en hover.

9. **Group labels tienen `role="group"` con `aria-labelledby`** — [ARIA/a11y]
   - Setup: grupos "Frutas", "Verduras".
   - Acción: snapshot.
   - Assertion: cada `<ul role="group">` con `aria-labelledby="group-N-title"`; items dentro heredan navegación.

10. **`is-flex-options-change` event incluye `value`, `label`, `index`** — [Domain event]
    - Setup: listener.
    - Acción: seleccionar opción.
    - Assertion: `detail: { value, label, index, previousValue }` con `composed: true` y `bubbles: true`.

11. **Búsqueda dentro del panel (combobox) filtra en tiempo real** — [Interacción]
    - Setup: input search encima del listbox.
    - Acción: escribir "ap".
    - Assertion: solo "Apple" visible; `aria-expanded` del input refleja estado.

12. **Opciones con HTML interno (iconos, badges) preservan semántica** — [ARIA/a11y]
    - Setup: opción con `<span class="icon">★</span> Premium`.
    - Acción: snapshot a11y.
    - Assertion: `accessibleName` = "Premium"; icono con `aria-hidden="true"`.

13. **Cambio de opciones vía API programática emite evento** — [Domain event]
    - Setup: `el.value = 'new'` vía JS.
    - Acción: leer logs.
    - Assertion: `is-flex-options-change` emitido; diferencia vs `change` event nativo clarificada.

14. **Panel con 0 opciones muestra estado vacío accesible** — [Estado visual / Edge case]
    - Setup: pasar array vacío.
    - Acción: render.
    - Assertion: "Sin opciones disponibles" con `role="status"`; sin colapso visual que confunda.

---

### demo: float-card
#### Tests existentes (resumen, brevísimo)
- Render de tarjeta flotante, posición, sombra, dismiss.
#### Propuestas nuevas

1. **Click fuera del card cierra y emite `is-float-card-dismiss`** — [Dismiss]
   - Setup: card visible con `dismissOnOutsideClick`.
   - Acción: click en backdrop.
   - Assertion: card oculto; evento emitido con `{ reason: 'outside-click' }`; focus restaura al trigger.

2. **Escape cierra el card con `reason: 'escape'`** — [Dismiss]
   - Setup: card abierto, focus dentro.
   - Acción: Escape.
   - Assertion: card oculto; evento con `{ reason: 'escape' }`; `preventDefault` permite al consumer suprimir.

3. **Card arrastrable mantiene posición al recargar** — [Estado visual / Edge case]
   - Setup: drag a (200, 300).
   - Acción: cerrar sesión, volver a abrir.
   - Assertion: posición persistida en localStorage o memory; sin reset a default silencioso.

4. **Z-index del card por encima de otros overlays** — [Estado visual / Edge case]
   - Setup: modal-verificacion abierto + float-card.
   - Acción: comparar `z-index` computados.
   - Assertion: float-card > modal-verificacion o viceversa según spec documentada; nunca `z-index: auto` en coexistencia.

5. **Resize del card via handle东南sw respeta min/max** — [Interacción]
   - Setup: card con min 200×150, max 800×600.
   - Acción: drag handle a posición extrema.
   - Assertion: tamaño clampeado; `is-float-card-resize` con `{ width, height }` final.

6. **Focus trap interno funciona con Tab cycling** — [Focus trap]
   - Setup: card con 3 botones internos.
   - Acción: Tab desde el último.
   - Assertion: focus vuelve al primero; Shift+Tab desde primero va al último.

7. **Scroll lock del body cuando card fullscreen** — [Scroll lock]
   - Setup: card con prop `fullscreen`.
   - Acción: intentar scroll body.
   - Assertion: `document.body.style.overflow === 'hidden'`; padding-right compensa scrollbar.

8. **`role="dialog"` con `aria-modal="true"` apropiado** — [ARIA/a11y]
   - Setup: snapshot a11y.
   - Acción: verificar.
   - Assertion: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`指向 title del card.

9. **Card con contenido lazy-loaded muestra skeleton** — [Estado visual / Edge case]
   - Setup: card con `<is-skeleton>` interno mientras carga.
   - Acción: observar.
   - Assertion: skeleton visible 200-500ms; `aria-busy="true"` mientras carga.

10. **Hover en trigger abre card sin retardo perceptible** — [Interacción]
    - Setup: `trigger="hover"`, prop `hoverDelay=200`.
    - Acción: mouseenter.
    - Assertion: aparece a 200ms ± 20ms; mouseleave cierra con mismo delay.

11. **Card arrastrable fuera del viewport se clampa** — [Layout shift]
    - Setup: drag a esquina inferior derecha más allá del viewport.
    - Acción: medir posición final.
    - Assertion: `right >= 0 && bottom >= 0`; nunca coordenadas negativas.

12. **Cierre animado respeta `prefers-reduced-motion`** — [Reducción motion / prefers-*]
    - Setup: emular reduce.
    - Acción: cerrar card.
    - Assertion: cierre instantáneo; `transition-duration: 0s`.

13. **Card con HTML complejo (video, iframe) no rompe Shadow DOM boundary** — [Deep nesting]
    - Setup: card con `<iframe src="...">` en slot.
    - Acción: focus traverse.
    - Assertion: iframe focusable solo si tiene `tabindex` explícito; `composedPath()` correcto al click.

14. **Dispatch de `is-float-card-position-change` durante drag** — [Domain event]
    - Setup: listener.
    - Acción: drag completo.
    - Assertion: múltiples eventos durante drag (throttled); final con `{ x, y, source: 'user' | 'programmatic' }`.

---

### demo: form
#### Tests existentes (resumen, brevísimo)
- Render de form con inputs, validación básica, submit.
#### Propuestas nuevas

1. **Submit con Enter desde input dispara validación y `is-form-submit`** — [Teclado]
   - Setup: form con 3 inputs requeridos.
   - Acción: completar y Enter en el último input.
   - Assertion: `submit` event emitido; si falta un campo, NO se emite; primer campo inválido recibe focus.

2. **Validación `required` muestra mensaje con `aria-describedby`** — [ARIA/a11y]
   - Setup: input required vacío.
   - Acción: blur.
   - Assertion: mensaje "Este campo es obligatorio" visible; `aria-describedby="input-help"` apunta al mensaje; `aria-invalid="true"`.

3. **Errores de validación anunciados via `aria-live="assertive"`** — [ARIA/a11y]
   - Setup: form con región de errores global.
   - Acción: submit con errores.
   - Assertion: screen reader anuncia errores; `role="alert"` o `aria-live="assertive"` presente.

4. **Navegación por Tab respeta orden de campos** — [Teclado]
   - Setup: form de 5 campos + botón submit.
   - Acción: tabular.
   - Assertion: orden = DOM order; `tabindex` positivos (si los hay) solo si intencionales; sin saltos a skip links no anunciados.

5. **Autocompletado de navegador no choca con validación custom** — [Estado visual / Edge case]
   - Setup: input con `autocomplete="email"` y validación custom de dominio.
   - Acción: autocompletar con email no permitido.
   - Assertion: error se muestra tras blur; sin conflicto con icono nativo del browser.

6. **Submit deshabilita botón mientras `inFlight` previene doble submit** — [Interacción]
   - Setup: form con prop `inFlight` async.
   - Acción: doble click rápido.
   - Assertion: un solo submit; segundo click ignorado; `aria-busy="true"` en form durante request.

7. **Reset limpia todos los campos y emite `is-form-reset`** — [Interacción]
   - Setup: form con valores.
   - Acción: click en reset button.
   - Assertion: campos vuelven a default; evento emitido; foco se mantiene en reset button.

8. **Campo `readonly` permite focus y selección pero no edición** — [Estado visual / Edge case]
   - Setup: input readonly.
   - Acción: intentar escribir.
   - Assertion: valor no cambia; cursor visible; `aria-readonly="true"` (implícito).

9. **Form con campos condicionales (`v-if` simulado) reasigna `for`/`id`** — [Deep nesting]
   - Setup: campo aparece tras seleccionar opción.
   - Acción: verificar asociación label-input.
   - Assertion: `htmlFor` del label apunta al `id` actual del input; tras cambio, asociación sigue válida.

10. **Error 500 del servidor renderiza mensaje genérico sin filtrar stack** — [Estado visual / Edge case]
    - Setup: mock endpoint con 500.
    - Acción: submit.
    - Assertion: mensaje "Ha ocurrido un error. Intenta nuevamente." sin stack trace; log interno sí captura detalle.

11. **`is-form-field-change` event por cada input** — [Domain event]
    - Setup: listener.
    - Acción: escribir en input.
    - Assertion: evento emitido con `{ name, value, valid }`; `composed: true`; debounced opcional a 100ms.

12. **Form en `disabled` previene submit y muestra campos con opacidad reducida** — [Estado visual / Edge case]
    - Setup: form disabled.
    - Acción: intentar submit.
    - Assertion: submit bloqueado; `pointer-events: none` o `aria-disabled`; sin colores invertidos confusos.

13. **Tokens `--is-form-error-color` faltantes caen a `--is-danger-500`** — [Estado visual / Edge case]
    - Setup: override CSS borrando tokens.
    - Acción: error.
    - Assertion: color rojo de error aplicado con fallback; `console.warn` opcional sobre token faltante.

14. **Submit programático via `el.requestSubmit()` valida antes de emitir** — [Interacción]
    - Setup: form con campo required vacío.
    - Acción: `form.requestSubmit()` desde JS.
    - Assertion: submit bloqueado por validación; mismo flujo que Enter; `is-form-submit` NO emitido.

---

### demo: heading
#### Tests existentes (resumen, brevísimo)
- Render de h1-h6 con tamaños y pesos tipográficos.
#### Propuestas nuevas

1. **Cambio de nivel `h1` → `h6` mantiene jerarquía semántica** — [ARIA/a11y]
   - Setup: heading level=1.
   - Acción: cambiar a level=6.
   - Assertion: `<h6>` real en DOM; no `<div role="heading" aria-level="6">` salvo override explícito.

2. **Skip-link "Saltar al contenido" apunta al primer `<h1>` visible** — [ARIA/a11y]
   - Setup: página con heading `id="main-title"`.
   - Acción: click skip-link.
    - Assertion: focus salta al heading o al main; `tabindex="-1"` aplicado temporalmente al target.

3. **Heading con `subheading` prop renderiza `<hgroup>` o `<p>` con clase** — [Estado visual / Edge case]
   - Setup: `<is-heading level="2" subheading="Texto adicional">`.
   - Acción: snapshot.
   - Assertion: estructura semántica correcta (hgroup o heading + p); estilos diferenciados.

4. **Outline de focus respeta contraste WCAG en heading focuseable** — [Teclado]
   - Setup: `<is-heading tabindex="0">`.
   - Acción: focus.
   - Assertion: outline 2px visible; contraste ≥ 3:1; no rompe diseño tipográfico.

5. **Texto de heading extremadamente largo hace wrap sin overflow** — [Layout shift]
   - Setup: heading con texto 500 chars en contenedor 300px.
   - Acción: medir.
   - Assertion: wrap a múltiples líneas; sin overflow horizontal; `line-height` constante.

6. **Cambio de tema dark/light ajusta color de heading via tokens** — [Estado visual / Edge case]
   - Setup: toggle dark.
   - Acción: leer `getComputedStyle`.
   - Assertion: color = `var(--is-text-heading)` con fallback; contraste ≥ 4.5:1 en ambos temas.

7. **Heading con anchor link genera `#id` navegable** — [Interacción]
   - Setup: `<is-heading id="section-1">`.
   - Acción: navegar a `#section-1`.
   - Assertion: scroll suave al heading; `id` único en documento; sin colisión si se duplica.

8. **`is-heading-mount` event para tracking analytics** — [Domain event]
    - Setup: listener en document.
    - Acción: render.
    - Assertion: evento emitido con `{ level, text }`; throttled si headings se generan en loop.

9. **Heading dentro de `<dialog>` con `aria-labelledby` referencia correctamente** — [ARIA/a11y]
    - Setup: dialog con heading `id="dialog-title"`.
    - Acción: snapshot.
    - Assertion: dialog `aria-labelledby="dialog-title"`; sin huérfanos.

10. **Nivel de heading debe ser secuencial en el documento (no saltar de h1 a h4)** — [ARIA/a11y]
    - Setup: outline del documento.
    - Acción: renderizar página con heading.
    - Assertion: warning si no sigue orden lógico (documentado como guía, no bloqueante).

11. **`prefers-reduced-motion` desactiva underline animado al hover** — [Reducción motion / prefers-*]
    - Setup: emular reduce.
    - Acción: hover.
    - Assertion: `animation: none`; cambio de color instantáneo.

12. **Heading con `truncate` añade ellipsis con `title` attribute** — [Estado visual / Edge case]
    - Setup: heading truncado.
    - Acción: hover.
    - Assertion: tooltip nativo con texto completo; `text-overflow: ellipsis` aplicado; `title` no vacío.

13. **Render de 100 headings en una página no degrada performance** — [Estado visual / Edge case]
    - Setup: página con 100 headings.
    - Acción: medir TTI.
    - Assertion: render < 100ms; memoria estable; sin reflows en cascada.

14. **Heading recibe `is-heading-click` event solo si `clickable` prop** — [Interacción]
    - Setup: heading sin prop.
    - Acción: click.
    - Assertion: sin cursor pointer; sin evento; con `clickable`, cursor pointer + evento emitido.

---

### demo: loading-overlay
#### Tests existentes (resumen, brevísimo)
- Mostrar overlay con spinner, ocultar tras completar.
#### Propuestas nuevas

1. **Overlay abre con `aria-busy="true"` y `role="alert"` para anuncio inmediato** — [ARIA/a11y]
   - Setup: `is-loading-overlay` con `assertive`.
   - Acción: mostrar.
   - Assertion: `role="alert"` o `aria-live="assertive"`; screen reader anuncia "Cargando".

2. **Focus trap durante loading evita interacción con fondo** — [Focus trap]
   - Setup: overlay activo sobre botones.
   - Acción: Tab.
   - Assertion: focus permanece dentro del overlay (si tiene controles) o retorna al overlay container; fondo `inert` o `pointer-events: none`.

3. **Scroll lock del body mientras overlay está activo** — [Scroll lock]
   - Setup: página larga, overlay abierto.
   - Acción: intentar scroll con wheel.
   - Assertion: scroll bloqueado; `document.body.style.overflow === 'hidden'`; sin "saltar" al cerrar (compensación de scrollbar).

4. **Tiempo de espera > N segundos muestra mensaje de "toma más de lo esperado"** — [Estado visual / Edge case]
   - Setup: overlay con prop `slowThreshold=5000`.
   - Acción: esperar 5500ms.
   - Assertion: texto "Esto está tomando más de lo esperado" visible; sin cambiar spinner.

5. **Cierre del overlay restaura focus al elemento que lo disparó** — [Focus trap]
   - Setup: botón que abre overlay; recordar `activeElement` previo.
   - Acción: cerrar overlay.
   - Assertion: `document.activeElement === btnTrigger`.

6. **Overlay con error cambia spinner por mensaje y botón reintentar** — [Estado visual / Edge case]
   - Setup: prop `error="Network failed"`.
   - Acción: render.
   - Assertion: ícono de error reemplaza spinner; `role="alert"` con mensaje; botón "Reintentar" focuseable.

7. **Modo `inline` (no fullscreen) no bloquea scroll del body** — [Scroll lock]
   - Setup: overlay con prop `inline`.
   - Acción: scroll body.
   - Assertion: scroll permitido; overlay sigue su contenedor; sin `position: fixed` global.

8. **`prefers-reduced-motion` reemplaza spinner rotativo por dots estáticos** — [Reducción motion / prefers-*]
   - Setup: emular reduce.
   - Acción: mostrar overlay.
   - Assertion: animación `none`; alternativa visual sin movimiento (puntos, barras estáticas).

9. **Múltiples overlays simultáneos: solo el top es interactivo** — [Focus trap]
   - Setup: 2 overlays stacked.
   - Acción: focus traverse.
   - Assertion: usuario solo puede interactuar con el top; inferior tiene `aria-hidden="true"` o `inert`.

10. **Overlay programático via `el.show()` / `el.hide()` emite eventos** — [Domain event]
    - Setup: listener.
    - Acción: show() / hide().
    - Assertion: `is-loading-overlay-show` y `is-loading-overlay-hide` con `composed: true`.

11. **Spinner color hereda `currentColor` para theming** — [Estado visual / Edge case]
    - Setup: overlay dentro de `<div style="color: red">`.
    - Acción: medir color del spinner.
    - Assertion: spinner rojo (inherit); tema oscuro invertido correctamente.

12. **Overlay con `progress` prop muestra barra de progreso accesible** — [ARIA/a11y]
    - Setup: `progress={50}`.
    - Acción: snapshot.
    - Assertion: `role="progressbar"` con `aria-valuenow="50"`, `aria-valuemin="0"`, `aria-valuemax="100"`.

13. **Cancelación por Escape requiere confirmación para evitar cierre accidental** — [Dismiss]
    - Setup: overlay con `cancelable`.
    - Acción: Escape.
    - Assertion: prompt de confirmación o cierre directo según prop; `is-loading-overlay-cancel` emitido.

14. **Overlay no debe atrapar foco si no tiene controles interactivos** — [Focus trap]
    - Setup: overlay puro spinner sin botones.
    - Acción: Tab desde body.
    - Assertion: foco atraviesa el overlay (o sale del documento); foco no queda "atrapado" en contenedor vacío.

---

### demo: modal-verificacion
#### Tests existentes (resumen, brevísimo)
- Apertura de modal, mostrar contenido, confirmar/cancelar.
#### Propuestas nuevas

1. **Modal abre con `role="dialog"`, `aria-modal="true"`, focus al primer focusable** — [Focus trap]
   - Setup: trigger button.
   - Acción: click para abrir.
   - Assertion: `<dialog>` o `role="dialog"` con `aria-modal="true"`; primer input/botón recibe focus automático.

2. **Focus trap completo: Tab cicla, Shift+Tab retrocede correctamente** — [Focus trap]
   - Setup: modal con 4 focusables.
   - Acción: tabular repetidamente.
   - Assertion: orden cerrado (último → primero → último); sin escape al body; `inert` en contenido de fondo.

3. **Cierre con Escape restaura focus al trigger** — [Focus trap]
   - Setup: modal abierto.
   - Acción: Escape.
   - Assertion: `document.activeElement === btnTrigger`; modal removido del DOM o `hidden`.

4. **Cierre con click en backdrop (no en contenido) emite `is-modal-verificacion-close` con reason** — [Dismiss]
   - Setup: backdrop clickeable.
   - Acción: click fuera del modal-content.
   - Assertion: modal cierra; evento con `{ reason: 'backdrop-click' }`; sin cerrar si click en contenido.

5. **Scroll lock del body mientras modal abierto** — [Scroll lock]
   - Setup: página larga.
   - Acción: abrir modal.
   - Assertion: `document.body.style.overflow === 'hidden'`; scroll en modal-content permitido si overflow.

6. **Modal anidado (modal dentro de modal): focus trap del top funciona** — [Deep nesting]
   - Setup: abrir modal-verificacion que abre otro modal.
   - Acción: tabular.
   - Assertion: foco solo en modal top; modal padre con `aria-hidden="true"` o `inert`.

7. **Confirmación emite `is-modal-verificacion-confirm` con payload del formulario** — [Domain event]
   - Setup: modal con inputs.
   - Acción: completar y confirmar.
   - Assertion: evento con `{ data: { ... }, timestamp }`; `composed: true`; modal cierra tras éxito.

8. **`aria-labelledby` apunta al title del modal** — [ARIA/a11y]
   - Setup: modal con `<h2 id="modal-title">`.
   - Acción: snapshot.
   - Assertion: modal tiene `aria-labelledby="modal-title"`; title anunciado por screen reader.

9. **`aria-describedby` apunta a instrucciones o descripción** — [ARIA/a11y]
   - Setup: modal con `<p id="modal-desc">`.
   - Acción: snapshot.
   - Assertion: `aria-describedby="modal-desc"` cuando existe descripción.

10. **Validación inline en modal muestra errores con `aria-invalid`** — [ARIA/a11y]
    - Setup: input required vacío.
    - Acción: submit del modal.
    - Assertion: errores visibles con `aria-invalid="true"`; `aria-describedby` apunta a mensaje; foco al primer inválido.

11. **Modal con contenido muy largo: scroll interno sin scroll del body** — [Scroll lock]
    - Setup: modal con 5000px de contenido.
    - Acción: scroll interno.
    - Assertion: solo modal-content scrollea; body bloqueado; scrollbar interna visible.

12. **Animación de apertura/cierre respeta `prefers-reduced-motion`** — [Reducción motion / prefers-*]
    - Setup: emular reduce.
    - Acción: abrir/cerrar modal.
    - Assertion: transición 0s; aparición instantánea; sin scale/fade.

13. **Cierre accidental con Escape emite `reason: 'escape'` y permite `preventDefault`** — [Dismiss]
    - Setup: listener con `preventDefault()`.
    - Acción: Escape.
    - Assertion: modal NO cierra; consumer puede decidir; log de la intención.

14. **Modal `destructive` (botón confirmar rojo) requiere confirmación doble** — [Estado visual / Edge case]
    - Setup: `variant="destructive"`.
    - Acción: click confirmar.
    - Assertion: segundo prompt "¿Estás seguro?" con texto explícito; solo entonces se ejecuta acción.

---

### demo: text
#### Tests existentes (resumen, brevísimo)
- Render de `<p>`, `<span>`,`<strong>`, `<em>` con tokens tipográficos.
#### Propuestas nuevas

1. **`variant="body"` vs `"caption"` vs `"code"` aplica tokens correctos** — [Estado visual / Edge case]
   - Setup: 3 textos con cada variant.
   - Acción: leer computed styles.
   - Assertion: cada uno usa `var(--is-text-body-*)` o equivalente; tamaño y line-height diferenciados.

2. **Texto con `truncate` (ellipsis) muestra tooltip con `title`** — [Estado visual / Edge case]
   - Setup: text en contenedor 100px, contenido 500 chars.
   - Acción: hover.
   - Assertion: tooltip nativo con texto completo; `text-overflow: ellipsis`; `white-space: nowrap`.

3. **Wrap de texto largo respeta `word-break` por idioma** — [Layout shift]
   - Setup: texto en alemán con palabras largas ("Donaudampfschifffahrtsgesellschaftskapitän").
   - Acción: viewport estrecho.
   - Assertion: `overflow-wrap: break-word` o `word-break: break-word` aplicado según `lang`; sin overflow horizontal.

4. **Texto con `selectable="false"` previene selección** — [Interacción]
   - Setup: `<is-text selectable="false">`.
   - Acción: intentar seleccionar.
   - Assertion: `user-select: none` aplicado; copy-paste no incluye ese fragmento; sin texto fantasma en selección.

5. **`prefers-color-scheme: dark` ajusta color via tokens** — [Estado visual / Edge case]
   - Setup: toggle dark.
   - Acción: medir color.
   - Assertion: contraste ≥ 4.5:1 con fondo; `var(--is-text-1)` aplicado.

6. **Render de 1000 instancias de `<is-text>` no degrada performance** — [Estado visual / Edge case]
   - Setup: página con 1000 textos.
   - Acción: medir TTI.
   - Assertion: render < 200ms; sin memory leaks en reconnect.

7. **Texto con `mark` (highlighted) usa color accesible** — [Estado visual / Edge case]
   - Setup: `<is-text mark>destacado</is-text>`.
   - Acción: medir color fondo vs texto.
   - Assertion: contraste ≥ 4.5:1; sin color idéntico a link.

8. **`is-text-link` (hipervínculo interno) tiene `aria-current` cuando activo** — [ARIA/a11y]
   - Setup: link a página actual.
   - Acción: render.
   - Assertion: `aria-current="page"` aplicado; estilo diferenciado.

9. **Texto con emoji y RTL mezcla correctamente** — [Layout shift]
   - Setup: mixto "Hello مرحبا 🌍".
   - Acción: medir dirección.
   - Assertion: `dir="auto"` o configuración correcta; emoji no rompe baseline.

10. **`is-text-click` event emitido solo si `clickable` prop** — [Interacción]
    - Setup: text con clickable.
    - Acción: click.
    - Assertion: evento emitido; cursor pointer; sin evento si `clickable="false"`.

11. **Texto editable (`contenteditable`) mantiene semántica de párrafo** — [Deep nesting]
    - Setup: `<is-text editable>`.
    - Acción: editar y tabular fuera.
    - Assertion: estructura DOM correcta; Enter genera `<br>` o nuevo `<p>` según config; `is-text-edit` con `{ oldValue, newValue }`.

12. **Cambio de `lang` aplica tipografía apropiada** — [Estado visual / Edge case]
    - Setup: texto en japonés con `lang="ja"`.
    - Acción: medir line-height y font.
    - Assertion: fuente con soporte CJK aplicada; line-height ajustado.

13. **`white-space: pre` preserva espacios y saltos de línea** — [Estado visual / Edge case]
    - Setup: text con `preformatted`.
    - Acción: insertar `\n` y múltiples espacios.
    - Assertion: render literal; `tab-size` configurable; sin colapso de espacios.

14. **Texto con token faltante (`--is-text-body-color`) cae a `--is-text-1`** — [Estado visual / Edge case]
    - Setup: override CSS borrando tokens.
    - Acción: render.
    - Assertion: fallback aplicado; `console.warn` opcional; sin texto invisible.

---

### demo: tree-view
#### Tests existentes (resumen, brevísimo)
- Render de árbol jerárquico, expand/collapse, selección.
#### Propuestas nuevas

1. **Navegación con flechas ↑/↓ entre nodos, → expande, ← colapsa** — [Teclado]
   - Setup: árbol de 3 niveles, focus en nodo root.
   - Acción: ArrowDown, ArrowRight, ArrowDown, ArrowLeft.
   - Assertion: foco recorre árbol según spec WAI-ARIA; expandir/colapsar funciona; `aria-expanded` actualizado.

2. **Home/End saltan a primer/último nodo visible** — [Teclado]
   - Setup: árbol con 50 nodos.
   - Acción: End, Home.
   - Assertion: foco salta correctamente; nodos collapsed no se atraviesan en End (queda en último expandido).

3. **Type-ahead busca nodo por letra con timeout 500ms** — [Teclado]
   - Setup: nodos "Apple", "Avocado", "Banana".
   - Acción: "A", "V".
   - Assertion: foco en "Avocado"; buffer resetea tras 500ms inactividad.

4. **Focus en nodo collapsed y Enter expande** — [Teclado]
   - Setup: nodo collapsed, focus.
   - Acción: Enter.
   - Assertion: nodo expande; foco permanece; `aria-expanded="true"`.

5. **Anidación de 8 niveles mantiene performance de expand/collapse** — [Deep nesting]
   - Setup: árbol con 8 niveles, 5 nodos por nivel.
   - Acción: expandir todo y colapsar todo.
   - Assertion: tiempo < 200ms por nivel; sin layout thrashing.

6. **`role="treeitem"` con `aria-level`, `aria-expanded`, `aria-selected`** — [ARIA/a11y]
   - Setup: snapshot.
   - Acción: verificar.
   - Assertion: cada nodo tiene `role="treeitem"`; contenedor padre `role="tree"`; `aria-level="N"` correcto.

7. **Selección múltiple con Ctrl+Click marca sin desmarcar otros** — [Interacción]
   - Setup: tree con `multiselect`.
   - Acción: click nodo A, Ctrl+Click nodo B.
   - Assertion: ambos `aria-selected="true"`; A no desmarcado.

8. **Selección con Shift+Click selecciona rango visible** — [Interacción]
   - Setup: tree multiselect.
   - Acción: click nodo 1, Shift+Click nodo 5.
   - Assertion: nodos 1-5 seleccionados; rango respeta nodos visibles (saltando collapsed).

9. **Drag & drop para reordenar/mover nodos actualiza jerarquía** — [Interacción]
   - Setup: tree draggable.
   - Acción: drag nodo 3 al nodo 7 como hijo.
   - Assertion: DOM reordenado; `is-tree-reorder` con `{ sourceId, targetId, position: 'before'|'after'|'inside' }`.

10. **Virtualización para árboles > 1000 nodos mantiene scroll fluido** — [Estado visual / Edge case]
    - Setup: tree con 1000 nodos.
    - Acción: scroll rápido.
    - Assertion: FPS ≥ 30; solo nodos visibles en DOM (virtualización); sin memory leak.

11. **`is-tree-select` event con `{ nodeId, path, isSelected }`** — [Domain event]
    - Setup: listener.
    - Acción: seleccionar nodo.
    - Assertion: evento con path completo desde root; `composed: true`; throttled si aplica.

12. **Búsqueda en árbol filtra y resalta coincidencias con `aria-live`** — [Interacción]
    - Setup: input search sobre tree.
    - Acción: buscar "foo".
    - Assertion: solo nodos coincidentes o sus ancestros visibles; `<mark>` o equivalente para highlight; conteo "3 resultados" en `aria-live="polite"`.

13. **Checkbox por nodo con tri-state (checked/unchecked/indeterminate)** — [ARIA/a11y]
    - Setup: tree con checkboxes.
    - Acción: marcar 2 de 3 hijos.
    - Assertion: padre en `aria-checked="mixed"`; propagar a hijos según config; `is-tree-check` con `{ nodeId, checked }`.

14. **Carga lazy de hijos muestra skeleton + spinner en nodo padre** — [Estado visual / Edge case]
    - Setup: nodo con `lazyLoad`.
    - Acción: expandir.
    - Assertion: skeleton visible mientras carga; `aria-busy="true"` en nodo; fallo emite `is-tree-load-error` con retry.

15. **Click en label vs click en disclosure triangle son independientes** — [Interacción]
    - Setup: tree estándar.
    - Acción: click en icono chevron → expande; click en label → selecciona.
    - Assertion: ambas acciones independientes; eventos separados emitidos; sin propagación cruzada.

16. **Tree dentro de scroll container propio no afecta scroll del body** — [Scroll lock]
    - Setup: tree en panel con `overflow: auto`.
    - Acción: scroll del tree.
    - Assertion: solo el panel scrollea; body intacto.

---

## Resumen de cobertura

- **Total demos**: 12 (block-layout, btn-ref, catalogo-gen, flex-layout, flex-options, float-card, form, heading, loading-overlay, modal-verificacion, text, tree-view).
- **Total propuestas**: ≥ 168 (todos los demos tienen ≥ 12, varios llegan a 14-16).
- **Categorías cubiertas por demo**: Interacción, Teclado, ARIA/a11y, Estado visual/Edge case, Layout shift, Focus trap, Scroll lock, Domain event, Dismiss, Deep nesting, Reducción motion / prefers-*.
- **Foco isp**: layout shifts (block-layout, flex-layout, flex-options), focus traps (modal-verificacion, loading-overlay, float-card), scroll lock (loading-overlay, modal-verificacion, tree-view, float-card), dismiss mechanisms (float-card, modal-verificacion, flex-options), deep nested interactions (block-layout, flex-layout, tree-view, modal-verificacion), keyboard nav en tree (tree-view, flex-options), modal ARIA (modal-verificacion, loading-overlay), dispatch de domain events (todos).
