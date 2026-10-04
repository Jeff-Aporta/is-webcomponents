---
tag: iswc-checkbox
tags:
  - iswc-checkbox
category: forms
status: public
source: ./checkbox.ts
style: ./checkbox.css
preview: ./checkbox.json
---
# `<iswc-checkbox>`

## PropÃ³sito

Casilla form-associated con paridad funcional con el
Checkbox de MUI:
entra en FormData y en la validaciÃ³n nativa del <form>
sin input oculto, con color por color, posiciÃ³n de etiqueta, iconos propios y
estado de error.

Este mÃ³dulo registra `<iswc-checkbox>`.

## CuÃ¡ndo usarlo

Captura, selecciÃ³n y validaciÃ³n de valores compatibles con formularios.

## CuÃ¡ndo no usarlo

No duplicar validaciÃ³n, form association ni pickers shared.

## ImportaciÃ³n

```js
import './checkbox.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-checkbox color="success" checked>success</iswc-checkbox>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `name` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `value` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `checked` | boolean | Fuente define default/restricciÃ³n. |
| `disabled` | boolean | Fuente define default/restricciÃ³n. |
| `readonly` | boolean | Fuente define default/restricciÃ³n. |
| `required` | boolean | Fuente define default/restricciÃ³n. |
| `indeterminate` | boolean | Fuente define default/restricciÃ³n. |
| `error` | boolean | Fuente define default/restricciÃ³n. |
| `hint` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `color` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `label-placement` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `icon` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `checked-icon` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `indeterminate-icon` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `checked` | lectura/escritura | Declarada por clase. |
| `indeterminate` | lectura/escritura | Declarada por clase. |
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
| `indeterminateIcon` | lectura/escritura | Declarada por clase. |
| `form` | solo lectura | Declarada por clase. |
| `validity` | solo lectura | Declarada por clase. |
| `validationMessage` | solo lectura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |
| `hint` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-change` | Emitido al confirmar el cambio de valor (escribe como `change` nativo). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-change` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-checkbox');
el.addEventListener('iswc-change', (e) => {
  console.log('iswc-change', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `checkValidity()` | MÃ©todo pÃºblico declarado. |
| `reportValidity()` | MÃ©todo pÃºblico declarado. |
| `setCustomValidity()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `form-control` | Personalizable con `::part(form-control)`. |
| `base` | Personalizable con `::part(base)`. |
| `control` | Personalizable con `::part(control)`. |
| `mark` | Personalizable con `::part(mark)`. |
| `label` | Personalizable con `::part(label)`. |
| `hint` | Personalizable con `::part(hint)`. |

### Custom states

| Estado | Uso |
| --- | --- |
| `:state(checked)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(indeterminate)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(disabled)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(readonly)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(error)` | Estado usado por implementaciÃ³n/CSS. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-checkbox-size` | Token leÃ­do o definido por componente. |
| `--iswc-checkbox-radius` | Token leÃ­do o definido por componente. |
| `--iswc-radius-sm` | Token leÃ­do o definido por componente. |
| `--iswc-checkbox-bg` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg` | Token leÃ­do o definido por componente. |
| `--iswc-checkbox-bg-hover` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg-hover` | Token leÃ­do o definido por componente. |
| `--iswc-checkbox-border` | Token leÃ­do o definido por componente. |
| `--iswc-control-border` | Token leÃ­do o definido por componente. |
| `--iswc-checkbox-accent` | Token leÃ­do o definido por componente. |
| `--iswc-accent` | Token leÃ­do o definido por componente. |
| `--iswc-color-brand-500` | Token leÃ­do o definido por componente. |
| `--iswc-checkbox-on-accent` | Token leÃ­do o definido por componente. |
| `--iswc-on-brand` | Token leÃ­do o definido por componente. |
| `--iswc-checkbox-focus` | Token leÃ­do o definido por componente. |
| `--iswc-focus` | Token leÃ­do o definido por componente. |
| `--iswc-checkbox-fill` | Token leÃ­do o definido por componente. |
| `--iswc-checkbox-mark` | Token leÃ­do o definido por componente. |
| `--iswc-checkbox-halo` | Token leÃ­do o definido por componente. |
| `--iswc-sans` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--iswc-control-text` | Token leÃ­do o definido por componente. |
| `--iswc-text-dim` | Token leÃ­do o definido por componente. |
| `--iswc-color-success-500` | Token leÃ­do o definido por componente. |
| `--iswc-color-warning-500` | Token leÃ­do o definido por componente. |
| `--iswc-color-danger-500` | Token leÃ­do o definido por componente. |
| `--iswc-danger-text` | Token leÃ­do o definido por componente. |
| `--iswc-color-danger-600` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

Participa mediante ElementInternals/helpers form-associated; respetar name, value, disabled, reset, restore y validaciÃ³n.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-checkbox> â€” Casilla form-associated: entra en FormData y en la validaciÃ³n del <form>.
> Atributos
>   name, value (default "on"), hint
>   color             brand (default) | neutral | success | warning | danger
>   label-placement     end (default) | start | top | bottom
>   icon                nombre de <iswc-icon> para el estado sin marcar
>   checked-icon        nombre de <iswc-icon> para el estado marcado (default mdi:check)
>   indeterminate-icon  nombre de <iswc-icon> para el estado mixto (default mdi:minus)
>   checked, indeterminate, disabled, readonly, required, error   (boolean)
> Slots: default (etiqueta), hint
> Parts: form-control, base, control, mark, label, hint
> Custom states: checked, indeterminate, disabled, readonly, error
> Events: iswc-change { checked, value }
> Sin atributo `size`: escala con el font-size del contexto.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../media/icon.js`](../media/icon.js)
- [`../_shared/form-associated.js`](../_shared/form-associated.js)

Tags del mÃ³dulo: `<iswc-checkbox>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-checked`, `aria-disabled`, `aria-readonly`, `aria-invalid`, `aria-required`.

## Ejemplo avanzado

```html
<iswc-checkbox label-placement="start" checked>start</iswc-checkbox>
<iswc-checkbox label-placement="top" checked>top</iswc-checkbox>
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

- [JavaScript](./checkbox.ts)
- [CSS](./checkbox.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./checkbox.json)
