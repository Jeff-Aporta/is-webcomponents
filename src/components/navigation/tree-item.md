---
tag: iswc-tree-item
tags:
  - iswc-tree-item
category: navigation
status: public
source: ./tree.ts
style: ./tree.scss
preview: ./tree-item.json
---
# `<iswc-tree-item>`

## Propósito

Nodo de `<iswc-tree>`. Puede tener hijos y se expande dentro del árbol.

## Importación

```js
import './tree.js';
```

Ese módulo registra este tag junto con `<iswc-tree>`.

## Cuándo usarlo

Cuando el componente padre ya está en la pantalla y este tag es la pieza que le falta.

## Cuándo no usarlo

No lo reimplementes ni lo uses para sustituir al padre. La guía del padre documenta el conjunto.

## Ejemplo mínimo

```html
<iswc-tree-item expanded>Carpeta<iswc-tree-item>Archivo</iswc-tree-item></iswc-tree-item>
```

## Atributos

| Atributo | Notas |
| --- | --- |
| `expanded` | Muestra sus hijos. |
| `selected` | Marca el nodo. |
| `disabled` | Bloquea el nodo. |
| `has-children` | Muestra el chevrón antes de cargar hijos. |
| `lazy` | Hijos a demanda. |

## Slots

| Slot | Uso |
| --- | --- |
| `(default)` | Etiqueta. Los `iswc-tree-item` hijos pasan solos al panel plegable. |
| `icon` | Ícono a la izquierda. |
| `expand-icon` | Chevrón propio. |
| `checkbox` | Casilla propia (solo `selection="multiple"`). |

## CSS parts

`item`, `expand-toggle`, `checkbox`, `icon`, `item-content`, `item-children`.

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

## Comportamiento

Se anida dentro de otro `iswc-tree-item` para crear ramas. `expanded` abre la rama y `selected` lo marca.

## Accesibilidad

El árbol le da `role="treeitem"`, `aria-level`, `aria-setsize`, `aria-posinset`, `aria-selected` y, si tiene hijos, `aria-expanded`.

## Reglas para LLM

- Va dentro de `<iswc-tree>` o de otro `iswc-tree-item`.
- La selección se escucha en el árbol con `iswc-tree-select`.
