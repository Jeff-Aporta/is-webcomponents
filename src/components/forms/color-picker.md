---
tag: is-color-picker
tags:
  - is-color-picker
category: forms
status: public
source: ./color-picker.js
style: ./color-picker.css
preview: ../../previews/forms/is-color-picker.json
---
# `<is-color-picker>`

## Propósito

Trigger con muestra + hex. El panel (input type="color", campo hex y paleta) vive en un <dialog> en el top layer.

Este módulo registra `<is-color-picker>`.

## Cuándo usarlo

Captura, selección y validación de valores compatibles con formularios.

## Cuándo no usarlo

No duplicar validación, form association ni pickers shared.

## Importación

```js
import './color-picker.js';
```

## Ejemplo mínimo

```html
<is-color-picker
label="Color de marca"
name="brand"
value="#1971c2"
swatches="#e03131,#f59f00,#2f9e44"
></is-color-picker>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `name` | string/según contrato | Fuente define default/restricción. |
| `value` | string/según contrato | Fuente define default/restricción. |
| `label` | string/según contrato | Fuente define default/restricción. |
| `hint` | string/según contrato | Fuente define default/restricción. |
| `disabled` | boolean | Fuente define default/restricción. |
| `required` | boolean | Fuente define default/restricción. |
| `swatches` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Declarada por clase. |
| `disabled` | lectura/escritura | Declarada por clase. |
| `required` | lectura/escritura | Declarada por clase. |
| `name` | lectura/escritura | Declarada por clase. |
| `swatches` | lectura/escritura | Declarada por clase. |
| `open` | solo lectura | Declarada por clase. |
| `form` | solo lectura | Declarada por clase. |
| `validity` | solo lectura | Declarada por clase. |
| `validationMessage` | solo lectura | Declarada por clase. |

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
| `swatch` | Personalizable con `::part(swatch)`. |
| `hint` | Personalizable con `::part(hint)`. |
| `dialog` | Personalizable con `::part(dialog)`. |
| `panel` | Personalizable con `::part(panel)`. |
| `input` | Personalizable con `::part(input)`. |
| `hex-input` | Personalizable con `::part(hex-input)`. |

### Custom states

| Estado | Uso |
| --- | --- |
| `:state(open)` | Estado usado por implementación/CSS. |
| `:state(disabled)` | Estado usado por implementación/CSS. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-picker-radius` | Token leído o definido por componente. |
| `--is-radius-sm` | Token leído o definido por componente. |
| `--is-picker-border` | Token leído o definido por componente. |
| `--is-control-border` | Token leído o definido por componente. |
| `--is-picker-bg` | Token leído o definido por componente. |
| `--is-control-bg` | Token leído o definido por componente. |
| `--is-picker-text` | Token leído o definido por componente. |
| `--is-control-text` | Token leído o definido por componente. |
| `--is-picker-focus` | Token leído o definido por componente. |
| `--is-focus` | Token leído o definido por componente. |
| `--is-accent` | Token leído o definido por componente. |
| `--is-sans` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--is-text-soft` | Token leído o definido por componente. |
| `--is-text-dim` | Token leído o definido por componente. |
| `--is-control-bg-hover` | Token leído o definido por componente. |
| `--is-mono` | Token leído o definido por componente. |
| `--is-bg-elev` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--is-radius` | Token leído o definido por componente. |
| `--is-shadow` | Token leído o definido por componente. |

### Integración con formularios

Participa mediante ElementInternals/helpers form-associated; respetar name, value, disabled, reset, restore y validación.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-color-picker> — Selector de color form-associated.
> El panel (color nativo + hex + swatches) vive en un <dialog modal> (top layer)
> para no perderse por overflow de ancestros.
> Atributos: name, value (#rrggbb, default #808080), label, hint,
>            disabled, required, swatches (lista hex separada por comas)
> Slots: label, hint
> Parts: base, trigger, swatch, panel, input, hex-input, label, hint
> Events: is-input { value }, is-change { value }

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../media/icon.js`](../media/icon.js)
- [`../_shared/form-associated.js`](../_shared/form-associated.js)

Tags del módulo: `<is-color-picker>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-haspopup`, `aria-expanded`, `aria-hidden`, `aria-label`, `aria-required`, `aria-pressed`.

## Ejemplo avanzado

```html
<is-color-picker
label="Color de marca"
name="brand"
value="#1971c2"
swatches="#e03131,#f59f00,#2f9e44"
></is-color-picker>
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

- [JavaScript](./color-picker.js)
- [CSS](./color-picker.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/forms/is-color-picker.json)
