---
tag: is-select
tags:
  - is-select
category: forms
status: public
source: ./select.js
style: ./select.css
preview: ../../previews/forms/is-select.html
---
# `<is-select>`

## Propósito

Select form-associated con paridad funcional con el
Select de MUI:
variants, error, selección múltiple con chips o checkmarks, agrupación, opciones ricas y typeahead.
El listbox vive en un <dialog> del top layer, así que nunca lo recorta
el overflow de un ancestro.

Este módulo registra `<is-select>`.

## Cuándo usarlo

Captura, selección y validación de valores compatibles con formularios.

## Cuándo no usarlo

No duplicar validación, form association ni pickers shared.

## Importación

```js
import './select.js';
```

## Ejemplo mínimo

```html
<is-select label="Ciudad" name="city" placeholder="Elige una ciudad…" clearable>
<is-option value="bog">Bogotá</is-option>
<is-option value="med">Medellín</is-option>
</is-select>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `name` | string/según contrato | Fuente define default/restricción. |
| `value` | string/según contrato | Fuente define default/restricción. |
| `multiple` | boolean | Fuente define default/restricción. |
| `placeholder` | string/según contrato | Fuente define default/restricción. |
| `label` | string/según contrato | Fuente define default/restricción. |
| `hint` | string/según contrato | Fuente define default/restricción. |
| `disabled` | boolean | Fuente define default/restricción. |
| `required` | boolean | Fuente define default/restricción. |
| `clearable` | boolean | Fuente define default/restricción. |
| `open` | boolean | Fuente define default/restricción. |
| `appearance` | string/según contrato | Fuente define default/restricción. |
| `checkmarks` | boolean | Fuente define default/restricción. |
| `selection-display` | string/según contrato | Fuente define default/restricción. |
| `limit-tags` | string/según contrato | Fuente define default/restricción. |
| `error` | boolean | Fuente define default/restricción. |
| `error-text` | string/según contrato | Fuente define default/restricción. |
| `full-width` | boolean | Fuente define default/restricción. |
| `auto-width` | boolean | Fuente define default/restricción. |
| `max-visible` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

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
| `appearance` | lectura/escritura | Declarada por clase. |
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

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-change` | sí | sí | sí | no |
| `is-show` | sí | sí | sí | no |
| `is-hide` | sí | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `show()` | Método público declarado. |
| `hide()` | Método público declarado. |
| `checkValidity()` | Método público declarado. |
| `reportValidity()` | Método público declarado. |
| `setCustomValidity()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

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

### Custom states

| Estado | Uso |
| --- | --- |
| `:state(open)` | Estado usado por implementación/CSS. |
| `:state(blank)` | Estado usado por implementación/CSS. |
| `:state(error)` | Estado usado por implementación/CSS. |
| `:state(disabled)` | Estado usado por implementación/CSS. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-select-border-radius` | Token leído o definido por componente. |
| `--is-radius-sm` | Token leído o definido por componente. |
| `--is-select-border` | Token leído o definido por componente. |
| `--is-control-border` | Token leído o definido por componente. |
| `--is-select-bg` | Token leído o definido por componente. |
| `--is-control-bg` | Token leído o definido por componente. |
| `--is-select-text` | Token leído o definido por componente. |
| `--is-control-text` | Token leído o definido por componente. |
| `--is-select-focus` | Token leído o definido por componente. |
| `--is-focus` | Token leído o definido por componente. |
| `--is-accent` | Token leído o definido por componente. |
| `--is-select-danger` | Token leído o definido por componente. |
| `--is-color-danger-500` | Token leído o definido por componente. |
| `--is-select-danger-text` | Token leído o definido por componente. |
| `--is-danger-text` | Token leído o definido por componente. |
| `--is-color-danger-600` | Token leído o definido por componente. |
| `--is-sans` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--is-text-soft` | Token leído o definido por componente. |
| `--is-text-dim` | Token leído o definido por componente. |
| `--is-control-bg-hover` | Token leído o definido por componente. |
| `--is-bg-elev` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--is-radius` | Token leído o definido por componente. |
| `--is-shadow` | Token leído o definido por componente. |
| `--is-border-soft` | Token leído o definido por componente. |
| `--is-accent-bg` | Token leído o definido por componente. |
| `--is-brand-text` | Token leído o definido por componente. |
| `--is-on-brand` | Token leído o definido por componente. |

### Integración con formularios

Participa mediante ElementInternals/helpers form-associated; respetar name, value, disabled, reset, restore y validación.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-select> — Select form-associated con listbox en <dialog modal> (top layer),
> así el desplegable nunca se pierde por overflow/clipping de ancestros.
> Atributos: name, value, multiple, placeholder, label, hint, disabled, required,
>            clearable, open, appearance, checkmarks, selection-display, limit-tags,
>            error, error-text, full-width, auto-width, max-visible
> Slots: default (<is-option>), label, hint, start
> Parts: base, trigger, listbox, group, group-label, option, check, option-start,
>        option-description, tag, clear, label, hint, error-text
> Events: is-change { value, values }, is-show, is-hide
> En modo `multiple` con `name`, el valor de formulario se envía como FormData
> con una entrada por opción seleccionada.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`./option.js`](./option.js)
- [`../media/icon.js`](../media/icon.js)
- [`../feedback/tag.js`](../feedback/tag.js)
- [`../_shared/form-associated.js`](../_shared/form-associated.js)

Tags del módulo: `<is-select>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-haspopup`, `aria-expanded`, `aria-controls`, `aria-label`, `aria-hidden`, `aria-describedby`, `aria-invalid`, `aria-required`, `aria-multiselectable`, `aria-disabled`, `aria-labelledby`, `aria-selected`, `aria-activedescendant`.

## Ejemplo avanzado

```html
<is-select appearance="filled" label="filled">…</is-select>
<is-select appearance="underlined" label="underlined">…</is-select>
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

- [JavaScript](./select.js)
- [CSS](./select.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/forms/is-select.html)
