---
tag: is-date-picker
tags:
  - is-date-picker
category: forms
status: public
source: ./date-picker.js
style: ./date-picker.css
preview: ../../previews/forms/is-date-picker.json
---
# `<is-date-picker>`

## Propósito

Calendario inline (DateCalendar de MUI X). Tres vistas (día, mes, año), teclado, números de semana y reglas de deshabilitado. El mes y el año del encabezado abren un is-dropdown.

Este módulo registra `<is-date-picker>`.

## Cuándo usarlo

Captura, selección y validación de valores compatibles con formularios.

## Cuándo no usarlo

No duplicar validación, form association ni pickers shared.

## Importación

```js
import './date-picker.js';
```

## Ejemplo mínimo

```html
<is-date-picker></is-date-picker>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string/según contrato | Fuente define default/restricción. |
| `mode` | string/según contrato | Fuente define default/restricción. |
| `min` | string/según contrato | Fuente define default/restricción. |
| `max` | string/según contrato | Fuente define default/restricción. |
| `locale` | string/según contrato | Fuente define default/restricción. |
| `view` | string/según contrato | Fuente define default/restricción. |
| `views` | string/según contrato | Fuente define default/restricción. |
| `open-to` | string/según contrato | Fuente define default/restricción. |
| `first-day-of-week` | string/según contrato | Fuente define default/restricción. |
| `weekday-width` | string/según contrato | Fuente define default/restricción. |
| `show-outside-days` | boolean | Fuente define default/restricción. |
| `fixed-weeks` | boolean | Fuente define default/restricción. |
| `show-week-numbers` | boolean | Fuente define default/restricción. |
| `disable-past` | boolean | Fuente define default/restricción. |
| `disable-future` | boolean | Fuente define default/restricción. |
| `disabled-dates` | string/según contrato | Fuente define default/restricción. |
| `disabled-days` | string/según contrato | Fuente define default/restricción. |
| `disabled` | boolean | Fuente define default/restricción. |
| `readonly` | boolean | Fuente define default/restricción. |
| `preview-to` | string/según contrato | Fuente define default/restricción. |
| `nav` | string/según contrato | Fuente define default/restricción. |
| `month` | string/según contrato | Fuente define default/restricción. |
| `both` | string/según contrato | Fuente define default/restricción. |
| `prev` | string/según contrato | Fuente define default/restricción. |
| `next` | string/según contrato | Fuente define default/restricción. |
| `none` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Declarada por clase. |
| `mode` | lectura/escritura | Declarada por clase. |
| `locale` | lectura/escritura | Declarada por clase. |
| `min` | lectura/escritura | Declarada por clase. |
| `max` | lectura/escritura | Declarada por clase. |
| `views` | lectura/escritura | Declarada por clase. |
| `view` | lectura/escritura | Declarada por clase. |
| `month` | lectura/escritura | Declarada por clase. |
| `previewTo` | lectura/escritura | Declarada por clase. |
| `nav` | lectura/escritura | Declarada por clase. |
| `firstDayOfWeek` | lectura/escritura | Declarada por clase. |
| `showOutsideDays` | lectura/escritura | Declarada por clase. |
| `fixedWeeks` | lectura/escritura | Declarada por clase. |
| `showWeekNumbers` | lectura/escritura | Declarada por clase. |
| `disablePast` | lectura/escritura | Declarada por clase. |
| `disableFuture` | lectura/escritura | Declarada por clase. |
| `disabled` | lectura/escritura | Declarada por clase. |
| `readonly` | lectura/escritura | Declarada por clase. |
| `disabledDates` | lectura/escritura | Declarada por clase. |
| `disabledDays` | lectura/escritura | Declarada por clase. |

### Slots

No expone.

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-view-change` | sí | sí | sí | no |
| `is-month-change` | sí | sí | sí | no |
| `is-day-hover` | sí | sí | sí | no |
| `is-change` | sí | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `showMonth()` | Método público declarado. |
| `navigate()` | Método público declarado. |
| `focusDate()` | Método público declarado. |
| `clear()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `nav` | Personalizable con `::part(nav)`. |
| `month-label` | Personalizable con `::part(month-label)`. |
| `month-select` | Personalizable con `::part(month-select)`. |
| `year-select` | Personalizable con `::part(year-select)`. |
| `weekdays` | Personalizable con `::part(weekdays)`. |
| `grid` | Personalizable con `::part(grid)`. |
| `month-view` | Personalizable con `::part(month-view)`. |
| `year-view` | Personalizable con `::part(year-view)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-dp-cols` | Token leído o definido por componente. |
| `--is-datepicker-border` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--is-datepicker-bg` | Token leído o definido por componente. |
| `--is-bg-elev` | Token leído o definido por componente. |
| `--is-datepicker-radius` | Token leído o definido por componente. |
| `--is-radius` | Token leído o definido por componente. |
| `--is-sans` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--is-shadow` | Token leído o definido por componente. |
| `--is-radius-sm` | Token leído o definido por componente. |
| `--is-control-bg-hover` | Token leído o definido por componente. |
| `--is-focus` | Token leído o definido por componente. |
| `--is-accent` | Token leído o definido por componente. |
| `--is-text-dim` | Token leído o definido por componente. |
| `--is-color-brand-500` | Token leído o definido por componente. |
| `--is-accent-bg` | Token leído o definido por componente. |
| `--is-color-brand-600` | Token leído o definido por componente. |
| `--is-on-brand` | Token leído o definido por componente. |
| `--is-year-height` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-date-picker> — Calendario inline (equivalente a DateCalendar de MUI X).
> Tres vistas: día, mes y año. El mes y el año del encabezado son triggers de
> un is-dropdown para saltar sin encadenar clics en las flechas.
> Atributos:
>   value            yyyy-mm-dd · rango: `inicio/fin`
>   mode             single | range
>   min / max        ISO
>   view             day | month | year   (vista mostrada)
>   views            subconjunto permitido, p. ej. "month year"
>   open-to          vista inicial
>   locale, first-day-of-week (0=domingo), weekday-width (narrow|short|long)
>   show-outside-days, fixed-weeks, show-week-numbers
>   disable-past, disable-future, disabled-dates="ISO,ISO", disabled-days="0,6"
>   disabled, readonly
> Events: is-change { value } | { start, end } · is-view-change { view }
>         is-month-change { month }

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/date-utils.js`](../_shared/date-utils.js)
- [`../actions/dropdown.js`](../actions/dropdown.js)
- [`./month-calendar.js`](./month-calendar.js)
- [`./year-calendar.js`](./year-calendar.js)

Tags del módulo: `<is-date-picker>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-hidden`, `aria-selected`.

## Ejemplo avanzado

```html
<is-date-picker></is-date-picker>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./date-picker.js)
- [CSS](./date-picker.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/forms/is-date-picker.json)
