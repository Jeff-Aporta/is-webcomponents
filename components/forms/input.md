---
tag: is-input
tags:
  - is-input
category: forms
status: public
source: ./input.js
style: ./input.css
preview: ../../previews/forms/is-input.html
---
# `<is-input>`

## Propósito

Campo de texto form-associated con paridad funcional con el
TextField de MUI:
tres appearances, estado de error ligado a la validación nativa, adornos, contador de
caracteres y ancho controlable. Participa en <form> vía
ElementInternals.

Este módulo registra `<is-input>`.

## Cuándo usarlo

Captura, selección y validación de valores compatibles con formularios.

## Cuándo no usarlo

No duplicar validación, form association ni pickers shared.

## Importación

```js
import './input.js';
```

## Ejemplo mínimo

```html
<is-input label="outlined (default)"></is-input>
<is-input appearance="filled" label="filled"></is-input>
<is-input appearance="underlined" label="underlined"></is-input>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `type` | string/según contrato | Fuente define default/restricción. |
| `name` | string/según contrato | Fuente define default/restricción. |
| `value` | string/según contrato | Fuente define default/restricción. |
| `placeholder` | string/según contrato | Fuente define default/restricción. |
| `label` | string/según contrato | Fuente define default/restricción. |
| `hint` | string/según contrato | Fuente define default/restricción. |
| `disabled` | boolean | Fuente define default/restricción. |
| `required` | boolean | Fuente define default/restricción. |
| `readonly` | boolean | Fuente define default/restricción. |
| `clearable` | boolean | Fuente define default/restricción. |
| `password-toggle` | boolean | Fuente define default/restricción. |
| `min` | string/según contrato | Fuente define default/restricción. |
| `max` | string/según contrato | Fuente define default/restricción. |
| `step` | string/según contrato | Fuente define default/restricción. |
| `maxlength` | string/según contrato | Fuente define default/restricción. |
| `autocomplete` | string/según contrato | Fuente define default/restricción. |
| `error` | boolean | Fuente define default/restricción. |
| `error-text` | string/según contrato | Fuente define default/restricción. |
| `show-count` | boolean | Fuente define default/restricción. |
| `prefix` | string/según contrato | Fuente define default/restricción. |
| `suffix` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Declarada por clase. |
| `defaultValue` | solo lectura | Declarada por clase. |
| `type` | lectura/escritura | Declarada por clase. |
| `appearance` | lectura/escritura | Declarada por clase. |
| `labelPlacement` | lectura/escritura | Declarada por clase. |
| `name` | lectura/escritura | Declarada por clase. |
| `disabled` | lectura/escritura | Declarada por clase. |
| `required` | lectura/escritura | Declarada por clase. |
| `readonly` | lectura/escritura | Declarada por clase. |
| `clearable` | lectura/escritura | Declarada por clase. |
| `passwordToggle` | lectura/escritura | Declarada por clase. |
| `error` | lectura/escritura | Declarada por clase. |
| `errorText` | lectura/escritura | Declarada por clase. |
| `showCount` | lectura/escritura | Declarada por clase. |
| `fullWidth` | lectura/escritura | Declarada por clase. |
| `prefixText` | lectura/escritura | Declarada por clase. |
| `suffixText` | lectura/escritura | Declarada por clase. |
| `placeholder` | lectura/escritura | Declarada por clase. |
| `label` | lectura/escritura | Declarada por clase. |
| `hint` | lectura/escritura | Declarada por clase. |
| `min` | lectura/escritura | Declarada por clase. |
| `max` | lectura/escritura | Declarada por clase. |
| `step` | lectura/escritura | Declarada por clase. |
| `maxlength` | lectura/escritura | Declarada por clase. |
| `autocomplete` | lectura/escritura | Declarada por clase. |
| `input` | solo lectura | Declarada por clase. |
| `validity` | solo lectura | Declarada por clase. |
| `validationMessage` | solo lectura | Declarada por clase. |
| `willValidate` | solo lectura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `label` | Contenido proyectado. |
| `start` | Contenido proyectado. |
| `end` | Contenido proyectado. |
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
| `start` | Personalizable con `::part(start)`. |
| `prefix` | Personalizable con `::part(prefix)`. |
| `input` | Personalizable con `::part(input)`. |
| `clear` | Personalizable con `::part(clear)`. |
| `toggle` | Personalizable con `::part(toggle)`. |
| `end` | Personalizable con `::part(end)`. |
| `suffix` | Personalizable con `::part(suffix)`. |
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
| `:state(password-visible)` | Estado usado por implementación/CSS. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-field-width` | Token leído o definido por componente. |
| `--is-field-label-width` | Token leído o definido por componente. |
| `--is-input-border-radius` | Token leído o definido por componente. |
| `--is-radius-sm` | Token leído o definido por componente. |
| `--is-input-border` | Token leído o definido por componente. |
| `--is-control-border` | Token leído o definido por componente. |
| `--is-input-bg` | Token leído o definido por componente. |
| `--is-control-bg` | Token leído o definido por componente. |
| `--is-input-text` | Token leído o definido por componente. |
| `--is-control-text` | Token leído o definido por componente. |
| `--is-input-focus` | Token leído o definido por componente. |
| `--is-focus` | Token leído o definido por componente. |
| `--is-accent` | Token leído o definido por componente. |
| `--is-input-danger` | Token leído o definido por componente. |
| `--is-color-danger-500` | Token leído o definido por componente. |
| `--is-input-danger-text` | Token leído o definido por componente. |
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

> <is-input> — Campo de texto form-associated (vanilla + Shadow DOM).
> Atributos
>   type            text | email | password | number | search | tel | url | date  (default text)
>   name, value, placeholder, label, hint, autocomplete
>   appearance      outlined (default) | filled | underlined
>   label-placement top (default) | start
>   error-text      mensaje mostrado en lugar del hint cuando hay error
>   prefix, suffix  adornos de texto corto ("$", "kg") sin usar slot
>   min, max, step, maxlength     (pasan al input nativo interno)
>   disabled, required, readonly, clearable, password-toggle,
>   error, show-count, full-width                              (boolean)
> Slots: label, hint, start, end
> Parts: form-control, label, base, start, prefix, input, clear, toggle, suffix, end,
>        support, hint, error-text, count
> Custom states: blank, disabled, readonly, focused, invalid, password-visible
> Eventos: is-input, is-change (bubbles + composed) y los nativos input/change
> Tokens: --is-field-width, --is-field-label-width, --is-input-*

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/form-associated.js`](../_shared/form-associated.js)
- [`../media/icon.js`](../media/icon.js)

Tags del módulo: `<is-input>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-describedby`, `aria-label`, `aria-invalid`.

## Ejemplo avanzado

```html
<is-input type="password" label="Contraseña" password-toggle></is-input>
<is-input type="number" label="Cantidad" min="0" max="100" step="5"></is-input>
<is-input type="search" label="Buscar" clearable></is-input>
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

- [JavaScript](./input.js)
- [CSS](./input.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/forms/is-input.html)
