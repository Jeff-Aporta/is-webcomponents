---
tag: iswc-playground
tags:
  - iswc-playground
category: preview
status: public
source: ./playground.ts
style: ./playground.scss
preview: ./playground.json
---
# `<iswc-playground>`

## Propósito

Playground homogeneo (stage + knobs) para galeria y apps. CDN.

## Cuándo usarlo

Cuando una app o una ficha necesita un escenario con controles fuera de la galería.

## Cuándo no usarlo

Dentro de un `.json` `iswc-preview/v1` no hace falta: el bloque `demo` con `controls` ya trae el playground.

## Ejemplo mínimo

```html
<iswc-playground title="Playground" target="iswc-button">
  <iswc-button slot="stage">Hola</iswc-button>
</iswc-playground>
```

## Importación

```js
import './playground.js';
```

## API

| Atributo | Notas |
| --- | --- |
| `layout` | `split` (default) \| `panel` |
| `title` | Titulo (default Playground) |
| `lede` | Subtitulo |
| `target` | Selector del host en `slot=stage` |
| `spec` | Array de controles (propiedad JS) |

Slots: `stage`, `spec` (`script type=application/json`).

Evento: `iswc-controls-change` `{ def, valor }`.


## Eventos

| Evento | Descripción |
| --- | --- |
| `iswc-controls-change` | Emitido al cambiar el valor de un control del playground. |

<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-playground');
el.addEventListener('iswc-controls-change', (e) => {
  console.log('iswc-controls-change', e.detail);
});
```

</details>


### CSS parts

| Part | Uso |
| --- | --- |
| `body` | Cuerpo del componente. |
| `config` | Panel de configuración. |
| `controls` | Fila de controles. |
| `head` | Cabecera. |
| `lede` | Párrafo introductorio bajo el título. |
| `root` | Personalizable con `::part(root)`. |
| `stage` | Escenario donde se renderiza el contenido. |
| `stage-wrap` | Contenedor del escenario. |
| `title` | Título del playground. |

## Comportamiento

Monta el escenario y sus controles, aplica cada cambio al `target` y emite `iswc-controls-change`.

## Accesibilidad

Los controles son `iswc-*` con su rótulo. El editor de CSS tiene `aria-label`.

## Reglas para LLM

- `target` apunta a un host dentro de `slot="stage"`.
- La lista de controles va por `spec`.
