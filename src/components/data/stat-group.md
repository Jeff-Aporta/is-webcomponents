---
tag: iswc-stat-group
tags:
  - iswc-stat-group
category: data
status: public
source: ./stat-group.ts
style: ./stat-group.css
preview: ./stat-group.json
---
# `<iswc-stat-group>`

## Propósito

Fila de indicadores: `iswc-stat` en una rejilla que se acomoda al ancho. Con `items: null` pinta esqueletos, y un refresco con los mismos `id` solo actualiza las cifras, sin parpadeo.

## Cuándo usarlo

- Arriba de una vista de negocio, bajo la cabecera.

## Cuándo no usarlo

- Tablas de cifras: `iswc-data-grid`.
- Un solo indicador: `iswc-stat`.

## Importación

```js
import './stat-group.js';
```

## Ejemplo mínimo

```html
<iswc-stat-group id="k"></iswc-stat-group>
<script type="module">
  document.querySelector('#k').props = { items: [{ id: 'ing', label: 'Ingresos', value: '$ 31.780.000' }] };
</script>
```

## API

### Atributos y propiedades

Los datos van por atributos o por `el.props = { … }` (se mezcla con lo anterior y solo repinta si algo cambió). Un arreglo o un objeto va como JSON en el atributo; las funciones, solo por `props`.

| Atributo / prop | Tipo | Default | Notas |
| --- | --- | --- | --- |
| `items` | `StatGroupItem[]` \| null | `null` | `null` pinta esqueletos. |
| `esqueletos` | number | `4` | Cuántos esqueletos. |

### Slots

No tiene slots.

### Eventos

No emite eventos propios.

### Métodos y propiedades públicas

`props`: las claves de la tabla anterior, en camelCase.

### CSS parts

| Part | Elemento |
| --- | --- |
| `rejilla` | El `iswc-grid-layout`. |
| `kpi` | Cada `iswc-stat`. |

### Custom states

No expone custom states.

### CSS custom properties

| Propiedad | Default | Uso |
| --- | --- | --- |
| `--iswc-stat-group-radius` | `0.75em` | Radio de las celdas. |
| `--iswc-stat-group-border` | `var(--iswc-border)` | Color del borde. |
| `--iswc-stat-group-tint` | `none` | Capa (degradado o imagen) sobre el fondo de las celdas. |
| `--iswc-stat-group-shadow` | `none` | Sombra de las celdas. |
| `--iswc-stat-group-value-font` | `inherit` | Fuente de la cifra. |
| `--iswc-stat-group-value-spacing` | `normal` | Espaciado de la cifra. |
| `--iswc-stat-group-value-glow` | `none` | Brillo de la cifra (`text-shadow`). |

### Integración con formularios

No participa en formularios.

## Anatomía

```html
<iswc-grid-layout part="rejilla">
  <iswc-stat part="kpi" data-id="ing"></iswc-stat>…
</iswc-grid-layout>
```

## Comportamiento

- Cada ítem es `{ id, label, value, helper?, icon?, color?, trend?, trendDirection? }`.
- Mismos `id` en el mismo orden: solo cambian los atributos.

## Dependencias y componentes relacionados

Usa `iswc-stat`, `iswc-grid-layout` e `iswc-skeleton`.

## Accesibilidad

Mientras carga, la rejilla lleva `aria-busy="true"`.

## Ejemplo avanzado

```html
<iswc-stat-group id="k"></iswc-stat-group>
<script type="module">
  document.querySelector('#k').props = { items: [{ id: 'ing', label: 'Ingresos', value: '$ 31.780.000' }] };
</script>
```

## Errores comunes

- Dar `id` repetidos o cambiantes: se repinta en cada refresco.

## Reglas para LLM

- Pasa `items: null` mientras llegan los datos, no un arreglo vacío.

## Fuentes

- [stat-group.ts](./stat-group.ts) · [stat-group.scss](./stat-group.scss) · [stat-group.json](./stat-group.json)
