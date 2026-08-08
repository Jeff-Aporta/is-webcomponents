---
tag: is-date-range-picker
tags:
  - is-date-range-picker
category: forms
status: public
source: ./date-range-picker.js
style: ./date-range-picker.css
preview: ../../previews/forms/is-date-range-picker.json
---
# `<is-date-range-picker>`

## Propósito

Rango de fechas con varios meses a la vista y panel de atajos (DateRangeCalendar de MUI X). El hover en un mes pinta la banda tentativa en todos.

Este módulo registra `<is-date-range-picker>`.

## Cuándo usarlo

Captura, selección y validación de valores compatibles con formularios.

## Cuándo no usarlo

No duplicar validación, form association ni pickers shared.

## Importación

```js
import './date-range-picker.js';
```

## Ejemplo mínimo

```html
<is-date-range-picker></is-date-range-picker>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string/según contrato | Fuente define default/restricción. |
| `calendars` | string/según contrato | Fuente define default/restricción. |
| `month` | string/según contrato | Fuente define default/restricción. |
| `shortcuts` | string/según contrato | Fuente define default/restricción. |
| `min` | string/según contrato | Fuente define default/restricción. |
| `max` | string/según contrato | Fuente define default/restricción. |
| `locale` | string/según contrato | Fuente define default/restricción. |
| `first-day-of-week` | string/según contrato | Fuente define default/restricción. |
| `weekday-width` | string/según contrato | Fuente define default/restricción. |
| `show-outside-days` | string/según contrato | Fuente define default/restricción. |
| `fixed-weeks` | string/según contrato | Fuente define default/restricción. |
| `show-week-numbers` | string/según contrato | Fuente define default/restricción. |
| `disable-past` | string/según contrato | Fuente define default/restricción. |
| `disable-future` | string/según contrato | Fuente define default/restricción. |
| `disabled-dates` | string/según contrato | Fuente define default/restricción. |
| `disabled-days` | string/según contrato | Fuente define default/restricción. |
| `disabled` | boolean | Fuente define default/restricción. |
| `readonly` | boolean | Fuente define default/restricción. |

#### Propiedades públicas

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

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-change` | sí | sí | sí | no |
| `is-month-change` | sí | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `clear()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

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
| `--is-daterange-border` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--is-daterange-bg` | Token leído o definido por componente. |
| `--is-bg-elev` | Token leído o definido por componente. |
| `--is-sans` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--is-radius` | Token leído o definido por componente. |
| `--is-shadow` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-date-range-picker> — Rango de fechas con varios meses a la vista
> (equivalente a DateRangeCalendar de MUI X) y panel de atajos.
> Compone N <is-date-picker mode="range">: el rango vive aquí y se empuja a
> todos, así que el segundo clic puede caer en cualquier mes y el rango
> tentativo se pinta en todos a la vez.
> Atributos: value ("inicio/fin"), calendars (1-3), month (ancla yyyy-mm),
>            shortcuts ("this-week last-7-days …" | "none"), min, max, locale,
>            first-day-of-week, weekday-width, show-outside-days, fixed-weeks,
>            show-week-numbers, disable-past, disable-future, disabled-dates,
>            disabled-days, disabled, readonly
> Slots: shortcut (atajos propios con data-range="inicio/fin")
> Events: is-change { start, end } · is-month-change { month }

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/date-utils.js`](../_shared/date-utils.js)
- [`../actions/button.js`](../actions/button.js)
- [`./date-picker.js`](./date-picker.js)

Tags del módulo: `<is-date-range-picker>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`.

## Ejemplo avanzado

```html
<is-date-range-picker></is-date-range-picker>
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

- [JavaScript](./date-range-picker.js)
- [CSS](./date-range-picker.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/forms/is-date-range-picker.json)
