---
tag: iswc-tab-panel
tags:
  - iswc-tab-panel
category: navigation
status: public
source: ./tab-group.ts
style: ./tab-group.scss
preview: ./tab-panel.json
---
# `<iswc-tab-panel>`

## Propósito

Panel de `<iswc-tab-group>`. El contenido que se muestra al activar su `<iswc-tab>`.

## Importación

```js
import './tab-group.js';
```

Ese módulo registra este tag junto con `<iswc-tab-group>`.

## Cuándo usarlo

Cuando el componente padre ya está en la pantalla y este tag es la pieza que le falta.

## Cuándo no usarlo

No lo reimplementes ni lo uses para sustituir al padre. La guía del padre documenta el conjunto.

## Ejemplo mínimo

```html
<iswc-tab-panel name="datos">Contenido</iswc-tab-panel>
```

## Atributos

| Atributo | Notas |
| --- | --- |
| `name` | Coincide con el `panel` de su pestaña. |

## Slots

| Slot | Uso |
| --- | --- |
| `(default)` | Contenido del panel. |

## CSS parts

`base`.

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

## Comportamiento

El grupo muestra solo el panel cuyo `name` coincide con la pestaña activa y oculta los demás.

## Accesibilidad

El grupo enlaza cada panel con su pestaña mediante `aria-labelledby`.

## Reglas para LLM

- Va dentro de `<iswc-tab-group>` y su `name` debe coincidir con el `panel` de una pestaña.
- Un panel sin pestaña no se abre nunca.
