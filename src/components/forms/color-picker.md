---
tag: iswc-color-picker
tags:
  - iswc-color-picker
category: forms
status: public
source: ./color-picker.ts
style: ./color-picker.css
preview: ./color-picker.json
---
# `<iswc-color-picker>`

## PropÃ³sito

Trigger con muestra + hex. El panel (input type="color", campo hex y paleta) vive en un <dialog> en el top layer.

Este mÃ³dulo registra `<iswc-color-picker>`.

## CuÃ¡ndo usarlo

Captura, selecciÃ³n y validaciÃ³n de valores compatibles con formularios.

## CuÃ¡ndo no usarlo

No duplicar validaciÃ³n, form association ni pickers shared.

## ImportaciÃ³n

```js
import './color-picker.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-color-picker
label="Color de marca"
name="brand"
value="#1971c2"
swatches="#e03131,#f59f00,#2f9e44"
></iswc-color-picker>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `name` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `value` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `hint` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `disabled` | boolean | Fuente define default/restricciÃ³n. |
| `required` | boolean | Fuente define default/restricciÃ³n. |
| `swatches` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

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


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-input` | Emitido en cada cambio del valor (escribe como `input` nativo). |
| `iswc-change` | Emitido al confirmar el cambio de valor (escribe como `change` nativo). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-input` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-change` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-color-picker');
el.addEventListener('iswc-input', (e) => {
  console.log('iswc-input', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `show()` | MÃ©todo pÃºblico declarado. |
| `hide()` | MÃ©todo pÃºblico declarado. |
| `checkValidity()` | MÃ©todo pÃºblico declarado. |
| `reportValidity()` | MÃ©todo pÃºblico declarado. |
| `setCustomValidity()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

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
| `eyedropper` | BotÃ³n EyeDropper (oculto si la API no existe). |

### Custom states

| Estado | Uso |
| --- | --- |
| `:state(open)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(disabled)` | Estado usado por implementaciÃ³n/CSS. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-picker-radius` | Token leÃ­do o definido por componente. |
| `--iswc-radius-sm` | Token leÃ­do o definido por componente. |
| `--iswc-picker-border` | Token leÃ­do o definido por componente. |
| `--iswc-control-border` | Token leÃ­do o definido por componente. |
| `--iswc-picker-bg` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg` | Token leÃ­do o definido por componente. |
| `--iswc-picker-text` | Token leÃ­do o definido por componente. |
| `--iswc-control-text` | Token leÃ­do o definido por componente. |
| `--iswc-picker-focus` | Token leÃ­do o definido por componente. |
| `--iswc-focus` | Token leÃ­do o definido por componente. |
| `--iswc-accent` | Token leÃ­do o definido por componente. |
| `--iswc-sans` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--iswc-text-soft` | Token leÃ­do o definido por componente. |
| `--iswc-text-dim` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg-hover` | Token leÃ­do o definido por componente. |
| `--iswc-mono` | Token leÃ­do o definido por componente. |
| `--iswc-bg-elev` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |
| `--iswc-radius` | Token leÃ­do o definido por componente. |
| `--iswc-shadow` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

Participa mediante ElementInternals/helpers form-associated; respetar name, value, disabled, reset, restore y validaciÃ³n.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-color-picker> â€” Selector de color form-associated.
> El panel (color nativo + hex + swatches) vive en un <dialog modal> (top layer)
> para no perderse por overflow de ancestros.
> Atributos: name, value (#rrggbb, default #808080), label, hint,
>            disabled, required, swatches (lista hex separada por comas)
> Slots: label, hint
> Parts: base, trigger, swatch, panel, input, hex-input, label, hint
> Events: iswc-input { value }, iswc-change { value }
>
> EyeDropper: botÃ³n `::part(eyedropper)` llama `new EyeDropper().open()` y escribe `sRGBHex`.
> Si `EyeDropper` no estÃ¡ en `window`, el botÃ³n queda `hidden`.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../media/icon.js`](../media/icon.js)
- [`../_shared/form-associated.js`](../_shared/form-associated.js)

Tags del mÃ³dulo: `<iswc-color-picker>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-haspopup`, `aria-expanded`, `aria-hidden`, `aria-label`, `aria-required`, `aria-pressed`.

## Ejemplo avanzado

```html
<iswc-color-picker
label="Color de marca"
name="brand"
value="#1971c2"
swatches="#e03131,#f59f00,#2f9e44"
></iswc-color-picker>
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

- [JavaScript](./color-picker.ts)
- [CSS](./color-picker.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./color-picker.json)
