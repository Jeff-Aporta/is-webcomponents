---
tag: iswc-date-field
tags:
  - iswc-date-field
category: forms
status: public
source: ./date-field.ts
style: ./date-field.css
preview: ./date-field.json
---
# `<iswc-date-field>`

## PropÃ³sito

Campo editable por secciones (DateField de MUI X). Cada secciÃ³n es un spinbutton: flechas, dÃ­gitos, izquierda/derecha, Retroceso. El orden lo decide el locale.

Este mÃ³dulo registra `<iswc-date-field>`.

## CuÃ¡ndo usarlo

Captura, selecciÃ³n y validaciÃ³n de valores compatibles con formularios.

## CuÃ¡ndo no usarlo

No duplicar validaciÃ³n, form association ni pickers shared.

## ImportaciÃ³n

```js
import './date-field.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-date-field></iswc-date-field>
```

## API

Wrapper de factory: hereda contrato completo de [`defineDateField`](../_shared/date-field-element.js). Cabecera de fuente enumera atributos, slots y eventos efectivos; tablas siguientes muestran solo declaraciones locales del wrapper.

### Atributos y propiedades

#### Atributos observados

No expone.

#### Propiedades pÃºblicas

No expone.

### Slots

No expone.

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |

No expone.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-date-field');
el.addEventListener('click', (e) => {
  console.log('click', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

No expone.

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

No expone.

### Custom states

Hereda de la factory [`defineDateField`](../_shared/date-field-element.js), que aplica los siguientes states en el host:

| Estado | Uso |
| --- | --- |
| `:state(disabled)` | Atributo `disabled` presente o `formDisabledCallback` recibido. |
| `:state(invalid)` | ValidaciÃ³n falla (required+vacÃ­o, secciÃ³n incompleta, fuera de min/max o atributo `invalid`). |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-sans` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--iswc-text-dim` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |
| `--iswc-radius-sm` | Token leÃ­do o definido por componente. |
| `--iswc-accent` | Token leÃ­do o definido por componente. |
| `--iswc-accent-bg` | Token leÃ­do o definido por componente. |
| `--iswc-color-danger-500` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg-hover` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-date-field> â€” Campo de fecha editable por secciones (MUI DateField).
> Cada secciÃ³n (dÃ­a, mes, aÃ±o, en el orden del locale) es un spinbutton:
> flechas para subir/bajar, dÃ­gitos para teclear, izquierda/derecha para
> saltar, Retroceso para vaciar. No usa <input type=date>.
> Atributos: label, hint, name, value (yyyy-mm-dd), min, max, required,
>            disabled, readonly, clearable, locale, invalid
> Slots: start, end
> Events: iswc-change, iswc-input

## Dependencias y componentes relacionados

- [`../_shared/date-field-element.js`](../_shared/date-field-element.js)

Tags del mÃ³dulo: `<iswc-date-field>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explÃ­cito en fuente.

## Ejemplo avanzado

```html
<iswc-date-field></iswc-date-field>
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

- [JavaScript](./date-field.ts)
- [CSS](./date-field.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./date-field.json)
