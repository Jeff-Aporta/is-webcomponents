---
tag: iswc-switch
tags:
  - iswc-switch
category: forms
status: public
source: ./switch.js
style: ./switch.css
preview: ./switch.json
---
# `<iswc-switch>`

## Propósito

Interruptor form-associated con paridad funcional con el
Switch de MUI:
mismo contrato de formulario que iswc-checkbox, con carril y perilla deslizante,
color por color, iconos en la perilla y rótulos dentro del carril.

Este módulo registra `<iswc-switch>`.

## Cuándo usarlo

Captura, selección y validación de valores compatibles con formularios.

## Cuándo no usarlo

No duplicar validación, form association ni pickers shared.

## Importación

```js
import './switch.js';
```

## Ejemplo mínimo

```html
<iswc-switch color="success" checked>success</iswc-switch>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `name` | string/según contrato | Fuente define default/restricción. |
| `value` | string/según contrato | Fuente define default/restricción. |
| `checked` | boolean | Fuente define default/restricción. |
| `disabled` | boolean | Fuente define default/restricción. |
| `readonly` | boolean | Fuente define default/restricción. |
| `required` | boolean | Fuente define default/restricción. |
| `error` | boolean | Fuente define default/restricción. |
| `hint` | string/según contrato | Fuente define default/restricción. |
| `color` | string/según contrato | Fuente define default/restricción. |
| `label-placement` | string/según contrato | Fuente define default/restricción. |
| `icon` | string/según contrato | Fuente define default/restricción. |
| `checked-icon` | string/según contrato | Fuente define default/restricción. |
| `on-label` | string/según contrato | Fuente define default/restricción. |
| `off-label` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `checked` | lectura/escritura | Declarada por clase. |
| `disabled` | lectura/escritura | Declarada por clase. |
| `readonly` | lectura/escritura | Declarada por clase. |
| `required` | lectura/escritura | Declarada por clase. |
| `error` | lectura/escritura | Declarada por clase. |
| `value` | lectura/escritura | Declarada por clase. |
| `name` | lectura/escritura | Declarada por clase. |
| `hint` | lectura/escritura | Declarada por clase. |
| `color` | lectura/escritura | Declarada por clase. |
| `labelPlacement` | lectura/escritura | Declarada por clase. |
| `icon` | lectura/escritura | Declarada por clase. |
| `checkedIcon` | lectura/escritura | Declarada por clase. |
| `onLabel` | lectura/escritura | Declarada por clase. |
| `offLabel` | lectura/escritura | Declarada por clase. |
| `form` | solo lectura | Declarada por clase. |
| `validity` | solo lectura | Declarada por clase. |
| `validationMessage` | solo lectura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |
| `hint` | Contenido proyectado. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-change` | sí | sí | sí | no |

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
| `base` | Personalizable con `::part(base)`. |
| `control` | Personalizable con `::part(control)`. |
| `track-label` | Personalizable con `::part(track-label)`. |
| `thumb` | Personalizable con `::part(thumb)`. |
| `mark` | Personalizable con `::part(mark)`. |
| `label` | Personalizable con `::part(label)`. |
| `hint` | Personalizable con `::part(hint)`. |

### Custom states

| Estado | Uso |
| --- | --- |
| `:state(checked)` | Estado usado por implementación/CSS. |
| `:state(disabled)` | Estado usado por implementación/CSS. |
| `:state(readonly)` | Estado usado por implementación/CSS. |
| `:state(error)` | Estado usado por implementación/CSS. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-switch-height` | Token leído o definido por componente. |
| `--iswc-switch-width` | Token leído o definido por componente. |
| `--iswc-switch-bg` | Token leído o definido por componente. |
| `--iswc-control-bg` | Token leído o definido por componente. |
| `--iswc-switch-bg-hover` | Token leído o definido por componente. |
| `--iswc-control-bg-hover` | Token leído o definido por componente. |
| `--iswc-switch-border` | Token leído o definido por componente. |
| `--iswc-control-border` | Token leído o definido por componente. |
| `--iswc-switch-accent` | Token leído o definido por componente. |
| `--iswc-accent` | Token leído o definido por componente. |
| `--iswc-color-brand-500` | Token leído o definido por componente. |
| `--iswc-switch-thumb` | Token leído o definido por componente. |
| `--iswc-on-brand` | Token leído o definido por componente. |
| `--iswc-switch-focus` | Token leído o definido por componente. |
| `--iswc-focus` | Token leído o definido por componente. |
| `--iswc-switch-icon` | Token leído o definido por componente. |
| `--iswc-control-text` | Token leído o definido por componente. |
| `--iswc-switch-icon-checked` | Token leído o definido por componente. |
| `--iswc-switch-halo` | Token leído o definido por componente. |
| `--iswc-sans` | Token leído o definido por componente. |
| `--iswc-text` | Token leído o definido por componente. |
| `--iswc-text-dim` | Token leído o definido por componente. |
| `--iswc-color-success-500` | Token leído o definido por componente. |
| `--iswc-color-warning-500` | Token leído o definido por componente. |
| `--iswc-color-danger-500` | Token leído o definido por componente. |
| `--iswc-danger-text` | Token leído o definido por componente. |
| `--iswc-color-danger-600` | Token leído o definido por componente. |

### Integración con formularios

Participa mediante ElementInternals/helpers form-associated; respetar name, value, disabled, reset, restore y validación.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <iswc-switch> — Interruptor form-associated (track + thumb).
> Atributos
>   name, value (default "on"), hint
>   color          brand (default) | neutral | success | warning | danger | info | error
>   label-placement  end (default) | start | top | bottom
>   icon             nombre de <iswc-icon> dentro del thumb apagado
>   checked-icon     nombre de <iswc-icon> dentro del thumb encendido
>   on-label         texto corto dentro del track cuando está encendido
>   off-label        texto corto dentro del track cuando está apagado
>   checked, disabled, readonly, required, error   (boolean)
> Slots: default (etiqueta), hint
> Parts: form-control, base, control, track-label, thumb, mark, label, hint
> Custom states: checked, disabled, readonly, error
> Events: iswc-change { checked, value }
> Sin atributo `size`: escala con el font-size del contexto.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../media/icon.js`](../media/icon.js)
- [`../_shared/form-associated.js`](../_shared/form-associated.js)

Tags del módulo: `<iswc-switch>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-checked`, `aria-disabled`, `aria-readonly`, `aria-invalid`, `aria-required`.

## Ejemplo avanzado

```html
<iswc-switch icon="mdi:weather-night" checked-icon="mdi:white-balance-sunny"
color="warning" checked>Tema claro</iswc-switch>
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

- [JavaScript](./switch.js)
- [CSS](./switch.css)
- [Índice de categoría](./LLM.md)
- [Preview](./switch.json)
