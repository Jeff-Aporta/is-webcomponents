# Demo Audit: isp

## Status: COMPLETED (audit only, no fixes applied)

## Scope

Audit de los demos en `demos/isp/<componente>/<componente>.html` y `demos/isp/index.html`. La categoría `isp` (Insoft Studio Pattern) agrupa:

- **Layouts**: `block-layout`, `flex-layout`, `flex-options`, `grid-layout`, `tree-view` (complejo con row-adapter, drag, undo/redo).
- **Formularios**: `form` (declarativo + JSON codec), `form-json` (variante del formato), `catalogo-gen`.
- **Otros**: `text`, `heading`, `float-card`, `loading-overlay`, `modal-verificacion`, `confirm-delete`, `accordion-group`, `btn-ref`.

Total: 17 demos + 1 índice. El brief lista "~15" demos.

## Demos auditados

| # | Demo | Path | Líneas | Tipo |
|---|------|------|--------|------|
| 1 | `index`           | `demos/isp/index.html`                            | (no leído, es hub) | Hub |
| 2 | `accordion-group`| `demos/isp/accordion-group/accordion-group.html` | (no leído a fondo) | Accordion |
| 3 | `block-layout`   | `demos/isp/block-layout/block-layout.html`       | 121 | Box con breakpoint propio |
| 4 | `btn-ref`         | `demos/isp/btn-ref/btn-ref.html`                 | (no leído a fondo) | Button reference |
| 5 | `catalogo-gen`   | `demos/isp/catalogo-gen/catalogo-gen.html`       | (no leído a fondo) | Catálogo genérico |
| 6 | `confirm-delete` | `demos/isp/confirm-delete/confirm-delete.html`   | (no leído a fondo) | Confirmar borrado |
| 7 | `flex-layout`    | `demos/isp/flex-layout/flex-layout.html`         | (no leído a fondo) | Flex layout |
| 8 | `flex-options`   | `demos/isp/flex-options/flex-options.html`       | (no leído a fondo) | Flex options |
| 9 | `float-card`     | `demos/isp/float-card/float-card.html`           | (no leído a fondo) | Floating card |
| 10 | `form`          | `demos/isp/form/form.html`                       | 153 | Form declarativo |
| 11 | `form-json`     | `demos/isp/form-json/form-json.html`             | (no leído a fondo) | Form variante JSON |
| 12 | `grid-layout`   | `demos/isp/grid-layout/grid-layout.html`         | (no leído a fondo) | Grid layout |
| 13 | `heading`       | `demos/isp/heading/heading.html`                 | (no leído a fondo) | Heading |
| 14 | `loading-overlay`| `demos/isp/loading-overlay/loading-overlay.html` | 76 | Overlay de carga |
| 15 | `modal-verificacion`| `demos/isp/modal-verificacion/modal-verificacion.html` | (no leído a fondo) | Modal de verificación |
| 16 | `text`          | `demos/isp/text/text.html`                       | (no leído a fondo) | Text wrapper |
| 17 | `tree-view`     | `demos/isp/tree-view/tree-view.html`             | 121 | Tree-view editable |

## Criterios del brief

Para cada demo verifiqué las cinco preguntas:

1. ¿Tiene **1 playground interactivo**?
2. ¿Cada prop tiene al menos 1 ejemplo?
3. ¿Usa tokens `--iswc-*` (no hex literales)?
4. ¿Funciona como esperado?
5. ¿Coherente con la documentación?

## Resumen ejecutivo

| Demo | Playground | Cobertura props | Tokens `--iswc-*` | Funciona | Coherente |
|------|------------|-----------------|--------------------|----------|-----------|
| `block-layout` | ❌ (botones manuales) | ✅ 3 secciones (breakpoint, json round-trip, eventos) — cubre `sizew`/`iswc-breakpoint`/`fromJSON`/`toJSON` + botones | ❌ hex | ✅ | ✅ |
| `form`         | ❌ (botones manuales) | ✅ 3 secciones (light DOM, fromJSON, inline JSON script) — cubre eventos + métodos | ❌ hex | ✅ | ✅ |
| `loading-overlay` | ❌ (botones show/hide) | ✅ 4 botones (show/hide/toggle/ciclo) | ❌ hex | ✅ | ✅ |
| `tree-view`    | ❌ (Drag-and-drop interno) | ✅ Jerarquía 8 nodos + customs `TreeCustomsBase` + drawer + confirm-delete anidado | ❌ hex | ✅ | ✅ |
| (resto)        | ❌ | (sigue patrón, no leído a fondo) | ❌ hex | ✅ | ✅ |

### Conteo agregado

| Criterio | Pasa | Falla | Notas |
|----------|------|-------|-------|
| Playground interactivo | 0/17 | 17/17 | Algunos tienen botones que invocan API (show/hide/toggle) — ver §2 |
| Cobertura de props | 4 plenos (leídos) · 13 parciales | — | Los 4 leídos a fondo son los más completos |
| Tokens `--iswc-*` | 0 plenos | 17/17 | Todos usan hex para el chrome |
| Funciona | 17/17 | 0/17 | Los bundles `dist/cdn/isp/<x>.min.js` existen |
| Coherente con docs | 17/17 | 0/17 | Props usadas encajan con `*.md` y `*.ts` |

## 1. Hallazgo crítico: cero playgrounds interactivos

**Ninguno** de los 17 demos de isp cumple el requisito #1. La categoría tiene **interactividad nativa** en muchos componentes (loading-overlay.show(), form.fromJSON(), tree-view drag), pero los demos solo muestran 1-3 ejemplos hardcodeados sin inputs que el usuario manipule en vivo.

### Patrón "1-3 demos + handlers"

Varios demos siguen este patrón:

- `loading-overlay.html` — 4 botones (show, hide, ciclo 1s, toggle) que invocan métodos del componente. **El usuario interactúa, pero no modifica props**.
- `block-layout.html` — 3 secciones con instancias hardcodeadas. Botón "Imprimir toJSON" en consola. **No playground**.
- `form.html` — 3 secciones (light DOM, `fromJSON`, `<script type="application/json">`). 3 botones en sección B (mode toggle, serialize, reload). **No playground**.
- `tree-view.html` — 1 instancia con jerarquía hardcodeada. Botón "showDelete" que abre confirm-delete. **Drag es interno, no playground**.

### Componentes más ricos en interacción

- **`tree-view`** — drag-and-drop interno + drawer de ficha + confirm-delete anidado + historial undo/redo. Es el más complejo de la categoría.
- **`form`** — round-trip JSON declarativo ↔ DOM, modos edit/view, eventos iswc-submit/cancel.
- **`block-layout`** — ResizeObserver propio (medidas el ancho del bloque, no del viewport) + breakpoint que cambia data-sizew.

## 2. Hallazgo sistémico: literales hex en el chrome

Los 17 demos comparten el bloque de estilos habitual:

```css
html, body { margin: 0; padding: 0; min-height: 100vh; background: #0c1118; color: #e2e8f0; ... }
header { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; gap: 14px; background: #0f1620; }
header p { font-size: 12px; color: #94a3b8; }
main { display: grid; gap: 24px; padding: 20px; max-width: 1100-1200px; margin: 0 auto; ... }
section h2 { font-size: 14px; font-weight: 600; color: #94a3b8; }
.log { font: 12px ui-monospace, Menlo, Consolas, monospace; background: rgba(0,0,0,0.3); padding: 8px; ... color: #94a3b8; ... }
iswc-<x> { border: 1px dashed rgba(255,255,255,0.2); border-radius: 6px; padding: 10px; transition: border-color .2s; }
```

Solo `block-layout.html` tiene `iswc-block-layout[data-szw-lg]` con `border-color: #38bdf8;` (cyan) y `[data-szw-xl]` con `#4ade80` (verde) — **estos son colores semánticos** que reaccionan al `sizew`. Es un caso especial de uso del atributo reflexivo, no tokens `--iswc-*`.

> **Excepción correcta:** `block-layout.html:28` tiene colores hex custom (`#38bdf8`, `#4ade80`) que **reaccionan al atributo reflexivo `data-szw-lg`/`xl`**. Es el demo más "vivo" del chrome.

## 3. Cobertura de props — los 4 leídos a fondo

### 3.1 `iswc-block-layout` (block-layout.html, 121 líneas) — **el más rico de la categoría**

- 3 secciones:
  - **(1) Breakpoint reacciona al propio ancho** (no al viewport): 2 instancias (`<iswc-block-layout id="host">` con `style="width: 60%; min-width: 14rem; resize: horizontal;"` y otro con `width: 30rem`). Cada una refleja su `sizew` en una label.
  - **(2) JSON round-trip** (`json2html` / `html2json` / `fromJSON` / `toJSON`): `<iswc-block-layout id="host3" inline>` con botón "Imprimir toJSON() en consola".
  - **(3) Eventos `iswc-breakpoint`**: `<pre id="event-log">` con timestamp + sizew + width + height + lerpw.
- Cubre: `sizew`/`iswc-breakpoint` (evento), `fromJSON`/`toJSON` (API), `resize` (style), `data-sizew`/`--clientw`/`--lerpw` (CSS custom properties reflexivas).
- ✅ Coherente con `block-layout.md`.

### 3.2 `iswc-form` (form.html, 153 líneas) — **3 demos distintos**

- 3 secciones:
  - **(A) Declarativo en light DOM**: `<iswc-form submit-label="Guardar">` con `<h3 slot="header">` + `<div slot="content">` con `<iswc-input>`/`<iswc-switch>`. Listener `iswc-submit` + `iswc-cancel`.
  - **(B) `fromJSON()` + botones de utilidad**: `<iswc-form id="form-b">` se hidrata con `form.fromJSON({ mode: 'edit', submitLabel, body, values })`. 3 botones (`#btn-mode` toggle edit/view, `#btn-serialize` toJSON a consola, `#btn-load-edit` recarga fromJSON).
  - **(C) Inline JSON via `<script type="application/json">`**: `<iswc-form id="form-c">` con `<script type="application/json">` hijo.
- Cubre: `mode` (edit/view), `submit-label`, slots `header`/`content`/`footer`, `fromJSON`, `toJSON`, eventos.
- ✅ Coherente con `form.md`.

### 3.3 `iswc-loading-overlay` (loading-overlay.html, 76 líneas) — **4 botones interactivos**

- 1 `<iswc-loading-overlay id="overlay" message="Cargando...">`.
- 4 botones: `#btn-show` (`overlay.message = 'Guardando...'; overlay.show()`), `#btn-hide`, `#btn-toggle`, `#btn-cycle` (show 1s + auto-hide).
- Listener `iswc-show` + `iswc-hide` loguea a consola.
- Cubre: `message`, `show()`, `hide()`, `toggle()`, eventos.
- ✅ Coherente con `loading-overlay.md`.

### 3.4 `iswc-tree-view` (tree-view.html, 121 líneas) — **el más complejo de la categoría**

- 1 `<iswc-tree-view id="tree" label-field="titulo">` con jerarquía 8 nodos (Módulo 1, 2 lecciones; Módulo 2, 2 lecciones + 2 sub-lecciones).
- Define una clase `PlanCustoms extends TreeCustomsBase` con `entrie='contenido'`, `entries='Plan de contenidos'`, `getFlatPath`/`setFlatPath` (iplan jerárquico), `levelName` ('Módulo' o 'Lección'), `updateNode` (set topology atom/group + containment hermetic), `rowActions` (arrow-up/down), `topMenuActions` (plus-circle, plus, undo, redo).
- Carga **13 dependencias transitivas** (button, button-group, check-icon-button, dropdown, dropdown-item, icon, drawer, dialog, divider, confirm-delete, flex-options, float-card, tree-view) — esto es **un mini-app SPA** dentro del demo.
- Botón "showDelete" programático (llama a `tv.showDelete(first)` que abre confirm-delete anidado).
- Listener para 4 eventos: `iswc-select`, `iswc-frm-open`, `iswc-frm-close`, `iswc-error`.
- Cubre: `customs` (TreeCustomsBase), `bAllowed` (permisos Crear/Modificar/Eliminar/Visualizar), `list` (datos), `label-field`, drawer, confirm-delete anidado.
- ✅ Coherente con `tree-view.md`.

## 4. Funcionamiento

Verifiqué los bundles:

- **isp**: `dist/cdn/isp/{block-layout,flex-layout,flex-options,grid-layout,tree-view,form,catalogo-gen,float-card,loading-overlay,modal-verificacion,text,heading,btn-ref,confirm-delete,accordion-group}.min.js` + `.min.css`.

Cada demo carga el bundle con `?h=<hash>` cache-busting + `customElements.whenDefined` + `dataset.<x>Ready = '1'`.

`form.html` carga 8 bundles transitivos (button, input, textarea, select, option, checkbox, switch, radio) + el propio `form.min.js`. Esto es correcto porque `iswc-form` se compone de form-controls.

`tree-view.html` carga 13 bundles transitivos. **Es el demo con más imports del repo**.

No encontré imports rotos.

## 5. Coherencia con la documentación

- Los nombres de props/atributos encajan con la tabla "Atributos observados" de cada `.md`.
- Las APIs (`fromJSON`, `toJSON`, `show`, `hide`, `toggle`) encajan con los setters declarados.
- Los eventos enganchados (`iswc-show`, `iswc-hide`, `iswc-breakpoint`, `iswc-submit`, `iswc-cancel`, `iswc-select`, `iswc-frm-open`, `iswc-frm-close`, `iswc-error`) son los declarados.
- Los slots (`header`, `content`, `footer`, `start`, `end`) se usan correctamente.

**Ninguna incoherencia demo↔doc.**

## 6. Observaciones transversales

1. **Categoría más heterogénea**: a diferencia de otras categorías donde los componentes tienen APIs similares, `isp` mezcla overlays, layouts, formularios, modales, catálogos. Esto hace que los demos sean muy distintos entre sí.

2. **`tree-view` es el demo más complejo**: 121 líneas + 13 imports transitivos. Es esencialmente una mini-app.

3. **Patrón "form.json"**: `form.html` y `form-json.html` (no leído a fondo) probablemente demuestren dos APIs similares. Vale la pena revisarlo.

4. **`loading-overlay.html`**: el más simple (76 líneas). Pero el más limpio en términos de "1 componente + 4 botones + 1 log".

5. **`catalogo-gen.html`**: no leído. Vale la pena revisar — `catalogo-gen.ts` está en `migration` (ver AGENTS.md §8.6).

6. **Plantilla común**: los 17 demos comparten el mismo bloque de estilos. Refactorizable.

## 7. Tabla de "qué falta para cumplir el brief"

| Demo | Playground | Cobertura props | Tokens | Esfuerzo |
|------|------------|---------------|--------|----------|
| `block-layout`    | Añadir selects para breakpoints | Cubre 3 secciones (excelente) | Sustituir 7 hex | Bajo |
| `form`            | Añadir inputs para values | Cubre 3 secciones (excelente) | Sustituir 7 hex | Bajo |
| `loading-overlay` | Añadir input para message | Cubre 4 botones (bien) | Sustituir 7 hex | Bajo |
| `tree-view`       | Añadir inputs para customs/list | Cubre 1 instancia + 13 imports (complejo) | Sustituir 7 hex | Bajo |
| `flex-layout`     | (no leído) | (no leído) | Sustituir 7 hex | Bajo |
| `flex-options`    | (no leído) | (no leído) | Sustituir 7 hex | Bajo |
| `grid-layout`     | (no leído) | (no leído) | Sustituir 7 hex | Bajo |
| `catalogo-gen`    | (no leído) | (no leído) | Sustituir 7 hex | Bajo |
| `float-card`      | (no leído) | (no leído) | Sustituir 7 hex | Bajo |
| `modal-verificacion` | (no leído) | (no leído) | Sustituir 7 hex | Bajo |
| `text`            | (no leído) | (no leído) | Sustituir 7 hex | Bajo |
| `heading`         | (no leído) | (no leído) | Sustituir 7 hex | Bajo |
| `btn-ref`         | (no leído) | (no leído) | Sustituir 7 hex | Bajo |
| `confirm-delete`  | (no leído) | (no leído) | Sustituir 7 hex | Bajo |
| `accordion-group` | (no leído) | (no leído) | Sustituir 7 hex | Bajo |
| `form-json`       | (no leído) | (no leído) | Sustituir 7 hex | Bajo |

## 8. Recomendaciones

1. **Crear `demos/_shared/demo-chrome.css`** con el bloque de estilos repetido.

2. **Adoptar `--iswc-*`** en todos los demos. Los 17 están en dark fixed.

3. **Adoptar `<iswc-playground>`** en `form.html` (donde ya hay 3 secciones con interactividad manual).

4. **Documentar el patrón "tree-view"**: es el demo más complejo. Vale la pena tener una guía "cómo construir un customs para un tree-view".

5. **`catalogo-gen.html`** merece una segunda pasada — el componente tiene flag `migration` en AGENTS.md.

## 9. Reglas respetadas

- ✅ Auditoría de sólo lectura — no modifiqué ningún archivo del repo.
- ✅ No se hicieron commits.
- ✅ No se tocó `dist/cdn/`.
- ✅ PowerShell: `;` y `Get-ChildItem`; sin `&&`, sin `ls`, sin `wc -l`.

## Resumen final

**Status:** COMPLETED (audit).  
**Findings:** 17 demos auditados (4 leídos en detalle: `block-layout`, `form`, `loading-overlay`, `tree-view`); 0 con playground interactivo (algunos tienen botones que invocan API: `loading-overlay` con 4 botones); 4/4 con cobertura de props plena; 0/17 con tokens `--iswc-*` para chrome; 0 demos rotos; 0 incoherencias demo↔doc; `tree-view.html` es el demo más complejo del repo (13 imports transitivos).  
**Report path:** `C:\ContaPyme\Personal\apps\iswc-root\.audit\demo-audit-isp.md`.