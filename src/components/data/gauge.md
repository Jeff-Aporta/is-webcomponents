---
tag: is-gauge
tags:
  - is-gauge
category: data
status: public
source: ./gauge.js
style: ./gauge.css
preview: ../../previews/data-viz/is-gauge.json
---
# `<is-gauge>`

## Propósito

Medidor circular SVG de porcentaje. Soporta colores, semicírculo,
custom min/max, unidad, formato y tamaño.

Este módulo registra `<is-gauge>`.

## Cuándo usarlo

Presentación, comparación, movimiento u organización de datos estructurados.

## Cuándo no usarlo

No reemplazar HTML semántico cuando contenido es estático y simple.

## Importación

```js
import './gauge.js';
```

## Ejemplo mínimo

```html
<is-gauge value="67" label="Conversión" unit="%"></is-gauge>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string/según contrato | Fuente define default/restricción. |
| `min` | string/según contrato | Fuente define default/restricción. |
| `max` | string/según contrato | Fuente define default/restricción. |
| `label` | string/según contrato | Fuente define default/restricción. |
| `unit` | string/según contrato | Fuente define default/restricción. |
| `thickness` | string/según contrato | Fuente define default/restricción. |
| `color` | string/según contrato | Fuente define default/restricción. |
| `half` | boolean | Fuente define default/restricción. |
| `format` | string/según contrato | Fuente define default/restricción. |
| `show-value` | boolean | Fuente define default/restricción. |

#### Propiedades públicas

No expone.

### Slots

No expone.

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-gauge-change` | según cabecera | según cabecera | según cabecera | según cabecera |

### Métodos y propiedades públicas

No expone.

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `svg` | Personalizable con `::part(svg)`. |
| `track` | Personalizable con `::part(track)`. |
| `fill` | Personalizable con `::part(fill)`. |
| `content` | Personalizable con `::part(content)`. |
| `value` | Personalizable con `::part(value)`. |
| `label` | Personalizable con `::part(label)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--brand` | Token leído o definido por componente. |
| `--is-brand` | Token leído o definido por componente. |
| `--success` | Token leído o definido por componente. |
| `--is-success` | Token leído o definido por componente. |
| `--warning` | Token leído o definido por componente. |
| `--is-warning` | Token leído o definido por componente. |
| `--danger` | Token leído o definido por componente. |
| `--is-danger` | Token leído o definido por componente. |
| `--bg-track` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--fg` | Token leído o definido por componente. |
| `--muted` | Token leído o definido por componente. |
| `--gauge-size` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-gauge> — Medidor circular de porcentaje (vanilla, zero dependencies).
> Medidor semicircular o completo de 0..100 (o arbitrary min/max).
>   <is-gauge value="67" label="Conversión"></is-gauge>
> Atributos
>   value       number  (0..100)
>   min         number
>   max         number
>   label       string
>   unit        string  (e.g. "%")
>   thickness   number  (px)
>   color     brand | success | warning | danger (default 'brand')
>   half        boolean — semicírculo.
>   format      string  — Intl.NumberFormat format string. e.g. "0.0".
>   show-value  boolean (default true)
> Eventos
>   is-gauge-change  detail: { value, percent }

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<is-gauge>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explícito en fuente.

## Ejemplo avanzado

```html
<is-gauge value="67" label="Conversión" unit="%"></is-gauge>
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

- [JavaScript](./gauge.js)
- [CSS](./gauge.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/data-viz/is-gauge.json)
