---
tag: iswc-pager
tags:
  - iswc-pager
category: navigation
status: public
source: ./pager.ts
style: ./pager.css
preview: ./pager.json
---
# `<iswc-pager>`

## Propósito

Paso a la página anterior y a la siguiente, cada lado con un rótulo pequeño («← Anterior»,
«Siguiente →») y el título de la otra página. Es el pie de una hoja de documentación, de un
artículo o de un paso de tutorial, en lugar de armar el par de botones a mano.

## Cuándo usarlo

- Pie de cada hoja en un lector de documentación (`iswc-docs-vault`).
- Secuencias lineales de páginas o pasos donde importa ver a dónde se va.

## Cuándo no usarlo

- Listas paginadas por número de página: eso es una paginación numérica.
- Asistentes con validación por paso: usa `iswc-stepper`.

## Importación

```js
import './pager.js';
```

## Ejemplo mínimo

```html
<iswc-pager prev="Introducción" next="Instalación"></iswc-pager>
```

## API

### Atributos y propiedades

| Atributo | Propiedad | Tipo | Default | Notas |
| --- | --- | --- | --- | --- |
| `prev` | `prev` | string | `""` | Título de la página anterior. Vacío oculta ese lado. |
| `next` | `next` | string | `""` | Título de la página siguiente. Vacío oculta ese lado. |
| `prev-href` | `prevHref` | string | `""` | Con valor, el lado es un enlace; sin valor, un botón. |
| `next-href` | `nextHref` | string | `""` | Igual que `prev-href`. |
| `prev-label` | — | string | `← Anterior` | Rótulo pequeño del lado anterior. |
| `next-label` | — | string | `Siguiente →` | Rótulo pequeño del lado siguiente. |
| `label` | — | string | `Paginación` | `aria-label` del `<nav>`. |

### Slots

No tiene slots.

### Eventos

| Evento | Detalle | Cuándo |
| --- | --- | --- |
| `iswc-pager-navigate` | `{ direction: 'prev' \| 'next', href: string }` | Al activar un lado (clic, Enter o Espacio). Cancelable: con `href`, `preventDefault()` cancela la navegación del enlace. |

### Métodos y propiedades públicas

Solo las propiedades de la tabla anterior.

### CSS parts

| Part | Elemento |
| --- | --- |
| `base` | `<nav>` contenedor (rejilla de 2 columnas). |
| `prev`, `next` | Cada lado. |
| `label` | Rótulo pequeño de un lado. |
| `title` | Título de la otra página. |

### Custom states

No expone custom states.

### CSS custom properties

| Propiedad | Default | Uso |
| --- | --- | --- |
| `--iswc-pager-gap` | `14px` | Separación entre lados. |
| `--iswc-pager-radius` | `12px` | Radio de cada lado. |

### Integración con formularios

No participa en formularios.

## Anatomía

```html
<nav part="base" aria-label="Paginación">
  <a part="prev"><small part="label">← Anterior</small><span part="title">…</span></a>
  <a part="next"><small part="label">Siguiente →</small><span part="title">…</span></a>
</nav>
```

## Comportamiento

- El lado siguiente siempre ocupa la columna derecha, aunque no haya anterior.
- A 760 px o menos los lados se apilan en una columna.
- Sin `href`, el lado lleva `role="button"` y `tabindex="0"`; Enter y Espacio lo activan.

## Dependencias y componentes relacionados

Sin dependencias. Relacionados: `iswc-stepper`, `iswc-breadcrumb`.

## Accesibilidad

`<nav>` con `aria-label`; cada lado se anuncia con su rótulo y su título; foco visible con el color de marca.

## Ejemplo avanzado

```js
const pager = document.querySelector('iswc-pager');
pager.setAttribute('prev', anterior?.titulo ?? '');
pager.setAttribute('next', siguiente?.titulo ?? '');
pager.addEventListener('iswc-pager-navigate', (e) => irA(e.detail.direction === 'prev' ? anterior : siguiente));
```

## Errores comunes

- Dejar `prev`/`next` con un título y sin manejar el evento ni dar `href`: el lado no lleva a ningún sitio.

## Reglas para LLM

- Usa `<iswc-pager>` para «anterior / siguiente» con título; no armes los botones a mano.
- Para navegar en una SPA escucha `iswc-pager-navigate`; con `href`, llama `preventDefault()`.

## Fuentes

- [pager.ts](./pager.ts) · [pager.scss](./pager.scss) · [pager.json](./pager.json)
