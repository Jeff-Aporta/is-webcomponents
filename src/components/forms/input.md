---
tag: iswc-input
tags:
  - iswc-input
category: forms
status: public
source: ./input.ts
style: ./input.css
preview: ./input.json
---
# `<iswc-input>`

## PropÃ³sito

Campo de texto form-associated con paridad funcional con el
TextField de MUI:
tres variants, estado de error ligado a la validaciÃ³n nativa, adornos, contador de
caracteres y ancho controlable. Participa en <form> vÃ­a
ElementInternals.

Este mÃ³dulo registra `<iswc-input>`.

## CuÃ¡ndo usarlo

Captura, selecciÃ³n y validaciÃ³n de valores compatibles con formularios.

## CuÃ¡ndo no usarlo

No duplicar validaciÃ³n, form association ni pickers shared.

## ImportaciÃ³n

```js
import './input.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-input label="outlined (default)"></iswc-input>
<iswc-input variant="filled" label="filled"></iswc-input>
<iswc-input variant="underlined" label="underlined"></iswc-input>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `type` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `name` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `value` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `placeholder` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `hint` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `disabled` | boolean | Fuente define default/restricciÃ³n. |
| `required` | boolean | Fuente define default/restricciÃ³n. |
| `readonly` | boolean | Fuente define default/restricciÃ³n. |
| `clearable` | boolean | Fuente define default/restricciÃ³n. |
| `password-toggle` | boolean | Fuente define default/restricciÃ³n. |
| `min` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `max` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `step` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `maxlength` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `autocomplete` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `error` | boolean | Fuente define default/restricciÃ³n. |
| `error-text` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `show-count` | boolean | Fuente define default/restricciÃ³n. |
| `prefix` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `suffix` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `label-placement` | `top` / `start` / `float` | Default `top`. `float` = etiqueta flotante estilo ISP. |
| `data-typing-delay` | nÃºmero (ms) | Debounce de `iswc-typing-end`. Default 600. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Declarada por clase. |
| `defaultValue` | solo lectura | Declarada por clase. |
| `type` | lectura/escritura | Declarada por clase. |
| `variant` | lectura/escritura | Declarada por clase. |
| `labelPlacement` | lectura/escritura | Declarada por clase. Acepta `float`. |
| `typingDelay` | lectura/escritura | Refleja `data-typing-delay` (ms). |
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


| Evento | DescripciÃ³n |
| --- | --- |
| `input` | Evento nativo al cambiar el valor. |
| `change` | Evento nativo al confirmar el cambio de valor. |
| `iswc-input` | Emitido en cada cambio del valor (escribe como `input` nativo). |
| `iswc-change` | Emitido al confirmar el cambio de valor (escribe como `change` nativo). |
| `iswc-typing-end` | Emitido tras el debounce de escritura (default 600 ms). |
| `iswc-otp` | Emitido al autocompletar el valor vÃ­a Web OTP (autocomplete="one-time-code"). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `input` | no | sÃ­ | sÃ­ | no |
| `change` | no | sÃ­ | sÃ­ | no |
| `iswc-input` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-change` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-typing-end` | `{ value }` | sÃ­ | sÃ­ | no |
| `iswc-otp` | `{ code }` | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-input');
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
| `:state(invalid)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(disabled)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(readonly)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(blank)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(focused)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(password-visible)` | Estado usado por implementaciÃ³n/CSS. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-field-width` | Token leÃ­do o definido por componente. |
| `--iswc-field-label-width` | Token leÃ­do o definido por componente. |
| `--iswc-input-border-radius` | Token leÃ­do o definido por componente. |
| `--iswc-radius-sm` | Token leÃ­do o definido por componente. |
| `--iswc-input-border` | Token leÃ­do o definido por componente. |
| `--iswc-control-border` | Token leÃ­do o definido por componente. |
| `--iswc-input-bg` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg` | Token leÃ­do o definido por componente. |
| `--iswc-input-text` | Token leÃ­do o definido por componente. |
| `--iswc-control-text` | Token leÃ­do o definido por componente. |
| `--iswc-input-focus` | Token leÃ­do o definido por componente. |
| `--iswc-focus` | Token leÃ­do o definido por componente. |
| `--iswc-accent` | Token leÃ­do o definido por componente. |
| `--iswc-input-danger` | Token leÃ­do o definido por componente. |
| `--iswc-color-danger-500` | Token leÃ­do o definido por componente. |
| `--iswc-input-danger-text` | Token leÃ­do o definido por componente. |
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

> <iswc-input> â€” Campo de texto form-associated (vanilla + Shadow DOM).
> Atributos
>   type            text | email | password | number | search | tel | url | date  (default text)
>   name, value, placeholder, label, hint, autocomplete
>   variant      outlined (default) | filled | underlined
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
> Eventos: iswc-input, iswc-change (bubbles + composed) y los nativos input/change
> Tokens: --iswc-field-width, --iswc-field-label-width, --iswc-input-*
>
> Web OTP: si `autocomplete` es `one-time-code` u `otp`, `navigator.credentials.get({ otp })`
> rellena `value` y emite `iswc-otp`. El SMS debe incluir el origen (HTTPS).

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/form-associated.js`](../_shared/form-associated.js)
- [`../_shared/web-otp.js`](../_shared/web-otp.js)
- [`../media/icon.js`](../media/icon.js)

Tags del mÃ³dulo: `<iswc-input>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-describedby`, `aria-label`, `aria-invalid`.

## Ejemplo avanzado

```html
<iswc-input type="password" label="ContraseÃ±a" password-toggle></iswc-input>
<iswc-input type="number" label="Cantidad" min="0" max="100" step="5"></iswc-input>
<iswc-input type="search" label="Buscar" clearable></iswc-input>
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

- [JavaScript](./input.ts)
- [CSS](./input.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./input.json)
