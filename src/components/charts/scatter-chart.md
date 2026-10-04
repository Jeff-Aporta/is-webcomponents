---
tag: iswc-scatter-chart
tags:
  - iswc-scatter-chart
category: charts
status: public
source: ./scatter-chart.js
style: ./scatter-chart.css
preview: ./scatter-chart.json
---
# `<iswc-scatter-chart>`

## Propósito

Wrapper tipado de `<iswc-chart>` con `type` fijo en `scatter`. Misma API
de configuración Chart.js (`config` / `<script type="application/json">`);
el atributo `type` no se cambia.

Este módulo registra `<iswc-scatter-chart>`.

## Cuándo usarlo

Series, distribuciones, relaciones o jerarquías de datos — cuando el tipo
de gráfica es siempre scatter chart.

## Cuándo no usarlo

Si el tipo puede cambiar en runtime, usar `<iswc-chart type="scatter">`.
No crear otro engine: hereda marks/engine de `chart.js`.

## Importación

```js
import './scatter-chart.js';
```

## Ejemplo mínimo

```html
<iswc-scatter-chart>
  <script type="application/json">
  {
    "data": {
      "labels": ["A", "B", "C"],
      "datasets": [{ "label": "Serie", "data": [3, 7, 4] }]
    }
  }
  </script>
</iswc-scatter-chart>
```

## API

### Atributos y propiedades

Hereda de `<iswc-chart>` (ver [chart.md](./chart.md)). `type` queda fijado
en `scatter` por la clase tipada.

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
| `config` | lectura/escritura | Forma Chart.js; `type` se fuerza a `scatter`. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado (p. ej. JSON de config). |

### Eventos


| Evento | Descripción |
| --- | --- |
| `iswc-render` | Emitido al renderizar o redibujar el componente. |
| `iswc-turtle-state` | Emitido al actualizarse el estado del módulo turtle (resize, datos, etc.). |
| `iswc-open-viewer` | Emitido al abrir el visor ampliado (cancelable). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-render` | sí | sí | sí | no |
| `iswc-turtle-state` | sí | sí | sí | no |
| `iswc-open-viewer` | sí | sí | sí | sí |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-scatter-chart');
el.addEventListener('iswc-render', (e) => {
  console.log('iswc-render', e.detail);
});
```

</details>

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

Misma familia de tokens que `<iswc-chart>` (ver [chart.md](./chart.md)).

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> `<iswc-scatter-chart>` — wrapper tipado vía `defineTypedChart('iswc-scatter-chart', 'scatter', …)`.
> Importa `./chart.js` y registra marks del tipo fijo.
> Consumo compatible con Chart.js: `config` o `<script type="application/json">`
> hijo con forma `{ data: { labels, datasets }, options }` (`type` lo fija el tag).

## Dependencias y componentes relacionados

- [`./chart.js`](./chart.js)
- [`./chart.md`](./chart.md)
- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/svg-chart-engine.js`](../_shared/svg-chart-engine.js)
- [`../_shared/chart-palette.js`](../_shared/chart-palette.js)

Tags del módulo: `<iswc-scatter-chart>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. Hereda contrato de `<iswc-chart>`.

## Ejemplo avanzado

```html
<iswc-scatter-chart label="Scatter Chart" legend-position="bottom">
  <script type="application/json">
  {
    "data": {
      "labels": ["Ene", "Feb", "Mar"],
      "datasets": [{ "label": "Ventas", "data": [12, 19, 8] }]
    }
  }
  </script>
</iswc-scatter-chart>
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

- [JavaScript](./scatter-chart.js)
- [CSS](./scatter-chart.css)
- [Índice de categoría](./LLM.md)
- [Preview](./scatter-chart.json)
