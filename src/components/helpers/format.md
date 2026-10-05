---
tag: iswc-format
tags:
  - iswc-format
category: helpers
status: public
source: ./format.ts
style: ./format.css
preview: ./format.json
---
# `<iswc-format>`

## PropÃ³sito

Web Component genÃ©rico de formateo con `Intl`. Un solo elemento cubre fechas, nÃºmeros, bytes y tiempo relativo vÃ­a `type`. Los nombres histÃ³ricos (`iswc-format-date`, `iswc-format-number`, `iswc-format-bytes`, `iswc-relative-time`) siguen como alias con `type` prefijado.

## CuÃ¡ndo usarlo

Cuando quieres un solo tag de formato o documentar el contrato unificado. Los alias histÃ³ricos siguen vÃ¡lidos.

## CuÃ¡ndo no usarlo

No crear otro wrapper Intl si este mÃ³dulo (o sus alias) ya cubre el caso.

## ImportaciÃ³n

```js
import './format.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-format type="date" value="2026-08-01"></iswc-format>
<iswc-format type="number" value="1234.5" format="currency" currency="EUR"></iswc-format>
<iswc-format type="bytes" value="2048" display="long"></iswc-format>
<iswc-format type="relative" date="2026-08-01T00:00:00Z"></iswc-format>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `type` | `date` \| `number` \| `bytes` \| `relative` | Obligatorio en `<iswc-format>` |
| `value` | string/number | Dato a formatear |
| `date` | string/number | Alternativa a `value` en `relative` |
| `locale` | string | BCP 47; si falta, lang del documento |
| `format` | string | En number: decimal/currency/percent/unit |
| `currency` | string | ISO 4217 si `format="currency"` |
| `weekday` `era` `year` `month` `day` `hour` `minute` `second` | string | Opciones DateTimeFormat |
| `time-zone` `time-zone-name` `hour-format` | string | Zona / ciclo horario |
| `minimum-fraction-digits` `maximum-fraction-digits` | number | NumberFormat |
| `unit` | string | Bytes: byteâ€¦petabyte |
| `display` | `short` \| `long` | Bytes |
| `style` | `long` \| `short` \| `narrow` | Relative (attr `format` en alias) |
| `numeric` | `always` \| `auto` | Relative |
| `sync` | boolean | Relative: refresco periÃ³dico |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | SegÃºn contrato de la clase |

### Slots

No expone.

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |

No expone.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-format');
el.addEventListener('click', (e) => {
  console.log('click', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

No expone APIs adicionales relevantes.

### CSS parts

| Part | Uso |
| --- | --- |
| `date` / `number` / `bytes` / `time` | SegÃºn `type` |
| `value` | El `<output>` con el valor formateado. |

### Custom states

No expone.

### CSS custom properties

No expone.

### IntegraciÃ³n con formularios

No es form-associated.

## Comportamiento

Los alias histÃ³ricos reutilizan esta clase vÃ­a `createFormatElement(tipo)`.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- Alias: `format-date.js`, `format-number.js`, `format-bytes.js`, `relative-time.js`

## Accesibilidad

Texto plano en shadow; hereda idioma del documento / `locale`.

## Ejemplo avanzado

```html
<iswc-format type="date" value="2026-07-30" weekday="long" month="long" day="numeric" year="numeric" locale="ja"></iswc-format>
```

## Errores comunes

- Olvidar `type` en `<iswc-format>` (los alias lo prefijan).
- Inventar attrs fuera del contrato Intl documentado.

## Reglas para LLM

- Preferir este MD + preview `helpers/iswc-format.html` como contrato unificado.
- No inventar tipos fuera de `date|number|bytes|relative`.

## Fuentes

- `./format.js` Â· `./format.css`
- Preview: `./format.json`
