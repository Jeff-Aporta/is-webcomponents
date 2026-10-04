---
tag: iswc-radio
tags:
  - iswc-radio
category: forms
status: public
source: ./radio.ts
style: ./radio.css
preview: ./radio.json
---
# `<iswc-radio>`

## PropÃ³sito

Paridad funcional con el
Radio Group de MUI:
color por color, posiciÃ³n de etiqueta, estado de error, solo lectura y
navegaciÃ³n por teclado segÃºn el patrÃ³n ARIA radiogroup.
El grupo es el elemento form-associated: publica el valor, valida y gobierna el teclado.
Los iswc-radio son las opciones y solo avisan al grupo cuando se eligen.

Este mÃ³dulo registra `<iswc-radio>`.

## CuÃ¡ndo usarlo

Captura, selecciÃ³n y validaciÃ³n de valores compatibles con formularios.

## CuÃ¡ndo no usarlo

No duplicar validaciÃ³n, form association ni pickers shared.

## ImportaciÃ³n

```js
import './radio.js';
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
| `value` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `checked` | boolean | Fuente define default/restricciÃ³n. |
| `disabled` | boolean | Fuente define default/restricciÃ³n. |
| `color` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `label-placement` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

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


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-radio-select` | Evento personalizado del componente (radio select). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-radio-select` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-radio');
el.addEventListener('iswc-radio-select', (e) => {
  console.log('iswc-radio-select', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `syncFromGroup()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

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
| `:state(error)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(placement-start)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(placement-top)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(placement-bottom)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(readonly)` | Estado usado por implementaciÃ³n/CSS. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--_size` | Token leÃ­do o definido por componente. |
| `--iswc-radio-size` | Token leÃ­do o definido por componente. |
| `--_bg` | Token leÃ­do o definido por componente. |
| `--iswc-radio-bg` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg` | Token leÃ­do o definido por componente. |
| `--_bg-hover` | Token leÃ­do o definido por componente. |
| `--iswc-radio-bg-hover` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg-hover` | Token leÃ­do o definido por componente. |
| `--_border` | Token leÃ­do o definido por componente. |
| `--iswc-radio-border` | Token leÃ­do o definido por componente. |
| `--iswc-control-border` | Token leÃ­do o definido por componente. |
| `--_accent` | Token leÃ­do o definido por componente. |
| `--iswc-radio-accent` | Token leÃ­do o definido por componente. |
| `--iswc-accent` | Token leÃ­do o definido por componente. |
| `--iswc-color-brand-500` | Token leÃ­do o definido por componente. |
| `--_dot` | Token leÃ­do o definido por componente. |
| `--iswc-radio-dot` | Token leÃ­do o definido por componente. |
| `--iswc-on-brand` | Token leÃ­do o definido por componente. |
| `--_focus` | Token leÃ­do o definido por componente. |
| `--iswc-radio-focus` | Token leÃ­do o definido por componente. |
| `--_halo` | Token leÃ­do o definido por componente. |
| `--iswc-radio-halo-size` | Token leÃ­do o definido por componente. |
| `--iswc-sans` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--iswc-control-text` | Token leÃ­do o definido por componente. |
| `--iswc-text-dim` | Token leÃ­do o definido por componente. |
| `--iswc-color-success-500` | Token leÃ­do o definido por componente. |
| `--iswc-color-warning-500` | Token leÃ­do o definido por componente. |
| `--iswc-color-danger-500` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-radio> â€” OpciÃ³n de radio. NO es form-associated a propÃ³sito: el valor lo
> publica <iswc-radio-group>, que es quien participa en el <form>.
> Atributos
>   value, checked, disabled
>   color          brand (default) | neutral | success | warning | danger
>   label-placement  end (default) | start | top | bottom
>   Sin color / label-placement propios se hereda el del grupo.
> Slots: default (etiqueta), description (texto secundario)
> Parts: base, control, dot, text, label, description
> Custom states: placement-* readonly error (heredados del grupo)
> Events: iswc-radio-select { value } â€” lo consume el grupo. Sin grupo, se marca solo.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/form-associated.js`](../_shared/form-associated.js)

Tags del mÃ³dulo: `<iswc-radio>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-checked`, `aria-disabled`.

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

- [JavaScript](./radio.ts)
- [CSS](./radio.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./radio.json)
