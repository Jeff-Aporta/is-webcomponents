# `actions` para LLM

## Propósito

Acciones, selección de comandos y menús interactivos.

## Qué componente elegir

Elegir módulo mínimo que cubra necesidad. Abrir referencia específica; no inferir API desde nombre.

## Componentes

| Tags | Documento | Uso principal |
| --- | --- | --- |
| `<is-button>` | [button.md](button.md) | Button |
| `<is-button-group>` | [button-group.md](button-group.md) | Button Group |
| `<is-copy-button>` | [copy-button.md](copy-button.md) | Copy Button |
| `<is-check-icon-button>` | [check-icon-button.md](check-icon-button.md) | Check Icon Button |
| `<is-dropdown>` | [dropdown.md](dropdown.md) | Dropdown |
| `<is-dropdown-item>` | [dropdown-item.md](dropdown-item.md) | Dropdown Item |
| `<is-fab>` | [fab.md](fab.md) | Floating Action Button |

## Composición y relaciones

Módulos multi-tag se documentan juntos. Parent/child mantienen contrato del mismo JS/CSS.

## Reusar antes de crear

- `../media/icon.js`
- `../helpers/popup.js`
- `../_shared/adopt-css.js`
- `../_shared/position.js`

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

Confundir acción, navegación y selección; revisar semántica button/link/menu.

Fuente manda sobre preview. Ruta preview viene de `manifest.js.page`.

## Módulos internos

No expone módulos internos documentales en esta categoría.

## Navegación

- [Índice global](../LLM.md)
