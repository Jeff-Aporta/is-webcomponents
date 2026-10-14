---
tag: iswc-doc-index
tags:
  - iswc-doc-index
category: navigation
status: public
source: ./doc-index.ts
style: ./doc-index.css
preview: ./doc-index.json
---
# `<iswc-doc-index>`

## Propósito

Índice documental con búsqueda: lista páginas agrupadas (grupo → subgrupo → ítem) y, al escribir,
busca en títulos, palabras clave y todo el texto, con los resultados por relevancia y el fragmento
resaltado.

## Cuándo usarlo

- La navegación de un lector de documentación (`iswc-md-docs-vault` lo usa en su lateral).
- Temarios, manuales o catálogos de páginas con búsqueda de texto completo.

## Cuándo no usarlo

- Menús de aplicación: usa `iswc-tree` o la navegación de la app.
- El índice de secciones de una sola página: lo genera `iswc-doc-layout`.

## Importación

```js
import './doc-index.js';
```

## Ejemplo mínimo

```html
<iswc-doc-index placeholder="Buscar…">
  <script type="application/json">[{"id":"intro.md","title":"Introducción","group":"010 · General"}]</script>
</iswc-doc-index>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Default | Notas |
| --- | --- | --- | --- |
| `current` | string | — | `id` del ítem activo (se marca en la lista). |
| `placeholder` | string | `Buscar…` | Texto del buscador. |

#### Propiedades públicas

| Propiedad | Tipo | Notas |
| --- | --- | --- |
| `items` | `ItemDocIndex[]` | `{ id, title, group?, subgroup?, number?, icon?, keywords?, text?, hint?, pinned? }`. |
| `current` | string | Ítem activo. |
| `textos` | `{ placeholder, sinResultados, resumen }` | Textos de la interfaz (i18n); `resumen` acepta `{items}` y `{grupos}`. |

### Slots

No tiene slots. Los ítems también pueden llegar en un `<script type="application/json">` hijo.

### Eventos

| Evento | Detalle | Cuándo |
| --- | --- | --- |
| `iswc-doc-index-select` | `{ id, item }` | Al elegir un ítem o un resultado de búsqueda. |

### Métodos y propiedades públicas

| Método | Notas |
| --- | --- |
| `focusSearch()` | Enfoca el buscador. |
| `search(texto)` | Busca por código (sin teclear). |

### CSS parts

| Part | Elemento |
| --- | --- |
| `search`, `search-input` | Caja de búsqueda. |
| `summary` | Resumen bajo el buscador. |
| `list` | Lista de grupos e ítems. |

### Custom states

No expone custom states.

### CSS custom properties

Usa los tokens del kit (`--iswc-text`, `--iswc-text-dim`, `--iswc-border`, `--iswc-color-brand`).

## Comportamiento

- Sin búsqueda: ítems fijados arriba (`pinned`), luego grupos y subgrupos en el orden recibido.
- Con búsqueda: sin acentos ni mayúsculas, sobre título, `keywords` y `text`; resultados por relevancia
  con el fragmento resaltado y `hint` (la ruta) como segunda línea.
- El número o el ícono va en una columna fija: un título que se parte queda alineado con su inicio.

## Dependencias y componentes relacionados

Lo usa `iswc-md-docs-vault`; convive con `iswc-doc-layout` (va en su slot `start`).

## Accesibilidad

- El buscador es un `input type="search"`; los ítems son botones navegables con teclado.
- El ítem activo lleva `aria-current`.

## Ejemplo avanzado

```js
const idx = document.querySelector('iswc-doc-index');
idx.textos = { placeholder: 'Search…', sinResultados: 'No results.', resumen: '{items} pages' };
idx.items = hojas.map((h) => ({ id: h.ruta, title: h.titulo, group: h.modulo, text: h.texto }));
idx.addEventListener('iswc-doc-index-select', (e) => abrir(e.detail.id));
```

## Errores comunes

- Ítems sin `id` único: elegir uno abre otro.
- Pasar HTML en `title` o `text`: se escapa (se muestra literal).

## Reglas para LLM

- Toda lista de páginas con búsqueda usa este componente; no se arma un buscador propio.

## Fuentes

- `src/components/navigation/doc-index.ts`, `doc-index.scss`, `doc-index.schemas.ts`.
