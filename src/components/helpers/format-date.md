---
tag: iswc-format-date
tags:
  - iswc-format-date
category: helpers
status: public
source: ./format-date.ts
style: ./format-date.scss
preview: ./format-date.json
---
# `<iswc-format-date>`

## Propósito

Formatea fechas con Intl.DateTimeFormat. Cualquier locale BCP 47 vía locale (o lang del documento).

Este módulo registra `<iswc-format-date>`.

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
<iswc-format-date locale="ja" date="2026-07-30" weekday="long" month="long" day="numeric" year="numeric"></iswc-format-date>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `date` | fecha ISO \| `Date` | Fecha a mostrar; sin ella, ahora. |
| `weekday` | `Intl.DateTimeFormat` | `long` \| `short` \| `narrow`. |
| `era` | `Intl.DateTimeFormat` | `long` \| `short` \| `narrow`. |
| `year` | `Intl.DateTimeFormat` | `numeric` \| `2-digit`. |
| `month` | `Intl.DateTimeFormat` | `numeric` \| `2-digit` \| `long` \| `short` \| `narrow`. |
| `day` | `Intl.DateTimeFormat` | `numeric` \| `2-digit`. |
| `hour` | `Intl.DateTimeFormat` | `numeric` \| `2-digit`. |
| `minute` | `Intl.DateTimeFormat` | `numeric` \| `2-digit`. |
| `second` | `Intl.DateTimeFormat` | `numeric` \| `2-digit`. |
| `time-zone` | string (IANA) | Zona horaria, por ejemplo `America/Bogota`. |
| `time-zone-name` | `Intl.DateTimeFormat` | `short` \| `long`. |
| `hour-format` | `auto` \| `12` \| `24` | Reloj de 12 o 24 horas. |
| `locale` | string (BCP 47) | Configuración regional; sin ella, la del documento. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `date` | lectura/escritura | Declarada por clase. |
| `locale` | lectura/escritura | Declarada por clase. |

### Slots

No expone.

### Eventos


| Evento | Descripción |
| --- | --- |

No expone.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-format-date');
el.addEventListener('click', (e) => {
  console.log('click', e.detail);
});
```

</details>

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

> <iswc-format-date> — Web Component (vanilla).
> Formatea fechas con Intl.DateTimeFormat.
> Atributos: date, weekday, era, year, month, day, hour, minute, second,
>            time-zone, time-zone-name, hour-format (auto|12|24),
>            locale (BCP 47; default = lang del documento)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<iswc-format-date>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explícito en fuente.

## Ejemplo avanzado

```html
<iswc-format-date date="2026-07-30T17:30:00" hour="numeric" minute="numeric" hour-format="24"></iswc-format-date>
<iswc-format-date date="2026-07-30T17:30:00" hour="numeric" minute="numeric" hour-format="12"></iswc-format-date>
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

- [JavaScript](./format-date.ts)
- [CSS](./format-date.scss)
- [Índice de categoría](../../../specs/componentes.md)
- [Preview](./format-date.json)
