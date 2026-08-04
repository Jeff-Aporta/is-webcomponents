# `feedback` para LLM

## Propósito

Estado, progreso, confirmación, carga o resultado de operaciones.

## Qué componente elegir

Elegir módulo mínimo que cubra necesidad. Abrir referencia específica; no inferir API desde nombre.

## Componentes

| Tags | Documento | Uso principal |
| --- | --- | --- |
| `<is-spinner>` | [spinner.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/feedback/spinner.md) | Spinner |
| `<is-badge>` | [badge.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/feedback/badge.md) | Badge |
| `<is-tag>` | [tag.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/feedback/tag.md) | Tag |
| `<is-skeleton>` | [skeleton.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/feedback/skeleton.md) | Skeleton |
| `<is-progress-bar>` | [progress-bar.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/feedback/progress-bar.md) | Progress Bar |
| `<is-progress-ring>` | [progress-ring.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/feedback/progress-ring.md) | Progress Ring |
| `<is-theme-toggle>` | [theme-toggle.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/feedback/theme-toggle.md) | Theme Toggle |
| `<is-toast>` | [toast.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/feedback/toast.md) | Toast |
| `<is-toast-item>` | [toast-item.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/feedback/toast-item.md) | Toast Item |
| `<is-tooltip>` | [tooltip.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/feedback/tooltip.md) | Tooltip |
| `<is-cdn-snippet>` | [cdn-snippet.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/feedback/cdn-snippet.md) | CDN Snippet |
| `<is-popconfirm>` | [popconfirm.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/feedback/popconfirm.md) | Popconfirm |

## Composición y relaciones

Módulos multi-tag se documentan juntos. Parent/child mantienen contrato del mismo JS/CSS.

## Reusar antes de crear

- `../helpers/popup.js`
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

## Qué no hacer

- No inventar API ni copiar contrato de componente parecido.
- No crear abstracción si shared/native resuelve caso.
- No crear size colors; usar font-size contextual y em.
- No duplicar MD por tag multi-tag.

## Errores conocidos y prevención

Duplicar overlays/position o emitir señales redundantes; reutilizar popup/toast.

Fuente manda sobre preview. Ruta preview viene de `manifest.js.page`.

## Módulos internos

No expone módulos internos documentales en esta categoría.

## Navegación

- [Índice global](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/LLM.md)
