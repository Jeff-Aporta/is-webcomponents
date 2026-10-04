---
tag: iswc-slider
tags:
  - iswc-slider
category: forms
status: public
source: ./slider.ts
style: ./slider.css
preview: ./slider.json
---
# `<iswc-slider>`

## PropÃ³sito

Control de rango form-associated con paridad funcional con el
Slider de MUI:
rango de dos thumbs, marks, escala no lineal, orientaciÃ³n vertical y track invertido.

Este mÃ³dulo registra `<iswc-slider>`.

## CuÃ¡ndo usarlo

Captura, selecciÃ³n y validaciÃ³n de valores compatibles con formularios.

## CuÃ¡ndo no usarlo

No duplicar validaciÃ³n, form association ni pickers shared.

## ImportaciÃ³n

```js
import './slider.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-slider label="Volumen" value="30"></iswc-slider>
<iswc-slider value="30" disabled></iswc-slider>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `name` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `value` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `min` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `max` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `step` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `shift-step` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `marks` | boolean | Fuente define default/restricciÃ³n. |
| `orientation` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `track` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `value-label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `with-tooltip` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `min-distance` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `disable-swap` | boolean | Fuente define default/restricciÃ³n. |
| `range` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `format` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `disabled` | boolean | Fuente define default/restricciÃ³n. |
| `readonly` | boolean | Fuente define default/restricciÃ³n. |
| `required` | boolean | Fuente define default/restricciÃ³n. |
| `label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `hint` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

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


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-input` | Emitido en cada cambio del valor (escribe como `input` nativo). |
| `iswc-change` | Emitido al confirmar el cambio de valor (escribe como `change` nativo). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-input` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-change` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-slider');
el.addEventListener('iswc-input', (e) => {
  console.log('iswc-input', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `focus()` | MÃ©todo pÃºblico declarado. |
| `blur()` | MÃ©todo pÃºblico declarado. |
| `stepUp()` | MÃ©todo pÃºblico declarado. |
| `stepDown()` | MÃ©todo pÃºblico declarado. |
| `checkValidity()` | MÃ©todo pÃºblico declarado. |
| `reportValidity()` | MÃ©todo pÃºblico declarado. |
| `setCustomValidity()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

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
| `mark` | Pastilla con el color de la paleta activa. |
| `mark-label` | Etiqueta de la marca bajo el thumb. |

### Custom states

| Estado | Uso |
| --- | --- |
| `:state(dragging)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(focused)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(disabled)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(readonly)` | Estado usado por implementaciÃ³n/CSS. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--pos` | Token leÃ­do o definido por componente. |
| `--iswc-slider-track-size` | Token leÃ­do o definido por componente. |
| `--iswc-slider-thumb-size` | Token leÃ­do o definido por componente. |
| `--iswc-slider-length` | Token leÃ­do o definido por componente. |
| `--iswc-slider-rail` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg-active` | Token leÃ­do o definido por componente. |
| `--iswc-slider-fill` | Token leÃ­do o definido por componente. |
| `--iswc-accent` | Token leÃ­do o definido por componente. |
| `--iswc-slider-thumb-bg` | Token leÃ­do o definido por componente. |
| `--iswc-slider-focus` | Token leÃ­do o definido por componente. |
| `--iswc-focus` | Token leÃ­do o definido por componente. |
| `--iswc-sans` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--iswc-control-border` | Token leÃ­do o definido por componente. |
| `--iswc-color-success-500` | Token leÃ­do o definido por componente. |
| `--iswc-color-warning-500` | Token leÃ­do o definido por componente. |
| `--iswc-color-danger-500` | Token leÃ­do o definido por componente. |
| `--iswc-text-soft` | Token leÃ­do o definido por componente. |
| `--iswc-text-dim` | Token leÃ­do o definido por componente. |
| `--iswc-on-brand` | Token leÃ­do o definido por componente. |
| `--iswc-bg-elev` | Token leÃ­do o definido por componente. |
| `--iswc-radius-sm` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

Participa mediante ElementInternals/helpers form-associated; respetar name, value, disabled, reset, restore y validaciÃ³n.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-slider> â€” Control de rango form-associated (vanilla + Shadow DOM).
> Atributos
>   name, label, hint, color (brand|neutral|success|warning|danger)
>   value          number | "20,37" (rango con dos o mÃ¡s thumbs)
>   min (0), max (100), step (1)  â€” step="null" restringe a los marks
>   shift-step     salto con Shift+flechas y PageUp/PageDown (default step Ã— 10)
>   marks          boolean (uno por step) | "0:0Â°C, 20:20Â°C" | "0,20,37"
>   orientation    horizontal (default) | vertical
>   track          normal (default) | none | inverted
>   value-label    off (default) | auto | on
>   min-distance   separaciÃ³n mÃ­nima entre thumbs de un rango
>   format         plantilla de la burbuja, ej. "{v}Â°C"
>   range, disable-swap, disabled, readonly, required   (boolean)
> Propiedades
>   value              number | number[]
>   values             number[]
>   marks              boolean | Array<{ value, label? }>
>   scale              (v) => any â€” valor mostrado (escala no lineal)
>   valueLabelFormat   (v, index) => string
>   getAriaValueText   (v, index) => string
> Slots: label, hint
> Parts: form-control, label, base, rail, track, mark, mark-label, thumb,
>        value-label, hint
> Custom states: disabled, readonly, dragging, focused
> Eventos: iswc-input (arrastre/tecla), iswc-change (al confirmar)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/form-associated.js`](../_shared/form-associated.js)

Tags del mÃ³dulo: `<iswc-slider>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-hidden`, `aria-disabled`, `aria-readonly`, `aria-orientation`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext`, `aria-label`.

## Ejemplo avanzado

```html
<iswc-slider style="font-size:0.8em" value="70" value-label="auto"></iswc-slider>
<iswc-slider value="50" value-label="auto"></iswc-slider>
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

- [JavaScript](./slider.ts)
- [CSS](./slider.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./slider.json)
