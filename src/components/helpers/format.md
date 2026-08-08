---
tag: is-format
tags:
  - is-format
category: helpers
status: public
source: ./format.js
style: ./format.css
preview: ../../previews/helpers/is-format.json
---
# `<is-format>`

## Propósito

Web Component genérico de formateo con `Intl`. Un solo elemento cubre fechas, números, bytes y tiempo relativo vía `type`. Los nombres históricos (`is-format-date`, `is-format-number`, `is-format-bytes`, `is-relative-time`) siguen como alias con `type` prefijado.

## Cuándo usarlo

Cuando quieres un solo tag de formato o documentar el contrato unificado. Los alias históricos siguen válidos.

## Cuándo no usarlo

No crear otro wrapper Intl si este módulo (o sus alias) ya cubre el caso.

## Importación

```js
import './format.js';
```

## Ejemplo mínimo

```html
<is-format type="date" value="2026-08-01"></is-format>
<is-format type="number" value="1234.5" format="currency" currency="EUR"></is-format>
<is-format type="bytes" value="2048" display="long"></is-format>
<is-format type="relative" date="2026-08-01T00:00:00Z"></is-format>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `type` | `date` \| `number` \| `bytes` \| `relative` | Obligatorio en `<is-format>` |
| `value` | string/number | Dato a formatear |
| `date` | string/number | Alternativa a `value` en `relative` |
| `locale` | string | BCP 47; si falta, lang del documento |
| `format` | string | En number: decimal/currency/percent/unit |
| `currency` | string | ISO 4217 si `format="currency"` |
| `weekday` `era` `year` `month` `day` `hour` `minute` `second` | string | Opciones DateTimeFormat |
| `time-zone` `time-zone-name` `hour-format` | string | Zona / ciclo horario |
| `minimum-fraction-digits` `maximum-fraction-digits` | number | NumberFormat |
| `unit` | string | Bytes: byte…petabyte |
| `display` | `short` \| `long` | Bytes |
| `style` | `long` \| `short` \| `narrow` | Relative (attr `format` en alias) |
| `numeric` | `always` \| `auto` | Relative |
| `sync` | boolean | Relative: refresco periódico |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Según contrato de la clase |

### Slots

No expone.

### Eventos

No expone.

### Métodos y propiedades públicas

No expone APIs adicionales relevantes.

### CSS parts

| Part | Uso |
| --- | --- |
| `date` / `number` / `bytes` / `time` | Según `type` |

### Custom states

No expone.

### CSS custom properties

No expone.

### Integración con formularios

No es form-associated.

## Comportamiento

Los alias históricos reutilizan esta clase vía `createFormatElement(tipo)`.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- Alias: `format-date.js`, `format-number.js`, `format-bytes.js`, `relative-time.js`

## Accesibilidad

Texto plano en shadow; hereda idioma del documento / `locale`.

## Ejemplo avanzado

```html
<is-format type="date" value="2026-07-30" weekday="long" month="long" day="numeric" year="numeric" locale="ja"></is-format>
```

## Errores comunes

- Olvidar `type` en `<is-format>` (los alias lo prefijan).
- Inventar attrs fuera del contrato Intl documentado.

## Reglas para LLM

- Preferir este MD + preview `helpers/is-format.html` como contrato unificado.
- No inventar tipos fuera de `date|number|bytes|relative`.

## Fuentes

- `./format.js` · `./format.css`
- Preview: `../../previews/helpers/is-format.json`
