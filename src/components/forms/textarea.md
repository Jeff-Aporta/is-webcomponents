---
tag: iswc-textarea
tags:
  - iswc-textarea
category: forms
status: public
source: ./textarea.ts
style: ./textarea.css
preview: ./textarea.json
---
# `<iswc-textarea>`

## PropÃ³sito

Ãrea de texto form-associated con las mismas piezas que
TextField
en modo multiline y el crecimiento automÃ¡tico de
TextareaAutosize:
variants, error, contador y autosize con
min-rows / max-rows.

Este mÃ³dulo registra `<iswc-textarea>`.

## CuÃ¡ndo usarlo

Captura, selecciÃ³n y validaciÃ³n de valores compatibles con formularios.

## CuÃ¡ndo no usarlo

No duplicar validaciÃ³n, form association ni pickers shared.

## ImportaciÃ³n

```js
import './textarea.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-textarea variant="filled" label="filled" rows="2"></iswc-textarea>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `name` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `value` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `placeholder` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `hint` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `disabled` | boolean | Fuente define default/restricciÃ³n. |
| `required` | boolean | Fuente define default/restricciÃ³n. |
| `readonly` | boolean | Fuente define default/restricciÃ³n. |
| `rows` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `maxlength` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `resize` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `autosize` | boolean | Fuente define default/restricciÃ³n. |
| `min-rows` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `max-rows` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `error` | boolean | Fuente define default/restricciÃ³n. |
| `error-text` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `show-count` | boolean | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Declarada por clase. |
| `defaultValue` | solo lectura | Declarada por clase. |
| `name` | lectura/escritura | Declarada por clase. |
| `disabled` | lectura/escritura | Declarada por clase. |
| `required` | lectura/escritura | Declarada por clase. |
| `readonly` | lectura/escritura | Declarada por clase. |
| `rows` | lectura/escritura | Declarada por clase. |
| `resize` | lectura/escritura | Declarada por clase. |
| `autosize` | lectura/escritura | Declarada por clase. |
| `minRows` | lectura/escritura | Declarada por clase. |
| `maxRows` | lectura/escritura | Declarada por clase. |
| `variant` | lectura/escritura | Declarada por clase. |
| `labelPlacement` | lectura/escritura | Declarada por clase. |
| `error` | lectura/escritura | Declarada por clase. |
| `errorText` | lectura/escritura | Declarada por clase. |
| `showCount` | lectura/escritura | Declarada por clase. |
| `fullWidth` | lectura/escritura | Declarada por clase. |
| `placeholder` | lectura/escritura | Declarada por clase. |
| `label` | lectura/escritura | Declarada por clase. |
| `hint` | lectura/escritura | Declarada por clase. |
| `maxlength` | lectura/escritura | Declarada por clase. |
| `textarea` | solo lectura | Declarada por clase. |
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
| `input` | Evento nativo al cambiar el valor. |
| `change` | Evento nativo al confirmar el cambio de valor. |
| `iswc-input` | Emitido en cada cambio del valor (escribe como `input` nativo). |
| `iswc-change` | Emitido al confirmar el cambio de valor (escribe como `change` nativo). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `input` | no | sÃ­ | sÃ­ | no |
| `change` | no | sÃ­ | sÃ­ | no |
| `iswc-input` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-change` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-textarea');
el.addEventListener('input', (e) => {
  console.log('input', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `focus()` | MÃ©todo pÃºblico declarado. |
| `blur()` | MÃ©todo pÃºblico declarado. |
| `select()` | MÃ©todo pÃºblico declarado. |
| `setSelectionRange()` | MÃ©todo pÃºblico declarado. |
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
| `textarea` | Personalizable con `::part(textarea)`. |
| `support` | Personalizable con `::part(support)`. |
| `hint` | Personalizable con `::part(hint)`. |
| `error-text` | Personalizable con `::part(error-text)`. |
| `count` | Personalizable con `::part(count)`. |

### Custom states

| Estado | Uso |
| --- | --- |
| `:state(invalid)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(disabled)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(readonly)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(blank)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(focused)` | Estado usado por implementaciÃ³n/CSS. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-field-width` | Token leÃ­do o definido por componente. |
| `--iswc-field-label-width` | Token leÃ­do o definido por componente. |
| `--iswc-textarea-border-radius` | Token leÃ­do o definido por componente. |
| `--iswc-radius-sm` | Token leÃ­do o definido por componente. |
| `--iswc-textarea-border` | Token leÃ­do o definido por componente. |
| `--iswc-control-border` | Token leÃ­do o definido por componente. |
| `--iswc-textarea-bg` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg` | Token leÃ­do o definido por componente. |
| `--iswc-textarea-text` | Token leÃ­do o definido por componente. |
| `--iswc-control-text` | Token leÃ­do o definido por componente. |
| `--iswc-textarea-focus` | Token leÃ­do o definido por componente. |
| `--iswc-focus` | Token leÃ­do o definido por componente. |
| `--iswc-accent` | Token leÃ­do o definido por componente. |
| `--iswc-textarea-danger` | Token leÃ­do o definido por componente. |
| `--iswc-color-danger-500` | Token leÃ­do o definido por componente. |
| `--iswc-textarea-danger-text` | Token leÃ­do o definido por componente. |
| `--iswc-danger-text` | Token leÃ­do o definido por componente. |
| `--iswc-color-danger-700` | Token leÃ­do o definido por componente. |
| `--_border` | Token leÃ­do o definido por componente. |
| `--_focus` | Token leÃ­do o definido por componente. |
| `--iswc-sans` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--iswc-text-soft` | Token leÃ­do o definido por componente. |
| `--iswc-text-dim` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg-hover` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

Participa mediante ElementInternals/helpers form-associated; respetar name, value, disabled, reset, restore y validaciÃ³n.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-textarea> â€” Ãrea de texto form-associated (vanilla + Shadow DOM).
> Atributos
>   name, value, placeholder, label, hint, maxlength
>   rows            nÃºmero de filas visibles (default 3)
>   resize          none | vertical | both | auto   (default vertical; auto = autosize)
>   min-rows        filas mÃ­nimas con autosize (default: rows)
>   max-rows        filas mÃ¡ximas con autosize; a partir de ahÃ­ hace scroll
>   variant      outlined (default) | filled | underlined
>   label-placement top (default) | start
>   error-text      mensaje mostrado en lugar del hint cuando hay error
>   disabled, required, readonly, autosize, error, show-count, full-width  (boolean)
> Slots: label, hint
> Parts: form-control, label, base, textarea, support, hint, error-text, count
> Custom states: blank, disabled, readonly, focused, invalid
> Eventos: iswc-input, iswc-change (bubbles + composed) y los nativos input/change
> Tokens: --iswc-field-width, --iswc-field-label-width, --iswc-textarea-*

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/form-associated.js`](../_shared/form-associated.js)

Tags del mÃ³dulo: `<iswc-textarea>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-describedby`, `aria-invalid`.

## Ejemplo avanzado

```html
<iswc-textarea autosize min-rows="3" max-rows="6" label="Comentario"></iswc-textarea>
<!-- equivalente -->
<iswc-textarea resize="auto" min-rows="3" max-rows="6"></iswc-textarea>
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

- [JavaScript](./textarea.ts)
- [CSS](./textarea.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./textarea.json)
