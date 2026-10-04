---
tag: iswc-radio-group
tags:
  - iswc-radio-group
category: forms
status: public
source: ./radio-group.ts
style: ./radio-group.css
preview: ./radio-group.json
---
# `<iswc-radio-group>`

## PropÃ³sito

Paridad funcional con el
Radio Group de MUI:
color por color, posiciÃ³n de etiqueta, estado de error, solo lectura y
navegaciÃ³n por teclado segÃºn el patrÃ³n ARIA radiogroup.
El grupo es el elemento form-associated: publica el valor, valida y gobierna el teclado.
Los iswc-radio son las opciones y solo avisan al grupo cuando se eligen.

Este mÃ³dulo registra `<iswc-radio-group>`.

## CuÃ¡ndo usarlo

Captura, selecciÃ³n y validaciÃ³n de valores compatibles con formularios.

## CuÃ¡ndo no usarlo

No duplicar validaciÃ³n, form association ni pickers shared.

## ImportaciÃ³n

```js
import './radio-group.js';
```

## Ejemplo mÃ­nimo

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
| `name` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `value` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `disabled` | boolean | Fuente define default/restricciÃ³n. |
| `required` | boolean | Fuente define default/restricciÃ³n. |
| `readonly` | boolean | Fuente define default/restricciÃ³n. |
| `label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `hint` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `orientation` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `row` | boolean | Fuente define default/restricciÃ³n. |
| `color` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `label-placement` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `error` | boolean | Fuente define default/restricciÃ³n. |
| `error-text` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `iswc-radio` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

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


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-change` | Emitido al confirmar el cambio de valor (escribe como `change` nativo). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-change` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-radio-group');
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
| `focus()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

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
| `:state(error)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(disabled)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(readonly)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(blank)` | Estado usado por implementaciÃ³n/CSS. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-sans` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--iswc-text-soft` | Token leÃ­do o definido por componente. |
| `--iswc-text-dim` | Token leÃ­do o definido por componente. |
| `--iswc-danger-text` | Token leÃ­do o definido por componente. |
| `--iswc-color-danger-600` | Token leÃ­do o definido por componente. |
| `--iswc-radio-accent` | Token leÃ­do o definido por componente. |
| `--iswc-accent` | Token leÃ­do o definido por componente. |
| `--iswc-color-brand-500` | Token leÃ­do o definido por componente. |
| `--iswc-control-border` | Token leÃ­do o definido por componente. |
| `--iswc-color-success-500` | Token leÃ­do o definido por componente. |
| `--iswc-color-warning-500` | Token leÃ­do o definido por componente. |
| `--iswc-color-danger-500` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

Participa mediante ElementInternals/helpers form-associated; respetar name, value, disabled, reset, restore y validaciÃ³n.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-radio-group> â€” Grupo form-associated de <iswc-radio>. El grupo es el dueÃ±o
> del valor: los radios solo avisan con `iswc-radio-select`.
> Atributos
>   name, value, label, hint
>   orientation      vertical (default) | horizontal   Â·   row = alias booleano de horizontal
>   color          brand (default) | neutral | success | warning | danger
>   label-placement  end (default) | start | top | bottom   (se aplica a los hijos)
>   error-text       mensaje de error; sustituye al hint y activa el estado de error
>   disabled, required, readonly, error   (boolean)
> Slots: default (<iswc-radio>), label, hint, error-text
> Parts: form-control, label, base, hint, error-text
> Custom states: disabled, readonly, error, blank
> Events: iswc-change { value }

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`./radio.js`](./radio.js)
- [`../_shared/form-associated.js`](../_shared/form-associated.js)

Tags del mÃ³dulo: `<iswc-radio-group>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-describedby`, `aria-disabled`, `aria-orientation`, `aria-required`, `aria-readonly`, `aria-invalid`.

## Ejemplo avanzado

```html
<iswc-radio-group color="success" row>
<iswc-radio value="c">Hereda success</iswc-radio>
<iswc-radio value="d" color="danger">Se sale del grupo</iswc-radio>
</iswc-radio-group>
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

- [JavaScript](./radio-group.ts)
- [CSS](./radio-group.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./radio-group.json)
