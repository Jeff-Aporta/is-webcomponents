---
tag: iswc-kanban-card
tags:
  - iswc-kanban-card
category: data
status: public
source: ./kanban.ts
style: ./kanban.scss
preview: ./kanban-card.json
---
# `<iswc-kanban-card>`

## Propósito

Tarjeta de `<iswc-kanban>`. Representa un ítem movible dentro de una columna.

## Importación

```js
import './kanban.js';
```

Ese módulo registra este tag junto con `<iswc-kanban>`.

## Cuándo usarlo

Cuando el componente padre ya está en la pantalla y este tag es la pieza que le falta.

## Cuándo no usarlo

No lo reimplementes ni lo uses para sustituir al padre. La guía del padre documenta el conjunto.

## Ejemplo mínimo

```html
<iswc-kanban-card></iswc-kanban-card>
```


## API

| Atributo | Notas |
| --- | --- |
| `heading` | Título. |
| `meta` | Línea secundaria. |
| `tag` | Texto de la etiqueta. |
| `tag-color` | Color de la etiqueta. |
| `cover` | Imagen de portada. |
| `without-shadow` | Quita la sombra. |

## Eventos

| Evento | Descripción |
| --- | --- |
| _(ninguno)_ | Este sub-componente no emite eventos propios; los eventos del componente padre (<iswc-kanban>) se documentan en la ficha del padre. |

<details>
<summary>Ejemplo en vivo</summary>

```js
// Los eventos se escuchan sobre el componente padre.
const parent = document.querySelector('iswc-kanban');
parent.addEventListener('iswc-event', (e) => {
  console.log('evento del padre', e.detail);
});
```

</details>

## Comportamiento

Se arrastra entre columnas y emite `iswc-kanban-card-click` con `{ card, column }` al pulsarla.

## Accesibilidad

Refleja el arrastre en `aria-grabbed`.

## Reglas para LLM

- Va dentro de `<iswc-kanban-column>`.
- El movimiento se escucha con `iswc-kanban-move`, que emite la columna destino.
