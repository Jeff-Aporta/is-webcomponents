---
tag: iswc-doc-layout
tags:
  - iswc-doc-layout
category: layout
status: public
source: ./doc-layout.ts
style: ./doc-layout.css
preview: ./doc-layout.json
---
# `<iswc-doc-layout>`

## Propósito

Layout documental común: navegación a la izquierda, contenido al centro e índice de la página a la
derecha, con scroll-spy entre ambos. La app solo pone el contenido de cada zona; el responsive, los
paneles redimensionables y el índice los resuelve el layout.

## Cuándo usarlo

- Vistas documentales: demos de componentes, lectores de markdown, guías, manuales.
- Cualquier página con navegación lateral + contenido largo + índice de secciones.

## Cuándo no usarlo

- Un libro de hojas markdown completo: usa `iswc-docs-vault` (ya lo monta sobre este layout).
- Una app con su propio shell de navegación: usa `iswc-main` / `iswc-split-panel`.

## Importación

```js
import './doc-layout.js';
```

## Ejemplo mínimo

```html
<iswc-doc-layout storage-key="mis-docs">
  <strong slot="brand">Mi app</strong>
  <nav slot="start">…</nav>
  <article><h2 id="uno">Uno</h2>…<h2 id="dos">Dos</h2>…</article>
</iswc-doc-layout>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Default | Notas |
| --- | --- | --- | --- |
| `storage-key` | string | — | Prefijo para recordar anchos y paneles abiertos (por tamaño de pantalla). |
| `toc` | `auto` \| `off` | `auto` | Índice de la página generado con los encabezados del contenido. |
| `toc-selector` | string | `h2, h3` | Encabezados que entran al índice. |
| `toc-title` | string | `En esta página` | Título del índice. |
| `toc-min` | number | `2` | Mínimo de entradas para mostrar el índice generado. |
| `spy-offset` | number | `96` | Px desde el borde superior del contenido para marcar la sección activa. |
| `start-width` / `end-width` | number | `300` / `250` | Ancho inicial de los laterales. |
| `no-bar` | boolean | — | Oculta la barra superior (la app pone la suya). |
| `hide-start` / `hide-end` | boolean | — | Oculta ese lateral y su botón. |

#### Propiedades públicas

| Propiedad | Tipo | Notas |
| --- | --- | --- |
| `panels` | `{ start, end }` | Visibilidad actual de los laterales. |
| `tocSource` | `(contenido) => HTMLElement[]` | Fuente propia de encabezados. |

### Slots

| Slot | Contenido |
| --- | --- |
| `brand` | Título/identidad en la barra. |
| `actions` | Acciones de la app en la barra (tema, paleta…). |
| `start` | Navegación; en celular es un cajón. |
| (default) | Contenido central (es el que hace scroll). |
| `end` | Panel derecho propio; vacío = índice generado. |

### Eventos

| Evento | Detalle | Cuándo |
| --- | --- | --- |
| `iswc-doc-layout-panels` | `{ start, end }` | Cambia la visibilidad de los laterales. |
| `iswc-doc-layout-active` | `{ id }` | Cambia la sección activa (scroll-spy). |
| `iswc-doc-layout-navigate` | `{ id }` (cancelable) | Clic en el índice; `preventDefault()` = la app navega. |

### Métodos y propiedades públicas

| Método | Notas |
| --- | --- |
| `toggleStart()` / `toggleEnd()` | Compacta o muestra cada lateral. |
| `refreshToc()` | Relee los encabezados (tras pintar contenido asíncrono). |
| `scrollToHeading(id)` | Lleva el contenido a ese encabezado. |
| `scrollContentTo(top)` | Scroll del contenido (p. ej. 0 al cambiar de página). |

### CSS parts

| Part | Elemento |
| --- | --- |
| `bar`, `brand`, `actions` | Barra superior y sus zonas. |
| `toggle-start`, `toggle-end` | Botones de los laterales. |
| `start`, `end`, `content` | Laterales y contenido. |
| `toc`, `toc-title`, `toc-links` | Índice generado. |
| `scrim`, `drawer-start`, `drawer-end` | Velo y cajones en celular. |

### Custom states

No expone custom states.

### CSS custom properties

Usa los tokens del kit (`--iswc-bg`, `--iswc-surface`, `--iswc-border`, `--iswc-text`, `--iswc-color-brand`).

## Comportamiento

- Celular (≤ 760 px): laterales cerrados; se abren como cajón y se cierran al elegir un enlace, con el
  velo o con Esc. Tableta (≤ 1100 px): índice compacto salvo que el usuario lo abra. Escritorio: ambos
  visibles y redimensionables. Las elecciones se recuerdan por tamaño de pantalla.
- En un panel `end` propio, todo `a[href="#id"]` o `[data-spy="id"]` recibe `aria-current="location"`
  cuando su sección está activa.

## Dependencias y componentes relacionados

`iswc-split-panel` (laterales redimensionables); lo usan `iswc-docs-vault` y las demos documentales.

## Accesibilidad

- El contenido es un `main` enfocable; los botones de la barra llevan `aria-label`.
- Cajones con velo y cierre por Esc; el índice marca la sección activa con `aria-current`.

## Ejemplo avanzado

```js
const layout = document.querySelector('iswc-doc-layout');
layout.addEventListener('iswc-doc-layout-navigate', (e) => {
  e.preventDefault(); // la app guarda la sección en su URL y luego hace el scroll
  router.go({ seccion: e.detail.id });
  layout.scrollToHeading(e.detail.id);
});
```

## Errores comunes

- Pintar el contenido de forma asíncrona y no llamar `refreshToc()`: el índice queda vacío.
- Poner la barra propia sin `no-bar`: quedan dos barras.

## Reglas para LLM

- Toda vista documental del kit o de una app usa este layout; no se arma un layout de 3 columnas a mano.

## Fuentes

- `src/components/layout/doc-layout.ts`, `doc-layout.scss`, `doc-layout.schemas.ts`.
