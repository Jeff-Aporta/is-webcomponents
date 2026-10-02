---
tag: iswc-er-editor
tags:
  - iswc-er-editor
category: diagrams
status: public
source: ./er-editor.ts
preview: ./er-editor.json
---
# `<iswc-er-editor>`

## Propósito

Editor visual del diagrama entidad-relación. Monta `<iswc-er-diagram>` y añade selección, arrastre, conexión, deshacer y exportación. El visor de solo lectura sigue siendo `<iswc-er-diagram>`.

## Cuándo usarlo

Cuando la persona tiene que armar o corregir entidades y relaciones, no solo verlas.

## Cuándo no usarlo

Para publicar un diagrama ya cerrado. En ese caso usa `<iswc-er-diagram>` o la app de solo vista.

## App API

`demos/diagramas/app/edit.html?kind=er&json=<base64url>` carga este editor.
`demos/diagramas/app/view.html?kind=er&json=<base64url>` carga el visor.
El parámetro `json` de la página abierta no cambia al editar. Compartir genera otro enlace.

## API

| Pieza | Contrato |
| --- | --- |
| `payload` | Estado `{ entities, relations, … }`. Leerlo devuelve el documento vivo. |
| `<script type="application/json">` | Documento inicial si todavía no hay `payload`. |
| `exportJson()` | Texto JSON del estado actual. |
| `iswc-state-change` | Se emite después de cada cambio. El detalle trae entidades y relaciones. |
| `animation="trace"` | Pasa la animación al visor interno. |

## Ejemplo mínimo

```html
<iswc-er-editor>
  <script type="application/json">
    { "entities": [], "relations": [] }
  </script>
</iswc-er-editor>
```
