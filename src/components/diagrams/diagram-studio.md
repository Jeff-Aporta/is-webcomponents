---
tag: iswc-diagram-studio
tags:
  - iswc-diagram-view-app
  - iswc-diagram-edit-app
category: diagrams
status: public
source: ./diagram-studio.ts
---
# App API de diagramas

## Propósito

Abrir cualquier diagrama del kit por enlace, en solo vista o en edición, sin reimplementar el visor.

## Cuándo usarlo

Cuando otra app, un agente o la galería necesitan mostrar o editar un diagrama ya serializado y después compartir el resultado.

## Cuándo no usarlo

No sustituye al tag del diagrama dentro de una pantalla de producto. Ahí se usa `<iswc-flowchart>`, `<iswc-er-diagram>` y el resto, con su JSON en un `<script type="application/json">`.

## Páginas

| Modo | URL |
| --- | --- |
| Vista | `demos/diagramas/app/view.html?kind=<kind>&json=<base64url>` |
| Edición | `demos/diagramas/app/edit.html?kind=<kind>&json=<base64url>` |

`kind`: `flowchart`, `sequence`, `class`, `state`, `er`, `block`, `component`, `mindmap`, `gantt`, `timeline`, `org-chart`, `sankey`, `quadrant`, `venn`, `usecase`, `swimlane`, `journey`.

## Contrato del enlace

- `json` es el documento completo, codificado en base64url (también se acepta base64 estándar al leer).
- Se lee una sola vez, al abrir la página.
- Cambiar el diagrama, aplicar otro JSON o mover nodos **no** modifica la dirección actual.
- **Compartir** copia un enlace nuevo (misma página, `kind` y JSON actuales).
- **Enlace de solo vista** / **Enlace del editor** copia la otra página con ese mismo JSON nuevo.
- **Recuperar JSON** muestra y copia el documento vivo.
- **Aplicar JSON** (solo edición) pinta el texto del panel. Tampoco toca la dirección.

El editor visual de entidad-relación es `<iswc-er-editor>` cuando `kind=er`. Los demás `kind` se editan con el panel JSON sobre el visor de ese diagrama.

## Ejemplo

```text
demos/diagramas/app/view.html?kind=flowchart&json=eyJmbG93Y2hhcnQiOnsidGl0bGUiOiJBbHRhIn19
```

El valor de `json` es `{"flowchart":{"title":"Alta"}}` en base64url.
