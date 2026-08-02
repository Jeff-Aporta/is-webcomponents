---
tag: is-combobox
tags:
  - is-combobox
category: forms
status: public
source: ./combobox.js
style: ./combobox.css
preview: ../../previews/forms/is-combobox.html
---
# `<is-combobox>`

## Propósito

Input + listbox filtrable con teclado y opciones is-option.

Este módulo registra `<is-combobox>`.

## Cuándo usarlo

Captura, selección y validación de valores compatibles con formularios.

## Cuándo no usarlo

No duplicar validación, form association ni pickers shared.

## Importación

```js
import './combobox.js';
```

## Ejemplo mínimo

```html
<is-combobox label="Ciudad" clearable>
<is-option value="bog">Bogotá</is-option>
<is-option value="med">Medellín</is-option>
</is-combobox>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `label` | string/según contrato | Fuente define default/restricción. |
| `hint` | string/según contrato | Fuente define default/restricción. |
| `name` | string/según contrato | Fuente define default/restricción. |
| `value` | string/según contrato | Fuente define default/restricción. |
| `placeholder` | string/según contrato | Fuente define default/restricción. |
| `disabled` | boolean | Fuente define default/restricción. |
| `required` | boolean | Fuente define default/restricción. |
| `open` | boolean | Fuente define default/restricción. |
| `clearable` | boolean | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Declarada por clase. |
| `open` | lectura/escritura | Declarada por clase. |
| `disabled` | lectura/escritura | Declarada por clase. |
| `required` | lectura/escritura | Declarada por clase. |
| `clearable` | lectura/escritura | Declarada por clase. |
| `name` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-show` | sí | sí | sí | no |
| `is-hide` | sí | sí | sí | no |
| `is-input` | sí | sí | sí | no |
| `is-change` | sí | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
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
| `input` | Personalizable con `::part(input)`. |
| `clear` | Personalizable con `::part(clear)`. |
| `trigger` | Personalizable con `::part(trigger)`. |
| `hint` | Personalizable con `::part(hint)`. |
| `dialog` | Personalizable con `::part(dialog)`. |
| `listbox` | Personalizable con `::part(listbox)`. |

### Custom states

| Estado | Uso |
| --- | --- |
| `:state(open)` | Estado usado por implementación/CSS. |
| `:state(disabled)` | Estado usado por implementación/CSS. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-combobox-border-radius` | Token leído o definido por componente. |
| `--is-radius-sm` | Token leído o definido por componente. |
| `--is-combobox-border` | Token leído o definido por componente. |
| `--is-control-border` | Token leído o definido por componente. |
| `--is-combobox-bg` | Token leído o definido por componente. |
| `--is-control-bg` | Token leído o definido por componente. |
| `--is-combobox-text` | Token leído o definido por componente. |
| `--is-control-text` | Token leído o definido por componente. |
| `--is-combobox-focus` | Token leído o definido por componente. |
| `--is-focus` | Token leído o definido por componente. |
| `--is-color-brand-500` | Token leído o definido por componente. |
| `--is-sans` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--is-text-soft` | Token leído o definido por componente. |
| `--is-text-dim` | Token leído o definido por componente. |
| `--is-control-bg-hover` | Token leído o definido por componente. |
| `--is-bg-elev` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--is-radius` | Token leído o definido por componente. |
| `--is-shadow` | Token leído o definido por componente. |
| `--is-accent-bg` | Token leído o definido por componente. |
| `--is-brand-text` | Token leído o definido por componente. |
| `--is-color-brand-700` | Token leído o definido por componente. |

### Integración con formularios

Participa mediante ElementInternals/helpers form-associated; respetar name, value, disabled, reset, restore y validación.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-combobox> — Input + listbox filtrable.
> El listbox vive en un <dialog modal> (top layer) para no perderse por
> overflow/visibility de ancestros. Clic en el backdrop del dialog cierra.
> Atributos: label, hint, name, value, placeholder, disabled, required, open, clearable
> Slots: default — <is-option> o <option>
> Events: is-change, is-input, is-show, is-hide

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`./option.js`](./option.js)

Tags del módulo: `<is-combobox>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-autocomplete`, `aria-expanded`, `aria-controls`, `aria-label`, `aria-hidden`, `aria-selected`.

## Ejemplo avanzado

```html
<is-combobox label="Ciudad" clearable>
<is-option value="bog">Bogotá</is-option>
<is-option value="med">Medellín</is-option>
</is-combobox>
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

- [JavaScript](./combobox.js)
- [CSS](./combobox.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/forms/is-combobox.html)
