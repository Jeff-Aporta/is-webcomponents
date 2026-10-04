---
tag: iswc-date-picker
tags:
  - iswc-date-picker
category: forms
status: public
source: ./date-picker.ts
style: ./date-picker.css
preview: ./date-picker.json
---
# `<iswc-date-picker>`

## PropÃ³sito

Calendario inline (DateCalendar de MUI X). Tres vistas (dÃ­a, mes, aÃ±o), teclado, nÃºmeros de semana y reglas de deshabilitado. El mes y el aÃ±o del encabezado abren un iswc-dropdown.

Este mÃ³dulo registra `<iswc-date-picker>`.

## CuÃ¡ndo usarlo

Captura, selecciÃ³n y validaciÃ³n de valores compatibles con formularios.

## CuÃ¡ndo no usarlo

No duplicar validaciÃ³n, form association ni pickers shared.

## ImportaciÃ³n

```js
import './date-picker.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-date-picker></iswc-date-picker>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `mode` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `min` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `max` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `locale` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `view` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `views` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `open-to` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `first-day-of-week` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `weekday-width` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `show-outside-days` | boolean | Fuente define default/restricciÃ³n. |
| `fixed-weeks` | boolean | Fuente define default/restricciÃ³n. |
| `show-week-numbers` | boolean | Fuente define default/restricciÃ³n. |
| `disable-past` | boolean | Fuente define default/restricciÃ³n. |
| `disable-future` | boolean | Fuente define default/restricciÃ³n. |
| `disabled-dates` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `disabled-days` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `disabled` | boolean | Fuente define default/restricciÃ³n. |
| `readonly` | boolean | Fuente define default/restricciÃ³n. |
| `preview-to` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `nav` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `month` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `both` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `prev` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `next` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `none` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

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


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-view-change` | Evento personalizado del componente (view change). |
| `iswc-month-change` | Evento personalizado del componente (month change). |
| `iswc-day-hover` | Evento personalizado del componente (day hover). |
| `iswc-change` | Emitido al confirmar el cambio de valor (escribe como `change` nativo). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-view-change` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-month-change` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-day-hover` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-change` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-date-picker');
el.addEventListener('iswc-view-change', (e) => {
  console.log('iswc-view-change', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `showMonth()` | MÃ©todo pÃºblico declarado. |
| `navigate()` | MÃ©todo pÃºblico declarado. |
| `focusDate()` | MÃ©todo pÃºblico declarado. |
| `clear()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

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
| `day` | Cada celda de dÃ­a en la grilla. |
| `week-number` | Columna de nÃºmero de semana. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-dp-cols` | Token leÃ­do o definido por componente. |
| `--iswc-datepicker-border` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |
| `--iswc-datepicker-bg` | Token leÃ­do o definido por componente. |
| `--iswc-bg-elev` | Token leÃ­do o definido por componente. |
| `--iswc-datepicker-radius` | Token leÃ­do o definido por componente. |
| `--iswc-radius` | Token leÃ­do o definido por componente. |
| `--iswc-sans` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--iswc-shadow` | Token leÃ­do o definido por componente. |
| `--iswc-radius-sm` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg-hover` | Token leÃ­do o definido por componente. |
| `--iswc-focus` | Token leÃ­do o definido por componente. |
| `--iswc-accent` | Token leÃ­do o definido por componente. |
| `--iswc-text-dim` | Token leÃ­do o definido por componente. |
| `--iswc-color-brand-500` | Token leÃ­do o definido por componente. |
| `--iswc-accent-bg` | Token leÃ­do o definido por componente. |
| `--iswc-color-brand-600` | Token leÃ­do o definido por componente. |
| `--iswc-on-brand` | Token leÃ­do o definido por componente. |
| `--iswc-year-height` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-date-picker> â€” Calendario inline (equivalente a DateCalendar de MUI X).
> Tres vistas: dÃ­a, mes y aÃ±o. El mes y el aÃ±o del encabezado son triggers de
> un iswc-dropdown para saltar sin encadenar clics en las flechas.
> Atributos:
>   value            yyyy-mm-dd Â· rango: `inicio/fin`
>   mode             single | range
>   min / max        ISO
>   view             day | month | year   (vista mostrada)
>   views            subconjunto permitido, p. ej. "month year"
>   open-to          vista inicial
>   locale, first-day-of-week (0=domingo), weekday-width (narrow|short|long)
>   show-outside-days, fixed-weeks, show-week-numbers
>   disable-past, disable-future, disabled-dates="ISO,ISO", disabled-days="0,6"
>   disabled, readonly
> Events: iswc-change { value } | { start, end } Â· iswc-view-change { view }
>         iswc-month-change { month }

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/date-utils.js`](../_shared/date-utils.js)
- [`../actions/dropdown.js`](../actions/dropdown.js)
- [`./month-calendar.js`](./month-calendar.js)
- [`./year-calendar.js`](./year-calendar.js)

Tags del mÃ³dulo: `<iswc-date-picker>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-hidden`, `aria-selected`.

## Ejemplo avanzado

```html
<iswc-date-picker></iswc-date-picker>
```

## Errores comunes

- Usar tag sin importar mÃ³dulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./date-picker.ts)
- [CSS](./date-picker.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./date-picker.json)
