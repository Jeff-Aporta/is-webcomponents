---
tag: iswc-trace-log
tags:
  - iswc-trace-log
category: data
status: public
source: ./trace-log.ts
style: ./trace-log.css
preview: ./trace-log.json
---
# `<iswc-trace-log>`

## Propósito

Log de un proceso: cabecera plegable con el resumen y, desplegada, cada paso con su tiempo, nivel, etapa, mensaje, duración y datos. Sirve para ver qué hizo, cuánto tardó y dónde falló.

## Cuándo usarlo

- Depuración y QA de un proceso, en vivo o al terminar.

## Cuándo no usarlo

- Historial para el usuario final: `iswc-timeline`.
- Tablas de registros: `iswc-data-grid`.

## Importación

```js
import './trace-log.js';
```

## Ejemplo mínimo

```html
<iswc-trace-log id="t" titulo="Traza del pedido"></iswc-trace-log>
<script type="module">
  document.querySelector('#t').props = { eventos };
</script>
```

## API

### Atributos y propiedades

Los datos van por atributos o por `el.props = { … }` (se mezcla con lo anterior y solo repinta si algo cambió). Un arreglo o un objeto va como JSON en el atributo; las funciones, solo por `props`.

| Atributo / prop | Tipo | Default | Notas |
| --- | --- | --- | --- |
| `eventos` | `TraceEvento[]` | `[]` | `{ seq, ts, ms, nivel, etapa, mensaje, dur?, datos? }`. |
| `titulo` | string | `Traza` | Título de la cabecera. |
| `filtro` | `todo` \| `info` \| `warn` \| `error` | `todo` | Filtro inicial. |
| `abierto` | boolean | `false` | Nace desplegada. |
| `en-vivo` | boolean | `false` | Sigue en curso (`enVivo` en `props`). |
| `textos` | `Partial<TraceTextos>` | `{}` | Reemplaza los textos visibles. |

### Slots

No tiene slots.

### Eventos

| Evento | Detalle | Cuándo |
| --- | --- | --- |
| `iswc-trace-copy` | `{ json }` | Al copiar la traza. |

### Métodos y propiedades públicas

`abierta` (solo lectura): si está desplegada.

### CSS parts

| Part | Elemento |
| --- | --- |
| `traza` | Contenedor. |
| `cabecera` | El botón plegable. |
| `barra` | Filtros y copiar. |
| `eventos` | La lista. |

### Custom states

No expone custom states.

### CSS custom properties

No define custom properties propias: toma los tokens del tema.

### Integración con formularios

No participa en formularios.

## Anatomía

```html
<section part="traza">
  <button part="cabecera">…</button><div part="barra">…</div><ol part="eventos"><li>…</li></ol>
</section>
```

## Comportamiento

- El filtro `warn` incluye errores; `info` excluye `debug`.
- `en-vivo` despliega la traza y marca el último paso.
- Con movimiento reducido, «en vivo» late más lento.

## Dependencias y componentes relacionados

Usa `iswc-badge` e `iswc-icon`. Relacionado: `iswc-status-pill`.

## Accesibilidad

La cabecera es un botón con `aria-expanded`; los filtros usan `aria-pressed`.

## Ejemplo avanzado

```html
<iswc-trace-log id="t" titulo="Traza del pedido"></iswc-trace-log>
<script type="module">
  document.querySelector('#t').props = { eventos };
</script>
```

## Errores comunes

- Pasar eventos sin `seq`, `ms` o `etapa`: `props` los rechaza y avisa.

## Reglas para LLM

- El contrato de `eventos` se valida con Zod: adapta tus datos, no el tag.

## Fuentes

- [trace-log.ts](./trace-log.ts) · [trace-log.scss](./trace-log.scss) · [trace-log.json](./trace-log.json)
