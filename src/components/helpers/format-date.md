---
tag: is-format-date
tags:
  - is-format-date
category: helpers
status: public
source: ./format-date.js
style: ./format-date.css
preview: ../../previews/helpers/is-format-date.html
---
# `<is-format-date>`

## Propósito

Formatea fechas con Intl.DateTimeFormat. Cualquier locale BCP 47 vía locale (o lang del documento).

Este módulo registra `<is-format-date>`.

## Cuándo usarlo

Formato, observación y posicionamiento reutilizable sobre APIs nativas.

## Cuándo no usarlo

No crear wrapper nuevo si Intl/Observer/position existente cubre caso.

## Importación

```js
import './format-date.js';
```

## Ejemplo mínimo

```html
const asked = ['es','en','fr','de','ja','zh-CN','ar','pt-BR'];
const ok = Intl.DateTimeFormat.supportedLocalesOf(asked);
// → p.ej. ["es","en","fr","de","ja","zh-CN","ar","pt-BR"]
<is-format-date locale="ja" date="2026-07-30" weekday="long" month="long" day="numeric" year="numeric"></is-format-date>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `date` | string/según contrato | Fuente define default/restricción. |
| `weekday` | string/según contrato | Fuente define default/restricción. |
| `era` | string/según contrato | Fuente define default/restricción. |
| `year` | string/según contrato | Fuente define default/restricción. |
| `month` | string/según contrato | Fuente define default/restricción. |
| `day` | string/según contrato | Fuente define default/restricción. |
| `hour` | string/según contrato | Fuente define default/restricción. |
| `minute` | string/según contrato | Fuente define default/restricción. |
| `second` | string/según contrato | Fuente define default/restricción. |
| `time-zone` | string/según contrato | Fuente define default/restricción. |
| `time-zone-name` | string/según contrato | Fuente define default/restricción. |
| `hour-format` | string/según contrato | Fuente define default/restricción. |
| `locale` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `date` | lectura/escritura | Declarada por clase. |
| `locale` | lectura/escritura | Declarada por clase. |

### Slots

No expone.

### Eventos

No expone.

### Métodos y propiedades públicas

No expone.

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `date` | Personalizable con `::part(date)`. |

### Custom states

No expone.

### CSS custom properties

No expone.

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-format-date> — Web Component (vanilla).
> Formatea fechas con Intl.DateTimeFormat.
> Atributos: date, weekday, era, year, month, day, hour, minute, second,
>            time-zone, time-zone-name, hour-format (auto|12|24),
>            locale (BCP 47; default = lang del documento)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<is-format-date>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explícito en fuente.

## Ejemplo avanzado

```html
<is-format-date date="2026-07-30T17:30:00" hour="numeric" minute="numeric" hour-format="24"></is-format-date>
<is-format-date date="2026-07-30T17:30:00" hour="numeric" minute="numeric" hour-format="12"></is-format-date>
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

- [JavaScript](./format-date.js)
- [CSS](./format-date.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/helpers/is-format-date.html)
