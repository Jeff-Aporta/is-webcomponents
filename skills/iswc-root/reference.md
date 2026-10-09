# Intención → componente is-*

Usar este mapa al elegir tag. API exacta: MD del módulo en el repo.

## Desambiguaciones

| Necesidad | Usar | Evitar |
| --- | --- | --- |
| Acción primaria/secundaria | `iswc-button` (+ `color`/`variant`) | `<button>` estilado a mano |
| Grupo de acciones | `iswc-button-group` | flex + botones sueltos |
| Copiar al portapapeles | `iswc-copy-button` | `navigator.clipboard` + UI propia |
| Menú de comandos | `iswc-dropdown` + `iswc-dropdown-item` | menú CSS casero |
| FAB | `iswc-fab` | botón fixed custom |
| Texto corto / largo | `iswc-input` / `iswc-textarea` | `<input>` / `<textarea>` nativos |
| Select simple | `iswc-select` | `<select>` estilado |
| Select con búsqueda | `iswc-combobox` | select + filtro casero |
| On/off | `iswc-switch` | checkbox fingiendo switch |
| Varias opciones visibles | `iswc-checkbox` / `iswc-radio-group` | inputs nativos |
| Fecha / hora / rango | `iswc-date-*` / `iswc-time-*` documentados | flatpickr / input date crudo |
| Confirmar destrucutivo | `iswc-popconfirm` o `iswc-confirm-delete` (ISP) | `window.confirm` |
| Modal genérico | `iswc-dialog` | modal div + overlay propio |
| Panel lateral | `iswc-drawer` | aside fixed custom |
| Aviso en página | `iswc-callout` | Alert/banner casero |
| Chip / etiqueta | `iswc-tag` | span.pill |
| Contador sobre icono | `iswc-badge` | badge CSS |
| Toast | `iswc-toast` (+ items del kit) | snackbar React/MUI |
| Loading indeterminado | `iswc-spinner` / `iswc-loading-overlay` | spinners CSS |
| Placeholder carga | `iswc-skeleton` | shimmer casero |
| Tabla densas/datos | `iswc-data-grid` | `<table>` + sort propio |
| KPI / cifra | `iswc-stat` | h1 + CSS |
| Árbol archivos/nav | `iswc-tree` | ul anidado custom |
| Tabs | `iswc-tab-group` | tabs ARIA a mano |
| Pasos de flujo | `iswc-stepper` | stepper MUI/custom |
| Gráfica | `iswc-chart` o tipado | Chart.js / Recharts directo |
| Secuencia UML | `iswc-sequence-diagram` | mermaid suelto si el kit basta |
| Timeline | `iswc-timeline` | lista vertical custom |
| Icono | `iswc-icon` | Iconify script / img SVG |
| Formato fecha/número/bytes | `iswc-format-*` / `iswc-relative-time` | Intl wrappers propios |
| Form ContaPyme | `iswc-form` (+ json2html/html2json) | form React |
| Toolbar de acciones ISP | `iswc-flex-options` | flex de botones nativos / reinventar FlexOptions |
| Tools hover ancladas | `iswc-float-card` | `display:none` + recrear DOM; `iswc-floating` interno; `iswc-popover` (es click) |
| Título / texto ISP | `iswc-heading` / `iswc-text` | typography casera en apps ISP |
| Superficie contenido | `iswc-card` | card div |
| Colapsable | `iswc-details` | accordion casero |
| Shell scrolleable | `iswc-main` | main overflow custom sin token |
| Split resizable | `iswc-split-panel` | split.js |

## color vs variant

```html
<!-- Bien -->
<iswc-button color="brand" variant="filled">Guardar</iswc-button>
<iswc-tag color="success" variant="filled-outlined" pill>OK</iswc-tag>
<iswc-callout color="warning" icon="mdi:alert">Revisa el payload</iswc-callout>

<!-- Mal: color metido en variant / size inventado -->
<iswc-button variant="danger">…</iswc-button>
<iswc-button size="large">…</iswc-button>
```

Escala: subir `font-size` del contexto o del host.

## Patrón wrapper de dominio

Tras cargar `all.min.js` (incluye `helpers/ui`), usa `IswcUi` / `Ui`:

```js
const { html, adoptCss, define, jsonScript } = IswcUi;

class TkBadges extends HTMLElement {
  #root = this.attachShadow({ mode: 'open' });
  connectedCallback() {
    this.#root.append(html`
      <iswc-tag color="${tono}" variant="filled-outlined" pill>${label}</iswc-tag>
    `);
    adoptCss(this.#root, import.meta.url); // tk-badges.css hermano
  }
}
define('tk-badges', TkBadges);
```

- Fuente: `tk-badges.ts` + `tk-badges.css`
- Dist: `tk-badges.js` + `tk-badges.css` (minificados)
- Mal: `const CSS = \`…\`` embebido + reinventar badge con `<span class="badge">`

CDN suelto: `…/dist/cdn/helpers/ui.min.js`. Docs: `src/components/helpers/ui.md`.

Referencia real: wrappers de dominio tipo `tk-badges` → `iswc-tag`, `tk-chart` → `iswc-chart`, `tk-block` → `iswc-callout` para kinds desconocidos.

## CDN y tema

```html
<link rel="stylesheet" href="…/dist/cdn/core/is-base.min.css">
<link rel="stylesheet" href="…/dist/cdn/core/palettes.min.css">
<script type="module" src="…/dist/cdn/all.min.js"></script>
```

`data-theme="dark|light"` · `data-palette="contapyme|…"` en `<html>`.  
CSS de app: preferir `var(--iswc-text)`, `var(--iswc-bg-soft)`, `var(--iswc-border-soft)`, `var(--iswc-accent)`.

## Cuando SÍ crear componente propio

Solo si:

1. El catálogo no tiene el tag (confirmado en LLM.md + categoría).
2. El componente encapsula **lógica de dominio** (mapear JSON de negocio → varios `is-*`).
3. No exporta una API genérica que compita con el kit.

Nombre: prefijo de app (`tk-`, `app-`, …), nunca `is-`.
