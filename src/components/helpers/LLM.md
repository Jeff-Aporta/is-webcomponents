# `helpers` para LLM

## Propósito

Formato, observación y posicionamiento reutilizable sobre APIs nativas.

## Qué componente elegir

Elegir módulo mínimo que cubra necesidad. Abrir referencia específica; no inferir API desde nombre.

## Componentes

| Tags | Documento | Uso principal |
| --- | --- | --- |
| `is-ui` · `IsUi` (módulo) | [ui.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/helpers/ui.md) | Plantilla `html` / CSS / `define` para apps |
| `<is-popover>` | [popover.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/helpers/popover.md) | Popover |
| `<is-format>` | [format.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/helpers/format.md) | Formato unificado (date/number/bytes/relative) |
| `<is-relative-time>` | [relative-time.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/helpers/relative-time.md) | Tiempo relativo (alias) |
| `<is-format-date>` | [format-date.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/helpers/format-date.md) | Formato de fecha (alias) |
| `<is-format-number>` | [format-number.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/helpers/format-number.md) | Formato de número (alias) |
| `<is-format-bytes>` | [format-bytes.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/helpers/format-bytes.md) | Formato de bytes (alias) |
| `<is-observer>` | [observer.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/helpers/observer.md) | Observer unificado (intersection/mutation/resize) |
| `<is-intersection-observer>` | [intersection-observer.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/helpers/intersection-observer.md) | Observador de intersección (alias) |
| `<is-mutation-observer>` | [mutation-observer.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/helpers/mutation-observer.md) | Observador de mutación (alias) |
| `<is-resize-observer>` | [resize-observer.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/helpers/resize-observer.md) | Resize Observer (alias) |
| `<is-lightbox>` | (diagrams/lightbox) | Lightbox en categoría helpers del nav |

## Composición y relaciones

Módulos multi-tag se documentan juntos. Parent/child mantienen contrato del mismo JS/CSS.

## Reusar antes de crear

- `../_shared/position.js`
- `../_shared/prefs.js`
- `../_shared/adopt-css.js` (kit interno; los `is-*` lo usan con `.css` hermano)
- `IsUi.adoptCss` en apps ([ui.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/helpers/ui.md)) — mismo contrato, sin embeber CSS en el JS

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

Crear wrappers nuevos sobre Intl/Observer/position; elegir helper existente.

Fuente manda sobre preview. Ruta preview viene de `manifest.js.page`.

## Módulos internos

- `is-floating` — building block interno de posicionamiento. No es API pública; usar `<is-popover>` / `<is-tooltip>`.
## Navegación

- [Índice global](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/LLM.md)
