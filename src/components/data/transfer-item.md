---
tag: iswc-transfer-item
tags:
  - iswc-transfer-item
category: data
status: public
source: ./transfer.ts
style: ./transfer.scss
preview: ./transfer-item.json
---
# `<iswc-transfer-item>`

## Propósito

Ítem de `<iswc-transfer>`. Es una opción de la lista origen o destino, no un control suelto.

## Importación

```js
import './transfer.js';
```

Ese módulo registra este tag junto con `<iswc-transfer>`.

## Cuándo usarlo

Cuando el componente padre ya está en la pantalla y este tag es la pieza que le falta.

## Cuándo no usarlo

No lo reimplementes ni lo uses para sustituir al padre. La guía del padre documenta el conjunto.

## Ejemplo mínimo

```html
<iswc-transfer-item></iswc-transfer-item>
```


## API

| Atributo | Notas |
| --- | --- |
| `value` | Identificador del ítem. |
| `selected` | Empieza en la lista de destino. |
| `disabled` | No se puede mover. |

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

## Comportamiento

No se pinta por sí mismo: `<iswc-transfer>` lo lee y dibuja su fila en la lista de origen o de destino.

## Accesibilidad

Tiene `role="presentation"`: la fila que dibuja el padre es la que lleva `role="option"` y `aria-selected`.

## Reglas para LLM

- Va como hijo directo de `<iswc-transfer>`.
- Se lee el resultado en `values` del padre, no en los ítems.
