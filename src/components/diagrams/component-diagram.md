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
- **interfaces (lollipop)**: círculo hueco `O` (`provided`) o arco `C`
  (`required`) sobre un palito perpendicular al lado del componente.
  Una arista entre componentes sin `interfaces` se completa sola a
  conector UML `-(O-`.

Las posiciones del payload son la **semilla**. En `pack` / `triptych` el
motor dispersa cajas con una distancia mínima configurable (`min-gap`).
`manual` deja x/y tal cual.

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
<is-component-diagram min-gap="64"></is-component-diagram>
```

## API

### Atributos y propiedades

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `color` | `"inline"` \| `"viewer"` | Default inline. |
| `min-gap` | number (px) | Distancia mínima entre cajas al empacar. Default **64**. El consumidor la puede bajar o subir. Piso de `rowGap`, `colGutter`, `sourceGap` y `pkgCorridor`. |

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `payload` | lectura/escritura | `{ componentDiagram: { packages, components, interfaces, edges } }`. |
| `spec` | solo lectura | Spec normalizada. |
| `layout` | solo lectura | Geometría lista para pintar. |
| `isViewer` | solo lectura | True cuando el componente vive dentro de un lightbox. |
| `minGap` | lectura/escritura | Refleja `min-gap`. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Payload JSON en un `<script type="application/json">`. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-render` | sí | sí | sí | no |
| `is-open-viewer` | sí | sí | sí | sí |

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
| `--is-sans` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--is-text-soft` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Schema del payload

```ts
{
  componentDiagram: {
    title?: string,
    subtitle?: string,
    layout?: {
      mode?: "pack" | "triptych" | "manual",
      minGap?: number,         // piso en px; equivalente al attr min-gap
      rowGap?: number,
      colGutter?: number,
      pkgCorridor?: number,
      sourceGap?: number,
      sources?: string[],
      sourceSides?: Record<string, "left" | "top" | "bottom" | "right">,
      ungroup?: string[]
    },
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
      x: number, y: number, w: number, h: number,
      items?: string[],       // inventario en el cuerpo (p.ej. endpoints HTTP)
      provides?: string[],    // lollipops O; si hay nombre en común, arista
      requires?: string[],    // sockets C
      connects?: string[]     // ids de componentes destino (alias: to, links)
    }>,
    interfaces?: Array<{
      id: string,
      component: string,      // id del componente al que pertenece
      name?: string,          // nombre UML de la interfaz
      side: "top" | "right" | "bottom" | "left",
      offset: number,         // posición a lo largo del lado
      kind?: "provided" | "required"  // default "provided"
    }>,
    edges?: Array<{           // alias: links, connections, relations
      from: string,           // id de componente o de interfaz
      to: string,
      fromInterface?: string,
      toInterface?: string,
      label?: string,
      kind?: "dependency" | "association" | "realization" | "assembly"
    }>
  }
}
```

## Comportamiento

- Las aristas son polilíneas ortogonales simples (un quiebre). Suficiente
  para diagramas en cuadrícula; no hay A*.
- `items` / `endpoints` se pintan como burbujas apiladas; el verbo HTTP
  (`GET`/`POST`/…) es un chip de color estilo Swagger. El alto de la caja
  se ajusta al contenido (`fit-h`).
- Las aristas sintetizadas se reparteen por los **cuatro lados** (tope 2
  conectores por lateral) para no atascar un solo pasillo.
- Las etiquetas de arista son actores rectangulares (`placeEdgeActors`): no
  se pisan entre sí ni a las cajas. El PNG usa `labelX`/`labelW` del layout.
- Sin `interfaces` en el payload, cada `edge`/`link` componente→componente
  sintetiza socket `C` en el origen y lollipop `O` en el destino.
- `dependency` sin lollipops se dibuja discontinua con punta polígono
  (PNG-safe, no `<marker>`). El conector `O–C` va en línea continua.
- El empaque (`pack` / `triptych`) dispersa cajas: `min-gap` (attr) o
  `layout.minGap` es la distancia mínima (default 64). `rowGap` /
  `colGutter` / `pkgCorridor` / `sourceGap` afinan un eje si son mayores
  que ese piso. `manual` no mueve x/y.
- El título del paquete (`«estereotipo» nombre`) es una caja: las aristas
  la rodean. Sin eso el rótulo queda ilegible.
- El estilo (cajón translúcido, dashed `2 5`, Tahoma, cajas `chipFill`)
  sigue al `<is-er-diagram>` para que ER y componentes convivan en la ficha.

## Dependencias y componentes relacionados

- [`./component-spec.js`](./component-spec.js)
- [`./sequence-spec.js`](./sequence-spec.js) — temas claro/oscuro
- [`../_shared/diagram-element-base.js`](../_shared/diagram-element-base.js)
- [`./diagram-kinds.js`](./diagram-kinds.js)

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. `aria-label` se
autogenera desde `title` o cae a "Diagrama de componentes".

## Ejemplo avanzado

Ver el preview de la galería, que trae paquetes, estereotipos e interfaces
provided/required:
[`../../previews/diagrams/is-component-diagram.json`](../../previews/diagrams/is-component-diagram.json).

## Errores comunes

- Declarar `edges` que referencien componentes/interfaces inexistentes.
  El spec las descarta silenciosamente (es trazable contando nodos).
- Olvidar `x`/`y` en un nodo: cae a `(0, 0)` y se solapa con el origen.
- Usar este componente para clases UML: para eso es `<is-class-diagram>`.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./component-diagram.js)
- [CSS](./component-diagram.css)
- [Spec y layout](./component-spec.js)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/diagrams/is-component-diagram.json)
