---
tag: iswc-examples-carousel
tags:
  - iswc-examples-carousel
category: preview
status: internal
source: ./examples-carousel.ts
style: ./examples-carousel.scss
preview: ./examples-carousel.json
---
# `<iswc-examples-carousel>` — Carrusel de ejemplos predefinidos (W15)

Estandar W15: cada playground debe incluir un carrusel de ejemplos
predefinidos. Cada card contiene una **instancia real** del componente target
(escalada via CSS para caber en el card) y, al hacer click, aplica los props
del ejemplo al host target en la misma pagina.

## Propósito

Carrusel de ejemplos predefinidos de un playground. Cada tarjeta contiene una instancia real del componente y, al pulsarla, aplica sus props al host `target`.

## Cuándo usarlo

En un demo con combinaciones que conviene enseñar de un clic.

## Cuándo no usarlo

No es un carrusel de contenido: para eso está `<iswc-carousel>`. No va en vistas de producto.

## Importación

```js
import './examples-carousel.js';
```

## Ejemplo mínimo

```html
<iswc-examples-carousel tag="iswc-button" target="#demo"
  examples='[{ "label": "Primario", "props": { "color": "brand" }, "text": "Primario" }]'>
</iswc-examples-carousel>
```

## Uso (data-driven)

```html
<iswc-examples-carousel
  tag="iswc-button"
  target="#playground-btn"
  label="Ejemplos predefinidos"
  examples='[
    { "label": "Primario",   "props": { "color": "brand",   "variant": "filled"   }, "text": "Primario"   },
    { "label": "Secundario", "props": { "color": "success", "variant": "outlined" }, "text": "Secundario" },
    { "label": "Peligro",    "props": { "color": "danger",  "variant": "filled"   }, "text": "Peligro"    }
  ]'>
</iswc-examples-carousel>
```

## Modo inline (hijos)

Alternativa: cada hijo con `data-label` es un ejemplo. Los props se leen de
`data-props` (JSON).

```html
<iswc-examples-carousel tag="iswc-button" target="#playground-btn" label="Inline">
  <span data-label="Primario"   data-props='{"color":"brand",  "variant":"filled"}'   data-text="Primario"></span>
  <span data-label="Secundario" data-props='{"color":"neutral","variant":"outlined"}' data-text="Secundario"></span>
</iswc-examples-carousel>
```

## Atributos

- `tag` — Tag del componente target. **Requerido**.
- `target` — Selector CSS del host en la misma pagina al que aplicar los props.
- `label` — Titulo del header.
- `lede` — Subtitulo opcional.
- `default-index` — Indice del ejemplo activo al inicio.

## Eventos

- `iswc-examples-pick` — `detail: { example, index, applied }`. Se emite al
  hacer click en una card. `applied=true` si se pudo aplicar al target.

## Comportamiento

Filtra por categoría y emite `iswc-examples-category`. Al elegir un ejemplo emite `iswc-examples-pick` con `{ example, index, applied }`.

## Accesibilidad

La pista es una lista rotulada. Cada tarjeta tiene `aria-label` y `aria-pressed`, y las flechas `aria-label`.

## Reglas para LLM

- Solo para demos.
- `target` debe existir en la misma página.
- El cálculo de los ejemplos no va en el HTML del demo: se declara en el `.json`.
