---
tag: is-doughnut-chart
tags:
  - is-doughnut-chart
category: charts
status: public
source: ./doughnut-chart.js
style: ./doughnut-chart.css
preview: ../../previews/data-viz/is-doughnut-chart.html
---
# `<is-doughnut-chart>`

## Propósito

Wrapper tipado de `<is-chart>` con `type` fijo en `doughnut`. Misma API
de configuración Chart.js (`config` / `<script type="application/json">`);
el atributo `type` no se cambia.

Este módulo registra `<is-doughnut-chart>`.

## Cuándo usarlo

Series, distribuciones, relaciones o jerarquías de datos — cuando el tipo
de gráfica es siempre doughnut chart.

## Cuándo no usarlo

Si el tipo puede cambiar en runtime, usar `<is-chart type="doughnut">`.
No crear otro engine: hereda marks/engine de `chart.js`.

## Importación

```js
import './doughnut-chart.js';
```

## Ejemplo mínimo

```html
<is-doughnut-chart>
  <script type="application/json">
  {
    "data": {
      "labels": ["A", "B", "C"],
      "datasets": [{ "label": "Serie", "data": [3, 7, 4] }]
    }
  }
  </script>
</is-doughnut-chart>
```

## API

### Atributos y propiedades

Hereda de `<is-chart>` (ver [chart.md](./chart.md)). `type` queda fijado
en `doughnut` por la clase tipada.

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `label` | string/según contrato | Fuente define default/restricción. |
| `legend-position` | string/según contrato | Fuente define default/restricción. |
| `index-axis` | string/según contrato | Fuente define default/restricción. |
| `min` | string/según contrato | Fuente define default/restricción. |
| `max` | string/según contrato | Fuente define default/restricción. |
| `grid` | string/según contrato | Fuente define default/restricción. |
| `stacked` | string/según contrato | Fuente define default/restricción. |
| `without-animation` | string/según contrato | Fuente define default/restricción. |
| `without-legend` | string/según contrato | Fuente define default/restricción. |
| `without-tooltip` | string/según contrato | Fuente define default/restricción. |
| `x-label` | string/según contrato | Fuente define default/restricción. |
| `y-label` | string/según contrato | Fuente define default/restricción. |
| `color` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `svg` | solo lectura | Declarada por clase base. |
| `chart` | solo lectura | Alias de `svg`. |
| `payload` | lectura/escritura | Declarada por clase base. |
| `isViewer` | solo lectura | Declarada por clase base. |
| `turtle` | solo lectura | Declarada por clase base. |
| `config` | lectura/escritura | Forma Chart.js; `type` se fuerza a `doughnut`. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado (p. ej. JSON de config). |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-render` | sí | sí | sí | no |
| `is-turtle-state` | sí | sí | sí | no |
| `is-open-viewer` | sí | sí | sí | sí |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `updateComplete()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `canvas` | Personalizable con `::part(canvas)`. |
| `legend` | Personalizable con `::part(legend)`. |
| `tooltip` | Personalizable con `::part(tooltip)`. |

### Custom states

No expone.

### CSS custom properties

Misma familia de tokens que `<is-chart>` (ver [chart.md](./chart.md)).

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> `<is-doughnut-chart>` — wrapper tipado vía `defineTypedChart('is-doughnut-chart', 'doughnut', …)`.
> Importa `./chart.js` y registra marks del tipo fijo.
> Consumo compatible con Chart.js: `config` o `<script type="application/json">`
> hijo con forma `{ data: { labels, datasets }, options }` (`type` lo fija el tag).

## Dependencias y componentes relacionados

- [`./chart.js`](./chart.js)
- [`./chart.md`](./chart.md)
- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/svg-chart-engine.js`](../_shared/svg-chart-engine.js)
- [`../_shared/chart-palette.js`](../_shared/chart-palette.js)

Tags del módulo: `<is-doughnut-chart>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. Hereda contrato de `<is-chart>`.

## Ejemplo avanzado

```html
<is-doughnut-chart label="Doughnut Chart" legend-position="bottom">
  <script type="application/json">
  {
    "data": {
      "labels": ["Ene", "Feb", "Mar"],
      "datasets": [{ "label": "Ventas", "data": [12, 19, 8] }]
    }
  }
  </script>
</is-doughnut-chart>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.
- Forzar `type` distinto al del wrapper: el tipado lo ignora / sobrescribe.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.
- API completa del motor: [chart.md](./chart.md).

## Fuentes

- [JavaScript](./doughnut-chart.js)
- [CSS](./doughnut-chart.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/data-viz/is-doughnut-chart.html)
