# Intención → componente is-*

Usar este mapa al elegir tag. API exacta: MD del módulo en el repo.

## Desambiguaciones

| Necesidad | Usar | Evitar |
| --- | --- | --- |
| Acción primaria/secundaria | `is-button` (+ `color`/`variant`) | `<button>` estilado a mano |
| Grupo de acciones | `is-button-group` | flex + botones sueltos |
| Copiar al portapapeles | `is-copy-button` | `navigator.clipboard` + UI propia |
| Menú de comandos | `is-dropdown` + `is-dropdown-item` | menú CSS casero |
| FAB | `is-fab` | botón fixed custom |
| Texto corto / largo | `is-input` / `is-textarea` | `<input>` / `<textarea>` nativos |
| Select simple | `is-select` | `<select>` estilado |
| Select con búsqueda | `is-combobox` | select + filtro casero |
| On/off | `is-switch` | checkbox fingiendo switch |
| Varias opciones visibles | `is-checkbox` / `is-radio-group` | inputs nativos |
| Fecha / hora / rango | `is-date-*` / `is-time-*` documentados | flatpickr / input date crudo |
| Confirmar destrucutivo | `is-popconfirm` o `is-confirm-delete` (ISP) | `window.confirm` |
| Modal genérico | `is-dialog` | modal div + overlay propio |
| Panel lateral | `is-drawer` | aside fixed custom |
| Aviso en página | `is-callout` | Alert/banner casero |
| Chip / etiqueta | `is-tag` | span.pill |
| Contador sobre icono | `is-badge` | badge CSS |
| Toast | `is-toast` (+ items del kit) | snackbar React/MUI |
| Loading indeterminado | `is-spinner` / `is-loading-overlay` | spinners CSS |
| Placeholder carga | `is-skeleton` | shimmer casero |
| Tabla densas/datos | `is-data-grid` | `<table>` + sort propio |
| KPI / cifra | `is-stat` | h1 + CSS |
| Árbol archivos/nav | `is-tree` | ul anidado custom |
| Tabs | `is-tab-group` | tabs ARIA a mano |
| Pasos de flujo | `is-stepper` | stepper MUI/custom |
| Gráfica | `is-chart` o tipado | Chart.js / Recharts directo |
| Secuencia UML | `is-sequence-diagram` | mermaid suelto si el kit basta |
| Timeline | `is-timeline` | lista vertical custom |
| Icono | `is-icon` | Iconify script / img SVG |
| Formato fecha/número/bytes | `is-format-*` / `is-relative-time` | Intl wrappers propios |
| Form ContaPyme | `is-form` (+ json2html/html2json) | form React |
| Toolbar de acciones ISP | `is-flex-options` | flex de botones nativos / reinventar FlexOptions |
| Tools hover ancladas | `is-float-card` | `display:none` + recrear DOM; `is-floating` interno; `is-popover` (es click) |
| Título / texto ISP | `is-heading` / `is-text` | typography casera en apps ISP |
| Superficie contenido | `is-card` | card div |
| Colapsable | `is-details` | accordion casero |
| Shell scrolleable | `is-main` | main overflow custom sin token |
| Split resizable | `is-split-panel` | split.js |

## color vs variant

```html
<!-- Bien -->
<is-button color="brand" variant="filled">Guardar</is-button>
<is-tag color="success" variant="filled-outlined" pill>OK</is-tag>
<is-callout color="warning" icon="mdi:alert">Revisa el payload</is-callout>

<!-- Mal: color metido en variant / size inventado -->
<is-button variant="danger">…</is-button>
<is-button size="large">…</is-button>
```

Escala: subir `font-size` del contexto o del host.

## Patrón wrapper de dominio

Tras cargar `all.min.js` (incluye `helpers/ui`), usa `IsUi` / `Ui`:

```js
const { html, adoptCss, define, jsonScript } = IsUi;

class TkBadges extends HTMLElement {
  #root = this.attachShadow({ mode: 'open' });
  connectedCallback() {
    this.#root.append(html`
      <is-tag color="${tono}" variant="filled-outlined" pill>${label}</is-tag>
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

Referencia real: wrappers de dominio tipo `tk-badges` → `is-tag`, `tk-chart` → `is-chart`, `tk-block` → `is-callout` para kinds desconocidos.

## CDN y tema

```html
<link rel="stylesheet" href="…/dist/cdn/core/is-base.min.css">
<link rel="stylesheet" href="…/dist/cdn/core/palettes.min.css">
<script type="module" src="…/dist/cdn/all.min.js"></script>
```

`data-theme="dark|light"` · `data-palette="contapyme|…"` en `<html>`.  
CSS de app: preferir `var(--is-text)`, `var(--is-bg-soft)`, `var(--is-border-soft)`, `var(--is-accent)`.

## Cuando SÍ crear componente propio

Solo si:

1. El catálogo no tiene el tag (confirmado en LLM.md + categoría).
2. El componente encapsula **lógica de dominio** (mapear JSON de negocio → varios `is-*`).
3. No exporta una API genérica que compita con el kit.

Nombre: prefijo de app (`tk-`, `app-`, …), nunca `is-`.
