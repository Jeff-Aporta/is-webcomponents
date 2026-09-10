# Auditoría UI/UX — Categoría NAVIGATION (g-navigation)

## Testables del grupo
- `src/components/navigation/carousel.ts` → `<is-carousel>` / `<is-carousel-item>`
- `src/components/navigation/tree.ts` → `<is-tree>` / `<is-tree-item>`
- `src/components/navigation/stepper.ts` → `<is-stepper>` / `<is-stepper-step>`
- `src/components/navigation/breadcrumb.ts` → `<is-breadcrumb>` / `<is-breadcrumb-item>`
- `src/components/navigation/tab-group.ts` → `<is-tab-group>` / `<is-tab>` / `<is-tab-panel>`
- `src/components/navigation/scroller.ts` → `<is-scroller>`
- `src/components/overlays/mega-menu.ts` → `<is-mega-menu>`

## Resumen ejecutivo
- **Total**: 109 propuestas UI/UX nuevas
- **Tests previos existentes**: solo `tab-group.test.ts` (12 estáticos Tier A)
- **Gaps a11y**: 20 (WAI-ARIA incompleto en todos)

### is-carousel

**Tests existentes**: 13 estáticos (motor, sin UI/UX).

**Propuestas nuevas** (15):
1. **Swipe izquierda avanza al siguiente slide** — touchstart(clientX=200) + touchend(clientX=120) → active=1, emite `is-carousel-change {from:0, to:1}`.
2. **Swipe derecha retrocede al slide anterior** — touchstart(120) + touchend(200) sobre active=2 → active=1.
3. **Swipe corto (< 40px) NO dispara navegación** — drag de 20px no cambia active.
4. **ArrowLeft/ArrowRight sobre viewport navegan** — viewport tiene tabindex=0, keydown dispara prev/next.
5. **Home/End salta primer/último slide** — *(gap WAI-ARIA, no implementado)*.
6. **Space pausa/reanuda autoplay** — *(gap, no implementado)*.
7. **Autoplay avanza cada N ms** — autoplay=200ms, esperar 600ms, verificar active se incrementó 3 veces.
8. **Autoplay pausa al hacer hover** — mouseenter congela, mouseleave reanuda con remaining.
9. **Autoplay pausa con focusin, reanuda con focusout** — sobre control interno.
10. **Autoplay pausa cuando `document.hidden`** — simular visibilitychange=true → pausa.
11. **`prefers-reduced-motion: reduce` deshabilita autoplay** — *(gap)*.
12. **Indicador activo refleja active** — aria-selected="true" solo en el botón indicator cuyo data-index === active.
13. **Click en indicator salta a ese slide** — active=0, click indicator 3 → active=3.
14. **Loop vuelve del último al primero** — loop=true, active=4, next() → active=0.
15. **Sin loop se detiene en el último** — loop=false, active=4, next() → active=4 (no emite change).

### is-tree

**Propuestas nuevas** (10):
1. **Click en disclosure expande/colapsa** — emite `is-tree-toggle {expanded:true}`.
2. **ArrowRight sobre item colapsado lo expande** — sin emitir selección.
3. **ArrowRight sobre item expandido mueve foco al primer hijo visible**.
4. **ArrowLeft colapsa, o mueve foco al padre** — closeOthers del name.
5. **Enter/Space seleccionan** — emite `is-tree-select`.
6. **Home/End saltan al primer/último visible**.
7. **Modo `single` deselecciona los demás al seleccionar uno**.
8. **Modo `leaf` ignora clicks sobre carpetas**.
9. **`aria-expanded` refleja `expanded`** — gap regresión.
10. **`aria-level`/`aria-posinset`/`aria-setsize`** — *(gap APG, no implementado)*.

### is-tab-group

**Propuestas nuevas** (10):
1. **Click en tab activa su panel + emite `is-tab-show`** — detail con {name, panel, tab}.
2. **Tab disabled NO se activa por click** — click no cambia active.
3. **ArrowRight con `activation="auto"` cambia panel** — focus + active juntos.
4. **ArrowRight con `activation="manual"` solo mueve foco** — Enter/Space confirma.
5. **Enter y Space activan en modo manual**.
6. **Home/End saltan primer/último (saltando disabled)**.
7. **Click en close-button emite `is-tab-close` sin `is-tab-show`** — stopPropagation.
8. **`is-tab-show` solo si cambia** — no re-emite en mismo tab.
9. **`url-key` persiste active en `?s=` b64url JSON** — reload restaura.
10. **Scroll buttons visibles solo con overflow** — ResizeObserver los muestra.

### is-scroller

**Propuestas nuevas** (10):
1. **Sin overflow → botones ocultos** — emite `is-scroll-overflow {overflowing:false}`.
2. **Con overflow → botones visibles**.
3. **Click en `.scroll-end` scrollea 120px** — emite `is-scroll-end {direction:1}`.
4. **Click en `.scroll-start` scrollea -120px**.
5. **`without-scroll-buttons` oculta siempre**.
6. **`orientation="vertical"` scrollea en `top`**.
7. **`orientation="both"` scrollea ambos ejes**.
8. **`is-scroll-position` se emite al scrollear**.
9. **`ResizeObserver` recalcula overflow al cambiar contenido**.
10. **`ResizeObserver` se desconecta en `disconnectedCallback` (no leak)**.

### is-mega-menu

**Propuestas nuevas** (10):
1. **`label` aparece como texto del trigger**.
2. **Click toggle abre/cierra + `aria-expanded`** sincroniza.
3. **Orden: `is-show` → dialog.show() → `is-after-show`**.
4. **Click en `<a href>` emite `is-select` + cierra**.
5. **`hover` abre con debounce 90 ms**.
6. **`hover` cierra con debounce 220 ms tras mouseleave**.
7. **Hover sobre panel mantiene abierto** — limpia closeTimer.
8. **`placement="bottom-end"` ancla al borde derecho del trigger**.
9. **`width="600"` se topa en `min(960, vw-32)`**.
10. **Focus vuelve al trigger al cerrar** — *(gap crítico, no implementado)*.

### is-stepper

**Propuestas nuevas** (10):
1. **`next()` desde el último emite `is-stepper-complete`** — no cambia active.
2. **`goTo(idx)` fuera de rango es no-op** — clamp.
3. **`data-state` correcto por índice** — done/active/pending.
4. **`error` pisa los demás** — incluso si i === active.
5. **`disabled` salvo si es el activo**.
6. **`.num` refleja índice+1**.
7. **`without-line` oculta conector**.
8. **Vertical apila steps**.
9. **Variant `numbered` usa CSS counter**.
10. **`aria-current="step"` en el activo** — *(gap APG)*.

### is-breadcrumb

**Propuestas nuevas** (10):
1. **`label` se refleja en `aria-label` del `<nav>`**.
2. **`href="/x"` renderiza `<a>`**.
3. **`href=""` marca `aria-current="page"`**.
4. **Sin `href` renderiza `<span>`**.
5. **`target`/`rel` se propagan al `<a>`**.
6. **`icon="mdi:home"` crea `<is-icon>` por defecto**.
7. **Slot `start` gana al atributo `icon`**.
8. **Slot `separator` personalizado por item**.
9. **Primer item oculta separator**.
10. **JSON-LD BreadcrumbList** — *(gap SEO)*.

## Gaps transversales

1. **WAI-ARIA APG incompleto**: `aria-current`, `aria-controls`, `aria-level/posinset/setsize`, focus roving.
2. **`prefers-reduced-motion` no respetado** en carousel autoplay, stepper transitions.
3. **RTL no probado** en componentes horizontales.
4. **JSON-LD / Schema.org ausente** en breadcrumb.
5. **Keyboard end-to-end incompleto** (Home/End, type-ahead).
