---
tag: iswc-transfer-item
tags:
  - iswc-transfer-item
category: data
status: public
---
# `<iswc-transfer-item>`

## Propósito

Ítem de `<iswc-transfer>`. Es una opción de la lista origen o destino, no un control suelto.

## Cuándo usarlo

Cuando el componente padre ya está en la pantalla y este tag es la pieza que le falta.

## Cuándo no usarlo

No lo reimplementes ni lo uses para sustituir al padre. La guía del padre documenta el conjunto.

## Ejemplo mínimo

```html
<iswc-transfer-item></iswc-transfer-item>
```


## Eventos

| Evento | Descripción |
| --- | --- |
| _(ninguno)_ | Este sub-componente no emite eventos propios; los eventos del componente padre (<iswc-transfer>) se documentan en la ficha del padre. |

<details>
<summary>Ejemplo en vivo</summary>

```js
// Los eventos se escuchan sobre el componente padre.
const parent = document.querySelector('iswc-transfer');
parent.addEventListener('iswc-event', (e) => {
  console.log('evento del padre', e.detail);
});
```

</details>
