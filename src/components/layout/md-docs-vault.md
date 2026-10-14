---
tag: iswc-md-docs-vault
tags:
  - iswc-md-docs-vault
category: layout
status: public
source: ./md-docs-vault.ts
style: ./md-docs-vault.css
preview: ./md-docs-vault.json
---
# `<iswc-md-docs-vault>`

## Propósito

Lector de una documentación modular (norma `documentacion-modular`) como un libro: cada `.md` es una
hoja, el README es la portada y se navega con índice, búsqueda, paso anterior/siguiente y enlaces
compartibles. Es el `docs/index.html` de cualquier proyecto: la app solo pone la lista de hojas.

## Cuándo usarlo

- La documentación de un proyecto (`docs/`) servida como sitio estático (Live Server, Pages, Azure).
- Un manual o guía de varias hojas markdown con frontmatter (`Titulo`, `Estado`, `Autor`, `tags`, `aliases`).
- Un libro sin servidor o una demo: las hojas van embebidas en la página.

## Cuándo no usarlo

- Una sola página de markdown: usa `iswc-md-render`.
- Un layout documental con contenido propio (no markdown): usa `iswc-doc-layout`.
- La documentación de la API de un server (`GET /api/docs`): usa `iswc-server-api-docs`.

## Importación

```js
import './md-docs-vault.js'; // o, por el loader: iswcLoader.ensure('iswc-md-docs-vault')
```

## Ejemplo mínimo

```html
<iswc-md-docs-vault main="README.md">
  <strong slot="brand">Mi proyecto</strong>
  <script type="application/json">["README.md", "010-General/010-Planteamiento/010-Ficha-de-proyecto.md"]</script>
</iswc-md-docs-vault>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Default | Notas |
| --- | --- | --- | --- |
| `main` | string | `README.md` | Hoja principal: sin `?s=` en la URL se abre ella. |
| `base` | string | carpeta de la página | Carpeta contra la que se resuelven las rutas de las hojas. |

#### Propiedades públicas

| Propiedad | Tipo | Notas |
| --- | --- | --- |
| `main` | string (solo lectura) | Hoja principal efectiva. |
| `layout` | `HTMLElement` (solo lectura) | El `<iswc-doc-layout>` que aloja al lector. |
| `renderers` | objeto | Renderers de `iswc-md-render` que se suman a (o reemplazan) los del lector: `image`, `link`, `code`… |

### Slots

| Slot | Contenido |
| --- | --- |
| `brand` | Marca de la barra superior (nombre del proyecto, hoja actual). |
| `actions` | Acciones de la app en la barra (tema, paleta, escoba). |

La lista de hojas no es un slot: va en un `<script type="application/json">` hijo (rutas `.md` en orden
de lectura). Las hojas embebidas van en `<script type="text/markdown" data-path="ruta.md">` hijos; sin
lista JSON, su orden es el del libro.

### Eventos

| Evento | Detalle | Cuándo |
| --- | --- | --- |
| `iswc-md-docs-vault-page` | `{ ruta, titulo, meta }` | Al abrir una hoja (también la primera). |

### Métodos y propiedades públicas

| Método | Notas |
| --- | --- |
| `irA(ruta, ancla?)` | Abre una hoja (y un encabezado). Cambia solo `?s=`: sin recarga. |

### CSS parts

| Part | Elemento |
| --- | --- |
| `bar`, `toc`, `content` | Re-exportados de `iswc-doc-layout`: barra, índice de la hoja y contenido. |

### Custom states

No expone custom states.

### CSS custom properties

Usa los tokens del kit (`--iswc-text`, `--iswc-text-dim`, `--iswc-border`, `--iswc-color-brand`).

## Comportamiento

- Lee todas las hojas al iniciar (título, estado, tags, alias y texto) para el índice y la búsqueda;
  una hoja que no se puede leer aparece igual en el índice, con su nombre.
- Navegación SPA en la URL (`?s=` base64url): atrás/adelante y enlaces compartibles a una hoja y a un
  encabezado. Volver a la principal deja la URL sin query.
- Cada hoja se pinta con `iswc-md-render`; por defecto las imágenes son `iswc-figure` sin marco que se
  abren en una pestaña nueva, los enlaces `.md` del libro navegan dentro del lector y los de fuera son
  enlaces normales.
- Las imágenes de la hoja se revalidan contra el servidor: un SVG regenerado no queda en la caché.
- Pie con `iswc-pager` (hoja anterior/siguiente) y ficha de la hoja (`iswc-meta-list`) en un modal.
- Teclado: ← / → hoja anterior/siguiente; `/` abre la navegación y enfoca la búsqueda.
- Sin servidor (`file://`) muestra un aviso: el navegador no permite `fetch` local.

## Dependencias y componentes relacionados

`iswc-doc-layout`, `iswc-doc-index`, `iswc-md-render`, `iswc-pager`, `iswc-figure`, `iswc-meta-list`,
`iswc-dialog`, `iswc-copy-button`, `iswc-button-group`, `iswc-callout`; `core/spa-state` para la URL.

## Accesibilidad

- La hoja es un `article` con `aria-live="polite"`; «cargando» usa `role="status"`.
- Botones de la barra con `aria-label`; el modal de información es un `iswc-dialog` (foco atrapado, Esc cierra).
- Los atajos no se disparan mientras el foco está en un campo de texto.

## Ejemplo avanzado

```js
const vault = document.querySelector('iswc-md-docs-vault');
// Imágenes en un lightbox propio en lugar de una pestaña nueva.
vault.renderers = { image: ({ src, alt }) => `<mi-lightbox src="${src}" alt="${alt}"></mi-lightbox>` };
vault.addEventListener('iswc-md-docs-vault-page', (e) => { document.title = `${e.detail.titulo} · Docs`; });
```

## Errores comunes

- Abrir la página con `file://`: el navegador bloquea `fetch`; sírvala (Live Server) o embeba las hojas.
- Rutas en la lista que no coinciden con los archivos: la hoja aparece pero no se puede leer.
- Omitir el README en la lista: el lector lo agrega igual como portada (`main`).

## Reglas para LLM

- El `docs/index.html` de un proyecto se arma con este componente; no se copia un visor propio.
- La lista de hojas sale de la estructura de `docs/` (norma `documentacion-modular`), en orden de lectura.
- Las hojas no se editan para el lector: frontmatter y markdown estándar.

## Fuentes

- `src/components/layout/md-docs-vault.ts`, `md-docs-vault.scss`, `md-docs-vault.schemas.ts`.
