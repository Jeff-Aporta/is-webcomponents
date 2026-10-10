---
tag: iswc-figure
tags:
  - iswc-figure
category: media
status: public
source: ./figure.ts
style: ./figure.css
preview: ./figure.json
---
# `<iswc-figure>`

## Propósito

Figura de contenido: una imagen (con variante dark/light opcional), su pie y, si se pide, un enlace
«abrir en una pestaña nueva». Es la estructura que un visor de documentos o un render de markdown
pinta por cada imagen, en lugar de armar `<figure><a><img><figcaption>` a mano.

## Cuándo usarlo

- Imágenes y diagramas dentro de documentación, fichas o artículos.
- Renderers de `<iswc-md-render>` (`renderers.image`) que deben pintar cada imagen igual en todas las apps.
- Capturas con pie explicativo y enlace al original a tamaño completo.

## Cuándo no usarlo

- Logos o marcas pequeñas que escalan con `font-size`: `<iswc-theme-img>`.
- Fotos de perfil: `<iswc-avatar>`.
- Galerías navegables o zoom en la misma página: `<iswc-lightbox>` / `<iswc-carousel>`.

## Importación

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha40>/dist/cdn/core/loader.min.js"></script>
<!-- o con el loader ya presente: await ISWebComponentsLoader.ensure('iswc-figure') -->
```

## Ejemplo mínimo

```html
<iswc-figure src="./diagrama.svg" alt="Flujo de login" caption="Figura 1 · Flujo de login" link paper></iswc-figure>
```

## API

### Atributos y propiedades

| Atributo | Propiedad | Tipo | Default | Notas |
| --- | --- | --- | --- | --- |
| `src` | `src` | URL | — | Imagen para ambos temas. |
| `src-dark` / `src-light` | `srcDark` / `srcLight` | URL | `src` | Variantes por tema (siguen el contenedor de tema del kit). |
| `alt` | `alt` | string | — | Texto alternativo; también nombra el enlace. |
| `caption` | `caption` | string | — | Pie en texto plano; el slot `caption` lo sustituye. Sin pie, el `figcaption` no se pinta. |
| `link` | `link` | boolean | `false` | La imagen enlaza en pestaña nueva a `href` o a la propia imagen. |
| `href` | `href` | URL | — | Destino del enlace; ponerlo implica `link`. |
| `link-label` | `linkLabel` | string | «Abrir en una pestaña nueva» | Título y nombre accesible del enlace. |
| `fit` | `fit` | `contain` \| `cover` | `contain` | Ajuste de la imagen. |
| `loading` | — | `lazy` \| `eager` | — | Como `<img loading>`. |
| `variant` | `variant` | `framed` \| `plain` | `framed` | `framed`: borde, fondo suave y realce al pasar el puntero; `plain`: solo imagen y pie. |
| `paper` | `paper` | boolean | `false` | Fondo claro fijo bajo la imagen (diagramas con trazo oscuro legibles en tema oscuro). |

Propiedad de solo lectura: `linkHref` (URL efectiva del enlace o vacío).

### Slots

| Slot | Uso |
| --- | --- |
| `caption` | Pie enriquecido (enlaces, `<code>`, iconos). Sustituye al atributo `caption`. |

### Eventos

| Evento | Detalle | Notas |
| --- | --- | --- |
| `iswc-figure-open` | `{ href }` | Cancelable. Se emite al activar el enlace; `preventDefault()` evita la pestaña nueva (p. ej. para abrir un lightbox). |

### Métodos y propiedades públicas

Sin métodos. Propiedades espejo de los atributos y `linkHref`.

### CSS parts

| Part | Elemento |
| --- | --- |
| `frame` | El `<figure>` (marco). |
| `link` | El `<a>` que envuelve la imagen. |
| `image` | La `<img>` interna (reexportada de `<iswc-theme-img>`). |
| `caption` | El `<figcaption>`. |

### Custom states

`data-linked` en el host cuando la figura enlaza.

### CSS custom properties

| Propiedad | Default | Uso |
| --- | --- | --- |
| `--iswc-figure-max-height` | `72vh` | Alto máximo de la imagen. |
| `--iswc-figure-paper` | blanco | Fondo de la imagen con `paper`. |

### Integración con formularios

No aplica.

## Anatomía

```text
<iswc-figure>
  #shadow-root
    <figure part="frame">
      <a part="link" target="_blank" rel="noopener">
        <iswc-theme-img exportparts="image"></iswc-theme-img>
      </a>
      <figcaption part="caption"><slot name="caption">caption</slot></figcaption>
    </figure>
```

## Comportamiento

- Sin `link` ni `href`, el `<a>` queda sin `href`: no es foco ni enlace.
- El pie se oculta si no hay atributo `caption` ni contenido en el slot.
- Cambiar el tema del contenedor cambia la variante de la imagen (vía `<iswc-theme-img>`).

## Dependencias y componentes relacionados

- `<iswc-theme-img>` (imagen dual tema), interna.
- `<iswc-md-render>`: usarla en `renderers.image`.
- `<iswc-lightbox>`: abrirla desde `iswc-figure-open` con `preventDefault()`.

## Accesibilidad

- `alt` llega a la `<img>`; el enlace toma como nombre «alt — link-label».
- Foco visible en el enlace (`:focus-visible`), y el marco se realza con `:focus-within`.
- Sin animaciones con `prefers-reduced-motion: reduce`.

## Ejemplo avanzado

```html
<iswc-figure src-dark="./arq-dark.svg" src-light="./arq-light.svg" alt="Arquitectura" href="./arq.html" link-label="Ver interactivo">
  <span slot="caption">Arquitectura general — <a href="./arq.md">ver ficha</a></span>
</iswc-figure>
<script type="module">
  document.querySelector('iswc-figure').addEventListener('iswc-figure-open', (e) => {
    e.preventDefault();
    abrirLightbox(e.detail.href);
  });
</script>
```

## Errores comunes

- Envolver `<iswc-figure>` en otro `<a>`: el enlace ya lo pone el componente (`link`/`href`).
- Escribir HTML en el atributo `caption`: es texto plano; para HTML usar el slot `caption`.
- Esperar caja `1em` como en `<iswc-theme-img>`: la figura ocupa el ancho del contenedor.

## Reglas para LLM

- Toda imagen de contenido con pie o enlace se pinta con `<iswc-figure>`, nunca con `<figure>` suelto.
- `paper` solo para diagramas o capturas con fondo transparente y trazo oscuro.
- Para interceptar el clic (lightbox), escuchar `iswc-figure-open` y llamar `preventDefault()`.
- No inventar atributos: los válidos son los de la tabla.

## Fuentes

- [figure.ts](./figure.ts) · [figure.scss](./figure.scss) · [figure.json](./figure.json)
