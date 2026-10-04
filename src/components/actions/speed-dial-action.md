---
tag: iswc-speed-dial-action
tags:
  - iswc-speed-dial-action
category: actions
status: public
---
# `<iswc-speed-dial-action>`

## Propósito

Acción hija de `<iswc-speed-dial>`. No se usa sola: vive dentro del speed dial y dispara su comando.

## Cuándo usarlo

Cuando el componente padre ya está en la pantalla y este tag es la pieza que le falta.

## Cuándo no usarlo

No lo reimplementes ni lo uses para sustituir al padre. La guía del padre documenta el conjunto.

## Ejemplo mínimo

```html
<iswc-speed-dial-action></iswc-speed-dial-action>
```


## Eventos

| Evento | Descripción |
| --- | --- |
| _(ninguno)_ | Este sub-componente no emite eventos propios; los eventos del componente padre (<iswc-speed-dial>) se documentan en la ficha del padre. |

<details>
<summary>Ejemplo en vivo</summary>

```js
// Los eventos se escuchan sobre el componente padre.
const parent = document.querySelector('iswc-speed-dial');
parent.addEventListener('iswc-event', (e) => {
  console.log('evento del padre', e.detail);
});
```

</details>
