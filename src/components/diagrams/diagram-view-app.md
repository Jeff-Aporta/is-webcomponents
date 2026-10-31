---
tag: iswc-diagram-view-app
tags:
  - iswc-diagram-view-app
category: diagrams
status: public
source: ./utils/diagram-studio.ts
preview: ./diagram-view-app.json
---
# `<iswc-diagram-view-app>`

## Propósito

Página que abre cualquier diagrama por enlace, sin editarlo: `demos/diagramas/app/view.html?kind=<kind>&json=<base64url>`.

## Importación

Es una página: no se importa. Se abre por enlace en `demos/diagramas/app/view.html`.

## Ejemplo mínimo

```html
<a href="demos/diagramas/app/view.html?kind=flowchart">Abrir diagrama</a>
```

## Cuándo usarlo

- Compartir un diagrama de solo lectura por enlace.

## Cuándo no usarlo

- Incrustar un diagrama en una vista: usa su tag (`iswc-flowchart`, `iswc-gantt`…).
- Editarlo: `iswc-diagram-edit-app`.

## API

| Parámetro | Valor |
| --- | --- |
| `kind` | Tipo de diagrama: `flowchart`, `sequence`, `class`, `state`, `er`, `block`, `component`, `mindmap`, `gantt`, `timeline`, `org-chart`, `sankey`, `quadrant`, `venn`, `usecase`, `swimlane`, `journey`. |
| `json` | Documento del diagrama en base64url. |

No es un custom element: la entrada documenta la página y su contrato de URL. No tiene `.ts` ni `.scss` propios; el código vive en `utils/diagram-studio.ts`.

## Comportamiento

Lee `kind` y `json` de la URL y pinta el diagrama de solo lectura.

## Accesibilidad

Hereda la accesibilidad del tag de diagrama que muestra. Al incrustarla en un `iframe`, ponle `title`.

## Reglas para LLM

- No es un custom element: no escribas `<iswc-diagram-view-app>`.
- `json` va en base64url.

## Fuentes

- [`./utils/diagram-studio.ts`](./utils/diagram-studio.ts)
- [`diagram-view-app.json`](./diagram-view-app.json)
