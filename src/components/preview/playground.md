---
tag: iswc-playground
tags:
  - iswc-playground
category: preview
status: public
source: ./playground.ts
style: ./playground.css
preview: ./playground.json
---
# `<iswc-playground>`

## Proposito

Playground homogeneo (stage + knobs) para galeria y apps. CDN.

## Importacion

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

| Evento | DescripciÃ³n |
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
| `config` | Panel de configuraciÃ³n. |
| `controls` | Fila de controles. |
| `head` | Cabecera. |
| `lede` | PÃ¡rrafo introductorio bajo el tÃ­tulo. |
| `root` | Personalizable con `::part(root)`. |
| `stage` | Escenario donde se renderiza el contenido. |
| `stage-wrap` | Contenedor del escenario. |
| `title` | TÃ­tulo del playground. |
