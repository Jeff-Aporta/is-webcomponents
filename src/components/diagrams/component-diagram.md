---
tag: iswc-component-diagram
tags:
  - iswc-component-diagram
category: diagrams
status: public
source: ./component-diagram.ts
style: ./component-diagram.css
preview: ./component-diagram.json
---
# `<iswc-component-diagram>`

## PropÃ³sito

Diagrama de **componentes UML** en SVG, sin Mermaid. A diferencia del
flujo y del bloque, este modo tiene tres primitivas declaradas:

- **packages**: carpetas con pestaÃ±a arriba a la izquierda (forma clÃ¡sica
  de UML para denotar un agrupamiento lÃ³gico / namespace).
- **components**: rectÃ¡ngulos con un estereotipo `Â«nameÂ»` sobre la
  etiqueta, igual que el componente UML clÃ¡sico.
- **interfaces (lollipop)**: cÃ­rculo hueco `O` (`provided`) o arco `C`
  (`required`) sobre un palito perpendicular al lado del componente.
  Una arista entre componentes sin `interfaces` se completa sola a
  conector UML `-(O-`.

Las posiciones del payload son la **semilla**. En `pack` / `triptych` el
motor reorganiza **paquetes con hijos** (y en `triptych`, los `sources`
declarados); `min-gap` es el piso de esas separaciones. Los componentes
**libres** (sin `package`) conservan su posiciÃ³n del payload: para rejilla
automÃ¡tica mÃ©telos en paquetes, o usa `manual` y colÃ³calos tÃº.
`manual` deja x/y tal cual.

Este mÃ³dulo registra `<iswc-component-diagram>`.

## CuÃ¡ndo usarlo

Cuando necesitas describir la arquitectura de un sistema (servicios,
mÃ³dulos, capas, proveedores externos) en estilo UML component, con sus
interfaces provided/required y los paquetes que los agrupan.

## CuÃ¡ndo no usarlo

Si lo que necesitas son clases UML con atributos y mÃ©todos â†’ usa
`<iswc-class-diagram>`. Si solo quieres nodos y conexiones simples sin la
semÃ¡ntica UML â†’ `<iswc-block-diagram>`.

## ImportaciÃ³n

```js
import './component-diagram.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-component-diagram min-gap="64"></iswc-component-diagram>
```

## API

### Atributos y propiedades

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `color` | `"inline"` \| `"viewer"` | Default inline. |
| `min-gap` | number (px) | Distancia mÃ­nima entre cajas al empacar. Default **64**. El consumidor la puede bajar o subir. Piso de `rowGap`, `colGutter`, `sourceGap` y `pkgCorridor`. |

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `payload` | lectura/escritura | `{ componentDiagram: { packages, components, interfaces, edges } }`. |
| `spec` | solo lectura | Spec normalizada. |
| `layout` | solo lectura | GeometrÃ­a lista para pintar. |
| `isViewer` | solo lectura | True cuando el componente vive dentro de un lightbox. |
| `minGap` | lectura/escritura | Refleja `min-gap`. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Payload JSON en un `<script type="application/json">`. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-render` | Emitido al renderizar o redibujar el componente. |
| `iswc-open-viewer` | Emitido al abrir el visor ampliado (cancelable). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-render` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-open-viewer` | sÃ­ | sÃ­ | sÃ­ | sÃ­ |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-component-diagram');
el.addEventListener('iswc-render', (e) => {
  console.log('iswc-render', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `updateComplete()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

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
| `--iswc-sans` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |
| `--iswc-text-soft` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

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
      stereotype?: string,    // p.ej. "component", "BD MSSQL", "FunciÃ³n HTTP"
      package?: string,       // id del package que lo contiene
      hue?: number,
      x: number, y: number, w: number, h: number,
      items?: string[],       // inventario en el cuerpo (p.ej. endpoints HTTP)
      provides?: string[],    // lollipops O; si hay nombre en comÃºn, arista
      requires?: string[],    // sockets C
      connects?: string[]     // ids de componentes destino (alias: to, links)
    }>,
    interfaces?: Array<{
      id: string,
      component: string,      // id del componente al que pertenece
      name?: string,          // nombre UML de la interfaz
      side: "top" | "right" | "bottom" | "left",
      offset: number,         // posiciÃ³n a lo largo del lado
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

- Las aristas son polilÃ­neas ortogonales simples (un quiebre). Suficiente
  para diagramas en cuadrÃ­cula; no hay A*.
- `items` / `endpoints` se pintan como burbujas apiladas; el verbo HTTP
  (`GET`/`POST`/â€¦) es un chip de color estilo Swagger. El alto de la caja
  se ajusta al contenido (`fit-h`).
- Las aristas sintetizadas se reparteen por los **cuatro lados** (tope 2
  conectores por lateral) para no atascar un solo pasillo.
- Las etiquetas de arista son actores rectangulares (`placeEdgeActors`): no
  se pisan entre sÃ­ ni a las cajas. El PNG usa `labelX`/`labelW` del layout.
- Sin `interfaces` en el payload, cada `edge`/`link` componenteâ†’componente
  sintetiza socket `C` en el origen y lollipop `O` en el destino.
  Tras sintetizar `-(O-`, `enforceAssemblyEntityMargins` aleja las cajas
  (â‰¥ `2Â·stem + 2Â·R + gap + 16`) para que O/C no se peguen al borde.
- `dependency` sin lollipops se dibuja discontinua con punta polÃ­gono
  (PNG-safe, no `<marker>`). El conector `Oâ€“C` va en lÃ­nea continua.
- El empaque (`pack` / `triptych`) reorganiza paquetes con hijos (y en
  `triptych`, los `sources`): `min-gap` (attr) o `layout.minGap` es el piso
  de separaciÃ³n (default 72). `rowGap` / `colGutter` / `pkgCorridor` /
  `sourceGap` afinan un eje si son mayores que ese piso. Los componentes
  libres conservan su posiciÃ³n semilla. `manual` no mueve x/y.
- El tÃ­tulo del paquete (`Â«estereotipoÂ» nombre`) es una caja: las aristas
  la rodean. Sin eso el rÃ³tulo queda ilegible.
- El estilo (cajÃ³n translÃºcido, dashed `2 5`, Tahoma, cajas `chipFill`)
  sigue al `<iswc-er-diagram>` para que ER y componentes convivan en la ficha.

## Dependencias y componentes relacionados

- [`./component-spec.js`](./component-spec.js)
- [`./sequence-spec.js`](./sequence-spec.js) â€” temas claro/oscuro
- [`../_shared/diagram-element-base.js`](../_shared/diagram-element-base.js)
- [`./diagram-kinds.js`](./diagram-kinds.js)

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. `aria-label` se
autogenera desde `title` o cae a "Diagrama de componentes".

## Ejemplo avanzado

Ver el preview de la galerÃ­a, que trae paquetes, estereotipos e interfaces
provided/required:
[`./component-diagram.json`](./component-diagram.json).

## Errores comunes

- Declarar `edges` que referencien componentes/interfaces inexistentes.
  El spec las descarta silenciosamente (es trazable contando nodos).
- Olvidar `x`/`y` en un nodo: cae a `(0, 0)` y se solapa con el origen.
- Usar este componente para clases UML: para eso es `<iswc-class-diagram>`.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./component-diagram.ts)
- [CSS](./component-diagram.css)
- [Spec y layout](./component-spec.js)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./component-diagram.json)

## App API

Visor: `demos/diagramas/app/view.html?kind=component&json=<base64url>`.
Editor: `demos/diagramas/app/edit.html?kind=component&json=<base64url>`.

`json` es el documento completo en base64url. Editar no reescribe ese parÃ¡metro: Compartir arma un enlace nuevo con el JSON resultante.
