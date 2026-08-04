# `overlays` para LLM

## Propósito

Superficies que se montan por encima del contenido y toman el foco: paleta de
comandos, visor de documentos y ventanas flotantes.

## Qué componente elegir

Elegir módulo mínimo que cubra necesidad. Abrir referencia específica; no inferir API desde nombre.

Para diálogos y cajones ir a [`../layout/`](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/layout/LLM.md) (`<is-dialog>`,
`<is-drawer>`): aquí solo están los overlays con comportamiento propio.

## Componentes

| Tags | Documento | Uso principal |
| --- | --- | --- |
| `<is-command-palette>` | [command-palette.js](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/overlays/command-palette.js) | Paleta de comandos |
| `<is-pdf-viewer>` | [pdf-viewer.js](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/overlays/pdf-viewer.js) | Visor de PDF |
| `<is-window>` | [window.js](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/overlays/window.js) | Ventana flotante |

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

- [Índice global](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/LLM.md)
