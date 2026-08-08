---
tag: is-full-calendar
tags:
  - is-full-calendar
category: forms
status: public
source: ./full-calendar.js
style: ./full-calendar.css
preview: ../../previews/forms/is-full-calendar.json
---
# `<is-full-calendar>`

## Propósito

Calendario con vistas de mes, semana y día, con eventos posicionados por fecha
y hora, barra de navegación propia y formateo por `Intl`.

Este módulo registra `<is-full-calendar>`.

## Cuándo usarlo

Mostrar y navegar una agenda: reservas, vencimientos, programación de tareas.

## Cuándo no usarlo

Para elegir una fecha en un formulario usar `<is-date-input>` o
`<is-date-picker>`; para un rango, `<is-date-range-input>`; para una sola
rejilla mensual sin eventos, `<is-month-calendar>`.

## Importación

```js
import './full-calendar.js';
```

## Ejemplo mínimo

```html
<is-full-calendar>
  <script type="application/json">
    { "events": [{ "id": 1, "title": "Cierre", "date": "2026-08-31", "start": "09:00" }] }
  </script>
</is-full-calendar>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `view` | `month` \| `week` \| `day` | Default `month`. |
| `date` | ISO `YYYY-MM-DD` | Fecha inicial; default hoy. |
| `first-day` | `0` \| `1` | Primer día de la semana; `0` domingo, `1` lunes (default). |
| `locale` | string | Tag `Intl` para nombres de mes y día, default `es`. |
| `hours-start` | number | Primera hora visible en `week`/`day`, default `7`. |
| `hours-end` | number | Última hora visible en `week`/`day`, default `20`. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `events` | lectura/escritura | Arreglo de eventos. Al escribirlo se repinta y sustituye lo leído del `<script>`. |

Forma de un evento: `{ id, title, date: 'YYYY-MM-DD', start: 'HH:MM', end?: 'HH:MM', color? }`.

### Slots

| Slot | Uso |
| --- | --- |
| (default) | Un `<script type="application/json">` con `{ events: [...] }`. Se lee al conectar. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-day-click` | `{ date }` | sí | sí | no |
| `is-event-click` | `{ event, date }` | sí | sí | no |
| `is-view-change` | `{ view, date }` | sí | sí | no |

`is-view-change` se emite al usar los botones de vista de la toolbar, no al
cambiar el atributo `view` por código.

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `setDate(iso)` | Fija el atributo `date`. |
| `setView(view)` | Fija el atributo `view`. |
| `prev()` | Retrocede una unidad de la vista actual. |
| `next()` | Avanza una unidad de la vista actual. |
| `today()` | Vuelve al día de hoy. |

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor. |
| `toolbar` | Barra de navegación y selector de vista. |
| `grid` | Rejilla de la vista activa. |

### Custom states

No expone custom states.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-bg-elev` | Fondo del calendario. |
| `--is-border` | Bordes de la rejilla. |
| `--is-border-soft` | Líneas internas. |
| `--is-radius` | Radio de bordes. |
| `--is-text` | Color del texto. |
| `--is-text-soft` | Días fuera del mes. |
| `--is-text-dim` | Etiquetas de hora. |
| `--is-accent` | Día de hoy y vista activa. |
| `--is-on-accent` | Contenido sobre el acento. |

El `color` de cada evento se aplica por variables locales del propio evento.

### Integración con formularios

No es form-associated: es una vista de agenda, no un campo.

## Comportamiento

- El cursor interno arranca en `date` (o hoy) y lo mueven `prev()`, `next()`
  y `today()`; la unidad de desplazamiento depende de la vista.
- La vista `month` dibuja la rejilla completa del mes respetando `first-day`.
- Las vistas `week` y `day` dibujan solo el rango `hours-start`..`hours-end`;
  un evento fuera de ese rango no se ve.
- Los clics se resuelven por delegación en la rejilla: sobre un evento se emite
  `is-event-click`, sobre el día `is-day-click`.
- Cambiar cualquier atributo observado repinta.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- [`../_shared/dom-utils.js`](../_shared/dom-utils.js)

Tags del módulo: `<is-full-calendar>`.

## Accesibilidad

Los controles de la toolbar son botones; los de navegación llevan
`aria-label` (`Anterior`, `Siguiente`). La rejilla se opera con puntero: si el
flujo debe ser navegable por teclado, exponer las mismas acciones (`prev()`,
`next()`, selección de día) desde controles propios.

## Ejemplo avanzado

```html
<is-full-calendar id="agenda" view="week" first-day="1"
                  hours-start="6" hours-end="22" locale="es-CO">
</is-full-calendar>

<script type="module">
  const agenda = document.getElementById('agenda');
  agenda.events = [
    { id: 'a', title: 'Conciliación', date: '2026-08-10', start: '08:00', end: '09:30', color: '#7048e8' },
    { id: 'b', title: 'Nómina', date: '2026-08-10', start: '14:00', end: '15:00' },
  ];
  agenda.addEventListener('is-event-click', (e) => console.log(e.detail.event.title));
  agenda.addEventListener('is-day-click', (e) => agenda.setDate(e.detail.date));
</script>
```

## Errores comunes

- Cambiar el `<script type="application/json">` tras conectar: solo se lee al
  conectar; después usar la propiedad `events`.
- Esperar `is-view-change` al hacer `setView()`: ese evento es de la toolbar.
- Fijar horas fuera de `hours-start`..`hours-end` y no ver los eventos.
- Pasar `date` en formato distinto de ISO.
- Usar tag sin importar módulo primero.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./full-calendar.js)
- [CSS](./full-calendar.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/forms/is-full-calendar.json)
