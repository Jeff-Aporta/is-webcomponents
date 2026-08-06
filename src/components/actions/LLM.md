# `actions` para LLM

## Propósito

Acciones, selección de comandos y menús interactivos.

## Qué componente elegir

Elegir módulo mínimo que cubra necesidad. Abrir referencia específica; no inferir API desde nombre.

## Componentes

| Tags | Documento | Uso principal |
| --- | --- | --- |
| `<is-button>` | [button.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/actions/button.md) | Button |
| `<is-button-group>` | [button-group.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/actions/button-group.md) | Button Group |
| `<is-copy-button>` | [copy-button.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/actions/copy-button.md) | Copy Button |
| `<is-check-icon-button>` | [check-icon-button.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/actions/check-icon-button.md) | Check Icon Button |
| `<is-dropdown>` | [dropdown.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/actions/dropdown.md) | Dropdown |
| `<is-dropdown-item>` | [dropdown-item.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/actions/dropdown-item.md) | Dropdown Item |
| `<is-fab>` | [fab.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/actions/fab.md) | Floating Action Button |

## Composición y relaciones

Módulos multi-tag se documentan juntos. Parent/child mantienen contrato del mismo JS/CSS.

## Reusar antes de crear

- `../media/icon.js`
- `../helpers/floating.js`
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
- No crear size colors; usar font-size contextual y em.
- No duplicar MD por tag multi-tag.

## Errores conocidos y prevención

Confundir acción, navegación y selección; revisar semántica button/link/menu.

Fuente manda sobre preview. Ruta preview viene de `manifest.js.page`.

### Color × appearance (`is-button`)

**Hacer**
- `color` → roles `--_tone-*` (tokens relativos de `is-base` / `palettes`).
- `variant` → solo `--_tone-*` (reglas genéricas `[color][variant=…]`).
- Color nuevo = una regla de enlace. Appearance nueva = una regla de variant.
- Fallback: `var(--is-color-X-strong, #hex)` en el sitio de uso.

**No hacer**
- Matriz N×M `:host([color=X][variant=Y])` por cada celda.
- Pedir `--is-color-*-600` / `-500` (el tema ya no los define → filled/outlined transparentes sin error).
- Hex de marca distinto en filled vs outlined (filled azul / outlined rojo).

Guardián: `tests/button-color-appearance.test.mjs`. Detalle: `LLM.md` error **30**.

## Módulos internos

No expone módulos internos documentales en esta categoría.

## Navegación

- [Índice global](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/LLM.md)
