---
tag: iswc-diagram-edit-app
tags:
  - iswc-diagram-edit-app
category: diagrams
status: public
source: ./utils/diagram-studio.ts
preview: ./diagram-edit-app.json
---
# `<iswc-diagram-edit-app>`

## Propósito

Página para editar un diagrama por enlace: `demos/diagramas/app/edit.html?kind=<kind>&json=<base64url>`. Editar no reescribe la dirección: **Compartir** copia un enlace nuevo y **Recuperar JSON** devuelve el documento actual.

## Importación

Es una página: no se importa. Se abre por enlace en `demos/diagramas/app/edit.html`.

## Ejemplo mínimo

```html
<a href="demos/diagramas/app/edit.html?kind=er">Editar diagrama</a>
```

## Cuándo usarlo

- Dar a alguien un diagrama para ajustar sin instalar nada.

## Cuándo no usarlo

- Solo mostrarlo: `iswc-diagram-view-app`.
- Editor visual de ER dentro de una vista: `iswc-er-editor`.

## API

| Parámetro | Valor |
| --- | --- |
| `kind` | Tipo de diagrama: `flowchart`, `sequence`, `class`, `state`, `er`, `block`, `component`, `mindmap`, `gantt`, `timeline`, `org-chart`, `sankey`, `quadrant`, `venn`, `usecase`, `swimlane`, `journey`. |
| `json` | Documento del diagrama en base64url. |

No es un custom element: la entrada documenta la página y su contrato de URL. No tiene `.ts` ni `.scss` propios; el código vive en `utils/diagram-studio.ts`.

## Comportamiento

Lee `kind` y `json` de la URL y abre el diagrama en el editor.

## Accesibilidad

Hereda la accesibilidad del editor. Al incrustarla en un `iframe`, ponle `title`.

## Reglas para LLM

- No es un custom element: no escribas `<iswc-diagram-edit-app>`.
- `json` va en base64url.

## Fuentes

- [`./utils/diagram-studio.ts`](./utils/diagram-studio.ts)
- [`diagram-edit-app.json`](./diagram-edit-app.json)
