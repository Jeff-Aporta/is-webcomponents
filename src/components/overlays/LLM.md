# `overlays` para LLM

## Propósito

Superficies que se montan por encima del contenido y toman el foco: paleta de
comandos, visor de documentos y ventanas flotantes.

## Qué componente elegir

Elegir módulo mínimo que cubra necesidad. Abrir referencia específica; no inferir API desde nombre.

Para diálogos y cajones ir a [`../layout/LLM.md`](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/layout/LLM.md) (`<is-dialog>`,
`<is-drawer>`): aquí solo están los overlays con comportamiento propio.

## Componentes

| Tags | Documento | Uso principal |
| --- | --- | --- |
| `<is-command-palette>` | [command-palette.md](./command-palette.md) | Paleta de comandos |
| `<is-pdf-viewer>` | [pdf-viewer.md](./pdf-viewer.md) | Visor de PDF |
| `<is-window>` | [window.md](./window.md) | Ventana flotante |

## Composición y relaciones

Módulos multi-tag se documentan juntos. Parent/child mantienen contrato del mismo JS/CSS.

## Reusar antes de crear

- `../_shared/adopt-css.js`
- `../_shared/position.js`
- `../helpers/popup.md`
- `../media/icon.js`

## Dependencias compartidas

Revisar imports y `_shared/` antes de implementar. Reusar stdlib, plataforma y módulos existentes.

## Patrones comunes

- Importar módulo ES antes de usar tag.
- Usar propiedades para objetos/payloads y atributos declarados para escalares.
- Respetar contrato de eventos, parts, states y tokens.
- Listeners de `document`/`window` solo en `connectedCallback` / `disconnectedCallback`.

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
- No usar `will-change: transform` en superficies con zoom por `scale()`.

## Errores conocidos y prevención

Los listeners de `document`/`window` van en `connectedCallback` y se quitan en
`disconnectedCallback`: un overlay que se monta y desmonta seguido es donde más
se notan las fugas.

No usar `will-change: transform` en superficies con zoom por `scale()`: el
contenido se rasteriza a escala 1 y se ve borroso.

Fuente manda sobre preview. Ruta preview viene de `manifest.js.page`.

## Módulos internos

No expone módulos internos documentales en esta categoría.

## Navegación

- [Índice global](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/LLM.md)
