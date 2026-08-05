# `layout` para LLM

## Propósito

Estructura, superficies, overlays y navegación por regiones de contenido.

## Qué componente elegir

Elegir módulo mínimo que cubra necesidad. Abrir referencia específica; no inferir API desde nombre.

## Componentes

| Tags | Documento | Uso principal |
| --- | --- | --- |
| `<is-split-panel>` | [split-panel.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/layout/split-panel.md) | Panel dividido |
| `<is-main>` | [main.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/layout/main.md) | Main |
| `<is-card>` | [card.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/layout/card.md) | Card |
| `<is-callout>` | [callout.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/layout/callout.md) | Callout |
| `<is-details>` | [details.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/layout/details.md) | Details |
| `<is-dialog>` | [dialog.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/layout/dialog.md) | Dialog |
| `<is-drawer>` | [drawer.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/layout/drawer.md) | Drawer |
| `<is-divider>` | [divider.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/layout/divider.md) | Divider |
| `<is-scrollspy>` | [scrollspy.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/layout/scrollspy.md) | Scrollspy |

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
- No crear size colors; usar font-size contextual y em.
- No duplicar MD por tag multi-tag.

## Errores conocidos y prevención

Añadir tamaños rígidos u overlays custom; usar em/context y dialog/drawer.

Fuente manda sobre preview. Ruta preview viene de `manifest.js.page`.

## Módulos internos

No expone módulos internos documentales en esta categoría.

## Navegación

- [Índice global](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/LLM.md)
