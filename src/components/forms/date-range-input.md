---
tag: iswc-date-range-input
tags:
  - iswc-date-range-input
category: forms
status: public
source: ./date-range-input.js
style: ./date-range-input.css
preview: ./date-range-input.json
---
# `<iswc-date-range-input>`

## Propósito

Campo + calendario en un panel del top layer (DatePicker de MUI X). Edita por secciones o abre el calendario. Alt+↓ abre el panel.

Este módulo registra `<iswc-date-range-input>`.

## Cuándo usarlo

Captura, selección y validación de valores compatibles con formularios.

## Cuándo no usarlo

No duplicar validación, form association ni pickers shared.

## Importación

```js
import './date-range-input.js';
```

## Ejemplo mínimo

```html
<iswc-date-range-input></iswc-date-range-input>
```

## API

Wrapper de factory: hereda contrato completo de [`definePickerInput`](../_shared/picker-element.js) y compone field/paneles importados. Cabecera de fuente enumera atributos, eventos y métodos efectivos; tablas siguientes muestran solo declaraciones locales.

### Atributos y propiedades

#### Atributos observados

No expone.

#### Propiedades públicas

No expone.

### Slots

No expone.

### Eventos

No expone.

### Métodos y propiedades públicas

No expone.

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

No expone.

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-sans` | Token leído o definido por componente. |
| `--iswc-text` | Token leído o definido por componente. |
| `--iswc-text-dim` | Token leído o definido por componente. |
| `--iswc-radius-sm` | Token leído o definido por componente. |
| `--iswc-control-bg-hover` | Token leído o definido por componente. |
| `--iswc-focus` | Token leído o definido por componente. |
| `--iswc-accent` | Token leído o definido por componente. |
| `--iswc-bg-elev` | Token leído o definido por componente. |
| `--iswc-border` | Token leído o definido por componente. |
| `--iswc-radius` | Token leído o definido por componente. |
| `--iswc-shadow-lg` | Token leído o definido por componente. |
| `--iswc-clock-height` | Token leído o definido por componente. |
| `--iswc-color-brand-600` | Token leído o definido por componente. |
| `--iswc-on-brand` | Token leído o definido por componente. |
| `--iswc-color-brand-700` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <iswc-date-range-input> — Dos campos (inicio y fin) con el calendario de rango
> en el panel (MUI DateRangePicker). El valor es `inicio/fin`.
> Atributos: start-label, end-label, hint, name, value, min, max, required,
>            disabled, readonly, clearable, locale, calendars, shortcuts,
>            color, action-bar, placement, close-on-select
> Events: iswc-change, iswc-show, iswc-hide
> Methods: show(), hide()

## Dependencias y componentes relacionados

- [`../_shared/picker-element.js`](../_shared/picker-element.js)
- [`./date-field.js`](./date-field.js)
- [`./date-range-picker.js`](./date-range-picker.js)

Tags del módulo: `<iswc-date-range-input>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explícito en fuente.

## Ejemplo avanzado

```html
<iswc-date-range-input></iswc-date-range-input>
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

- [JavaScript](./date-range-input.js)
- [CSS](./date-range-input.css)
- [Índice de categoría](./LLM.md)
- [Preview](./date-range-input.json)
