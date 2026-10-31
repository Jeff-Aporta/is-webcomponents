---
tag: iswc-pagination
tags:
  - iswc-pagination
category: navigation
status: public
source: ./pagination.ts
style: ./pagination.css
preview: ./pagination.json
---
# `<iswc-pagination>`

## Propósito

Paginación numérica: pista de números desplazable (flechas, Shift+rueda, arrastre táctil) y selector de tamaño opcional.

## Cuándo usarlo

- Pie de una lista o de una tabla propia.

## Cuándo no usarlo

- Anterior / siguiente con título: `iswc-pager`.
- Grillas: `iswc-data-grid` trae su paginación.

## Importación

```js
import './pagination.js';
```

## Ejemplo mínimo

```html
<iswc-pagination page="3" pages="12"></iswc-pagination>
```

## API

### Atributos y propiedades

| Atributo | Tipo | Default | Notas |
| --- | --- | --- | --- |
| `page` | number | `1` | Página actual (1-based). |
| `pages` | number | `1` | Total de páginas. |
| `page-size` | number | primera opción | Propiedad `pageSize`. |
| `elements-per-page` | lista | `15 30 50` | Opciones. Propiedad `elementsPerPage`. |
| `hide-page-size` | boolean | `false` | Oculta el selector. |
| `total` | number | — | Si es menor que la opción menor, no hay selector. |
| `disabled` | boolean | `false` | Bloquea todo. |
| `compact` | boolean | `false` | Versión baja. |
| `variant` | string | `filled` | Del número actual. |
| `color` | string | `brand` | Del número actual y las flechas. |
| `label` | string | `Paginación` | `aria-label`. |

### Slots

No tiene slots.

### Eventos

| Evento | Detalle | Cuándo |
| --- | --- | --- |
| `iswc-page-change` | `{ page }` | Al ir a otra página. |
| `iswc-page-size-change` | `{ pageSize }` | Al cambiar el tamaño. |

### Métodos y propiedades públicas

`textos` (propiedad): textos para lectores de pantalla, con `{n}` y `{total}`.

### CSS parts

| Part | Elemento |
| --- | --- |
| `base` | El `<nav>`. |
| `resumen` | Resumen para lectores de pantalla. |
| `carril` | Flechas y pista. |
| `pista` | Los números. |
| `tamano` | El select. |

### Custom states

No expone custom states.

### CSS custom properties

No define custom properties propias: toma los tokens del tema.

### Integración con formularios

No participa en formularios.

## Anatomía

```html
<nav part="base">
  <span part="resumen">…</span>
  <div part="carril"><iswc-button></iswc-button><div part="pista">…</div><iswc-button></iswc-button></div>
  <iswc-select part="tamano"></iswc-select>
</nav>
```

## Comportamiento

- La página actual queda centrada en la pista.
- Las flechas solo aparecen si hay más números hacia ese lado.
- Un arrastre táctil no cuenta como clic.

## Dependencias y componentes relacionados

Usa `iswc-button`, `iswc-select` e `iswc-icon`. Relacionado: `iswc-pager`.

## Accesibilidad

El resumen va en una región `aria-live`; la página actual lleva `aria-current="page"`.

## Ejemplo avanzado

```html
<iswc-pagination page="3" pages="12"></iswc-pagination>
```

## Errores comunes

- Olvidar actualizar `pages` al cambiar el tamaño: lo hace quien oye el evento.

## Reglas para LLM

- El tag no pagina datos: emite el cambio y tú pides la página.

## Fuentes

- [pagination.ts](./pagination.ts) · [pagination.scss](./pagination.scss) · [pagination.json](./pagination.json)
