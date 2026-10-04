---
tag: iswc-polar-area-chart
tags:
  - iswc-polar-area-chart
category: charts
status: public
source: ./polar-area-chart.ts
style: ./polar-area-chart.css
preview: ./polar-area-chart.json
---
# `<iswc-polar-area-chart>`

## PropÃ³sito

Wrapper tipado de `<iswc-chart>` con `type` fijo en `polarArea`. Misma API
de configuraciÃ³n Chart.js (`config` / `<script type="application/json">`);
el atributo `type` no se cambia.

Este mÃ³dulo registra `<iswc-polar-area-chart>`.

## CuÃ¡ndo usarlo

Series, distribuciones, relaciones o jerarquÃ­as de datos â€” cuando el tipo
de grÃ¡fica es siempre polar area chart.

## CuÃ¡ndo no usarlo

Si el tipo puede cambiar en runtime, usar `<iswc-chart type="polarArea">`.
No crear otro engine: hereda marks/engine de `chart.js`.

## ImportaciÃ³n

```js
import './polar-area-chart.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-polar-area-chart>
  <script type="application/json">
  {
    "data": {
      "labels": ["A", "B", "C"],
      "datasets": [{ "label": "Serie", "data": [3, 7, 4] }]
    }
  }
  </script>
</iswc-polar-area-chart>
```

## API

### Atributos y propiedades

Hereda de `<iswc-chart>` (ver [chart.md](./chart.md)). `type` queda fijado
en `polarArea` por la clase tipada.

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `legend-position` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `index-axis` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `min` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `max` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `grid` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `stacked` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `without-animation` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `without-legend` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `without-tooltip` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `x-label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `y-label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `color` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `svg` | solo lectura | Declarada por clase base. |
| `chart` | solo lectura | Alias de `svg`. |
| `payload` | lectura/escritura | Declarada por clase base. |
| `isViewer` | solo lectura | Declarada por clase base. |
| `turtle` | solo lectura | Declarada por clase base. |
| `config` | lectura/escritura | Forma Chart.js; `type` se fuerza a `polarArea`. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado (p. ej. JSON de config). |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-render` | Emitido al renderizar o redibujar el componente. |
| `iswc-turtle-state` | Emitido al actualizarse el estado del mÃ³dulo turtle (resize, datos, etc.). |
| `iswc-open-viewer` | Emitido al abrir el visor ampliado (cancelable). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-render` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-turtle-state` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-open-viewer` | sÃ­ | sÃ­ | sÃ­ | sÃ­ |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-polar-area-chart');
el.addEventListener('iswc-render', (e) => {
  console.log('iswc-render', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `updateComplete()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

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

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> `<iswc-polar-area-chart>` â€” wrapper tipado vÃ­a `defineTypedChart('iswc-polar-area-chart', 'polarArea', â€¦)`.
> Importa `./chart.js` y registra marks del tipo fijo.
> Consumo compatible con Chart.js: `config` o `<script type="application/json">`
> hijo con forma `{ data: { labels, datasets }, options }` (`type` lo fija el tag).

## Dependencias y componentes relacionados

- [`./chart.js`](./chart.js)
- [`./chart.md`](./chart.md)
- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/svg-chart-engine.js`](../_shared/svg-chart-engine.js)
- [`../_shared/chart-palette.js`](../_shared/chart-palette.js)

Tags del mÃ³dulo: `<iswc-polar-area-chart>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. Hereda contrato de `<iswc-chart>`.

## Ejemplo avanzado

```html
<iswc-polar-area-chart label="Polar Area Chart" legend-position="bottom">
  <script type="application/json">
  {
    "data": {
      "labels": ["Ene", "Feb", "Mar"],
      "datasets": [{ "label": "Ventas", "data": [12, 19, 8] }]
    }
  }
  </script>
</iswc-polar-area-chart>
```

## Errores comunes

- Usar tag sin importar mÃ³dulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.
- Forzar `type` distinto al del wrapper: el tipado lo ignora / sobrescribe.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.
- API completa del motor: [chart.md](./chart.md).

## Fuentes

- [JavaScript](./polar-area-chart.ts)
- [CSS](./polar-area-chart.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./polar-area-chart.json)
