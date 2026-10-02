---
tag: iswc-mindmap
tags:
  - iswc-mindmap
category: diagrams
status: public
source: ./mindmap.js
style: ./mindmap.css
preview: ./mindmap.json
---
# `<iswc-mindmap>`

## Propósito

Mapa mental en SVG, sin Mermaid. Declaras ideas con un `parent`
opcional y el componente arma el árbol, reparte las ramas y las une
con curvas suaves coloreadas por rama.

Este módulo registra `<iswc-mindmap>`.

## Cuándo usarlo

Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos.

## Cuándo no usarlo

No inventar schemas ni usar specs/layout como custom elements.

## Importación

```js
import './mindmap.js';
```

## Ejemplo mínimo

```html
<iswc-mindmap></iswc-mindmap>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `color` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `isViewer` | solo lectura | Declarada por clase. |
| `payload` | lectura/escritura | Declarada por clase. |
| `spec` | solo lectura | Declarada por clase. |
| `layout` | solo lectura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-render` | sí | sí | sí | no |
| `iswc-open-viewer` | sí | sí | sí | sí |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `updateComplete()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `canvas` | Personalizable con `::part(canvas)`. |
| `tooltip` | Personalizable con `::part(tooltip)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-sans` | Token leído o definido por componente. |
| `--iswc-border` | Token leído o definido por componente. |
| `--iswc-text-soft` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <iswc-mindmap> — mapa mental en SVG, sin Mermaid.
>   <iswc-mindmap>
>     <script type="application/json">
>       { "mindmap": { "layout": "radial", "nodes": [...] } }
>     </script>
>   </iswc-mindmap>
> Mismo esqueleto que <iswc-flowchart>: shadow DOM, slot JSON + MutationObserver,
> tema por atributo `data-theme`, `color` (inline | viewer), lightbox propio.
> Atributos: color (inline | viewer), open-on-click
> Propiedades: payload, spec, layout
> Eventos: iswc-render, iswc-open-viewer

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`./mindmap-spec.js`](./mindmap-spec.js)
- [`./sequence-spec.js`](./sequence-spec.js)
- [`../_shared/tk-hue.js`](../_shared/tk-hue.js)
- [`../_shared/tk-inline-md.js`](../_shared/tk-inline-md.js)
- [`../_shared/tk-icon-inline.js`](../_shared/tk-icon-inline.js)
- [`../_shared/icon-loader.js`](../_shared/icon-loader.js)
- [`./diagram-kinds.js`](./diagram-kinds.js)

Tags del módulo: `<iswc-mindmap>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`.

## Ejemplo avanzado

```html
<iswc-mindmap></iswc-mindmap>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./mindmap.js)
- [CSS](./mindmap.css)
- [Índice de categoría](./LLM.md)
- [Preview](./mindmap.json)

## App API

Visor: `demos/diagramas/app/view.html?kind=mindmap&json=<base64url>`.
Editor: `demos/diagramas/app/edit.html?kind=mindmap&json=<base64url>`.

`json` es el documento completo en base64url. Editar no reescribe ese parámetro: Compartir arma un enlace nuevo con el JSON resultante.
