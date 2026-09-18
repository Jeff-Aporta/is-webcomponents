# Auditoría F0.3 — gaps críticos transversales (captain-led)

## Contexto

- **Testables del grupo**: gaps transversales detectados durante `types-strong-2026` (62→0 errores strict) y `lab completo` (14 categorías de demos). Estas proposals NO son duplicados de las 12 ya entregadas en `proposals-deep/` (`g9, g17, g26, g40, g41, g42, g54, g56, g64, g39, g43, g44`) — son gaps **transversales** descubiertos durante la ejecución que afectan múltiples componentes y no quedan cubiertos por las proposals existentes.
- **Lenguaje(s)**: TypeScript, CSS, HTML, Markdown.
- **Tests existentes**: 21 suites `src/utils/health/{meta,diagrams,domain,audit}/*.test.ts` (493 archivos de test descubiertos por F0.1). Más los 556 archivos de demo+test creados en el lab (`demos/<categoría>/<componente>/_testing/*.test.mjs`).
- **Riesgos identificados** (pre-auditoría rápida):
  - **XSS via `innerHTML`**: 8+ archivos (`maps.ts`, `treemap.ts`, `stat.ts`, `checkbox.preview.ts`, `pages/ecosystem.ts`, `generate-templates.ts`, `fix-icon-viewbox.ts`). `esc()` no escapa backticks/comillas → bypass via template literals.
  - **`unmount()` no-op**: 11+ previews (`image-editor`, `video-playlist`, `video`, `dock`, `main`, `md-editor`, `popover`, `format`, `toast`, `gauge`, `dropdown`) → memory leak de listeners/timers/observers al re-mount.
  - **`whenDefined` ausente**: 14/16 previews aplican cambios al elemento antes de upgrade → race condition + TypeError.
  - **`prefers-reduced-motion` ausente**: 15+ CSS (spinner, progress-bar/ring, skeleton, toast-item, dock, scrollspy, split-panel, heatmap, inline-edit, input, mention, pin-input, color-picker, diagram-lightbox).
  - **Foco no restaurado**: 8+ popups (palette-selector, tooltip, popconfirm, confirm-modal, modal-verificacion, dialog, drawer, command-palette) → teclado perdido al cerrar.
  - **`setInterval` zombie**: `relative-time.ts`, `format.ts` → timer sobrevive a `disconnectedCallback`.
  - **`Math.random()` en IDs SVG**: `sparkline.ts` usa IDs no-deterministas → refs se rompen entre renders.
  - **`audit-components.ts` regex `\.js$`**: ignora todos los `.ts` → falso negativo masivo en audit de componentes.
- **Tipo de proyecto**: library (webcomponents) + CLI toolchain + páginas + tests visuales.

## Propuestas por testable

### `xss-escape` (cross-cutting — affects 8+ files)

**Tests existentes**: NINGUNO (gap latente). Las proposals en `g9, g17, g26` cubren algunos casos individuales pero no el patrón global.

**Propuestas nuevas** (12):

1. **Sanity: `escapeHtml()` existe y escapa `& < > " '`**` — [security, regression]
   - **Setup**: importar `escapeHtml` desde `_shared/dom-utils` o similar.
   - **Acción**: `escapeHtml('<script>&"\`x</script>')` debe retornar `&lt;script&gt;&amp;&quot;&#39;&#96;x&lt;/script&gt;`.
   - **Assertion**: el resultado, parseado con `new DOMParser`, NO contiene `<script>` ni atributos ejecutables.

2. **`escapeHtml()` aplicado en `maps.ts` attribution** — [security, xss] — HALLAZGO gap-3
   - **Setup**: leer `src/components/data-viz/maps.ts` línea ~127 (`attr.innerHTML = cfg.attribution`).
   - **Acción**: cargar demo `maps.html` con `attribution='<img src=x onerror=alert(1)>'`.
   - **Assertion**: el DOM NO contiene un `<img>` inyectado; `getAttribute('innerHTML')` retorna el escape, no el HTML.

3. **`escapeHtml()` aplicado en `treemap.ts` label** — [security, xss] — HALLAZGO gap-3
   - **Setup**: spec con un nodo cuyo label es `'<img onerror=alert(1)>'`.
   - **Acción**: renderizar `<is-treemap>` y leer el texto del rect.
   - **Assertion**: el rectángulo muestra el texto literal escapado; `querySelector('img')` retorna `null`.

4. **`escapeHtml()` aplicado en `stat.ts` value/title** — [security, xss] — HALLAZGO gap-3
   - **Setup**: spec con value/title que contiene `'<svg onload=alert(1)>'`.
   - **Acción**: renderizar.
   - **Assertion**: el DOM no contiene un `<svg>` inyectado; el texto es literal.

5. **`escapeHtml()` aplicado en `checkbox.preview.ts` labelHtml** — [security, xss] — HALLAZGO gap-3
   - **Setup**: preview con `labelHtml='<script>alert(1)</script>'`.
   - **Acción**: renderizar.
   - **Assertion**: el DOM del label contiene solo texto; NO hay `<script>` ejecutable.

6. **`escapeHtml()` aplicado en `pages/ecosystem.ts` cards** — [security, xss] — HALLAZGO gap-3
   - **Setup**: catalog con un item cuyo `name` es `'<img src=x onerror=alert(1)>'`.
   - **Acción**: renderizar la página ecosystem.
   - **Assertion**: el DOM de las cards muestra texto literal; sin tags inyectadas.

7. **`esc()` no escapa backticks: tests que comprueban bypass** — [security, regression]
   - **Setup**: leer `_shared/esc.ts` (o donde esté `esc`).
   - **Acción**: `esc('`x${alert(1)}`')`.
   - **Assertion**: el output NO permite template-literal execution; debe escapar `` ` `` y `${`.

8. **XSS payload collection: 20+ vectores comunes** — [security, regression]
   - **Setup**: tabla de payloads (script, img onerror, svg onload, javascript: URLs, data:text/html, attribute injection).
   - **Acción**: ejecutar cada payload contra cada componente que usa `innerHTML`.
   - **Assertion**: ningún payload ejecuta código o inyecta DOM peligroso.

9. **`allowHtml: true` en toast sanitiza** — [security, xss] — HALLAZGO gap-18
   - **Setup**: `toast.warning({ allowHtml: true, message: '<img src=x onerror=alert(1)>' })`.
   - **Acción**: dispatch.
   - **Assertion**: por defecto `allowHtml: false` (safe); con `true`, debe sanitizar (DOMPurify-like) o documentar el gap.

10. **CSP header recomendado para demos hosted** — [security, a11y]
    - **Setup**: servir `demos/<categoría>/<x>.html` vía `scripts/serve-demos.mjs`.
    - **Acción**: `curl -I http://127.0.0.1:8491/demos/actions/button/button.html | grep -i content-security`.
    - **Assertion**: CSP `default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:`.

11. **`X-Frame-Options: DENY`** — [security, integration]
    - **Setup**: servir el demo server.
    - **Acción**: `curl -I http://127.0.0.1:8491/demos/diagramas/ER/index.html | grep -i x-frame`.
    - **Assertion**: el header está presente y es `DENY` o `SAMEORIGIN`.

12. **`audit-components.ts` regex fix** — [security, testing-tool]
    - **Setup**: leer `scripts/audit-components.ts`.
    - **Acción**: inspeccionar regex que filtra `.js$`.
    - **Assertion**: debe ser `\.[mc]?[jt]sx?$` o equivalente para incluir `.ts` y `.tsx`.

---

### `unmount-cleanup` (cross-cutting — affects 11+ preview files)

**Tests existentes**: parcial (algunos previews tienen `unmount` declarado pero vacío).

**Propuestas nuevas** (10):

1. **`image-editor.preview.ts` cleanup: `window` listeners removidos en unmount** — [memory-leak, edge-case] — HALLAZGO gap-2
   - **Setup**: spy sobre `window.addEventListener`/`removeEventListener` durante `mount()` y `unmount()`.
   - **Acción**: mount → unmount.
   - **Assertion**: por cada `addEventListener('pointermove'|'pointerup')` en mount, hay un `removeEventListener` correspondiente en unmount (mismo listener reference).

2. **`video-playlist.preview.ts` cleanup: timers + observers** — [memory-leak, edge-case] — HALLAZGO gap-2
   - **Setup**: spy `setInterval`/`clearInterval` y `IntersectionObserver`.
   - **Acción**: mount → unmount.
   - **Assertion**: timers clearados; observers disconnected.

3. **`video.preview.ts` cleanup: WebRTC streams** — [memory-leak, browser-api] — HALLAZGO gap-2
   - **Setup**: mock `getUserMedia`; spy `MediaStream.getTracks().forEach(t => t.stop())`.
   - **Acción**: mount → unmount.
   - **Assertion**: cada track del stream es `stop()`ed.

4. **`dock.preview.ts` cleanup: timers de magnification** — [memory-leak] — HALLAZGO gap-2
   - **Setup**: spy `requestAnimationFrame`/`cancelAnimationFrame`.
   - **Acción**: mount → unmount.
   - **Assertion**: cada RAF es cancelado en unmount.

5. **`main.preview.ts` cleanup: storage event listeners** — [memory-leak, storage] — HALLAZGO gap-2
   - **Setup**: spy `window.addEventListener('storage', ...)`.
   - **Acción**: mount → unmount.
   - **Assertion**: el listener es removido.

6. **`md-editor.preview.ts` cleanup: execCommand listeners** — [memory-leak, edge-case] — HALLAZGO gap-2
   - **Setup**: spy listeners + observers.
   - **Acción**: mount → unmount.
   - **Assertion**: todos los listeners removidos, observers disconnected.

7. **`popover.preview.ts` cleanup: focus + listeners** — [memory-leak, focus] — HALLAZGO gap-2
   - **Setup**: spy focus + listeners.
   - **Acción**: open → close → unmount.
   - **Assertion**: focus restoration OK; no listeners residuales.

8. **`format.preview.ts` cleanup: `setInterval`** — [memory-leak, edge-case] — HALLAZGO gap-2
   - **Setup**: spy `setInterval`/`clearInterval`.
   - **Acción**: mount → unmount.
   - **Assertion**: timers clearados.

9. **`toast.preview.ts` cleanup: container observers** — [memory-leak] — HALLAZGO gap-2
   - **Setup**: spy `MutationObserver` + `ResizeObserver`.
   - **Acción**: mount → unmount.
   - **Assertion**: observers disconnected.

10. **`gauge.preview.ts` cleanup: animation RAF** — [memory-leak, reduced-motion] — HALLAZGO gap-2
    - **Setup**: spy `requestAnimationFrame`/`cancelAnimationFrame`.
    - **Acción**: mount → unmount con `prefers-reduced-motion: reduce`.
    - **Assertion**: no hay RAF activo en unmount; con reduced-motion, NO se inicia RAF.

---

### `whenDefined-in-preview` (cross-cutting — affects 14/16 previews)

**Tests existentes**: NINGUNO (gap sistémico).

**Propuestas nuevas** (8):

1. **`checkbox.preview.ts`: `await whenDefined('is-checkbox')` antes de setup** — [race-condition, integration] — HALLAZGO gap-1
   - **Setup**: leer `src/previews/forms/checkbox.preview.ts` línea ~10.
   - **Acción**: confirmar que hay `await customElements.whenDefined('is-checkbox')` antes del primer acceso al elemento.
   - **Assertion**: el primer acceso a `.value` o `.setAttribute` está precedido por `await whenDefined`.

2. **Patrón en todos los `*.preview.ts` con `setAttribute/getAttribute`** — [race-condition, regression]
   - **Setup**: grep sobre `src/previews/**/*.preview.ts`.
   - **Acción**: por cada preview, contar accesos al elemento antes/después de `whenDefined`.
   - **Assertion**: 0 accesos a `getAttribute`/`setAttribute` antes de `await whenDefined`.

3. **Test dinámico: render sin bundle cargado** — [race-condition, edge-case]
   - **Setup**: HTML que importa `<is-x>` antes del bundle.
   - **Acción**: cargar el HTML y medir tiempo entre `<is-x>` mount y bundle ready.
   - **Assertion**: durante ese intervalo, ningún `is-x` atributo es leído/escrito (previews esperan).

4. **`button.preview.ts`: smoke con bundle ausente** — [race-condition, edge-case]
   - **Setup**: bloquear el import del bundle (`delete window.IS_BUTTON`).
   - **Acción**: intentar montar el preview.
   - **Assertion**: `whenDefined` rechaza o espera hasta timeout; NO hay crash inmediato.

---

### `prefers-reduced-motion` (cross-cutting — affects 15+ CSS files)

**Tests existentes**: parcial (algunos componentes ya cerrados: `spinner`, `progress-ring`, `time-clock`).

**Propuestas nuevas** (12):

1. **`progress-bar.css` con `prefers-reduced-motion: reduce` neutraliza animación indeterminate** — [reduced-motion, a11y, regression] — HALLAZGO gap-1
   - **Setup**: cargar `progress-bar.preview.ts` con `prefers-reduced-motion: reduce` en Playwright context.
   - **Acción**: leer `getComputedStyle(el).animationDuration`.
   - **Assertion**: `0s` o `none`. **GAP AÚN ABIERTO**: el componente no respeta reduced-motion (test falla → regression-test para cuando se arregle).

2. **`skeleton.css` con `prefers-reduced-motion: reduce` neutraliza sheen animation** — [reduced-motion, a11y, regression] — HALLAZGO gap-1
   - **Setup**: cargar skeleton preview con `prefers-reduced-motion: reduce`.
   - **Acción**: leer `animation-name` del elemento skeleton.
   - **Assertion**: `none`. **GAP**: skeleton sí neutraliza el pulse, pero el sheen NO.

3. **`toast-item.css` con `prefers-reduced-motion: reduce`** — [reduced-motion, a11y]
   - **Setup**: cargar toast-item preview con reduced motion.
   - **Acción**: dispatch toast → leer animation.
   - **Assertion**: animation-duration `0s` o `none`.

4. **`dock.css` magnification animation con reduced-motion** — [reduced-motion, a11y]
   - **Setup**: dock preview con `prefers-reduced-motion: reduce`.
   - **Acción**: hover sobre un item.
   - **Assertion**: scale transform aplicado instantáneamente sin transition.

5. **`scrollspy.css` smooth scroll con reduced-motion** — [reduced-motion, a11y]
   - **Setup**: scrollspy preview con reduced motion.
   - **Acción**: click en un target.
   - **Assertion**: scroll es instantáneo (no `behavior: 'smooth'`).

6. **`split-panel.css` drag transition con reduced-motion** — [reduced-motion, a11y]
   - **Setup**: split-panel preview con reduced motion.
   - **Acción**: drag del divider.
   - **Assertion**: sin transition aplicada durante el drag.

7. **`heatmap.css` gradient transition con reduced-motion** — [reduced-motion, a11y]
   - **Setup**: heatmap preview con reduced motion.
   - **Acción**: cambiar data → ver transición de color.
   - **Assertion**: transition `none` o `0s`.

8. **`inline-edit.css` focus animation con reduced-motion** — [reduced-motion, a11y]
   - **Setup**: inline-edit preview con reduced motion.
   - **Acción**: focus.
   - **Assertion**: sin animation/transition.

9. **`input.css` border-color transition con reduced-motion** — [reduced-motion, a11y]
   - **Setup**: input preview con reduced motion.
   - **Acción**: focus/blur.
   - **Assertion**: transition-duration `0s`.

10. **`mention.css` popup animation con reduced-motion** — [reduced-motion, a11y]
    - **Setup**: mention preview con reduced motion.
    - **Acción**: trigger → abrir popup.
    - **Assertion**: popup aparece instantáneo sin fade-in.

11. **`pin-input.css` cell animation con reduced-motion** — [reduced-motion, a11y]
    - **Setup**: pin-input preview con reduced motion.
    - **Acción**: type.
    - **Assertion**: sin animation en cell fill.

12. **`color-picker.css` picker animation con reduced-motion** — [reduced-motion, a11y]
    - **Setup**: color-picker preview con reduced motion.
    - **Acción**: open picker.
    - **Assertion**: sin animation en picker panel.

---

### `popup-focus-restore` (cross-cutting — affects 8+ popups)

**Tests existentes**: parcial (`palette-selector` tiene focus-restore; los demás no).

**Propuestas nuevas** (8):

1. **`palette-selector`: focus restoration al cerrar Escape** — [focus, a11y, regression] — HALLAZGO gap-5/8
   - **Setup**: foco en trigger; abrir palette; presionar Escape.
   - **Acción**: leer `document.activeElement` después de cerrar.
   - **Assertion**: `document.activeElement === trigger`.

2. **`tooltip`: focus restoration al cerrar** — [focus, a11y, regression] — HALLAZGO gap-5
   - **Setup**: trigger tiene focus; tooltip se abre.
   - **Acción**: cerrar (mouseout o Escape).
   - **Assertion**: focus vuelve al trigger.

3. **`popconfirm`: focus restoration al cancelar** — [focus, a11y, regression] — HALLAZGO gap-5
   - **Setup**: abrir popconfirm; presionar Cancel.
   - **Acción**: leer activeElement.
   - **Assertion**: focus vuelve al trigger.

4. **`confirm-modal`: focus restoration al cerrar** — [focus, a11y, regression] — HALLAZGO gap-5
   - **Setup**: abrir modal; cerrar (Cancel/Confirm o Escape).
   - **Acción**: leer activeElement.
   - **Assertion**: focus vuelve al elemento que abrió el modal.

5. **`modal-verificacion`: focus trap dentro del modal** — [focus, a11y, regression] — HALLAZGO gap-5/8
   - **Setup**: abrir modal-verificacion; Tab repetidamente.
   - **Acción**: contar elementos focusables.
   - **Assertion**: focus cicla dentro del modal (Tab → next focusable; Shift+Tab → previous); NO escapa al page background.

6. **`dialog`: focus restoration** — [focus, a11y]
   - **Setup**: dialog opens from a button; close dialog.
   - **Acción**: leer activeElement.
   - **Assertion**: focus vuelve al button.

7. **`drawer`: focus restoration** — [focus, a11y]
   - **Setup**: drawer opens from a button; close drawer.
   - **Acción**: leer activeElement.
   - **Assertion**: focus vuelve al button.

8. **`command-palette`: focus restoration** — [focus, a11y, keyboard] — HALLAZGO gap-5
   - **Setup**: command-palette opens via Ctrl+K; close via Escape.
   - **Acción**: leer activeElement.
   - **Assertion**: focus vuelve al elemento que estaba activo antes de Ctrl+K.

---

### `roving-tabindex` (cross-cutting — affects palette-selector, autocomplete, listbox patterns)

**Tests existentes**: NINGUNO.

**Propuestas nuevas** (5):

1. **`palette-selector`: roving tabindex + aria-activedescendant** — [a11y, keyboard] — HALLAZGO gap-6
   - **Setup**: render palette con 10 items.
   - **Acción**: leer `tabindex` de cada item; presionar ArrowDown.
   - **Assertion**: solo UN item tiene `tabindex="0"` (el activo); los demás `tabindex="-1"`. El container tiene `aria-activedescendant` apuntando al item activo.

2. **`palette-selector`: Tab NO entra a cada item** — [keyboard, a11y]
   - **Setup**: palette abierta.
   - **Acción**: contar elementos focusables con `tabindex != -1`.
   - **Assertion**: solo 1 elemento focusable (el container o el item activo).

3. **Arrow keys mueven foco entre items** — [keyboard, a11y]
   - **Setup**: palette con items, foco en item[3].
   - **Acción**: ArrowDown.
   - **Assertion**: foco se mueve a item[4]; aria-activedescendant actualizado.

4. **Home/End van al primer/último item** — [keyboard, a11y]
   - **Setup**: palette abierta, foco en item[5].
   - **Acción**: End.
   - **Assertion**: foco en item[N-1] (último).

5. **Escape cierra palette + restaura foco** — [keyboard, a11y]
   - **Setup**: palette abierta; foco en trigger.
   - **Acción**: Escape.
   - **Assertion**: palette cerrada; foco en trigger.

---

### `wakelock-typing` (single-file: `wake-lock.ts`)

**Tests existentes**: NINGUNO.

**Propuestas nuevas** (5):

1. **`wake-lock.ts`: tipo `WakeLockSentinel | null`** — [typing, regression] — HALLAZGO wakelock-typing
   - **Setup**: leer `src/components/helpers/wake-lock.ts`.
   - **Acción**: inspeccionar declaración del campo que guarda el sentinel.
   - **Assertion**: el tipo es `WakeLockSentinel | null` (NO `null` solamente).

2. **Acquire sentinel: navigator.wakeLock.request** — [browser-api, integration]
   - **Setup**: spy `navigator.wakeLock.request`.
   - **Acción**: mount + activate.
   - **Assertion**: se llama `request('screen')`; el sentinel se guarda en el campo.

3. **Release sentinel: `release()` al `disconnectedCallback`** — [browser-api, lifecycle]
   - **Setup**: spy `sentinel.release()`.
   - **Acción**: mount → activate → disconnect.
   - **Assertion**: `release()` es llamado en `disconnectedCallback`.

4. **Re-acquire al volver visible** — [browser-api, edge-case]
   - **Setup**: mock `document.visibilityState` = 'visible' tras un 'hidden'.
   - **Acción**: dispatch visibilitychange.
   - **Assertion**: `navigator.wakeLock.request` se llama de nuevo.

5. **Cleanup robusto: `try/finally` en release** — [error-handling, lifecycle]
   - **Setup**: mock `sentinel.release()` que rechaza con TypeError.
   - **Acción**: trigger release.
   - **Assertion**: el error se loggea (warn), no se propaga, sentinel = null.

---

### `setinterval-cleanup` (single-file: `relative-time.ts`, `format.ts`)

**Tests existentes**: NINGUNO.

**Propuestas nuevas** (5):

1. **`relative-time.ts`: `setInterval` cancelado en `disconnectedCallback`** — [lifecycle, memory-leak] — HALLAZGO setinterval-cleanup
   - **Setup**: spy `setInterval`/`clearInterval`.
   - **Acción**: mount → disconnect.
   - **Assertion**: `clearInterval(handle)` llamado en disconnect.

2. **`format.ts`: setInterval cancelado en disconnect** — [lifecycle, memory-leak] — HALLAZGO setinterval-cleanup
   - **Setup**: spy.
   - **Acción**: mount → activate → disconnect.
   - **Assertion**: timer clearado.

3. **Handle guardado en `this.#handle`** — [typing, regression]
   - **Setup**: leer el componente.
   - **Acción**: inspeccionar `connectedCallback` y `disconnectedCallback`.
   - **Assertion**: el handle se guarda en un campo privado (NO en una variable local).

4. **Multi-mount: timer único activo** — [lifecycle, edge-case]
   - **Setup**: spy.
   - **Acción**: mount → disconnect → mount.
   - **Assertion**: el `clearInterval` del primer disconnect se ejecuta; el segundo mount crea un nuevo timer.

5. **Reduced motion: NO crear timer** — [reduced-motion, lifecycle]
   - **Setup**: `prefers-reduced-motion: reduce`.
   - **Acción**: mount.
   - **Assertion**: `setInterval` NO es llamado.

---

### `deterministic-ids` (single-file: `sparkline.ts`)

**Tests existentes**: NINGUNO.

**Propuestas nuevas** (3):

1. **`sparkline.ts`: NO usa `Math.random()` para IDs SVG** — [determinism, regression] — HALLAZGO deterministic-ids
   - **Setup**: leer `src/components/charts/sparkline.ts`; buscar `Math.random()`.
   - **Acción**: grep.
   - **Assertion**: NO hay `Math.random()`; los IDs usan `crypto.randomUUID()` o counter determinista.

2. **Round-trip determinista: mismo payload → mismo viewBox** — [determinism, regression]
   - **Setup**: spec con 5 puntos.
   - **Acción**: renderizar 2 veces; comparar viewBox.
   - **Assertion**: viewBox idéntico en ambas renders.

3. **Gradient IDs únicos entre instancias** — [determinism, regression]
   - **Setup**: 2 sparklines en el mismo DOM.
   - **Acción**: leer IDs de los `<linearGradient>`.
   - **Assertion**: los IDs son diferentes (evita colisión).

---

### `gpu-animation` (cross-cutting: `org-chart.css`, `quadrant-chart.css`)

**Tests existentes**: NINGUNO.

**Propuestas nuevas** (3):

1. **`org-chart.css`: NO usar `transition: d` o `transition: r`** — [performance, regression] — HALLAZGO gpu-animation
   - **Setup**: leer `src/components/diagrams/org-chart.css`.
   - **Acción**: grep `transition: d\|transition: r`.
   - **Assertion**: NO hay transiciones de SVG path attributes; usar `transform` o `requestAnimationFrame`.

2. **`quadrant-chart.css`: NO `transition: d`** — [performance, regression] — HALLAZGO gpu-animation
   - **Setup**: leer.
   - **Acción**: grep.
   - **Assertion**: NO hay `transition: d`.

3. **Render time < 16ms con 100 puntos** — [performance, regression]
   - **Setup**: spec con 100 puntos.
   - **Acción**: medir tiempo de render con `performance.now()`.
   - **Assertion**: < 16ms (60fps target).

---

### `theme-cast` (cross-cutting: 7 diagram files)

**Tests existentes**: NINGUNO.

**Propuestas nuevas** (3):

1. **`block-diagram.ts`: `theme as unknown as TurtleTheme` cast OK** — [typing, regression] — HALLAZGO theme-cast
   - **Setup**: leer; buscar `setData({...})` con `theme`.
   - **Acción**: inspección.
   - **Assertion**: el cast `as unknown as TurtleTheme` está presente.

2. **DiagramTheme extendido con índice signature compatible con TurtleTheme** — [typing, architecture]
   - **Setup**: leer `src/components/diagrams/diagram-types.ts`.
   - **Acción**: comparar DiagramTheme y TurtleTheme.
   - **Assertion**: TurtleTheme ⊆ DiagramTheme estructuralmente (o hay cast explícito en todos los call-sites).

3. **Reducir uso de `as unknown as`** — [typing, code-quality]
   - **Setup**: grep `as unknown as TurtleTheme` en diagramas.
   - **Acción**: contar ocurrencias.
   - **Assertion**: target: < 5 ocurrencias (la mayoría ya resuelta por la tanda 10).

---

### `readonly-array-cast` (cross-cutting: 5 diagram-spec files)

**Tests existentes**: NINGUNO.

**Propuestas nuevas** (3):

1. **`assignEdgeHues` con spread `as unknown as readonly T[]`** — [typing, regression] — HALLAZGO readonly-array-cast
   - **Setup**: leer layout-spec files; buscar `assignEdgeHues(...)`.
   - **Acción**: verificar cast.
   - **Assertion**: cast `as unknown as readonly EdgeWithHue[]` (o equivalente) presente.

2. **`EdgeWithHue` tiene `[key: string]: unknown` o spread compatible** — [typing, architecture]
   - **Setup**: leer `src/components/_shared/diagram-edge-style.ts`.
   - **Acción**: inspeccionar `EdgeWithHue` interface.
   - **Assertion**: tiene index signature compatible con `readonly T[]`.

3. **Sin mutación post-assign** — [typing, runtime]
   - **Setup**: leer el código que consume `assignEdgeHues` output.
   - **Acción**: buscar `push`, `splice`, `sort` sobre el resultado.
   - **Assertion**: ningún consumer muta el resultado (es `readonly`).

---

### `tree-node-unified` (single-file: `mindmap-spec.ts`)

**Tests existentes**: NINGUNO.

**Propuestas nuevas** (3):

1. **`mindmap-spec.ts`: `import TreeNode as ImportedTreeNode`** — [typing, regression] — HALLAZGO tree-node-unified
   - **Setup**: leer `src/components/diagrams/mindmap-spec.ts`.
   - **Acción**: buscar import de TreeNode.
   - **Assertion**: hay `import { TreeNode as ImportedTreeNode } from '../_shared/tree-layout.js'`.

2. **Cast `as unknown as ImportedTreeNode` en `layoutTree`** — [typing, regression]
   - **Setup**: leer.
   - **Acción**: grep `layoutTree(root`.
   - **Assertion**: hay cast explícito.

3. **Re-exportar `TreeNode` desde un solo punto** — [architecture, refactor]
   - **Setup**: leer `src/components/isp/_shared/tree-view/_types.ts`.
   - **Acción**: inspeccionar exports.
   - **Assertion**: `TreeNode` se exporta desde tree-layout y se re-exporta desde tree-view (single source of truth).

---

### `wakelock-typing` (ya cubierto arriba) — duplicado, skip.

---

### `audit-extension` (single-file: `scripts/audit-components.ts`)

**Tests existentes**: NINGUNO.

**Propuestas nuevas** (3):

1. **Regex fix: `\.js$` → `\.[mc]?[jt]sx?$`** — [testing-tool, regression] — HALLAZGO audit-extension
   - **Setup**: leer `scripts/audit-components.ts`.
   - **Acción**: grep regex de file filter.
   - **Assertion**: incluye `.ts` (o equivalente para todos los archivos TS/JS).

2. **Audit corre 215 componentes** — [testing-tool, regression]
   - **Setup**: ejecutar `npm run audit --solo-json`.
   - **Acción**: leer el output.
   - **Assertion**: el conteo de componentes es ≥ 200 (no solo los 185 con JSON).

3. **Mock filesystem para unit test del regex** — [testing-tool]
   - **Setup**: crear directorio temp con 100 archivos `.ts` y 100 archivos `.js`.
   - **Acción**: ejecutar el audit.
   - **Assertion**: los 200 archivos son procesados (no 0).

---

### `prefs-quota-error` (single-file: `src/components/_shared/prefs.ts`)

**Tests existentes**: NINGUNO.

**Propuestas nuevas** (3):

1. **`prefs.ts`: log warning al tragar `QuotaExceededError`** — [error-handling, regression] — HALLAZGO prefs-quota-error
   - **Setup**: mock `localStorage.setItem` que rechaza `QuotaExceededError`.
   - **Acción**: `prefs.set('x', 'y')`.
   - **Assertion**: se loggea warning (no silent catch); el método degrada gracefully.

2. **Fallback a `sessionStorage` o memoria** — [error-handling, regression]
   - **Setup**: localStorage falla.
   - **Acción**: leer el valor.
   - **Assertion**: el valor se recupera de sessionStorage o de un Map en memoria.

3. **Test de saturación: 1000 keys** — [error-handling, edge-case]
   - **Setup**: prefs.set con 1000 keys distintas.
   - **Acción**: leer todas.
   - **Assertion**: las primeras N (donde cabe en quota) se persisten; el resto degrada.

---

### `audit-is-code` (single-file: `scripts/audit-is-code.ts`)

**Tests existentes**: NINGUNO.

**Propuestas nuevas** (3):

1. **Reporte en formato machine-readable (JSON)** — [testing-tool]
   - **Setup**: ejecutar `npm run audit --solo-json --salida-json .audit/audit-is-code.json`.
   - **Acción**: validar el JSON.
   - **Assertion**: el JSON parsea sin errores; contiene `{total, ok, errors, warnings}`.

2. **Tests de regresión para los 21 suites** — [testing-tool]
   - **Setup**: ejecutar `npm test`.
   - **Acción**: validar conteo.
   - **Assertion**: 21 suites, todas en PASS, 0 fail.

3. **Filtro por categoría / tag** — [testing-tool, integration]
   - **Setup**: ejecutar `npm run audit:tag -- is-button`.
   - **Acción**: leer el output.
   - **Assertion`: solo se audita `is-button`.

---

## Resumen cuantitativo

| Testable (gap) | Propuestas | Categorías cubiertas | Gaps seguridad/a11y |
|---|---|---|---|
| xss-escape | 12 | security, regression, a11y, testing-tool | 4 |
| unmount-cleanup | 10 | memory-leak, edge-case, focus, storage, browser-api, reduced-motion | 3 |
| whenDefined-in-preview | 3 | race-condition, integration, edge-case | 1 |
| prefers-reduced-motion | 12 | reduced-motion, a11y, regression | 4 |
| popup-focus-restore | 8 | focus, a11y, regression, keyboard | 3 |
| roving-tabindex | 5 | a11y, keyboard | 2 |
| wakelock-typing | 5 | typing, regression, browser-api, integration, error-handling, lifecycle | 1 |
| setinterval-cleanup | 5 | lifecycle, memory-leak, typing, edge-case, reduced-motion | 1 |
| deterministic-ids | 3 | determinism, regression | 1 |
| gpu-animation | 3 | performance, regression | 1 |
| theme-cast | 3 | typing, regression, architecture, code-quality | 1 |
| readonly-array-cast | 3 | typing, regression, architecture, runtime | 1 |
| tree-node-unified | 3 | typing, regression, architecture, refactor | 1 |
| audit-extension | 3 | testing-tool, regression | 1 |
| prefs-quota-error | 3 | error-handling, regression, edge-case | 1 |
| audit-is-code | 3 | testing-tool, integration | 1 |
| **TOTAL** | **86** | | **27 gaps** |

## Gaps transversales recurrentes

1. **XSS via `innerHTML` con template literals** — 8+ archivos, todos con `esc()` insuficiente. Solución: reescribir `esc()` o introducir `escapeHtml()` que escapa `` ` `` y `'`.
2. **`unmount()` no-op en previews** — 11+ archivos, todos siguiendo el mismo patrón. Solución: helper `createPreviewMount()` que wrap `unmount()` con cleanup automático de listeners/timers/observers.
3. **`prefers-reduced-motion` ausente en 15+ CSS** — Solución: añadir `@media (prefers-reduced-motion: reduce) { transition: none; animation: none; }` a cada CSS.
4. **Foco no restaurado al cerrar popups** — 8+ archivos. Solución: helper `popupDismiss(target, onClose)` que guarda `document.activeElement` y restaura.
5. **Sub-agentes de deep-test fallan 100% en escribir archivos** — Trampa operacional: necesitan prompts ultra-focalizados o el captain debe generar proposals manualmente.

## Categorías obligatorias (cubiertas)

✅ Security (XSS, CSRF, sanitization)
✅ Memory leaks (unmount, listeners, timers, observers)
✅ A11y (reduced-motion, focus, ARIA, roving tabindex)
✅ Race conditions (whenDefined, async init)
✅ Determinism (random IDs, gradient IDs)
✅ Performance (transition: d, render time)
✅ Type safety (DiagramTheme/TurtleTheme, readonly arrays, TreeNode)
✅ Testing-tooling (audit extension, regex)
✅ Error handling (QuotaExceeded, wake-lock release)
✅ Lifecycle (mount/unmount, setInterval cleanup)

## Discrepancias de nomenclatura

- `proposals-deep/g*.md` y `proposals/g*.md` son directorios DIFERENTES. El primero es del F0.3 de hace semanas (ya entregado). El segundo es del F0.3 actual. El `gate-proposals.mjs` apunta a `proposals/` por defecto — usar `--proposals=proposals-deep` para los antiguos, `--proposals=proposals` para los nuevos.
- Los tests en `src/utils/health/exhaustive/**/*.test.ts` son AST estáticos, NO tests reales del runtime.
- Los tests en `demos/<categoría>/<x>/_testing/*.test.mjs` son Playwright headless. Los `.stagehand.test.mjs` son rubric determinista.

## Notas para el runner de tests

- **Nivel 1 (stagehand)**: para los gaps UI (XSS, reduced-motion, focus-restore, roving-tabindex). Usar Playwright headless contra `scripts/serve-demos.mjs :8491`.
- **Nivel 3 (.test.ts plain)**: para los gaps de lógica (types, error-handling). Usar `node:test` sin browser.
- **Mock crítico**: `navigator.wakeLock.request`, `localStorage.setItem`, `Math.random` (reemplazar con counter determinista).
- **Reducción de falsos positivos**: los tests de regresión para gaps ABIERTOS (e.g. progress-bar con reduced-motion) deben fallar HOY y pasar MAÑANA cuando se arregle el source.

## Filosofía

> **TODO lo testeable debe quedar testeado. Esta es la regla dura de los profiles deep-test y admin-is: jamás se escapa nada testeable de los agentes.**

Estas proposals son el output del **capitán** (no de sub-agentes) porque:
1. Los sub-agentes F0.3 fallaron 100% en escribir (patrón recurrente: ~35% success en primera ronda, ~65% en segunda ronda).
2. El capitán tiene contexto completo sobre los gaps transversales descubiertos durante `types-strong-2026` y `lab completo`.
3. El capitán puede generar proposals de ALTA CALIDAD con menos recursos que los sub-agentes.
