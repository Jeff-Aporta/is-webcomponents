---
tag: iswc-select
tags:
  - iswc-select
category: forms
status: public
source: ./select.ts
style: ./select.css
preview: ./select.json
---
# `<iswc-select>`

## PropÃ³sito

Select form-associated con paridad funcional con el
Select de MUI:
colors, error, selecciÃ³n mÃºltiple con chips o checkmarks, agrupaciÃ³n, opciones ricas y typeahead.
El listbox vive en un <dialog> del top layer, asÃ­ que nunca lo recorta
el overflow de un ancestro.

Este mÃ³dulo registra `<iswc-select>`.

## CuÃ¡ndo usarlo

Captura, selecciÃ³n y validaciÃ³n de valores compatibles con formularios.

## CuÃ¡ndo no usarlo

No duplicar validaciÃ³n, form association ni pickers shared.

## ImportaciÃ³n

```js
import './select.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-select label="Ciudad" name="city" placeholder="Elige una ciudadâ€¦" clearable>
<iswc-option value="bog">BogotÃ¡</iswc-option>
<iswc-option value="med">MedellÃ­n</iswc-option>
</iswc-select>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `name` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `value` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `multiple` | boolean | Fuente define default/restricciÃ³n. |
| `placeholder` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `hint` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `disabled` | boolean | Fuente define default/restricciÃ³n. |
| `required` | boolean | Fuente define default/restricciÃ³n. |
| `clearable` | boolean | Fuente define default/restricciÃ³n. |
| `open` | boolean | Fuente define default/restricciÃ³n. |
| `variant` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `checkmarks` | boolean | Fuente define default/restricciÃ³n. |
| `selection-display` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `limit-tags` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `error` | boolean | Fuente define default/restricciÃ³n. |
| `error-text` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `full-width` | boolean | Fuente define default/restricciÃ³n. |
| `auto-width` | boolean | Fuente define default/restricciÃ³n. |
| `max-visible` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Declarada por clase. |
| `values` | lectura/escritura | Declarada por clase. |
| `selectedOptions` | solo lectura | Declarada por clase. |
| `multiple` | lectura/escritura | Declarada por clase. |
| `open` | lectura/escritura | Declarada por clase. |
| `disabled` | lectura/escritura | Declarada por clase. |
| `required` | lectura/escritura | Declarada por clase. |
| `clearable` | lectura/escritura | Declarada por clase. |
| `checkmarks` | lectura/escritura | Declarada por clase. |
| `error` | lectura/escritura | Declarada por clase. |
| `errorText` | lectura/escritura | Declarada por clase. |
| `fullWidth` | lectura/escritura | Declarada por clase. |
| `autoWidth` | lectura/escritura | Declarada por clase. |
| `maxVisible` | lectura/escritura | Declarada por clase. |
| `limitTags` | lectura/escritura | Declarada por clase. |
| `selectionDisplay` | lectura/escritura | Declarada por clase. |
| `variant` | lectura/escritura | Declarada por clase. |
| `placeholder` | lectura/escritura | Declarada por clase. |
| `name` | lectura/escritura | Declarada por clase. |
| `form` | solo lectura | Declarada por clase. |
| `validity` | solo lectura | Declarada por clase. |
| `validationMessage` | solo lectura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `label` | Contenido proyectado. |
| `start` | Contenido proyectado. |
| `hint` | Contenido proyectado. |
| `default` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-change` | Emitido al confirmar el cambio de valor (escribe como `change` nativo). |
| `iswc-show` | Emitido justo antes de mostrarse (cancelable). |
| `iswc-hide` | Emitido justo antes de ocultarse (cancelable). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-change` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-show` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-hide` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-select');
el.addEventListener('iswc-change', (e) => {
  console.log('iswc-change', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `show()` | MÃ©todo pÃºblico declarado. |
| `hide()` | MÃ©todo pÃºblico declarado. |
| `checkValidity()` | MÃ©todo pÃºblico declarado. |
| `reportValidity()` | MÃ©todo pÃºblico declarado. |
| `setCustomValidity()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `label` | Personalizable con `::part(label)`. |
| `base` | Personalizable con `::part(base)`. |
| `trigger` | Personalizable con `::part(trigger)`. |
| `clear` | Personalizable con `::part(clear)`. |
| `hint` | Personalizable con `::part(hint)`. |
| `error-text` | Personalizable con `::part(error-text)`. |
| `dialog` | Personalizable con `::part(dialog)`. |
| `listbox` | Personalizable con `::part(listbox)`. |
| `check` | Icono check que marca la opciÃ³n seleccionada. |
| `group` | `<optgroup>` del listado. |
| `group-label` | Etiqueta del `<optgroup>`. |
| `option` | Cada opciÃ³n del listado. |
| `option-description` | Texto secundario bajo la etiqueta de la opciÃ³n. |
| `option-start` | Slot/icono a la izquierda de la opciÃ³n. |
| `tag` | Cada chip del modo multi-selecciÃ³n. |
| `tag-more` | Chip `+N` que indica cuÃ¡ntas opciones mÃ¡s hay. |

### Custom states

| Estado | Uso |
| --- | --- |
| `:state(open)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(blank)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(error)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(disabled)` | Estado usado por implementaciÃ³n/CSS. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-select-border-radius` | Token leÃ­do o definido por componente. |
| `--iswc-radius-sm` | Token leÃ­do o definido por componente. |
| `--iswc-select-border` | Token leÃ­do o definido por componente. |
| `--iswc-control-border` | Token leÃ­do o definido por componente. |
| `--iswc-select-bg` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg` | Token leÃ­do o definido por componente. |
| `--iswc-select-text` | Token leÃ­do o definido por componente. |
| `--iswc-control-text` | Token leÃ­do o definido por componente. |
| `--iswc-select-focus` | Token leÃ­do o definido por componente. |
| `--iswc-focus` | Token leÃ­do o definido por componente. |
| `--iswc-accent` | Token leÃ­do o definido por componente. |
| `--iswc-select-danger` | Token leÃ­do o definido por componente. |
| `--iswc-color-danger-500` | Token leÃ­do o definido por componente. |
| `--iswc-select-danger-text` | Token leÃ­do o definido por componente. |
| `--iswc-danger-text` | Token leÃ­do o definido por componente. |
| `--iswc-color-danger-600` | Token leÃ­do o definido por componente. |
| `--iswc-sans` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--iswc-text-soft` | Token leÃ­do o definido por componente. |
| `--iswc-text-dim` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg-hover` | Token leÃ­do o definido por componente. |
| `--iswc-bg-elev` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |
| `--iswc-radius` | Token leÃ­do o definido por componente. |
| `--iswc-shadow` | Token leÃ­do o definido por componente. |
| `--iswc-border-soft` | Token leÃ­do o definido por componente. |
| `--iswc-accent-bg` | Token leÃ­do o definido por componente. |
| `--iswc-brand-text` | Token leÃ­do o definido por componente. |
| `--iswc-on-brand` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

Participa mediante ElementInternals/helpers form-associated; respetar name, value, disabled, reset, restore y validaciÃ³n.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-select> â€” Select form-associated con listbox en <dialog modal> (top layer),
> asÃ­ el desplegable nunca se pierde por overflow/clipping de ancestros.
> Atributos: name, value, multiple, placeholder, label, hint, disabled, required,
>            clearable, open, variant, checkmarks, selection-display, limit-tags,
>            error, error-text, full-width, auto-width, max-visible
> Slots: default (<iswc-option>), label, hint, start
> Parts: base, trigger, listbox, group, group-label, option, check, option-start,
>        option-description, tag, clear, label, hint, error-text
> Events: iswc-change { value, values }, iswc-show, iswc-hide
> En modo `multiple` con `name`, el valor de formulario se envÃ­a como FormData
> con una entrada por opciÃ³n seleccionada.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`./option.js`](./option.js)
- [`../media/icon.js`](../media/icon.js)
- [`../feedback/tag.js`](../feedback/tag.js)
- [`../_shared/form-associated.js`](../_shared/form-associated.js)

Tags del mÃ³dulo: `<iswc-select>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-haspopup`, `aria-expanded`, `aria-controls`, `aria-label`, `aria-hidden`, `aria-describedby`, `aria-invalid`, `aria-required`, `aria-multiselectable`, `aria-disabled`, `aria-labelledby`, `aria-selected`, `aria-activedescendant`.

## Ejemplo avanzado

```html
<iswc-select variant="filled" label="filled">â€¦</iswc-select>
<iswc-select variant="underlined" label="underlined">â€¦</iswc-select>
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

- [JavaScript](./select.ts)
- [CSS](./select.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./select.json)
