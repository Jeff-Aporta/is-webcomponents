# `helpers` para LLM

## Propósito

Formato, observación y posicionamiento reutilizable sobre APIs nativas.

## Qué componente elegir

Elegir módulo mínimo que cubra necesidad. Abrir referencia específica; no inferir API desde nombre.

## Componentes

| Tags | Documento | Uso principal |
| --- | --- | --- |
| `<is-popover>` | [popover.md](popover.md) | Popover |
| `<is-relative-time>` | [relative-time.md](relative-time.md) | Tiempo relativo |
| `<is-format-date>` | [format-date.md](format-date.md) | Formato de fecha |
| `<is-format-number>` | [format-number.md](format-number.md) | Formato de número |
| `<is-format-bytes>` | [format-bytes.md](format-bytes.md) | Formato de bytes |
| `<is-intersection-observer>` | [intersection-observer.md](intersection-observer.md) | Observador de intersección |
| `<is-mutation-observer>` | [mutation-observer.md](mutation-observer.md) | Observador de mutación |
| `<is-resize-observer>` | [resize-observer.md](resize-observer.md) | Resize Observer |
| `<is-popup>` | [popup.md](popup.md) | Popup |

## Composición y relaciones

Módulos multi-tag se documentan juntos. Parent/child mantienen contrato del mismo JS/CSS.

## Reusar antes de crear

- `../_shared/position.js`
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
- No crear size variants; usar font-size contextual y em.
- No duplicar MD por tag multi-tag.

## Errores conocidos y prevención

Crear wrappers nuevos sobre Intl/Observer/position; elegir helper existente.

Fuente manda sobre preview. Ruta preview viene de `manifest.js.page`.

## Módulos internos

- `is-popup` — [popup.md](popup.md)

## Navegación

- [Índice global](../LLM.md)
