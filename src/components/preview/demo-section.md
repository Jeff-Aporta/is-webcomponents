---
tag: iswc-demo-section
tags:
  - iswc-demo-section
category: preview
status: internal
source: ./demo-section.ts
style: ./demo-section.scss
preview: ./demo-section.json
---
# `<iswc-demo-section>` — Sección homogénea de un demo

Envoltorio que aplica la política de los demos del kit: **todo el contenido de una sección va
dentro de una card**; solo el título y el resumen principal (lede) flotan a ancho completo.
Lo crea el renderer de previews (`src/previews/_kit/render.ts`), una por sección; no se escribe
a mano en una página.

## Propósito

Sección homogénea de un demo: el título y el lede flotan a ancho completo y el resto del contenido va dentro de una card.

## Cuándo no usarlo

A mano en una página o en una vista de producto: la monta el renderer. Para agrupar contenido de producto, usa `<iswc-card>`.

## Importación

```js
import './demo-section.js';
```

## Ejemplo mínimo

```html
<iswc-demo-section id="intro" class="section">
  <h2 slot="title">Título</h2>
  <iswc-demo>…</iswc-demo>
</iswc-demo-section>
```

## Anatomía

```html
<iswc-demo-section id="intro" class="section">
  <h2 slot="title">Título</h2>            <!-- omitido si hideTitle: true -->
  <p class="lede" slot="lede">Resumen</p> <!-- omitido si no hay lede -->
  <iswc-demo>…</iswc-demo>                <!-- bloques kind: demo / code / html … -->
</iswc-demo-section>
```

El shadow DOM proyecta `slot="title"` y `slot="lede"` arriba (fuera de la card) y el slot por
defecto dentro de una card homogénea.

## Atributos

| Atributo | Tipo | Qué hace |
| --- | --- | --- |
| `id` | string | Ancla del TOC y del scroll-spy de la página del demo |
| `as` | `section` | `aside` | Semántica del contenedor que declara el JSON del demo (por defecto `section`) |

Hereda `class="section"` y los `aria-*`/`role` que ponga el renderer, para que las reglas de
`presentation.css` sigan aplicando al encabezado.

## Cuándo usarlo

Nunca directamente: lo monta el renderer. Si una sección de un demo se ve fuera de card, el
defecto está aquí, no en la página.

## Comportamiento

Proyecta `slot="title"` y `slot="lede"` arriba, fuera de la card, y el slot por defecto dentro de la card.

## Accesibilidad

Reenvía `role`, `aria-label` y `aria-labelledby`, y `as` elige entre `section` y `aside`.

## Reglas para LLM

- La monta `src/previews/_kit/render.ts`.
- Si una sección se ve fuera de card, el defecto está aquí, no en la página.
