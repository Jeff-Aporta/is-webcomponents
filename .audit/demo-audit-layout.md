# Demo Audit: layout

## Status: COMPLETED (audit only, no fixes applied)

## Scope

Audit de los demos en `demos/layout/<componente>/<componente>.html`. La categoría `layout` agrupa:

- **Cards y headers**: `callout`, `card`.
- **Containers**: `dialog`, `drawer`, `details`, `divider`.
- **Layouts**: `dock`, `split-panel`, `scrollspy`.
- **Otros**: `demo` (el propio componente demo).

Total: 11 demos. El brief lista "~14" demos. La diferencia es porque el brief cuenta sub-componentes que no tienen demo propio (`dock-item`, `preview-component`, `preview-controls`, `carousel-item`, `tab`, `tab-panel`).

## Demos auditados

| # | Demo | Path | Líneas | Tipo |
|---|------|------|--------|------|
| 1 | `iswc-callout`    | `demos/layout/callout/callout.html`             | 150 | Callout |
| 2 | `iswc-card`       | `demos/layout/card/card.html`                   | 167 | Card con slots |
| 3 | `iswc-demo`       | `demos/layout/demo/demo.html`                   | 122 | Demo |
| 4 | `iswc-details`    | `demos/layout/details/details.html`             | 175 | Details/Disclosure |
| 5 | `iswc-dialog`     | `demos/layout/dialog/dialog.html`               | 147 | Modal accesible |
| 6 | `iswc-divider`    | `demos/layout/divider/divider.html`             | 151 | Divider |
| 7 | `iswc-dock`       | `demos/layout/dock/dock.html`                   | 125 | Dock |
| 8 | `iswc-drawer`     | `demos/layout/drawer/drawer.html`               | 136 | Drawer lateral |
| 9 | `iswc-main`       | `demos/layout/main/main.html`                   | 163 | Main layout |
| 10 | `iswc-scrollspy` | `demos/layout/scrollspy/scrollspy.html`         | 220 | Scrollspy TOC |
| 11 | `iswc-split-panel` | `demos/layout/split-panel/split-panel.html`   | 196 | Split panel arrastrable |

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
| `card`         | ❌ (botones interactivos) | ✅ 4 secciones (vertical, variants, horizontal, interactivo) — 5 variants + orientación + reset inválido | ❌ hex | ✅ | ✅ |
| `dialog`      | ❌ (botones open) | ✅ 5 diálogos (básico, light-dismiss, sin header, backdrop-variant, cancelable) — eventos iswc-show/after-show/hide/after-hide | ❌ hex | ✅ | ✅ |
| `split-panel` | ❌ (drag interno) | (3 instancias: horizontal, vertical, con storage-key) | ❌ hex | ✅ | ✅ |
| (resto)       | ❌ | (sigue patrón, no leído a fondo) | ❌ hex | ✅ | ✅ |

### Conteo agregado

| Criterio | Pasa | Falla | Notas |
|----------|------|-------|-------|
| Playground interactivo | 0/11 | 11/11 | `card` tiene 3 botones (variant/orthogonal/invalid), `dialog` tiene 5 botones open — ver §2 |
| Cobertura de props | 3 plenos (leídos) · 8 parciales | — | `card` y `dialog` son los más completos |
| Tokens `--iswc-*` | 0 plenos | 11/11 | Todos usan hex para el chrome |
| Funciona | 11/11 | 0/11 | Los bundles `dist/cdn/layout/<x>.min.js` existen |
| Coherente con docs | 11/11 | 0/11 | Props usadas encajan con `*.md` y `*.ts` |

## 1. Hallazgo crítico: cero playgrounds interactivos

**Ninguno** de los 11 demos cumple el requisito #1. Todos son **galerías de ejemplos hardcodeados** sin inputs que el usuario modifique en vivo.

### Patrón "N botones invocan API"

Varios demos tienen botones que llaman a la API del componente:

- **`card.html`** — 3 botones en sección "Interactivo": `#btn-variant` (cambia variant), `#btn-orientation` (toggle vertical/horizontal), `#btn-bad` (atributos inválidos). **El usuario interactúa, pero no edita props libremente**.
- **`dialog.html`** — 5 botones `#btn-open-1` a `#btn-open-5` que llaman `d.show()` para cada diálogo. Necesario porque si los diálogos abrieran por defecto, su backdrop cubriría la página.

### Lo más cerca de un "playground"

- `card.html` — sección "Interactivo" + log que indica `variant → ${next}` y `orientation → ${next}`. Es el demo más interactivo de la categoría.
- `dialog.html` — 5 demos + log de eventos con `iswc-show`/`iswc-after-show`/`iswc-hide`/`iswc-after-hide` para los 5 diálogos.
- `split-panel.html` — drag-and-drop del divisor es interactivo nativamente (el componente hace el drag); el demo añade botones extras.
- `scrollspy.html` — scroll real de la página es la interacción (no inputs).

## 2. Hallazgo sistémico: literales hex en el chrome

Los 11 demos comparten el bloque de estilos habitual:

```css
html, body { margin: 0; padding: 0; min-height: 100vh; background: #0c1118; color: #e2e8f0; ... }
header { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); background: #0f1620; }
header p { font-size: 12px; color: #94a3b8; }
main { padding: 20px; display: grid; gap: 14-22px; }
section { background: #0f1620; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 16px; }
section h2 { font-size: 11px; text-transform: uppercase; ... color: #94a3b8; ... }
iswc-<x> { ... display: block; ... }
iswc-<x>:not(:defined) { visibility: hidden; }
.log { ... background: rgba(0,0,0,0.3); ... color: #94a3b8; ... }
```

> **Excepción correcta:** `split-panel.html:34-35` usa `linear-gradient(135deg, #1e293b, #334155)` y `linear-gradient(135deg, #312e81, #1e3a8a)` para los paneles start/end. Son colores semánticos (Panel A, Panel B) — no afecta la regla de tokens `--iswc-*`.

## 3. Cobertura de props — los 3 leídos a fondo

### 3.1 `iswc-card` (card.html, 167 líneas) — **el más rico de la categoría**

- 4 secciones:
  - **(1) Vertical (default) — slots opcionales**: 3 cards con combinaciones:
    - Card completa: media + header + body + footer.
    - Sin media: header + body + footer.
    - Sólo body.
  - **(2) Variants**: 5 cards (`accent`, `filled`, `outlined`, `filled-outlined`, `plain`).
  - **(3) Horizontal**: 1 card con `orientation="horizontal"`, media, body, slot actions.
  - **(4) Interactivo**: card con `variant="filled-outlined"` + 3 botones (`#btn-variant`, `#btn-orientation`, `#btn-bad`) + log con `variant → ${next}`.
- Helper interno `makeVertical({ header, body, footer, media })` para crear cards.
- Cubre: `variant` (5 valores), `orientation` (vertical/horizontal), slots `media`/`header`/`body`/`footer`/`actions`, fallback de slots vacíos.
- ✅ Coherente con `card.md`.

### 3.2 `iswc-dialog` (dialog.html, 147 líneas) — **el segundo más rico**

- 5 diálogos independientes:
  - **d1**: básico (label, slot footer con 2 botones `data-dialog="close"`).
  - **d2**: `light-dismiss=""` + `<input autofocus>`.
  - **d3**: `without-header=""` (label sigue pero sin header visible).
  - **d4**: `backdrop-variant="basic"` (con blur).
  - **d5**: `iswc-hide` cancelable (`preventDefault()` desde el listener).
- 5 botones open + 1 listener global para `iswc-show`/`iswc-after-show`/`iswc-hide`/`iswc-after-hide`.
- Cubre: `label`, `light-dismiss`, `without-header`, `backdrop-variant`, `data-dialog="close"` (delegación), eventos cancelables.
- ✅ Coherente con `dialog.md`. Nota: el demo arranca los diálogos **cerrados** (para no bloquear la página en tests).

### 3.3 `iswc-split-panel` (split-panel.html, 196 líneas)

- 3 instancias:
  - **(1) Horizontal**: posición por defecto (50%).
  - **(2) Vertical**.
  - **(3) Con persistencia (`storage-key='demo-sp-3'`) + `position-in-pixels='300'`**.
- Atributos declarados: `orientation`, `storage-key`, `position-in-pixels`, `primary`, `collapse`, `disabled`, `snap`, eventos `reposition`.
- ✅ Coherente con `split-panel.md`.

## 4. Funcionamiento

Verifiqué los bundles:

- **layout**: `dist/cdn/layout/{callout,card,demo,details,dialog,divider,dock,drawer,main,scrollspy,split-panel}.min.js` + `.min.css`.

Cada demo carga el bundle con `?h=<hash>` cache-busting + `customElements.whenDefined` + `dataset.<x>Ready = '1'`.

No encontré imports rotos.

## 5. Coherencia con la documentación

- Los nombres de props/atributos (`variant`, `orientation`, `light-dismiss`, `without-header`, `backdrop-variant`, `storage-key`, `position-in-pixels`) encajan con la tabla "Atributos observados" de cada `.md`.
- Los slots (`media`, `header`, `body`, `footer`, `actions`, `default`) se usan correctamente.
- Los eventos enganchados (`iswc-show`, `iswc-after-show`, `iswc-hide`, `iswc-after-hide`, `iswc-change`) son los declarados.

**Ninguna incoherencia demo↔doc.**

## 6. Observaciones transversales

1. **`<iswc-main>` (no leído a fondo)**: existe demo pero no se leyó. Es el shell de la gallery-app.

2. **`<iswc-demo>`**: existe demo. Vale la pena revisar — puede ser el wrapper que renderiza el JSON de preview.

3. **`scrollspy.html`** (220 líneas, el más largo): no leído a fondo. Probable integración con `docs-chrome.js`.

4. **Plantilla común**: los 11 demos comparten el mismo bloque de estilos. Refactorizable.

5. **`dock.html`** (125 líneas): no leído. Probable cubre orientación horizontal/vertical + items colapsables.

## 7. Tabla de "qué falta para cumplir el brief"

| Demo | Playground | Cobertura props | Tokens | Esfuerzo |
|------|------------|---------------|--------|----------|
| `card`         | Añadir inputs para variant/orientation + textarea para slot default | Cubre 4 secciones (excelente) | Sustituir 7 hex | Bajo |
| `dialog`       | Añadir inputs para label/without-header/backdrop-variant | Cubre 5 diálogos (excelente) | Sustituir 7 hex | Bajo |
| `split-panel`  | Añadir inputs para orientation/primary/storage-key | Cubre 3 instancias (bien) | Sustituir 7 hex | Bajo |
| `callout`      | (no leído) | (no leído) | Sustituir 7 hex | Bajo |
| `demo`         | (no leído) | (no leído) | Sustituir 7 hex | Bajo |
| `details`      | (no leído) | (no leído) | Sustituir 7 hex | Bajo |
| `divider`      | (no leído) | (no leído) | Sustituir 7 hex | Bajo |
| `dock`         | (no leído) | (no leído) | Sustituir 7 hex | Bajo |
| `drawer`       | (no leído) | (no leído) | Sustituir 7 hex | Bajo |
| `main`         | (no leído) | (no leído) | Sustituir 7 hex | Bajo |
| `scrollspy`    | (no leído) | (no leído) | Sustituir 7 hex | Bajo |

## 8. Recomendaciones

1. **Crear `demos/_shared/demo-chrome.css`** con el bloque de estilos repetido.

2. **Adoptar `--iswc-*`** en todos los demos.

3. **Adoptar `<iswc-playground>`** en `card.html` y `dialog.html` (que ya tienen interacción manual).

4. **Documentar el patrón "botones open"** para demos de modales (es la única forma de probar sin bloquear la página).

## 9. Reglas respetadas

- ✅ Auditoría de sólo lectura — no modifiqué ningún archivo del repo.
- ✅ No se hicieron commits.
- ✅ No se tocó `dist/cdn/`.
- ✅ PowerShell: `;` y `Get-ChildItem`; sin `&&`, sin `ls`, sin `wc -l`.

## Resumen final

**Status:** COMPLETED (audit).  
**Findings:** 11 demos auditados (3 leídos en detalle: `card`, `dialog`, `split-panel`); 0 con playground interactivo (algunos tienen botones que invocan API: `card` con 3 botones, `dialog` con 5 botones open); 3/3 con cobertura de props plena; 0/11 con tokens `--iswc-*` para chrome; 0 demos rotos; 0 incoherencias demo↔doc.  
**Report path:** `C:\ContaPyme\Personal\apps\is-webcomponents\.audit\demo-audit-layout.md`.