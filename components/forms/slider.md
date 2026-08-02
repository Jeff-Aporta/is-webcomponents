---
tag: is-slider
tags:
  - is-slider
category: forms
status: public
source: ./slider.js
style: ./slider.css
preview: ../../previews/forms/is-slider.html
---
# `<is-slider>`

## Propósito

Control de rango form-associated con paridad funcional con el
Slider de MUI:
rango de dos thumbs, marks, escala no lineal, orientación vertical y track invertido.

Este módulo registra `<is-slider>`.

## Cuándo usarlo

Captura, selección y validación de valores compatibles con formularios.

## Cuándo no usarlo

No duplicar validación, form association ni pickers shared.

## Importación

```js
import './slider.js';
```

## Ejemplo mínimo

```html
<is-slider label="Volumen" value="30"></is-slider>
<is-slider value="30" disabled></is-slider>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `name` | string/según contrato | Fuente define default/restricción. |
| `value` | string/según contrato | Fuente define default/restricción. |
| `min` | string/según contrato | Fuente define default/restricción. |
| `max` | string/según contrato | Fuente define default/restricción. |
| `step` | string/según contrato | Fuente define default/restricción. |
| `shift-step` | string/según contrato | Fuente define default/restricción. |
| `marks` | boolean | Fuente define default/restricción. |
| `orientation` | string/según contrato | Fuente define default/restricción. |
| `track` | string/según contrato | Fuente define default/restricción. |
| `value-label` | string/según contrato | Fuente define default/restricción. |
| `with-tooltip` | string/según contrato | Fuente define default/restricción. |
| `min-distance` | string/según contrato | Fuente define default/restricción. |
| `disable-swap` | boolean | Fuente define default/restricción. |
| `range` | string/según contrato | Fuente define default/restricción. |
| `format` | string/según contrato | Fuente define default/restricción. |
| `disabled` | boolean | Fuente define default/restricción. |
| `readonly` | boolean | Fuente define default/restricción. |
| `required` | boolean | Fuente define default/restricción. |
| `label` | string/según contrato | Fuente define default/restricción. |
| `hint` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Declarada por clase. |
| `values` | lectura/escritura | Declarada por clase. |
| `min` | lectura/escritura | Declarada por clase. |
| `max` | lectura/escritura | Declarada por clase. |
| `step` | lectura/escritura | Declarada por clase. |
| `shiftStep` | lectura/escritura | Declarada por clase. |
| `marks` | lectura/escritura | Declarada por clase. |
| `orientation` | lectura/escritura | Declarada por clase. |
| `track` | lectura/escritura | Declarada por clase. |
| `valueLabel` | lectura/escritura | Declarada por clase. |
| `minDistance` | lectura/escritura | Declarada por clase. |
| `disableSwap` | lectura/escritura | Declarada por clase. |
| `format` | lectura/escritura | Declarada por clase. |
| `scale` | lectura/escritura | Declarada por clase. |
| `valueLabelFormat` | lectura/escritura | Declarada por clase. |
| `getAriaValueText` | lectura/escritura | Declarada por clase. |
| `name` | lectura/escritura | Declarada por clase. |
| `disabled` | lectura/escritura | Declarada por clase. |
| `readonly` | lectura/escritura | Declarada por clase. |
| `required` | lectura/escritura | Declarada por clase. |
| `withTooltip` | lectura/escritura | Declarada por clase. |
| `label` | lectura/escritura | Declarada por clase. |
| `hint` | lectura/escritura | Declarada por clase. |
| `validity` | solo lectura | Declarada por clase. |
| `validationMessage` | solo lectura | Declarada por clase. |
| `willValidate` | solo lectura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `label` | Contenido proyectado. |
| `hint` | Contenido proyectado. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-input` | sí | sí | sí | no |
| `is-change` | sí | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `focus()` | Método público declarado. |
| `blur()` | Método público declarado. |
| `stepUp()` | Método público declarado. |
| `stepDown()` | Método público declarado. |
| `checkValidity()` | Método público declarado. |
| `reportValidity()` | Método público declarado. |
| `setCustomValidity()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `form-control` | Personalizable con `::part(form-control)`. |
| `label` | Personalizable con `::part(label)`. |
| `base` | Personalizable con `::part(base)`. |
| `rail` | Personalizable con `::part(rail)`. |
| `track` | Personalizable con `::part(track)`. |
| `hint` | Personalizable con `::part(hint)`. |
| `thumb` | Personalizable con `::part(thumb)`. |
| `value-label` | Personalizable con `::part(value-label)`. |

### Custom states

| Estado | Uso |
| --- | --- |
| `:state(dragging)` | Estado usado por implementación/CSS. |
| `:state(focused)` | Estado usado por implementación/CSS. |
| `:state(disabled)` | Estado usado por implementación/CSS. |
| `:state(readonly)` | Estado usado por implementación/CSS. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--pos` | Token leído o definido por componente. |
| `--is-slider-track-size` | Token leído o definido por componente. |
| `--is-slider-thumb-size` | Token leído o definido por componente. |
| `--is-slider-length` | Token leído o definido por componente. |
| `--is-slider-rail` | Token leído o definido por componente. |
| `--is-control-bg-active` | Token leído o definido por componente. |
| `--is-slider-fill` | Token leído o definido por componente. |
| `--is-accent` | Token leído o definido por componente. |
| `--is-slider-thumb-bg` | Token leído o definido por componente. |
| `--is-slider-focus` | Token leído o definido por componente. |
| `--is-focus` | Token leído o definido por componente. |
| `--is-sans` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--is-control-border` | Token leído o definido por componente. |
| `--is-color-success-500` | Token leído o definido por componente. |
| `--is-color-warning-500` | Token leído o definido por componente. |
| `--is-color-danger-500` | Token leído o definido por componente. |
| `--is-text-soft` | Token leído o definido por componente. |
| `--is-text-dim` | Token leído o definido por componente. |
| `--is-on-brand` | Token leído o definido por componente. |
| `--is-bg-elev` | Token leído o definido por componente. |
| `--is-radius-sm` | Token leído o definido por componente. |

### Integración con formularios

Participa mediante ElementInternals/helpers form-associated; respetar name, value, disabled, reset, restore y validación.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-slider> — Control de rango form-associated (vanilla + Shadow DOM).
> Atributos
>   name, label, hint, variant (brand|neutral|success|warning|danger)
>   value          number | "20,37" (rango con dos o más thumbs)
>   min (0), max (100), step (1)  — step="null" restringe a los marks
>   shift-step     salto con Shift+flechas y PageUp/PageDown (default step × 10)
>   marks          boolean (uno por step) | "0:0°C, 20:20°C" | "0,20,37"
>   orientation    horizontal (default) | vertical
>   track          normal (default) | none | inverted
>   value-label    off (default) | auto | on
>   min-distance   separación mínima entre thumbs de un rango
>   format         plantilla de la burbuja, ej. "{v}°C"
>   range, disable-swap, disabled, readonly, required   (boolean)
> Propiedades
>   value              number | number[]
>   values             number[]
>   marks              boolean | Array<{ value, label? }>
>   scale              (v) => any — valor mostrado (escala no lineal)
>   valueLabelFormat   (v, index) => string
>   getAriaValueText   (v, index) => string
> Slots: label, hint
> Parts: form-control, label, base, rail, track, mark, mark-label, thumb,
>        value-label, hint
> Custom states: disabled, readonly, dragging, focused
> Eventos: is-input (arrastre/tecla), is-change (al confirmar)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/form-associated.js`](../_shared/form-associated.js)

Tags del módulo: `<is-slider>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-hidden`, `aria-disabled`, `aria-readonly`, `aria-orientation`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext`, `aria-label`.

## Ejemplo avanzado

```html
<is-slider style="font-size:0.8em" value="70" value-label="auto"></is-slider>
<is-slider value="50" value-label="auto"></is-slider>
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

- [JavaScript](./slider.js)
- [CSS](./slider.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/forms/is-slider.html)
