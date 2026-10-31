---
tag: iswc-carousel-item
tags:
  - iswc-carousel-item
category: navigation
status: public
source: ./carousel.ts
style: ./carousel.scss
preview: ./carousel-item.json
---
# `<iswc-carousel-item>`

## Propósito

Lámina de `<iswc-carousel>`. Un paso del carrusel; el grupo controla el avance.

## Importación

```js
import './carousel.js';
```

Ese módulo registra este tag junto con `<iswc-carousel>`.

## Cuándo usarlo

Cuando el componente padre ya está en la pantalla y este tag es la pieza que le falta.

## Cuándo no usarlo

No lo reimplementes ni lo uses para sustituir al padre. La guía del padre documenta el conjunto.

## Ejemplo mínimo

```html
<iswc-carousel-item label="Portada"><img src="a.jpg" alt="Portada"></iswc-carousel-item>
```

## Atributos

| Atributo | Notas |
| --- | --- |
| `label` | Nombre de la diapositiva para lectores de pantalla. |

## Slots

| Slot | Uso |
| --- | --- |
| `(default)` | Contenido de la diapositiva. |

## CSS parts

`base`.

## Eventos

| Evento | Descripción |
| --- | --- |
| _(ninguno)_ | Este sub-componente no emite eventos propios; los eventos del componente padre (<iswc-carousel>) se documentan en la ficha del padre. |

<details>
<summary>Ejemplo en vivo</summary>

```js
// Los eventos se escuchan sobre el componente padre.
const parent = document.querySelector('iswc-carousel');
parent.addEventListener('iswc-event', (e) => {
  console.log('evento del padre', e.detail);
});
```

</details>

## Comportamiento

Es una diapositiva: el carrusel la dimensiona, la numera y decide cuál se ve.

## Accesibilidad

El carrusel enlaza cada indicador con su diapositiva con `aria-controls` y anuncia el cambio con `aria-live="polite"` en el viewport.

## Reglas para LLM

- Va como hijo directo de `<iswc-carousel>`.
- La posición activa se elige con `active` del carrusel, no aquí.
