---
tag: iswc-rating
tags:
  - iswc-rating
category: forms
status: public
source: ./rating.ts
style: ./rating.css
preview: ./rating.json
---
# `<iswc-rating>`

## PropÃ³sito

ValoraciÃ³n form-associated con paridad funcional con el
Rating de MUI:
precisiÃ³n arbitraria, iconos propios, textos de hover, colores de color y reset.

Este mÃ³dulo registra `<iswc-rating>`.

## CuÃ¡ndo usarlo

Captura, selecciÃ³n y validaciÃ³n de valores compatibles con formularios.

## CuÃ¡ndo no usarlo

No duplicar validaciÃ³n, form association ni pickers shared.

## ImportaciÃ³n

```js
import './rating.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-rating label="SatisfacciÃ³n" value="3" name="rating"></iswc-rating>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `name` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `value` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `max` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `precision` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `allow-half` | boolean | Fuente define default/restricciÃ³n. |
| `icon` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `empty-icon` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `highlight-selected-only` | boolean | Fuente define default/restricciÃ³n. |
| `color` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `label-format` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `show-label` | boolean | Fuente define default/restricciÃ³n. |
| `clearable` | boolean | Fuente define default/restricciÃ³n. |
| `disabled` | boolean | Fuente define default/restricciÃ³n. |
| `readonly` | boolean | Fuente define default/restricciÃ³n. |
| `required` | boolean | Fuente define default/restricciÃ³n. |
| `label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Declarada por clase. |
| `max` | lectura/escritura | Declarada por clase. |
| `precision` | lectura/escritura | Declarada por clase. |
| `allowHalf` | lectura/escritura | Declarada por clase. |
| `icon` | lectura/escritura | Declarada por clase. |
| `emptyIcon` | lectura/escritura | Declarada por clase. |
| `highlightSelectedOnly` | lectura/escritura | Declarada por clase. |
| `color` | lectura/escritura | Declarada por clase. |
| `labels` | lectura/escritura | Declarada por clase. |
| `labelFormat` | lectura/escritura | Declarada por clase. |
| `getLabelText` | lectura/escritura | Declarada por clase. |
| `showLabel` | lectura/escritura | Declarada por clase. |
| `clearable` | lectura/escritura | Declarada por clase. |
| `name` | lectura/escritura | Declarada por clase. |
| `disabled` | lectura/escritura | Declarada por clase. |
| `readonly` | lectura/escritura | Declarada por clase. |
| `required` | lectura/escritura | Declarada por clase. |
| `label` | lectura/escritura | Declarada por clase. |
| `validity` | solo lectura | Declarada por clase. |
| `validationMessage` | solo lectura | Declarada por clase. |
| `willValidate` | solo lectura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `label` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-change` | Emitido al confirmar el cambio de valor (escribe como `change` nativo). |
| `iswc-hover` | Evento personalizado del componente (hover). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-change` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-hover` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-rating');
el.addEventListener('iswc-change', (e) => {
  console.log('iswc-change', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `focus()` | MÃ©todo pÃºblico declarado. |
| `blur()` | MÃ©todo pÃºblico declarado. |
| `clear()` | MÃ©todo pÃºblico declarado. |
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
| `hover-label` | Personalizable con `::part(hover-label)`. |
| `star` | Personalizable con `::part(star)`. |
| `icon-empty` | Personalizable con `::part(icon-empty)`. |
| `icon-filled` | Personalizable con `::part(icon-filled)`. |

### Custom states

| Estado | Uso |
| --- | --- |
| `:state(readonly)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(disabled)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(blank)` | Estado usado por implementaciÃ³n/CSS. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--fill` | Token leÃ­do o definido por componente. |
| `--iswc-rating-size` | Token leÃ­do o definido por componente. |
| `--iswc-rating-gap` | Token leÃ­do o definido por componente. |
| `--iswc-rating-color` | Token leÃ­do o definido por componente. |
| `--iswc-accent` | Token leÃ­do o definido por componente. |
| `--iswc-rating-empty` | Token leÃ­do o definido por componente. |
| `--iswc-control-border` | Token leÃ­do o definido por componente. |
| `--iswc-rating-focus` | Token leÃ­do o definido por componente. |
| `--iswc-focus` | Token leÃ­do o definido por componente. |
| `--iswc-sans` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--iswc-control-text` | Token leÃ­do o definido por componente. |
| `--iswc-color-success-500` | Token leÃ­do o definido por componente. |
| `--iswc-color-warning-500` | Token leÃ­do o definido por componente. |
| `--iswc-color-danger-500` | Token leÃ­do o definido por componente. |
| `--iswc-text-soft` | Token leÃ­do o definido por componente. |
| `--iswc-radius-sm` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

Participa mediante ElementInternals/helpers form-associated; respetar name, value, disabled, reset, restore y validaciÃ³n.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-rating> â€” ValoraciÃ³n form-associated (vanilla + Shadow DOM).
> Atributos
>   name, label, color (brand|neutral|success|warning|danger)
>   value        0..max (default 0)
>   max          nÃºmero de iconos (default 5)
>   precision    granularidad del valor: 1 (default) | 0.5 | 0.25 | 0.1
>   allow-half   alias de precision="0.5"
>   icon         nombre iswc-icon del estado relleno (ej. tabler:heart-filled)
>   empty-icon   nombre iswc-icon del estado vacÃ­o
>   highlight-selected-only  resalta solo el icono del valor, no los anteriores
>   label-format plantilla del texto del valor, ej. "{v} de {max}"
>   show-label   muestra ese texto junto a los iconos (sigue al hover)
>   clearable, disabled, readonly, required   (boolean)
> Propiedades
>   labels        string[] â€” Ã­ndice 0 = valor 1
>   getLabelText  (value) => string â€” gana sobre labels y label-format
> Slots: label
> Parts: form-control, label, base, star, icon-empty, icon-filled, hover-label
> Custom states: blank, disabled, readonly
> Eventos: iswc-change (valor confirmado), iswc-hover (previsualizaciÃ³n)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/form-associated.js`](../_shared/form-associated.js)
- [`../media/icon.js`](../media/icon.js)

Tags del mÃ³dulo: `<iswc-rating>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-labelledby`, `aria-valuemin`, `aria-disabled`, `aria-readonly`, `aria-label`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext`.

## Ejemplo avanzado

```html
<iswc-rating label="10 iconos" max="10" value="7"></iswc-rating>
<iswc-rating value="3" style="font-size:1.5rem"></iswc-rating>
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

- [JavaScript](./rating.ts)
- [CSS](./rating.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./rating.json)
