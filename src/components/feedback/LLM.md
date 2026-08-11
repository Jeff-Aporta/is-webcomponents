# `feedback` para LLM

## Propósito

Estado, progreso, confirmación, carga o resultado de operaciones.

## Qué componente elegir

Elegir módulo mínimo que cubra necesidad. Abrir referencia específica; no inferir API desde nombre.

## Componentes

| Tags | Documento | Uso principal |
| --- | --- | --- |
| `<is-spinner>` | [spinner.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/feedback/spinner.md) | Spinner |
| `<is-badge>` | [badge.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/feedback/badge.md) | Badge |
| `<is-tag>` | [tag.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/feedback/tag.md) | Tag |
| `<is-skeleton>` | [skeleton.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/feedback/skeleton.md) | Skeleton |
| `<is-progress-bar>` | [progress-bar.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/feedback/progress-bar.md) | Progress Bar |
| `<is-progress-ring>` | [progress-ring.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/feedback/progress-ring.md) | Progress Ring |
| `<is-theme-toggle>` | [theme-toggle.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/feedback/theme-toggle.md) | Theme Toggle |
| `<is-toast>` | [toast.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/feedback/toast.md) | Toast |
| `<is-toast-item>` | [toast-item.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/feedback/toast-item.md) | Toast Item |
| `<is-tooltip>` | [tooltip.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/feedback/tooltip.md) | Tooltip |
| `<is-cdn-snippet>` | [cdn-snippet.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/feedback/cdn-snippet.md) | CDN Snippet |
| `<is-popconfirm>` | [popconfirm.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/feedback/popconfirm.md) | Popconfirm |
| `<is-confirm-modal>` | [confirm-modal.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/feedback/confirm-modal.md) | Confirmación en modal con backdrop |
| `<is-palette-selector>` | [palette-selector.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/feedback/palette-selector.md) | Selector de paleta de color |

## Composición y relaciones

Módulos multi-tag se documentan juntos. Parent/child mantienen contrato del mismo JS/CSS.

## Reusar antes de crear

- `../helpers/floating.js`
- `../_shared/prefs.js`
- `../_shared/adopt-css.js`

## Dependencias compartidas

Revisar imports y `_shared/` antes de implementar. Reusar stdlib, plataforma y módulos existentes.

## Patrones comunes

- Importar módulo ES antes de usar tag.
- Usar propiedades para objetos/payloads y atributos declarados para escalares.
- Respetar contrato de eventos, parts, states y tokens.

## Qué hacer

- Leer MD, JS, CSS y preview exacto de manifest.
- Leer callers antes de tocar helper compartido.
- Preservar accesibilidad, validación y fallbacks.
- Ejecutar `node scripts/docs-consistency.selfcheck.mjs`.
- Tema/paleta: default `contapyme`; snippets de demo sellan `data-theme` +
  `data-palette` vía `scripts/demo-code.js` (no reinventar). Ver root `LLM.md`.

## Qué no hacer

- No inventar API ni copiar contrato de componente parecido.
- No crear abstracción si shared/native resuelve caso.
- No crear size colors; usar font-size contextual y em.
- No duplicar MD por tag multi-tag.
- No poner `color-scheme` en `:root` ni `background` de página en
  `is-base`/`palettes`. No volver el default de paleta a `insoft`.

## Errores conocidos y prevención

Duplicar overlays/position o emitir señales redundantes; reutilizar floating/toast.

Fuente manda sobre preview. Ruta preview viene de `manifest.js.page`.

Snippets CDN (`is-cdn-snippet`) ≠ snippets de demo (`demo-code.js`). El primero
lista URLs; el segundo serializa el ejemplo y **debe** incluir tema/paleta
activos. Guardián: `tests/palette-and-snippet-contract.test.mjs`.

Scripts de galería (`cdn-panel.js`): importar `dist/cdn/feedback/cdn-snippet.min.js`,
**no** `src/…/cdn-snippet.js` (arrastra `md-editor` y cuelga el boot). Ver LLM
raíz error **#43** · `tests/gallery-boot.test.mjs`.

## Módulos internos

No expone módulos internos documentales en esta categoría.

## Navegación

- [Índice global](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/LLM.md)
