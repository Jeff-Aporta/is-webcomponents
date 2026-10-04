---
tag: iswc-full-calendar
tags:
  - iswc-full-calendar
category: forms
status: public
source: ./full-calendar.ts
style: ./full-calendar.css
preview: ./full-calendar.json
---
# `<iswc-full-calendar>`

## PropÃ³sito

Calendario con vistas de mes, semana y dÃ­a, con eventos posicionados por fecha
y hora, barra de navegaciÃ³n propia y formateo por `Intl`.

Este mÃ³dulo registra `<iswc-full-calendar>`.

## CuÃ¡ndo usarlo

Mostrar y navegar una agenda: reservas, vencimientos, programaciÃ³n de tareas.

## CuÃ¡ndo no usarlo

Para elegir una fecha en un formulario usar `<iswc-date-input>` o
`<iswc-date-picker>`; para un rango, `<iswc-date-range-input>`; para una sola
rejilla mensual sin eventos, `<iswc-month-calendar>`.

## ImportaciÃ³n

```js
import './full-calendar.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-full-calendar>
  <script type="application/json">
    { "events": [{ "id": 1, "title": "Cierre", "date": "2026-08-31", "start": "09:00" }] }
  </script>
</iswc-full-calendar>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `view` | `month` \| `week` \| `day` | Default `month`. |
| `date` | ISO `YYYY-MM-DD` | Fecha inicial; default hoy. |
| `first-day` | `0` \| `1` | Primer dÃ­a de la semana; `0` domingo, `1` lunes (default). |
| `locale` | string | Tag `Intl` para nombres de mes y dÃ­a, default `es`. |
| `hours-start` | number | Primera hora visible en `week`/`day`, default `7`. |
| `hours-end` | number | Ãšltima hora visible en `week`/`day`, default `20`. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `events` | lectura/escritura | Arreglo de eventos. Al escribirlo se repinta y sustituye lo leÃ­do del `<script>`. |

Forma de un evento: `{ id, title, date: 'YYYY-MM-DD', start: 'HH:MM', end?: 'HH:MM', color? }`.

### Slots

| Slot | Uso |
| --- | --- |
| (default) | Un `<script type="application/json">` con `{ events: [...] }`. Se lee al conectar. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-day-click` | Evento personalizado del componente (day click). |
| `iswc-event-click` | Evento personalizado del componente (event click). |
| `iswc-view-change` | Evento personalizado del componente (view change). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-day-click` | `{ date }` | sÃ­ | sÃ­ | no |
| `iswc-event-click` | `{ event, date }` | sÃ­ | sÃ­ | no |
| `iswc-view-change` | `{ view, date }` | sÃ­ | sÃ­ | no |

`iswc-view-change` se emite al usar los botones de vista de la toolbar, no al
cambiar el atributo `view` por cÃ³digo.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-full-calendar');
el.addEventListener('iswc-day-click', (e) => {
  console.log('iswc-day-click', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `setDate(iso)` | Fija el atributo `date`. |
| `setView(view)` | Fija el atributo `view`. |
| `prev()` | Retrocede una unidad de la vista actual. |
| `next()` | Avanza una unidad de la vista actual. |
| `today()` | Vuelve al dÃ­a de hoy. |

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor. |
| `toolbar` | Barra de navegaciÃ³n y selector de vista. |
| `grid` | Rejilla de la vista activa. |

### Custom states

No expone custom states.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-bg-elev` | Fondo del calendario. |
| `--iswc-border` | Bordes de la rejilla. |
| `--iswc-border-soft` | LÃ­neas internas. |
| `--iswc-radius` | Radio de bordes. |
| `--iswc-text` | Color del texto. |
| `--iswc-text-soft` | DÃ­as fuera del mes. |
| `--iswc-text-dim` | Etiquetas de hora. |
| `--iswc-accent` | DÃ­a de hoy y vista activa. |
| `--iswc-on-accent` | Contenido sobre el acento. |

El `color` de cada evento se aplica por variables locales del propio evento.

### IntegraciÃ³n con formularios

No es form-associated: es una vista de agenda, no un campo.

## Comportamiento

- El cursor interno arranca en `date` (o hoy) y lo mueven `prev()`, `next()`
  y `today()`; la unidad de desplazamiento depende de la vista.
- La vista `month` dibuja la rejilla completa del mes respetando `first-day`.
- Las vistas `week` y `day` dibujan solo el rango `hours-start`..`hours-end`;
  un evento fuera de ese rango no se ve.
- Los clics se resuelven por delegaciÃ³n en la rejilla: sobre un evento se emite
  `iswc-event-click`, sobre el dÃ­a `iswc-day-click`.
- Cambiar cualquier atributo observado repinta.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- [`../_shared/dom-utils.js`](../_shared/dom-utils.js)

Tags del mÃ³dulo: `<iswc-full-calendar>`.

## Accesibilidad

Los controles de la toolbar son botones; los de navegaciÃ³n llevan
`aria-label` (`Anterior`, `Siguiente`). La rejilla se opera con puntero: si el
flujo debe ser navegable por teclado, exponer las mismas acciones (`prev()`,
`next()`, selecciÃ³n de dÃ­a) desde controles propios.

## Ejemplo avanzado

```html
<iswc-full-calendar id="agenda" view="week" first-day="1"
                  hours-start="6" hours-end="22" locale="es-CO">
</iswc-full-calendar>

<script type="module">
  const agenda = document.getElementById('agenda');
  agenda.events = [
    { id: 'a', title: 'ConciliaciÃ³n', date: '2026-08-10', start: '08:00', end: '09:30', color: '#7048e8' },
    { id: 'b', title: 'NÃ³mina', date: '2026-08-10', start: '14:00', end: '15:00' },
  ];
  agenda.addEventListener('iswc-event-click', (e) => console.log(e.detail.event.title));
  agenda.addEventListener('iswc-day-click', (e) => agenda.setDate(e.detail.date));
</script>
```

## Errores comunes

- Cambiar el `<script type="application/json">` tras conectar: solo se lee al
  conectar; despuÃ©s usar la propiedad `events`.
- Esperar `iswc-view-change` al hacer `setView()`: ese evento es de la toolbar.
- Fijar horas fuera de `hours-start`..`hours-end` y no ver los eventos.
- Pasar `date` en formato distinto de ISO.
- Usar tag sin importar mÃ³dulo primero.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./full-calendar.ts)
- [CSS](./full-calendar.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./full-calendar.json)
