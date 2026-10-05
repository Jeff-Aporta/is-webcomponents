---
tag: iswc-file-input
tags:
  - iswc-file-input
category: forms
status: public
source: ./file-input.ts
style: ./file-input.css
preview: ./file-input.json
---
# `<iswc-file-input>`

## PropÃ³sito

Dropzone con input nativo oculto, lista de archivos y estados blank / dragging.

Este mÃ³dulo registra `<iswc-file-input>`.

## CuÃ¡ndo usarlo

Captura, selecciÃ³n y validaciÃ³n de valores compatibles con formularios.

## CuÃ¡ndo no usarlo

No duplicar validaciÃ³n, form association ni pickers shared.

## ImportaciÃ³n

```js
import './file-input.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-file-input
label="Adjuntos"
accept="image/*,.pdf"
multiple
name="attachments"
></iswc-file-input>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `hint` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `name` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `accept` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `capture` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `multiple` | boolean | Fuente define default/restricciÃ³n. |
| `disabled` | boolean | Fuente define default/restricciÃ³n. |
| `required` | boolean | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

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


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-change` | Emitido al confirmar el cambio de valor (escribe como `change` nativo). |
| `input` | Evento nativo al cambiar el valor. |
| `change` | Evento nativo al confirmar el cambio de valor. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-change` | sÃ­ | sÃ­ | sÃ­ | no |
| `input` | sÃ­ | sÃ­ | sÃ­ | no |
| `change` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-file-input');
el.addEventListener('iswc-change', (e) => {
  console.log('iswc-change', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

No expone.

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `label` | Personalizable con `::part(label)`. |
| `hint` | Personalizable con `::part(hint)`. |
| `dropzone` | Personalizable con `::part(dropzone)`. |
| `input` | Personalizable con `::part(input)`. |
| `file-list` | Personalizable con `::part(file-list)`. |
| `file` | Cada fila de la lista de archivos. |
| `remove-button` | BotÃ³n para quitar un archivo de la lista. |

### Custom states

| Estado | Uso |
| --- | --- |
| `:state(dragging)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(disabled)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(blank)` | Estado usado por implementaciÃ³n/CSS. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-font-family` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--iswc-text-soft` | Token leÃ­do o definido por componente. |
| `--iswc-control-border` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg` | Token leÃ­do o definido por componente. |
| `--iswc-color-brand-500` | Token leÃ­do o definido por componente. |
| `--iswc-focus` | Token leÃ­do o definido por componente. |
| `--iswc-surface` | Token leÃ­do o definido por componente. |
| `--iswc-color-danger-500` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

Participa mediante ElementInternals/helpers form-associated; respetar name, value, disabled, reset, restore y validaciÃ³n.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-file-input> â€” Web Component (vanilla).
> Dropzone + input file nativo oculto. Lista de archivos con quitar.
> Atributos
>   label, hint, name, accept, capture
>   multiple, disabled, required  (boolean)
> Propiedad
>   files  File[]  get/set â€” reasignar dispara update
> Slots: label, hint, dropzone
> Custom states: blank, dragging  (:state / data-state-*)
> Eventos: change, input, iswc-change (bubbles, composed)
> CSS Parts: ::part(base) ::part(label) ::part(hint) ::part(dropzone)
>            ::part(file-list) ::part(file) ::part(remove-button)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../media/icon.js`](../media/icon.js)
- [`../helpers/format-bytes.js`](../helpers/format-bytes.js)

Tags del mÃ³dulo: `<iswc-file-input>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-labelledby`, `aria-describedby`, `aria-hidden`, `aria-disabled`, `aria-label`.

## Ejemplo avanzado

```html
<iswc-file-input
label="Adjuntos"
accept="image/*,.pdf"
multiple
name="attachments"
></iswc-file-input>
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

- [JavaScript](./file-input.ts)
- [CSS](./file-input.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./file-input.json)
