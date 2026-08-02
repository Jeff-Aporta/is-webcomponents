---
tag: is-rating
tags:
  - is-rating
category: forms
status: public
source: ./rating.js
style: ./rating.css
preview: ../../previews/forms/is-rating.html
---
# `<is-rating>`

## Propósito

Valoración form-associated con paridad funcional con el
Rating de MUI:
precisión arbitraria, iconos propios, textos de hover, colores de color y reset.

Este módulo registra `<is-rating>`.

## Cuándo usarlo

Captura, selección y validación de valores compatibles con formularios.

## Cuándo no usarlo

No duplicar validación, form association ni pickers shared.

## Importación

```js
import './rating.js';
```

## Ejemplo mínimo

```html
<is-rating label="Satisfacción" value="3" name="rating"></is-rating>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `name` | string/según contrato | Fuente define default/restricción. |
| `value` | string/según contrato | Fuente define default/restricción. |
| `max` | string/según contrato | Fuente define default/restricción. |
| `precision` | string/según contrato | Fuente define default/restricción. |
| `allow-half` | boolean | Fuente define default/restricción. |
| `icon` | string/según contrato | Fuente define default/restricción. |
| `empty-icon` | string/según contrato | Fuente define default/restricción. |
| `highlight-selected-only` | boolean | Fuente define default/restricción. |
| `color` | string/según contrato | Fuente define default/restricción. |
| `label-format` | string/según contrato | Fuente define default/restricción. |
| `show-label` | boolean | Fuente define default/restricción. |
| `clearable` | boolean | Fuente define default/restricción. |
| `disabled` | boolean | Fuente define default/restricción. |
| `readonly` | boolean | Fuente define default/restricción. |
| `required` | boolean | Fuente define default/restricción. |
| `label` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

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

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-change` | sí | sí | sí | no |
| `is-hover` | sí | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `focus()` | Método público declarado. |
| `blur()` | Método público declarado. |
| `clear()` | Método público declarado. |
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
| `hover-label` | Personalizable con `::part(hover-label)`. |
| `star` | Personalizable con `::part(star)`. |
| `icon-empty` | Personalizable con `::part(icon-empty)`. |
| `icon-filled` | Personalizable con `::part(icon-filled)`. |

### Custom states

| Estado | Uso |
| --- | --- |
| `:state(readonly)` | Estado usado por implementación/CSS. |
| `:state(disabled)` | Estado usado por implementación/CSS. |
| `:state(blank)` | Estado usado por implementación/CSS. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--fill` | Token leído o definido por componente. |
| `--is-rating-size` | Token leído o definido por componente. |
| `--is-rating-gap` | Token leído o definido por componente. |
| `--is-rating-color` | Token leído o definido por componente. |
| `--is-accent` | Token leído o definido por componente. |
| `--is-rating-empty` | Token leído o definido por componente. |
| `--is-control-border` | Token leído o definido por componente. |
| `--is-rating-focus` | Token leído o definido por componente. |
| `--is-focus` | Token leído o definido por componente. |
| `--is-sans` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--is-control-text` | Token leído o definido por componente. |
| `--is-color-success-500` | Token leído o definido por componente. |
| `--is-color-warning-500` | Token leído o definido por componente. |
| `--is-color-danger-500` | Token leído o definido por componente. |
| `--is-text-soft` | Token leído o definido por componente. |
| `--is-radius-sm` | Token leído o definido por componente. |

### Integración con formularios

Participa mediante ElementInternals/helpers form-associated; respetar name, value, disabled, reset, restore y validación.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-rating> — Valoración form-associated (vanilla + Shadow DOM).
> Atributos
>   name, label, color (brand|neutral|success|warning|danger)
>   value        0..max (default 0)
>   max          número de iconos (default 5)
>   precision    granularidad del valor: 1 (default) | 0.5 | 0.25 | 0.1
>   allow-half   alias de precision="0.5"
>   icon         nombre is-icon del estado relleno (ej. tabler:heart-filled)
>   empty-icon   nombre is-icon del estado vacío
>   highlight-selected-only  resalta solo el icono del valor, no los anteriores
>   label-format plantilla del texto del valor, ej. "{v} de {max}"
>   show-label   muestra ese texto junto a los iconos (sigue al hover)
>   clearable, disabled, readonly, required   (boolean)
> Propiedades
>   labels        string[] — índice 0 = valor 1
>   getLabelText  (value) => string — gana sobre labels y label-format
> Slots: label
> Parts: form-control, label, base, star, icon-empty, icon-filled, hover-label
> Custom states: blank, disabled, readonly
> Eventos: is-change (valor confirmado), is-hover (previsualización)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/form-associated.js`](../_shared/form-associated.js)
- [`../media/icon.js`](../media/icon.js)

Tags del módulo: `<is-rating>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-labelledby`, `aria-valuemin`, `aria-disabled`, `aria-readonly`, `aria-label`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext`.

## Ejemplo avanzado

```html
<is-rating label="10 iconos" max="10" value="7"></is-rating>
<is-rating value="3" style="font-size:1.5rem"></is-rating>
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

- [JavaScript](./rating.js)
- [CSS](./rating.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/forms/is-rating.html)
