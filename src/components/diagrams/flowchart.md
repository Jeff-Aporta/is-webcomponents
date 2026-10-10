---
tag: iswc-flowchart
tags:
  - iswc-flowchart
category: diagrams
status: public
source: ./flowchart.ts
style: ./flowchart.css
preview: ./flowchart.json
---
# `<iswc-flowchart>`

## Propósito

Diagrama de flujo en SVG, sin Mermaid. Tú declaras nodos y aristas; el
componente decide las capas, reduce los cruces y rutea las flechas
rodeando las cajas.

Este módulo registra `<iswc-flowchart>`.

## Cuándo usarlo

Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos.

## Cuándo no usarlo

No inventar schemas ni usar specs/layout como custom elements.

## Importación

```js
import './flowchart.js';
```

## Ejemplo mínimo

```html
<iswc-flowchart open-on-click animation="flow">
  <script type="application/json">
    { "flowchart": { "direction": "TB", "nodes": […], "edges": […] } }
  </script>
</iswc-flowchart>
```

`animation="flow"` dibuja una arista dashed brand (con transparencia) detrás de cada arista continua; los dash se desplazan en el sentido del flujo. Ausente = sin animación. Tokens futuros se suman con espacios (`animation="flow …"`).

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `color` | `inline` \| `viewer` | Modo visor vs embebido. |
| `mode` | `read` \| `edit` | Edición de layout (drag). |
| `open-on-click` | boolean | Clic abre `<iswc-diagram-lightbox>`. |
| `animation` | tokens (`flow`, …) | Efectos opcionales (espacio-separados). Default: off. |
| `persist` / `storage-key` | string | Persistencia de overrides en edit. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `animation` | lectura/escritura | Tokens (`flow`, …). Vacío = off. |
| `mode` | lectura/escritura | Declarada por clase. |
| `overrides` | lectura/escritura | Declarada por clase. |
| `isViewer` | solo lectura | Declarada por clase. |
| `payload` | lectura/escritura | Declarada por clase. |
| `spec` | solo lectura | Declarada por clase. |
| `layout` | solo lectura | Declarada por clase. |
| `turtle` | solo lectura | Declarada por clase. |
| `hiddenGroups` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |

### Eventos


| Evento | Descripción |
| --- | --- |
| `iswc-turtle-state` | Emitido al actualizarse el estado del módulo turtle (resize, datos, etc.). |
| `iswc-render` | Emitido al renderizar o redibujar el componente. |
| `iswc-toggle-group` | Evento personalizado del componente (toggle group). |
| `iswc-open-viewer` | Emitido al abrir el visor ampliado (cancelable). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-turtle-state` | sí | sí | sí | no |
| `iswc-render` | sí | sí | sí | no |
| `iswc-toggle-group` | sí | sí | sí | sí |
| `iswc-open-viewer` | sí | sí | sí | sí |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-flowchart');
el.addEventListener('iswc-turtle-state', (e) => {
  console.log('iswc-turtle-state', e.detail);
});
```

</details>

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

> <iswc-flowchart> — diagrama de flujo en SVG, sin Mermaid.
> Configuración por JSON, igual que <iswc-sequence-diagram>:
>   <iswc-flowchart>
>     <script type="application/json">
>       { "flowchart": { "direction": "TB", "nodes": [...], "edges": [...] } }
>     </script>
>   </iswc-flowchart>
> Atributos: color (inline | viewer), open-on-click
> Propiedades: payload, spec, layout, turtle, hiddenGroups
> Eventos: iswc-render, iswc-turtle-state, iswc-open-viewer, iswc-toggle-group

## Estilo insoft (actividad)

`diagram-style="insoft"` carga el tema `themes/insoft-flow.json` (`kind: "flowchart"`) y pinta un diagrama de actividad estilo Visual Paradigm:

- Acciones: rectángulo de ángulos rectos, relleno `primary` de la paleta InSoft (`#7ACFF4`), borde fino `slate`, texto centrado `ink`.
- `shape: "start"`: círculo relleno. `shape: "end"`: anillo con punto (bullseye). Funcionan también en el estilo clásico.
- Decisión (`shape: "diamond"`): el texto (hasta 180 px por línea) se mide en un rect inscrito en el rombo. El rombo nunca queda aplanado: su alto es al menos la mitad de su ancho (vértices laterales de unos 53°).
- Un tono por símbolo (`flow.hueRotate` del tema): cada acción y decisión rota el tono del relleno base en OKLCH por el ángulo áureo, con la misma luminosidad y croma.
- `shape: "bar"`: barra de sincronización (bifurcación / unión de flujos paralelos). Cruza el flujo: horizontal si baja, vertical si avanza a la derecha; cada rama sale o llega a la altura de su nodo.
- Layout TB con columna principal recta; las ramas salen por el vértice lateral del rombo y bajan a la cara superior del destino; flechas finas de punta abierta; etiquetas (`sí`/`no`) junto al arranque de la arista, sin taparla.
- Los colores del bloque `flow` del tema son nombres de token (`cluster.palettes`, `fills`, `lines`) o colores literales. Oscuro: `primary` = `#3A8FB5` con texto `#0B1220`.
- Sin `diagram-style` el flowchart se ve como siempre.

## Carriles de contexto (swimlanes)

Con `lanes`, el estilo insoft dibuja carriles: la entidad o el contexto donde ocurre cada paso (Cliente, Turno, PostgreSQL…). Cada nodo nombra el suyo con `lane`; uno sin `lane` hereda el de su antecesor. Sin `lanes` el diagrama es un flujo simple.

```json
{
  "lanes": [{ "id": "C", "label": "Cliente" }, { "id": "T", "label": "Turno (ISS)" }],
  "laneDirection": "vertical",
  "nodes": [
    { "id": "ini", "shape": "start", "lane": "C" },
    { "id": "pide", "label": "POST /conversacion", "lane": "T" },
    { "id": "fin", "shape": "end", "lane": "C" }
  ],
  "edges": [{ "from": "ini", "to": "pide" }, { "from": "pide", "to": "fin" }]
}
```

- `laneDirection`: `"vertical"` (por defecto: carriles en columnas y el flujo baja) u `"horizontal"` (carriles en filas y el flujo avanza a la derecha). Con carriles, el sentido del flujo lo fijan ellos (`direction` no aplica).
- Cada carril mide lo que piden sus nodos. Los pasos van en el orden del recorrido y cada nodo queda centrado en su carril. Las aristas entre carriles son rectas, L o Z ortogonales.
- Se combinan con todos los nodos: acciones, decisiones, barras, `nested`, `tableder` y `component`.
- Pintado: separadores continuos celestes entre carriles (`flow.laneLine`) y el nombre de cada contexto en negrita (arriba si son verticales, a la izquierda si son horizontales). Los grupos de contexto sí van con borde punteado.
- **Aristas punteadas = uso** (`kind: "dashed"`: «uses», `SELECT`, `INSERT`, `UPDATE`…): relacionan, no ordenan el flujo. Lo que solo se usa (una tabla, un POJO) va a la altura de su primer usuario. Los usos los rutea en lote el router compartido de clases y componentes (`routeEdges`): salen por el costado que mira al destino (en el rombo, por su vértice), las cajas, insignias, títulos y textos son muros, y el flujo ya trazado cuenta como riel fijo (`world.fixedRails`). Los que llegan al mismo costado de una entidad comparten **una sola punta** en abanico: cada uno corre por su vía, paralela a 4 px de la anterior, y se reincorpora escalonado justo antes de la punta.
- **Giros**: cerca de la llegada cuestan más que lejos (radio de proximidad de 4U); cerca de la partida, la mitad.
- **Vuelta al origen**: una arista hacia un paso anterior (la respuesta que regresa al componente que inició el flujo) baja por debajo de todo, corre por fuera y entra por el costado del destino. Así un mismo componente puede ser emisión y recepción. Desde un fin sale siempre por abajo: sus costados son para las ramas que terminan.
- **Numeración**: `steps: "auto"` numera TODOS los elementos del diagrama (componentes, clases, tablas, decisiones, acciones) del 1 al N sin saltos, en orden de lectura (por altura del flujo y, en la misma altura, de izquierda a derecha). Inicio, fin y barras no cuentan. Cada elemento lleva una insignia (número + ícono) arriba a la izquierda; en el rombo, sobre su lado superior izquierdo. Su fondo es el tono de su entidad oscurecido a L 0,42 en OKLCH (`flow.pillTone: "entity"`; un color fijo la cambia).
- **Grupos de contexto**: si un carril mezcla flujo con clases, tablas o componentes, esos elementos se encierran en un recuadro con título («Clases», «Tablas», «Componentes») y fondo suave. Con `context: "Título"` en los nodos se arma un grupo propio. Un carril que solo tiene tablas no lleva recuadro: el carril ya es el contexto.
- **Paralelismo asíncrono**: la barra negra (`shape: "bar"`) bifurca el flujo; cada rama sale de su propio punto de la barra. Una rama en segundo plano termina en su propio fin.
- **Comentarios**: `{ "shape": "comment", "about": "<id>", "label": "…" }` dibuja un globo de diálogo (esquinas redondeadas, triángulo que señala al nodo comentado y comillas) pegado a su nodo (la punta del triángulo lo toca), del lado por donde no salen aristas; si no cabe, del otro. No se numera ni entra al flujo, y su nodo sigue centrado en la columna. Con `x`/`y` fijados a mano (overrides) va donde se le diga. Es el símbolo para notas: no se usan aristas de «uses» para comentar.
- **Bucles** (arista punteada hacia un paso anterior del mismo carril): suben por un pasillo pegado a los nodos, con la etiqueta en vertical.
- **Texto de las acciones**: alineado a la izquierda, en rectángulos de ángulos rectos y de ancho homogéneo (el de la más ancha).
- **Paso e ícono**: `step` (número de la secuencia) y/o `icon` (`"mdi:…"`) van en la insignia. Sin `icon`, cada tipo trae uno por defecto.
- **Etiquetas de aristas**: son entidades. Nunca se montan entre sí, ni sobre nodos, ni bajo rieles; se prefieren horizontales y, si no caben, se abre espacio. Una arista puede llevar `icon` (va a la izquierda del texto); los verbos SQL (`SELECT`, `INSERT`, `UPDATE`, `UPSERT`, `DELETE`…) llevan uno de base de datos por defecto.
- **Movimiento** (`flow.dashFlow`, activo en insoft): las punteadas avanzan hacia su destino; sobre las continuas corre una segunda línea de puntos (3 px más gruesa, uno cada 100 px). Es animación SVG nativa (viaja con el SVG exportado) y se apaga con `prefers-reduced-motion`.

## Nodos especiales (`kind`)

Contrato común en `_shared/diagram-embed.schemas.ts` (reutilizable por otros diagramas). Un nodo puede declarar:

| `kind` | Qué dibuja | Campos |
| --- | --- | --- |
| `nested` | Recuadro con borde y DENTRO otro diagrama del kit, escalado entero tipo `object-fit: contain` (líneas incluidas). Sin rótulo propio: el título lo trae el diagrama; `label` solo se ve si falta la captura. | `diagram: { tag, payload, script?, attrs? }` y/o `src` (JSON editable; gana sobre `diagram`, que queda de respaldo), `maxW` / `maxH` (por defecto 200 px por lado), `bg` (insoft: blanco; oscuro: el lienzo). |
| `tableder` | Una tabla del DER (`iswc-er-diagram`) a tamaño natural. | `table: { name, attributes: [{ name, type, key? }] }` |
| `component` | Una caja del diagrama de componentes (`iswc-component-diagram`) a tamaño natural. | `component: { name, stereotype?, items? }` |
| `class` | Una clase del diagrama de clases (`iswc-class-diagram`) a tamaño natural: controladores, POJOs. | `class: { name, stereotype?, attributes?, methods? }` |

```json
{
  "nodes": [
    { "id": "inicio", "label": "Inicio", "shape": "start" },
    { "id": "turno", "label": "Turno de conversación", "kind": "nested",
      "src": "diagramas/conversacion-turno.json" },
    { "id": "sub", "label": "Parche de datos", "kind": "nested",
      "diagram": { "tag": "iswc-flowchart", "attrs": { "diagram-style": "insoft" }, "payload": { "nodes": [], "edges": [] } } },
    { "id": "tabla", "label": "patyia_conversaciones", "kind": "tableder",
      "table": { "name": "patyia_conversaciones", "attributes": [{ "name": "iconversacion", "type": "bigint", "key": "PK" }] } },
    { "id": "api", "label": "API", "kind": "component",
      "component": { "name": "conversacion", "stereotype": "Chat", "items": ["POST /conversacion"] } },
    { "id": "fin", "label": "Fin", "shape": "end" }
  ]
}
```

- `src` es relativo a la página (`document.baseURI`) y acepta el formato editable del ISS (`tag`, `script`, `attrs`, `payload`) o un payload suelto.
- `script` (opcional) es relativo a la raíz del CDN (`diagrams/sequence-diagram.min.js`); sin él se deduce del tag junto al bundle del flowchart.
- `diagram-style` se hereda del diagrama padre si el anidado no trae el suyo.
- El diagrama se monta fuera de pantalla, se espera su render (`prepareRender`, incluido en `updateComplete`) y su SVG se copia vectorial (ids prefijados, estilos acotados): el SVG exportado lo incluye. Se escala por `viewBox` y se le quita `vector-effect: non-scaling-stroke`, así sus líneas y guiones se reducen con él. Sin bundle o sin `src` alcanzable se pinta un marco punteado con el rótulo.
- `iswc-sequence-diagram`: el subproceso en la llegada de un mensaje está planificado con este mismo contrato (ver `labs/iss-ayudascpia-flujos/NOTES.md`), aún no implementado.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`./flowchart-spec.js`](./flowchart-spec.js)
- [`./sequence-spec.js`](./sequence-spec.js)
- [`./sequence-turtle.js`](./sequence-turtle.js)
- [`../_shared/tk-hue.js`](../_shared/tk-hue.js)
- [`../_shared/tk-inline-md.js`](../_shared/tk-inline-md.js)
- [`../_shared/tk-icon-inline.js`](../_shared/tk-icon-inline.js)
- [`../_shared/icon-loader.js`](../_shared/icon-loader.js)
- [`./diagram-kinds.js`](./diagram-kinds.js)
- [`../_shared/diagram-edit.js`](../_shared/diagram-edit.js)

Tags del módulo: `<iswc-flowchart>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`.

## Ejemplo avanzado

```html
<iswc-flowchart></iswc-flowchart>
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

- [JavaScript](./flowchart.ts)
- [CSS](./flowchart.css)
- [Índice de categoría](../../specs/componentes.md)
- [Preview](./flowchart.json)

## App API

Visor: `demos/diagramas/app/view.html?kind=flowchart&json=<base64url>`.
Editor: `demos/diagramas/app/edit.html?kind=flowchart&json=<base64url>`.

`json` es el documento completo en base64url. Editar no reescribe ese parámetro: Compartir arma un enlace nuevo con el JSON resultante.
