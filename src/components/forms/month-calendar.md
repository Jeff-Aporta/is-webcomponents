---
tag: is-month-calendar
tags:
  - is-month-calendar
category: forms
status: public
source: ./month-calendar.js
style: ./month-calendar.css
preview: ../../previews/forms/is-date-picker.html
---
# `<is-month-calendar>`

## Propósito

Calendario inline (DateCalendar de MUI X). Tres vistas (día, mes, año), teclado, números de semana y reglas de deshabilitado. El mes y el año del encabezado abren un is-dropdown.

Este módulo registra `<is-month-calendar>`.

## Cuándo usarlo

Captura, selección y validación de valores compatibles con formularios.

## Cuándo no usarlo

No duplicar validación, form association ni pickers shared.

## Importación

```js
import './month-calendar.js';
```

## Ejemplo mínimo

```html
<is-month-calendar></is-month-calendar>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string/según contrato | Fuente define default/restricción. |
| `year` | string/según contrato | Fuente define default/restricción. |
| `min` | string/según contrato | Fuente define default/restricción. |
| `max` | string/según contrato | Fuente define default/restricción. |
| `locale` | string/según contrato | Fuente define default/restricción. |
| `columns` | string/según contrato | Fuente define default/restricción. |
| `month-width` | string/según contrato | Fuente define default/restricción. |
| `disabled` | boolean | Fuente define default/restricción. |
| `readonly` | boolean | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Declarada por clase. |
| `year` | lectura/escritura | Declarada por clase. |
| `month` | solo lectura | Declarada por clase. |
| `locale` | lectura/escritura | Declarada por clase. |
| `disabled` | lectura/escritura | Declarada por clase. |
| `readonly` | lectura/escritura | Declarada por clase. |

### Slots

No expone.

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-change` | sí | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `focus()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-month-columns` | Token leído o definido por componente. |
| `--is-sans` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--is-radius-sm` | Token leído o definido por componente. |
| `--is-control-bg-hover` | Token leído o definido por componente. |
| `--is-focus` | Token leído o definido por componente. |
| `--is-accent` | Token leído o definido por componente. |
| `--is-color-brand-500` | Token leído o definido por componente. |
| `--is-color-brand-600` | Token leído o definido por componente. |
| `--is-on-brand` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-month-calendar> — Rejilla de los 12 meses de un año (MUI MonthCalendar).
> Atributos: value (yyyy-mm), year, min, max (ISO), locale, columns,
>            month-width (short|long), disabled, readonly
> Events: is-change  detail { value, year, month }

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/date-utils.js`](../_shared/date-utils.js)

Tags del módulo: `<is-month-calendar>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-checked`.

## Ejemplo avanzado

```html
<is-month-calendar></is-month-calendar>
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

- [JavaScript](./month-calendar.js)
- [CSS](./month-calendar.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/forms/is-date-picker.html)
