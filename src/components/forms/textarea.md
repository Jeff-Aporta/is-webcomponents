---
tag: is-textarea
tags:
  - is-textarea
category: forms
status: public
source: ./textarea.js
style: ./textarea.css
preview: ../../previews/forms/is-textarea.html
---
# `<is-textarea>`

## Propósito

Área de texto form-associated con las mismas piezas que
TextField
en modo multiline y el crecimiento automático de
TextareaAutosize:
variants, error, contador y autosize con
min-rows / max-rows.

Este módulo registra `<is-textarea>`.

## Cuándo usarlo

Captura, selección y validación de valores compatibles con formularios.

## Cuándo no usarlo

No duplicar validación, form association ni pickers shared.

## Importación

```js
import './textarea.js';
```

## Ejemplo mínimo

```html
<is-textarea variant="filled" label="filled" rows="2"></is-textarea>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `name` | string/según contrato | Fuente define default/restricción. |
| `value` | string/según contrato | Fuente define default/restricción. |
| `placeholder` | string/según contrato | Fuente define default/restricción. |
| `label` | string/según contrato | Fuente define default/restricción. |
| `hint` | string/según contrato | Fuente define default/restricción. |
| `disabled` | boolean | Fuente define default/restricción. |
| `required` | boolean | Fuente define default/restricción. |
| `readonly` | boolean | Fuente define default/restricción. |
| `rows` | string/según contrato | Fuente define default/restricción. |
| `maxlength` | string/según contrato | Fuente define default/restricción. |
| `resize` | string/según contrato | Fuente define default/restricción. |
| `autosize` | boolean | Fuente define default/restricción. |
| `min-rows` | string/según contrato | Fuente define default/restricción. |
| `max-rows` | string/según contrato | Fuente define default/restricción. |
| `error` | boolean | Fuente define default/restricción. |
| `error-text` | string/según contrato | Fuente define default/restricción. |
| `show-count` | boolean | Fuente define default/restricción. |

#### Propiedades públicas

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

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `input` | no | sí | sí | no |
| `change` | no | sí | sí | no |
| `is-input` | sí | sí | sí | no |
| `is-change` | sí | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `focus()` | Método público declarado. |
| `blur()` | Método público declarado. |
| `select()` | Método público declarado. |
| `setSelectionRange()` | Método público declarado. |
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
| `textarea` | Personalizable con `::part(textarea)`. |
| `support` | Personalizable con `::part(support)`. |
| `hint` | Personalizable con `::part(hint)`. |
| `error-text` | Personalizable con `::part(error-text)`. |
| `count` | Personalizable con `::part(count)`. |

### Custom states

| Estado | Uso |
| --- | --- |
| `:state(invalid)` | Estado usado por implementación/CSS. |
| `:state(disabled)` | Estado usado por implementación/CSS. |
| `:state(readonly)` | Estado usado por implementación/CSS. |
| `:state(blank)` | Estado usado por implementación/CSS. |
| `:state(focused)` | Estado usado por implementación/CSS. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-field-width` | Token leído o definido por componente. |
| `--is-field-label-width` | Token leído o definido por componente. |
| `--is-textarea-border-radius` | Token leído o definido por componente. |
| `--is-radius-sm` | Token leído o definido por componente. |
| `--is-textarea-border` | Token leído o definido por componente. |
| `--is-control-border` | Token leído o definido por componente. |
| `--is-textarea-bg` | Token leído o definido por componente. |
| `--is-control-bg` | Token leído o definido por componente. |
| `--is-textarea-text` | Token leído o definido por componente. |
| `--is-control-text` | Token leído o definido por componente. |
| `--is-textarea-focus` | Token leído o definido por componente. |
| `--is-focus` | Token leído o definido por componente. |
| `--is-accent` | Token leído o definido por componente. |
| `--is-textarea-danger` | Token leído o definido por componente. |
| `--is-color-danger-500` | Token leído o definido por componente. |
| `--is-textarea-danger-text` | Token leído o definido por componente. |
| `--is-danger-text` | Token leído o definido por componente. |
| `--is-color-danger-700` | Token leído o definido por componente. |
| `--_border` | Token leído o definido por componente. |
| `--_focus` | Token leído o definido por componente. |
| `--is-sans` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--is-text-soft` | Token leído o definido por componente. |
| `--is-text-dim` | Token leído o definido por componente. |
| `--is-control-bg-hover` | Token leído o definido por componente. |

### Integración con formularios

Participa mediante ElementInternals/helpers form-associated; respetar name, value, disabled, reset, restore y validación.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-textarea> — Área de texto form-associated (vanilla + Shadow DOM).
> Atributos
>   name, value, placeholder, label, hint, maxlength
>   rows            número de filas visibles (default 3)
>   resize          none | vertical | both | auto   (default vertical; auto = autosize)
>   min-rows        filas mínimas con autosize (default: rows)
>   max-rows        filas máximas con autosize; a partir de ahí hace scroll
>   variant      outlined (default) | filled | underlined
>   label-placement top (default) | start
>   error-text      mensaje mostrado en lugar del hint cuando hay error
>   disabled, required, readonly, autosize, error, show-count, full-width  (boolean)
> Slots: label, hint
> Parts: form-control, label, base, textarea, support, hint, error-text, count
> Custom states: blank, disabled, readonly, focused, invalid
> Eventos: is-input, is-change (bubbles + composed) y los nativos input/change
> Tokens: --is-field-width, --is-field-label-width, --is-textarea-*

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/form-associated.js`](../_shared/form-associated.js)

Tags del módulo: `<is-textarea>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-describedby`, `aria-invalid`.

## Ejemplo avanzado

```html
<is-textarea autosize min-rows="3" max-rows="6" label="Comentario"></is-textarea>
<!-- equivalente -->
<is-textarea resize="auto" min-rows="3" max-rows="6"></is-textarea>
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

- [JavaScript](./textarea.js)
- [CSS](./textarea.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/forms/is-textarea.html)
