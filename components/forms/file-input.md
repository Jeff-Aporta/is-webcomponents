---
tag: is-file-input
tags:
  - is-file-input
category: forms
status: public
source: ./file-input.js
style: ./file-input.css
preview: ../../previews/forms/is-file-input.html
---
# `<is-file-input>`

## Propósito

Dropzone con input nativo oculto, lista de archivos y estados blank / dragging.

Este módulo registra `<is-file-input>`.

## Cuándo usarlo

Captura, selección y validación de valores compatibles con formularios.

## Cuándo no usarlo

No duplicar validación, form association ni pickers shared.

## Importación

```js
import './file-input.js';
```

## Ejemplo mínimo

```html
<is-file-input
label="Adjuntos"
accept="image/*,.pdf"
multiple
name="attachments"
></is-file-input>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `label` | string/según contrato | Fuente define default/restricción. |
| `hint` | string/según contrato | Fuente define default/restricción. |
| `name` | string/según contrato | Fuente define default/restricción. |
| `accept` | string/según contrato | Fuente define default/restricción. |
| `capture` | string/según contrato | Fuente define default/restricción. |
| `multiple` | boolean | Fuente define default/restricción. |
| `disabled` | boolean | Fuente define default/restricción. |
| `required` | boolean | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `files` | lectura/escritura | Declarada por clase. |
| `value` | solo lectura | Declarada por clase. |
| `disabled` | lectura/escritura | Declarada por clase. |
| `multiple` | lectura/escritura | Declarada por clase. |
| `required` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `label` | Contenido proyectado. |
| `hint` | Contenido proyectado. |
| `dropzone` | Contenido proyectado. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-change` | sí | sí | sí | no |
| `input` | sí | sí | sí | no |
| `change` | sí | sí | sí | no |

### Métodos y propiedades públicas

No expone.

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `label` | Personalizable con `::part(label)`. |
| `hint` | Personalizable con `::part(hint)`. |
| `dropzone` | Personalizable con `::part(dropzone)`. |
| `input` | Personalizable con `::part(input)`. |
| `file-list` | Personalizable con `::part(file-list)`. |

### Custom states

| Estado | Uso |
| --- | --- |
| `:state(dragging)` | Estado usado por implementación/CSS. |
| `:state(disabled)` | Estado usado por implementación/CSS. |
| `:state(blank)` | Estado usado por implementación/CSS. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-font-family` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--is-text-soft` | Token leído o definido por componente. |
| `--is-control-border` | Token leído o definido por componente. |
| `--is-control-bg` | Token leído o definido por componente. |
| `--is-color-brand-500` | Token leído o definido por componente. |
| `--is-focus` | Token leído o definido por componente. |
| `--is-surface` | Token leído o definido por componente. |
| `--is-color-danger-500` | Token leído o definido por componente. |

### Integración con formularios

Participa mediante ElementInternals/helpers form-associated; respetar name, value, disabled, reset, restore y validación.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-file-input> — Web Component (vanilla).
> Dropzone + input file nativo oculto. Lista de archivos con quitar.
> Atributos
>   label, hint, name, accept, capture
>   multiple, disabled, required  (boolean)
> Propiedad
>   files  File[]  get/set — reasignar dispara update
> Slots: label, hint, dropzone
> Custom states: blank, dragging  (:state / data-state-*)
> Eventos: change, input, is-change (bubbles, composed)
> CSS Parts: ::part(base) ::part(label) ::part(hint) ::part(dropzone)
>            ::part(file-list) ::part(file) ::part(remove-button)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../media/icon.js`](../media/icon.js)
- [`../helpers/format-bytes.js`](../helpers/format-bytes.js)

Tags del módulo: `<is-file-input>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-labelledby`, `aria-describedby`, `aria-hidden`, `aria-disabled`, `aria-label`.

## Ejemplo avanzado

```html
<is-file-input
label="Adjuntos"
accept="image/*,.pdf"
multiple
name="attachments"
></is-file-input>
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

- [JavaScript](./file-input.js)
- [CSS](./file-input.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/forms/is-file-input.html)
