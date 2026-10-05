---
tag: iswc-date-range-picker
tags:
  - iswc-date-range-picker
category: forms
status: public
source: ./date-range-picker.ts
style: ./date-range-picker.css
preview: ./date-range-picker.json
---
# `<iswc-date-range-picker>`

## PropÃ³sito

Rango de fechas con varios meses a la vista y panel de atajos (DateRangeCalendar de MUI X). El hover en un mes pinta la banda tentativa en todos.

Este mÃ³dulo registra `<iswc-date-range-picker>`.

## CuÃ¡ndo usarlo

Captura, selecciÃ³n y validaciÃ³n de valores compatibles con formularios.

## CuÃ¡ndo no usarlo

No duplicar validaciÃ³n, form association ni pickers shared.

## ImportaciÃ³n

```js
import './date-range-picker.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-date-range-picker></iswc-date-range-picker>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `calendars` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `month` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `shortcuts` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `min` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `max` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `locale` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `first-day-of-week` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `weekday-width` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `show-outside-days` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `fixed-weeks` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `show-week-numbers` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `disable-past` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `disable-future` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `disabled-dates` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `disabled-days` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `disabled` | boolean | Fuente define default/restricciÃ³n. |
| `readonly` | boolean | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Declarada por clase. |
| `start` | solo lectura | Declarada por clase. |
| `end` | solo lectura | Declarada por clase. |
| `calendars` | lectura/escritura | Declarada por clase. |
| `locale` | lectura/escritura | Declarada por clase. |
| `month` | lectura/escritura | Declarada por clase. |
| `disabled` | lectura/escritura | Declarada por clase. |
| `readonly` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `shortcut` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-change` | Emitido al confirmar el cambio de valor (escribe como `change` nativo). |
| `iswc-month-change` | Evento personalizado del componente (month change). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-change` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-month-change` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-date-range-picker');
el.addEventListener('iswc-change', (e) => {
  console.log('iswc-change', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `clear()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `shortcuts` | Personalizable con `::part(shortcuts)`. |
| `calendars` | Personalizable con `::part(calendars)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-daterange-border` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |
| `--iswc-daterange-bg` | Token leÃ­do o definido por componente. |
| `--iswc-bg-elev` | Token leÃ­do o definido por componente. |
| `--iswc-sans` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--iswc-radius` | Token leÃ­do o definido por componente. |
| `--iswc-shadow` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-date-range-picker> â€” Rango de fechas con varios meses a la vista
> (equivalente a DateRangeCalendar de MUI X) y panel de atajos.
> Compone N <iswc-date-picker mode="range">: el rango vive aquÃ­ y se empuja a
> todos, asÃ­ que el segundo clic puede caer en cualquier mes y el rango
> tentativo se pinta en todos a la vez.
> Atributos: value ("inicio/fin"), calendars (1-3), month (ancla yyyy-mm),
>            shortcuts ("this-week last-7-days â€¦" | "none"), min, max, locale,
>            first-day-of-week, weekday-width, show-outside-days, fixed-weeks,
>            show-week-numbers, disable-past, disable-future, disabled-dates,
>            disabled-days, disabled, readonly
> Slots: shortcut (atajos propios con data-range="inicio/fin")
> Events: iswc-change { start, end } Â· iswc-month-change { month }

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/date-utils.js`](../_shared/date-utils.js)
- [`../actions/button.js`](../actions/button.js)
- [`./date-picker.js`](./date-picker.js)

Tags del mÃ³dulo: `<iswc-date-range-picker>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`.

## Ejemplo avanzado

```html
<iswc-date-range-picker></iswc-date-range-picker>
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

- [JavaScript](./date-range-picker.ts)
- [CSS](./date-range-picker.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./date-range-picker.json)
