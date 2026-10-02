---
tag: iswc-date-input
tags:
  - iswc-date-input
category: forms
status: public
source: ./date-input.js
style: ./date-input.css
preview: ./date-input.json
---
# `<iswc-date-input>`

## Propósito

Campo + calendario en un panel del top layer (DatePicker de MUI X). Edita por secciones o abre el calendario. Alt+↓ abre el panel.

Este módulo registra `<iswc-date-input>`.

## Cuándo usarlo

Captura, selección y validación de valores compatibles con formularios.

## Cuándo no usarlo

No duplicar validación, form association ni pickers shared.

## Importación

```js
import './date-input.js';
```

## Ejemplo mínimo

```html
<iswc-date-input></iswc-date-input>
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

> <iswc-date-input> — Campo de fecha con calendario en un panel (MUI DatePicker).
> Compone <iswc-date-field> (edición por secciones) e <iswc-date-picker> (el
> calendario) dentro de un <dialog> del top layer.
> Atributos: label, hint, name, value (yyyy-mm-dd), min, max, required,
>            disabled, readonly, clearable, locale, color (desktop|mobile),
>            action-bar, placement, close-on-select, views, open-to,
>            first-day-of-week, show-outside-days, fixed-weeks,
>            show-week-numbers, disable-past, disable-future, disabled-dates,
>            disabled-days
> Events: iswc-change, iswc-show, iswc-hide
> Methods: show(), hide()

## Dependencias y componentes relacionados

- [`../_shared/picker-element.js`](../_shared/picker-element.js)
- [`./date-field.js`](./date-field.js)
- [`./date-picker.js`](./date-picker.js)

Tags del módulo: `<iswc-date-input>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explícito en fuente.

## Ejemplo avanzado

```html
<iswc-date-input></iswc-date-input>
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

- [JavaScript](./date-input.js)
- [CSS](./date-input.css)
- [Índice de categoría](./LLM.md)
- [Preview](./date-input.json)
