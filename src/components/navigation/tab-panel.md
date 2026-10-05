---
tag: iswc-tab-panel
tags:
  - iswc-tab-panel
category: navigation
status: public
---
# `<iswc-tab-panel>`

## Propósito

Panel de `<iswc-tab-group>`. El contenido que se muestra al activar su `<iswc-tab>`.

## Cuándo usarlo

Cuando el componente padre ya está en la pantalla y este tag es la pieza que le falta.

## Cuándo no usarlo

No lo reimplementes ni lo uses para sustituir al padre. La guía del padre documenta el conjunto.

## Ejemplo mínimo

```html
<iswc-tab-panel></iswc-tab-panel>
```


## Eventos

| Evento | Descripción |
| --- | --- |
| _(ninguno)_ | Este sub-componente no emite eventos propios; los eventos del componente padre (<iswc-tab-group>) se documentan en la ficha del padre. |

<details>
<summary>Ejemplo en vivo</summary>

```js
// Los eventos se escuchan sobre el componente padre.
const parent = document.querySelector('iswc-tab-group');
parent.addEventListener('iswc-event', (e) => {
  console.log('evento del padre', e.detail);
});
```

</details>
