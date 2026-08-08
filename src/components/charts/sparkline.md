---
tag: is-sparkline
tags:
  - is-sparkline
category: charts
status: public
source: ./sparkline.js
style: ./sparkline.css
preview: ../../previews/data-viz/is-sparkline.json
---
# `<is-sparkline>`

## Propósito

<is-sparkline>

Este módulo registra `<is-sparkline>`.

## Cuándo usarlo

Series, distribuciones, relaciones o jerarquías de datos.

## Cuándo no usarlo

No crear otro engine si marks/engine existentes cubren caso.

## Importación

```js
import './sparkline.js';
```

## Ejemplo mínimo

```html
<is-sparkline data="3 5 4 8 6 9 7 10" label="Ventas"></is-sparkline>
<is-sparkline type="bar" data="2 1 3 2 4 1 2" label="Errores"></is-sparkline>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `values` | string/según contrato | Fuente define default/restricción. |
| `data` | string/según contrato | Fuente define default/restricción. |
| `type` | string/según contrato | Fuente define default/restricción. |
| `label` | string/según contrato | Fuente define default/restricción. |
| `variant` | string/según contrato | Fuente define default/restricción. |
| `curve` | string/según contrato | Fuente define default/restricción. |
| `trend` | `positive \| negative \| neutral` (sin atributo = color de acento de marca) | Controla `--line-color`/`--border-color-1`/`--fill-color-1` vía tokens de estado (`--is-success-text`, `--is-danger-text`, `--is-text-dim`). |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `data` | lectura/escritura | Declarada por clase. |

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
| `sparkline` | Personalizable con `::part(sparkline)`. |
| `canvas` | Personalizable con `::part(canvas)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--line-color` | Token leído o definido por componente. |
| `--fill-color-1` | Token leído o definido por componente. |
| `--line-width` | Token leído o definido por componente. |
| `--is-accent` | Token leído o definido por componente. |
| `--border-color-1` | Token leído o definido por componente. |
| `--is-success-text` | Token leído o definido por componente. |
| `--is-danger-text` | Token leído o definido por componente. |
| `--is-text-dim` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> Contrato derivado de fuente y preview actuales.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/svg-chart-engine.js`](../_shared/svg-chart-engine.js)

Tags del módulo: `<is-sparkline>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explícito en fuente.

## Ejemplo avanzado

```html
<is-sparkline variant="solid" data="…"></is-sparkline>
<is-sparkline variant="gradient" data="…"></is-sparkline>
<is-sparkline variant="line" data="…"></is-sparkline>
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

- [JavaScript](./sparkline.js)
- [CSS](./sparkline.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/data-viz/is-sparkline.json)
