---
tag: iswc-dock-item
tags:
  - iswc-dock-item
category: layout
status: public
---
# `<iswc-dock-item>`

## Propósito

Ítem de `<iswc-dock>`. Un acceso del dock, con icono y acción.

## Cuándo usarlo

Cuando el componente padre ya está en la pantalla y este tag es la pieza que le falta.

## Cuándo no usarlo

No lo reimplementes ni lo uses para sustituir al padre. La guía del padre documenta el conjunto.

## Ejemplo mínimo

```html
<iswc-dock-item></iswc-dock-item>
```


## Eventos

| Evento | Descripción |
| --- | --- |
| _(ninguno)_ | Este sub-componente no emite eventos propios; los eventos del componente padre (<iswc-dock>) se documentan en la ficha del padre. |

<details>
<summary>Ejemplo en vivo</summary>

```js
// Los eventos se escuchan sobre el componente padre.
const parent = document.querySelector('iswc-dock');
parent.addEventListener('iswc-event', (e) => {
  console.log('evento del padre', e.detail);
});
```

</details>
