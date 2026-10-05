---
tag: iswc-tree-item
tags:
  - iswc-tree-item
category: navigation
status: public
---
# `<iswc-tree-item>`

## Propósito

Nodo de `<iswc-tree>`. Puede tener hijos y se expande dentro del árbol.

## Cuándo usarlo

Cuando el componente padre ya está en la pantalla y este tag es la pieza que le falta.

## Cuándo no usarlo

No lo reimplementes ni lo uses para sustituir al padre. La guía del padre documenta el conjunto.

## Ejemplo mínimo

```html
<iswc-tree-item></iswc-tree-item>
```


## Eventos

| Evento | Descripción |
| --- | --- |
| _(ninguno)_ | Este sub-componente no emite eventos propios; los eventos del componente padre (<iswc-tree>) se documentan en la ficha del padre. |

<details>
<summary>Ejemplo en vivo</summary>

```js
// Los eventos se escuchan sobre el componente padre.
const parent = document.querySelector('iswc-tree');
parent.addEventListener('iswc-event', (e) => {
  console.log('evento del padre', e.detail);
});
```

</details>
