# Anatomía de la ficha de un componente iswc

La sección de anatomía es la **primera** que aparece en
`src/components/<carpeta>/<modulo>.md`. Cubre frontmatter, título y la
frase de identidad. Sin esto, ni la ficha ni el catálogo saben qué
componente están describiendo.

## Plantilla canónica

```md
---
tag: iswc-foo
tags:
  - iswc-foo
category: <carpeta>
status: public
source: ./foo.js
style: ./foo.css
preview: ./foo.json
---

# `<iswc-foo>`

## Propósito

Componente InSoft accesible y personalizable, escrito con JavaScript
nativo, Shadow DOM y sin frameworks.

Este módulo registra `<iswc-foo>`.

## Cuándo usarlo

<una sola frase: el caso canónico>

## Cuándo no usarlo

<una sola frase: el caso donde NO es la herramienta correcta, o "Ver
guía de la categoría" si no aplica>

## Importación

```js
import './foo.js';
```

## Ejemplo mínimo

```html
<iswc-foo></iswc-foo>
```
```

## Frontmatter

| Clave | Tipo | Obligatoria | Descripción |
| --- | --- | --- | --- |
| `tag` | string | sí | Tag principal sin `<>`. Coincide con `customElements.define`. |
| `tags` | string[] | sí | Lista de tags asociados. Suele ser un único elemento igual a `tag`. |
| `category` | string | sí | Carpeta lógica: `actions`, `feedback`, `forms`, `data`, `charts`, `diagrams`, `layout`, `navigation`, `helpers`, `media`, `isp`. |
| `status` | enum | sí | `public` (API de producto) o `internal` (building block, no usar desde apps). |
| `source` | path | sí | Relativo al MD: `./foo.js`. |
| `style` | path | sí | Relativo al MD: `./foo.css`. Si no hay CSS, poner `./foo.css` y dejar el archivo vacío. |
| `preview` | path | sí | Relativo al MD: `./foo.json`. Payload declarativo del preview. |

## Reglas duras del frontmatter

- `tag` siempre en kebab-case, prefijo `iswc-`.
- `category` debe existir en `src/manifest.ts` (ver `tests/manifest-paths.test.mjs`).
- `status: public` solo si la guía dice "API de producto". Lo demás es
  `internal` y no debe aparecer en el catálogo público.
- `source`/`style`/`preview` deben apuntar a **archivos reales**. El
  test `tests/manifest-paths.test.mjs` lo valida y falla si falta
  alguno.

## Título H1

```md
# `<iswc-foo>`
```

- Siempre con backticks.
- Coincidir exactamente con `tag` del frontmatter.
- Una sola línea, sin emoji, sin sufijo descriptivo.

## Frase de identidad

Primer párrafo tras el H1. Dos frases máximo:

1. Qué es (en una línea).
2. Que registra el tag al importarse.

Forma canónica:

> Componente InSoft accesible y personalizable, escrito con JavaScript
> nativo, Shadow DOM y sin frameworks.
>
> Este módulo registra `<iswc-foo>`.

No repetir el nombre del tag tres veces en la misma página: el frontmatter
y el H1 ya lo dicen.

## Secciones opcionales que viven aquí

- **Cuándo usarlo / Cuándo no usarlo** — siempre juntas, mismo nivel de
  detalle. Si una de las dos no aplica, omitir la sección, no dejarla
  vacía.
- **Importación** — mostrar el `import` mínimo. Si el componente necesita
  CSS hermano, mencionarlo en una sub-sección, no aquí.
- **Ejemplo mínimo** — un solo bloque HTML. Sin variantes, sin "y
  también…". Las variantes van en la sección **Ejemplos** al final.
