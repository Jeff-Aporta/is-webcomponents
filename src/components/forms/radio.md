---
tag: iswc-radio
tags:
  - iswc-radio
category: forms
status: public
source: ./radio.js
style: ./radio.css
preview: ./radio.json
---
# `<iswc-radio>`

## Propósito

Paridad funcional con el
Radio Group de MUI:
color por color, posición de etiqueta, estado de error, solo lectura y
navegación por teclado según el patrón ARIA radiogroup.
El grupo es el elemento form-associated: publica el valor, valida y gobierna el teclado.
Los iswc-radio son las opciones y solo avisan al grupo cuando se eligen.

Este módulo registra `<iswc-radio>`.

## Cuándo usarlo

Captura, selección y validación de valores compatibles con formularios.

## Cuándo no usarlo

No duplicar validación, form association ni pickers shared.

## Importación

```js
import './radio.js';
```

## Ejemplo mínimo

```html
<iswc-radio-group name="plan" value="pro" label="Plan">
<iswc-radio value="free">Gratis</iswc-radio>
<iswc-radio value="pro">Profesional</iswc-radio>
<iswc-radio value="legacy" disabled>Heredado</iswc-radio>
</iswc-radio-group>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string/según contrato | Fuente define default/restricción. |
| `checked` | boolean | Fuente define default/restricción. |
| `disabled` | boolean | Fuente define default/restricción. |
| `color` | string/según contrato | Fuente define default/restricción. |
| `label-placement` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Declarada por clase. |
| `checked` | lectura/escritura | Declarada por clase. |
| `disabled` | lectura/escritura | Declarada por clase. |
| `color` | lectura/escritura | Declarada por clase. |
| `labelPlacement` | lectura/escritura | Declarada por clase. |
| `group` | solo lectura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |
| `description` | Contenido proyectado. |

### Eventos


| Evento | Descripción |
| --- | --- |
| `iswc-radio-select` | Evento personalizado del componente (radio select). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-radio-select` | sí | sí | sí | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-radio');
el.addEventListener('iswc-radio-select', (e) => {
  console.log('iswc-radio-select', e.detail);
});
```

</details>

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `syncFromGroup()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `control` | Personalizable con `::part(control)`. |
| `dot` | Personalizable con `::part(dot)`. |
| `text` | Personalizable con `::part(text)`. |
| `label` | Personalizable con `::part(label)`. |
| `description` | Personalizable con `::part(description)`. |

### Custom states

| Estado | Uso |
| --- | --- |
| `:state(error)` | Estado usado por implementación/CSS. |
| `:state(placement-start)` | Estado usado por implementación/CSS. |
| `:state(placement-top)` | Estado usado por implementación/CSS. |
| `:state(placement-bottom)` | Estado usado por implementación/CSS. |
| `:state(readonly)` | Estado usado por implementación/CSS. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--_size` | Token leído o definido por componente. |
| `--iswc-radio-size` | Token leído o definido por componente. |
| `--_bg` | Token leído o definido por componente. |
| `--iswc-radio-bg` | Token leído o definido por componente. |
| `--iswc-control-bg` | Token leído o definido por componente. |
| `--_bg-hover` | Token leído o definido por componente. |
| `--iswc-radio-bg-hover` | Token leído o definido por componente. |
| `--iswc-control-bg-hover` | Token leído o definido por componente. |
| `--_border` | Token leído o definido por componente. |
| `--iswc-radio-border` | Token leído o definido por componente. |
| `--iswc-control-border` | Token leído o definido por componente. |
| `--_accent` | Token leído o definido por componente. |
| `--iswc-radio-accent` | Token leído o definido por componente. |
| `--iswc-accent` | Token leído o definido por componente. |
| `--iswc-color-brand-500` | Token leído o definido por componente. |
| `--_dot` | Token leído o definido por componente. |
| `--iswc-radio-dot` | Token leído o definido por componente. |
| `--iswc-on-brand` | Token leído o definido por componente. |
| `--_focus` | Token leído o definido por componente. |
| `--iswc-radio-focus` | Token leído o definido por componente. |
| `--_halo` | Token leído o definido por componente. |
| `--iswc-radio-halo-size` | Token leído o definido por componente. |
| `--iswc-sans` | Token leído o definido por componente. |
| `--iswc-text` | Token leído o definido por componente. |
| `--iswc-control-text` | Token leído o definido por componente. |
| `--iswc-text-dim` | Token leído o definido por componente. |
| `--iswc-color-success-500` | Token leído o definido por componente. |
| `--iswc-color-warning-500` | Token leído o definido por componente. |
| `--iswc-color-danger-500` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <iswc-radio> — Opción de radio. NO es form-associated a propósito: el valor lo
> publica <iswc-radio-group>, que es quien participa en el <form>.
> Atributos
>   value, checked, disabled
>   color          brand (default) | neutral | success | warning | danger
>   label-placement  end (default) | start | top | bottom
>   Sin color / label-placement propios se hereda el del grupo.
> Slots: default (etiqueta), description (texto secundario)
> Parts: base, control, dot, text, label, description
> Custom states: placement-* readonly error (heredados del grupo)
> Events: iswc-radio-select { value } — lo consume el grupo. Sin grupo, se marca solo.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/form-associated.js`](../_shared/form-associated.js)

Tags del módulo: `<iswc-radio>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-checked`, `aria-disabled`.

## Ejemplo avanzado

```html
<iswc-radio-group color="success" row>
<iswc-radio value="c">Hereda success</iswc-radio>
<iswc-radio value="d" color="danger">Se sale del grupo</iswc-radio>
</iswc-radio-group>
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

- [JavaScript](./radio.js)
- [CSS](./radio.css)
- [Índice de categoría](./LLM.md)
- [Preview](./radio.json)
