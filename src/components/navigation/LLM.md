# `navigation` para LLM

## Propósito

Orientación, movimiento entre vistas y navegación jerárquica o secuencial.

## Qué componente elegir

Elegir módulo mínimo que cubra necesidad. Abrir referencia específica; no inferir API desde nombre.

## Componentes

| Tags | Documento | Uso principal |
| --- | --- | --- |
| `<is-breadcrumb>` | [breadcrumb.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/navigation/breadcrumb.md) | Breadcrumb |
| `<is-breadcrumb-item>` | [breadcrumb-item.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/navigation/breadcrumb-item.md) | Breadcrumb Item |
| `<is-tab-group>`, `<is-tab>`, `<is-tab-panel>` | [tab-group.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/navigation/tab-group.md) | Tab Group |
| `<is-scroller>` | [scroller.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/navigation/scroller.md) | Scroller |
| `<is-carousel>`, `<is-carousel-item>` | [carousel.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/navigation/carousel.md) | Carousel |
| `<is-tree>`, `<is-tree-item>` | [tree.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/navigation/tree.md) | Tree |
| `<is-stepper>`, `<is-stepper-step>` | [stepper.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/navigation/stepper.md) | Stepper |
| `<is-mega-menu>` | [mega-menu.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/navigation/mega-menu.md) | Mega-menú multicolumna |

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

Separar tags children o romper teclado/ARIA; mantener parent-child.

Fuente manda sobre preview. Ruta preview viene de `manifest.js.page`.

## Módulos internos

No expone módulos internos documentales en esta categoría.

## Navegación

- [Índice global](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/LLM.md)
