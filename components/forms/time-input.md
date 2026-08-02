---
tag: is-time-input
tags:
  - is-time-input
category: forms
status: public
source: ./time-input.js
style: ./time-input.css
preview: ../../previews/forms/is-date-input.html
---
# `<is-time-input>`

## Propósito

Campo + calendario en un panel del top layer (DatePicker de MUI X). Edita por secciones o abre el calendario. Alt+↓ abre el panel.

Este módulo registra `<is-time-input>`.

## Cuándo usarlo

Captura, selección y validación de valores compatibles con formularios.

## Cuándo no usarlo

No duplicar validación, form association ni pickers shared.

## Importación

```js
import './time-input.js';
```

## Ejemplo mínimo

```html
<is-time-input></is-time-input>
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
| `--is-sans` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--is-text-dim` | Token leído o definido por componente. |
| `--is-radius-sm` | Token leído o definido por componente. |
| `--is-control-bg-hover` | Token leído o definido por componente. |
| `--is-focus` | Token leído o definido por componente. |
| `--is-accent` | Token leído o definido por componente. |
| `--is-bg-elev` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--is-radius` | Token leído o definido por componente. |
| `--is-shadow-lg` | Token leído o definido por componente. |
| `--is-clock-height` | Token leído o definido por componente. |
| `--is-color-brand-600` | Token leído o definido por componente. |
| `--is-on-brand` | Token leído o definido por componente. |
| `--is-color-brand-700` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-time-input> — Campo de hora con panel (MUI TimePicker).
> `panel` elige la superficie: columnas digitales (por defecto, como el picker
> de escritorio de MUI), lista simple o reloj analógico.
> Atributos: label, hint, name, value (HH:mm[:ss]), min, max, required,
>            disabled, readonly, clearable, locale, ampm, hour24, seconds,
>            panel (sections|list|clock), minutes-step, step, variant,
>            action-bar, placement, close-on-select
> Events: is-change, is-show, is-hide
> Methods: show(), hide()

## Dependencias y componentes relacionados

- [`../_shared/picker-element.js`](../_shared/picker-element.js)
- [`./time-field.js`](./time-field.js)
- [`./time-clock.js`](./time-clock.js)
- [`./digital-clock.js`](./digital-clock.js)

Tags del módulo: `<is-time-input>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explícito en fuente.

## Ejemplo avanzado

```html
<is-time-input></is-time-input>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size variant; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./time-input.js)
- [CSS](./time-input.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/forms/is-date-input.html)
