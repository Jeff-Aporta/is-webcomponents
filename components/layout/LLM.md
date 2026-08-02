# `layout` para LLM

## Propósito

Estructura, superficies, overlays y navegación por regiones de contenido.

## Qué componente elegir

Elegir módulo mínimo que cubra necesidad. Abrir referencia específica; no inferir API desde nombre.

## Componentes

| Tags | Documento | Uso principal |
| --- | --- | --- |
| `<is-split-panel>` | [split-panel.md](split-panel.md) | Panel dividido |
| `<is-main>` | [main.md](main.md) | Main |
| `<is-card>` | [card.md](card.md) | Card |
| `<is-callout>` | [callout.md](callout.md) | Callout |
| `<is-details>` | [details.md](details.md) | Details |
| `<is-dialog>` | [dialog.md](dialog.md) | Dialog |
| `<is-drawer>` | [drawer.md](drawer.md) | Drawer |
| `<is-divider>` | [divider.md](divider.md) | Divider |
| `<is-scrollspy>` | [scrollspy.md](scrollspy.md) | Scrollspy |

## Composición y relaciones

Módulos multi-tag se documentan juntos. Parent/child mantienen contrato del mismo JS/CSS.

## Reusar antes de crear

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

Añadir tamaños rígidos u overlays custom; usar em/context y dialog/drawer.

Fuente manda sobre preview. Ruta preview viene de `manifest.js.page`.

## Módulos internos

No expone módulos internos documentales en esta categoría.

## Navegación

- [Índice global](../LLM.md)
