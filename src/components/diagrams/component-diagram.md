---
tag: is-component-diagram
tags:
  - is-component-diagram
category: diagrams
status: public
source: ./component-diagram.js
style: ./component-diagram.css
preview: ../../previews/diagrams/is-component-diagram.json
---
# `<is-component-diagram>`

## Propósito

Diagrama de **componentes UML** en SVG, sin Mermaid. A diferencia del
flujo y del bloque, este modo tiene tres primitivas declaradas:

- **packages**: carpetas con pestaña arriba a la izquierda (forma clásica
  de UML para denotar un agrupamiento lógico / namespace).
- **components**: rectángulos con un estereotipo `«name»` sobre la
  etiqueta, igual que el componente UML clásico.
- **interfaces (lollipop)**: círculo (`provided`) o semicírculo (`required`)
  sobre una arista corta perpendicular al lado del componente.

Las posiciones son **explícitas** en el payload. Esto replica el flujo de
PlantUML/Structurizr: el diagrama es un mapa mental del sistema, no un
grafo que el motor dibuja.

Este módulo registra `<is-component-diagram>`.

## Cuándo usarlo

Cuando necesitas describir la arquitectura de un sistema (servicios,
módulos, capas, proveedores externos) en estilo UML component, con sus
interfaces provided/required y los paquetes que los agrupan.

## Cuándo no usarlo

Si lo que necesitas son clases UML con atributos y métodos → usa
`<is-class-diagram>`. Si solo quieres nodos y conexiones simples sin la
semántica UML → `<is-block-diagram>`.

## Importación

```js
import './component-diagram.js';
```

## Ejemplo mínimo

```html
<is-component-diagram></is-component-diagram>
```

## API

### Atributos y propiedades

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `color` | `"inline"` \| `"viewer"` | Default inline. |

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `payload` | lectura/escritura | `{ componentDiagram: { packages, components, interfaces, edges } }`. |
| `spec` | solo lectura | Spec normalizada. |
| `layout` | solo lectura | Geometría lista para pintar. |
| `isViewer` | solo lectura | True cuando el componente vive dentro de un lightbox. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-render` | sí | sí | sí | no |
| `is-open-viewer` | sí | sí | sí | sí |

## Schema del payload

```ts
{
  componentDiagram: {
    title?: string,
    subtitle?: string,
    packages?: Array<{
      id: string,
      name: string,
      stereotype?: string,    // p.ej. "Azure", "OpenAI"
      hue?: number,
      x: number, y: number, w: number, h: number
    }>,
    components: Array<{
      id: string,
      name: string,
      stereotype?: string,    // p.ej. "component", "BD MSSQL", "Función HTTP"
      package?: string,       // id del package que lo contiene
      hue?: number,
      x: number, y: number, w: number, h: number
    }>,
    interfaces?: Array<{
      id: string,
      component: string,      // id del componente al que pertenece
      name?: string,          // nombre UML de la interfaz
      side: "top" | "right" | "bottom" | "left",
      offset: number,         // posición a lo largo del lado
      kind?: "provided" | "required"  // default "provided"
    }>,
    edges?: Array<{
      from: string,           // id de componente o de interfaz
      to: string,
      fromInterface?: string,
      toInterface?: string,
      label?: string,
      kind?: "dependency" | "association" | "realization"
    }>
  }
}
```

## Comportamiento

- Las aristas son polilíneas ortogonales simples (un quiebre). Suficiente
  para diagramas en cuadrícula; no hay A*.
- `dependency` se dibuja con línea discontinua; `realization` con flecha
  hueca (estilo UML).
- Las posiciones se declaran absolutas: el motor NO recalcula layout.

## Dependencias y componentes relacionados

- [`./component-spec.js`](./component-spec.js)
- [`./sequence-spec.js`](./sequence-spec.js) — temas claro/oscuro
- [`../_shared/diagram-element-base.js`](../_shared/diagram-element-base.js)
- [`./diagram-kinds.js`](./diagram-kinds.js)

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. `aria-label` se
autogenera desde `title` o cae a "Diagrama de componentes".

## Errores comunes

- Declarar `edges` que referencien componentes/interfaces inexistentes.
  El spec las descarta silenciosamente (es trazable contando nodos).
- Olvidar `x`/`y` en un nodo: cae a `(0, 0)` y se solapa con el origen.
- Usar este componente para clases UML: para eso es `<is-class-diagram>`.
