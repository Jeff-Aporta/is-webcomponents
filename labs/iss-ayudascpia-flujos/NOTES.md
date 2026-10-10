# Lab · iss-ayudascpia-flujos

**Inicio:** 2026-10-09
**Proyecto destino:** `PatyIA/_experimental/ISS-AyudasCPIA` (editables en
`docs-experimental/diagramas/`, publicados en `docs/<módulo>/999-Adjuntos/010-Diagramas/`)
**Kit:** `<iswc-flowchart diagram-style="insoft">`

## Objetivo

Diagramas de flujo / actividad con el estilo InSoft de referencia (actividad a
lo Visual Paradigm) y nodos especiales reutilizables (`kind`).

| Payload | Qué prueba |
| --- | --- |
| `ruta-<slug>` | Las 12 rutas ilustradas (diagramas combinados) de los procesos del ISS, generadas por `rutas-ricas.mjs` con piezas reales del ISS (ver abajo). |
| `secuencia-subproceso` | Secuencia con `nested` en la llegada de un mensaje: self-loop → parche de datos (flujo, `maxW` 200) y POST del portal → turno de conversación (secuencia, tamaño por defecto). |

## Estilo insoft del flowchart

- Tema `themes/insoft-flow.json` (`kind: "flowchart"`), cargado con los otros
  cuatro por `diagram-style="insoft"`. Bloque `flow` con **nombres de token**
  del propio tema: acciones y decisiones `primary` (`#7ACFF4`, el mismo celeste
  de DER/componentes), borde y aristas `slate` (`#334155`), texto `ink`. En
  oscuro, `primary` = `#3A8FB5` con texto `#0B1220` (contraste ≥ 4.5).
- Acciones: rectángulo de ángulos rectos (`flow.radius` 0). Inicio: círculo relleno. Fin:
  anillo + punto (bullseye). Flechas finas con punta abierta.
- **Decisión**: el texto (hasta 180 px por línea, parte en dos antes de
  estirar) se mide en un rect `rw × rh` inscrito en el rombo
  (`rw/W + rh/H ≤ 1`). Si el rombo saldría aplanado (`H/W < 0.5`), se reparte:
  `H = 0.5·W`, `W = rw + rh/0.5` → más alto y angosto, vértices laterales
  ≈ 53° en vez de ~30° (pedido 2026-10-09).
- **Un tono por símbolo** (`flow.hueRotate: true` en `insoft-flow.json`):
  cada acción/decisión rota el tono del celeste base en OKLCH por el ángulo
  áureo (137.5°), con la misma luminosidad y croma; el texto conserva el
  contraste. Hex en el SVG (`_shared/oklch.ts`). Inicio/fin y nodos
  especiales no rotan.
- **Layout** (TB): capas y orden del motor node-link; en x cada nodo sigue a
  su padre. El hijo principal (camino más largo, o el punto de unión de un if
  sin else con desvío corto) sigue la columna; las ramas salen al costado
  libre (derecha, luego izquierda) y nunca encima del corredor de una arista
  larga. Columna principal recta.
- **Ruteo**: ramas de una decisión por el vértice lateral → L a la cara
  superior; recta / Z / L-lateral para el resto, sin tocar cajas ni montarse
  en otra arista (las que llegan al mismo nodo se funden y comparten punta).
  El A* queda de respaldo. Etiquetas (`sí`/`no`) junto al arranque, a un
  costado, con halo del color del lienzo.
- El estilo clásico (sin `diagram-style`) no cambia.

## Carriles de contexto (pedido 2026-10-09)

`lanes: [{ id, label }]`, `laneDirection: "vertical"` (por defecto) u `"horizontal"`, y `lane` en cada
nodo (sin él hereda el del antecesor). Sin `lanes`, flujo simple. Las capas salen del motor; cada
carril mide lo que piden sus nodos; aristas entre carriles con el router insoft (recta / L / Z). A un
rombo se entra siempre por arriba (sus vértices laterales son salidas de rama). Con carriles, la rama
principal de una decisión es la que sigue en su carril o, si ninguna, la del camino más largo. Si
varias ramas comparten el primer tramo, cada etiqueta va junto al codo de su rama. Contrato y
ejemplos en `src/components/diagrams/flowchart.md` § Carriles de contexto.

### Rutas ilustradas del ISS (`rutas-ricas.mjs`, `eps-iss.mjs`)

Una ruta por proceso del ISS (las 8 secuencias y los 4 flujos de `docs-experimental/diagramas`),
compuesta con piezas REALES leídas de `componentes.json`, `clases.json` y `der.json`:

| Pieza | En la ruta |
| --- | --- |
| componente del portal y su URL | abre el flujo y recibe la respuesta (`fin → componente`) |
| clase del controlador y su POJO | grupo «Clases» del carril del controlador, con «uses» |
| tablas del DER (columnas relevantes) | carril PostgreSQL; cada paso las usa con punteada SELECT / INSERT / UPDATE / DELETE |
| OpenAI, DataSnap, PostgreSQL como sistema | su componente; los pasos lo llaman con punteada |
| notas y casos laterales de la secuencia | comentarios en globo junto al paso |
| `par` | barra negra |
| numeración | `steps: "auto"` + ícono por paso (insignia arriba a la izquierda) |

```bash
deno run -A --no-check labs/iss-ayudascpia-flujos/rutas-ricas.mjs --iss   # payloads/ruta-*.json (+ docs-experimental/diagramas del ISS)
deno run -A --no-check labs/iss-ayudascpia-flujos/eps-iss.mjs --iss       # EP sin diagrama: secuencia pura + ruta (12 pares)
deno task build                                                     # render.mjs usa dist/cdn
deno run -A --no-check labs/iss-ayudascpia-flujos/render.mjs        # renderiza todo
```

Pendiente de ruteo: las rutas con muchas ramas de error que vuelven al fin
(`calificacion-mensaje`, `seguridad-conversaciones`, `gate-entregable`) se enredan; la salida es
migrar el ruteo del flowchart al router compartido (puertos de perímetro, anclas `via`, deltas).

## Nodos `start` / `end` en `parches-de-datos`

El editable del ISS no trae inicio ni fin; el payload del lab los añade
(`inicio` → A; X, S y G → `fin`). Para que el ISS publique igual, copiar
`src/utils/health/diagrams/fixtures/parches-de-datos.json` (fixture de pruebas) sobre el editable.

## Nodos especiales (`kind`)

Contrato en `src/components/_shared/diagram-embed.schemas.ts`, documentado en
`src/components/diagrams/flowchart.md` § Nodos especiales.

```json
{ "id": "turno", "label": "Turno de conversación", "kind": "nested",
  "src": "docs-experimental/diagramas/conversacion-turno.json",
  "diagram": { "tag": "iswc-sequence-diagram", "payload": { } },
  "bg": "#FFFFFF" }
```

El diagrama se monta fuera de pantalla con su propio web component, se espera
su render y su SVG se copia (vectorial, ids prefijados, estilos acotados) en
el nodo. Se escala entero (sin `non-scaling-stroke`), a 200 px de lado por
defecto, y sin rótulo propio: el título lo trae el diagrama. Ruta de `src`: relativa a la página (`document.baseURI`); aquí
`../labs/…` porque el render sintético vive en `.iswc-render-tmp/`.

## Secuencia: subproceso en la llegada de un mensaje

Implementado (2026-10-09). El mensaje lleva `nested` con el MISMO contrato del
nodo (`kind` implícito) más `title`:

```json
{ "id": "m3", "from": "P", "to": "S", "label": "POST /conversaciones/{id}/mensajes",
  "nested": { "title": "Turno de conversación", "src": "…/conversacion-turno.json",
              "diagram": { "tag": "iswc-flowchart", "payload": { } },
              "maxW": 200, "maxH": 200, "bg": "#FFFFFF" } }
```

- `sequence-spec.schemas.ts`: `SequenceNestedSpecSchema` = `NodeEmbedSpecSchema` + `title`.
- `sequence-spec.ts`: el recuadro va al costado del self-loop de la lifeline
  destino (derecha; el último actor, izquierda); ese hueco entre lifelines
  crece y la fila siguiente baja. El layout devuelve `nestedBox`,
  `nestedEmbedBox` y `nestedTitleBox` por mensaje.
- `sequence-diagram.ts`: `prepareRender()` captura con `captureNodeEmbed`
  (compartido en `diagram-embed.ts`) y pinta con `embedSvgElement`.
- Guardián: `sequence-vocab.test.ts` («nested en secuencia»).
- Tamaño por defecto del anidado (flujo y secuencia): 200 px por lado
  (`NESTED_DEFAULT_MAX`), calibrado con `secuencia-subproceso`.

## Cómo regenerar

```bash
deno task labs:render --sin-iss                                   # lote completo (regla del kit)
deno run -A --no-check labs/iss-ayudascpia-flujos/render.mjs      # solo este lab, para iterar
```

## Salidas

`out/<slug>.svg` y `out/<slug>.png` (revisión visual).
