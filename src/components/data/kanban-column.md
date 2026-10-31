---
tag: iswc-kanban-column
tags:
  - iswc-kanban-column
category: data
status: public
source: ./kanban.ts
style: ./kanban.scss
preview: ./kanban-column.json
---
# `<iswc-kanban-column>`

## Propósito

Columna de `<iswc-kanban>`. Declara el estado del tablero; las tarjetas van dentro.

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
<iswc-kanban-column></iswc-kanban-column>
```


## API

| Atributo | Notas |
| --- | --- |
| `title` | Encabezado de la columna. |
| `accent` | Color de acento. |
| `badge` | Texto de la insignia del encabezado. |

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

Recibe tarjetas arrastradas y emite `iswc-kanban-move` con `{ card, from, to }`.

## Accesibilidad

Tiene `role="listitem"`. Su carril es una lista con `aria-label` que dice el título y el número de tarjetas.

## Reglas para LLM

- Va dentro de `<iswc-kanban>`.
- `accent` acepta un token: `var(--iswc-color-warning)`.
