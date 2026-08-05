---
tag: is-radio-group
tags:
  - is-radio-group
category: forms
status: public
source: ./radio-group.js
style: ./radio-group.css
preview: ../../previews/forms/is-radio.html
---
# `<is-radio-group>`

## Propósito

Paridad funcional con el
Radio Group de MUI:
color por color, posición de etiqueta, estado de error, solo lectura y
navegación por teclado según el patrón ARIA radiogroup.
El grupo es el elemento form-associated: publica el valor, valida y gobierna el teclado.
Los is-radio son las opciones y solo avisan al grupo cuando se eligen.

Este módulo registra `<is-radio-group>`.

## Cuándo usarlo

Captura, selección y validación de valores compatibles con formularios.

## Cuándo no usarlo

No duplicar validación, form association ni pickers shared.

## Importación

```js
import './radio-group.js';
```

## Ejemplo mínimo

```html
<is-radio-group name="plan" value="pro" label="Plan">
<is-radio value="free">Gratis</is-radio>
<is-radio value="pro">Profesional</is-radio>
<is-radio value="legacy" disabled>Heredado</is-radio>
</is-radio-group>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `name` | string/según contrato | Fuente define default/restricción. |
| `value` | string/según contrato | Fuente define default/restricción. |
| `disabled` | boolean | Fuente define default/restricción. |
| `required` | boolean | Fuente define default/restricción. |
| `readonly` | boolean | Fuente define default/restricción. |
| `label` | string/según contrato | Fuente define default/restricción. |
| `hint` | string/según contrato | Fuente define default/restricción. |
| `orientation` | string/según contrato | Fuente define default/restricción. |
| `row` | boolean | Fuente define default/restricción. |
| `color` | string/según contrato | Fuente define default/restricción. |
| `label-placement` | string/según contrato | Fuente define default/restricción. |
| `error` | boolean | Fuente define default/restricción. |
| `error-text` | string/según contrato | Fuente define default/restricción. |
| `is-radio` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Declarada por clase. |
| `name` | lectura/escritura | Declarada por clase. |
| `disabled` | lectura/escritura | Declarada por clase. |
| `required` | lectura/escritura | Declarada por clase. |
| `readonly` | lectura/escritura | Declarada por clase. |
| `error` | lectura/escritura | Declarada por clase. |
| `errorText` | lectura/escritura | Declarada por clase. |
| `label` | lectura/escritura | Declarada por clase. |
| `hint` | lectura/escritura | Declarada por clase. |
| `orientation` | lectura/escritura | Declarada por clase. |
| `row` | lectura/escritura | Declarada por clase. |
| `color` | lectura/escritura | Declarada por clase. |
| `labelPlacement` | lectura/escritura | Declarada por clase. |
| `radios` | solo lectura | Declarada por clase. |
| `form` | solo lectura | Declarada por clase. |
| `validity` | solo lectura | Declarada por clase. |
| `validationMessage` | solo lectura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `label` | Contenido proyectado. |
| `default` | Contenido proyectado. |
| `hint` | Contenido proyectado. |
| `error-text` | Contenido proyectado. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-change` | sí | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `checkValidity()` | Método público declarado. |
| `reportValidity()` | Método público declarado. |
| `setCustomValidity()` | Método público declarado. |
| `focus()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `form-control` | Personalizable con `::part(form-control)`. |
| `label` | Personalizable con `::part(label)`. |
| `base` | Personalizable con `::part(base)`. |
| `hint` | Personalizable con `::part(hint)`. |
| `error-text` | Personalizable con `::part(error-text)`. |

### Custom states

| Estado | Uso |
| --- | --- |
| `:state(error)` | Estado usado por implementación/CSS. |
| `:state(disabled)` | Estado usado por implementación/CSS. |
| `:state(readonly)` | Estado usado por implementación/CSS. |
| `:state(blank)` | Estado usado por implementación/CSS. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-sans` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--is-text-soft` | Token leído o definido por componente. |
| `--is-text-dim` | Token leído o definido por componente. |
| `--is-danger-text` | Token leído o definido por componente. |
| `--is-color-danger-600` | Token leído o definido por componente. |
| `--is-radio-accent` | Token leído o definido por componente. |
| `--is-accent` | Token leído o definido por componente. |
| `--is-color-brand-500` | Token leído o definido por componente. |
| `--is-control-border` | Token leído o definido por componente. |
| `--is-color-success-500` | Token leído o definido por componente. |
| `--is-color-warning-500` | Token leído o definido por componente. |
| `--is-color-danger-500` | Token leído o definido por componente. |

### Integración con formularios

Participa mediante ElementInternals/helpers form-associated; respetar name, value, disabled, reset, restore y validación.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-radio-group> — Grupo form-associated de <is-radio>. El grupo es el dueño
> del valor: los radios solo avisan con `is-radio-select`.
> Atributos
>   name, value, label, hint
>   orientation      vertical (default) | horizontal   ·   row = alias booleano de horizontal
>   color          brand (default) | neutral | success | warning | danger
>   label-placement  end (default) | start | top | bottom   (se aplica a los hijos)
>   error-text       mensaje de error; sustituye al hint y activa el estado de error
>   disabled, required, readonly, error   (boolean)
> Slots: default (<is-radio>), label, hint, error-text
> Parts: form-control, label, base, hint, error-text
> Custom states: disabled, readonly, error, blank
> Events: is-change { value }

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`./radio.js`](./radio.js)
- [`../_shared/form-associated.js`](../_shared/form-associated.js)

Tags del módulo: `<is-radio-group>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-describedby`, `aria-disabled`, `aria-orientation`, `aria-required`, `aria-readonly`, `aria-invalid`.

## Ejemplo avanzado

```html
<is-radio-group color="success" row>
<is-radio value="c">Hereda success</is-radio>
<is-radio value="d" color="danger">Se sale del grupo</is-radio>
</is-radio-group>
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

- [JavaScript](./radio-group.js)
- [CSS](./radio-group.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/forms/is-radio.html)
