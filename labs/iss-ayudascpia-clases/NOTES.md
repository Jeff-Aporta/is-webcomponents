# Lab · iss-ayudascpia-clases

**Inicio:** 2026-10-07
**Fuente:** `PatyIA/_experimental/ISS-AyudasCPIA/src/sources` (controllers `server` + `010 Objetos/models`)
**Destino:** `ISS-AyudasCPIA/docs/010-General/999-Adjuntos/010-Diagramas/clases.svg` (editable `docs-experimental/diagramas/clases.json`)
**Kit:** `<iswc-class-diagram>` en modo paquetes

## Cómo regenerar

```bash
cd Personal/apps/iswc-root
deno run -A --no-check scripts/build.mjs                    # si cambió el kit
deno run -A --no-check labs/iss-ayudascpia-clases/render.mjs  # out/clases.svg + out/clases.png
```

Chromium a veces no arranca en Windows (`Controlador no válido`): reintentar.

## Modo paquetes (`classDiagram.packages`)

- `packages: [{ id, name, stereotype?, parent?, palette?, accent?, cols? }]` y cada clase con `package`.
- Empaque: el mismo `packDiagram` en modo `layers` que el diagrama de componentes. Las franjas raíz se apilan en el orden del payload; los subpaquetes van en rejilla de `cols` (del padre) o `layout.nestedCols`. En una rejilla de una sola fila cada subpaquete conserva su ancho; con varias filas se igualan para alinear columnas.
- Ruteo: el mismo `component-router` y **las mismas perillas que el diagrama de componentes**: `step`/`clearance` (`GRID_STEP`, `EDGE_CLEARANCE`) y `lanePitch`, `laneNearFactor`, `pkgBorderClearance`, `pkgBorderNearFactor`, `pkgCrossFactor` salen de `resolvePackingGaps` con los mismos nombres de `layout` del payload de componentes. El payload usa los valores del editable de componentes del ISS (28 · 48 · 40 · 6 · 2). Solo cambia el `stub` (largo del remate).
- Colores de arista: la regla W60 del diagrama de componentes (`assignEmitterReceiverPalette`: color del emisor, B −5 %), calculada sobre copias para no tocar rellenos.
- Orden de franjas: ancestros primero (stack, base) y descendientes después, así la herencia apunta hacia arriba.

## Herencia en bus

Un padre con 3 o más hijos en otra franja recibe un **conjunto de generalización**: cada hijo sube a una barra común en el corredor entre franjas y un solo tronco llega al único triángulo. La barra es un riel compartido por aristas de la misma clave (`padre::inheritance`) a menos de 150 px de la punta: es exactamente el radio de incentivo del router, donde las `->` del mismo destino deben converger. Barra y tronco son muros con medio carril de aire, así ninguna otra arista corre encima ni pegada. Se probó un bus por paquete (cuatro troncos) y quedó peor: cuatro triángulos juntos en la cara del padre.

## Campo de factores del router (2026-10-07)

`component-router.ts` ya no suma costos: cada nodo de la grilla vale 1 y cada fuente emite un brillo con radio y caída lineal; el costo del paso es largo × producto de brillos. Desincentivo (> 1): entidades (2·clearance alrededor del hitbox), bordes de agrupador, anidación, rieles ajenos (encima ×120; a < `lanePitch` hasta ×6 decreciente), choque de frente, ir por detrás, cruces (×8), historial. Incentivo (< 1): puntas `->` de la misma clave con radio 150 px (en la punta ~0, a 150 px 1); dentro de ese radio los rieles de la misma clave no son ajenos y una arista puede unirse a otra si le sale más barato que su puerto propio. Lo único aditivo es el giro.

## Puertos del perímetro y config de costos (2026-10-07)

- Cada clase ofrece puertos candidatos en sus cuatro lados a 1U (`grid.step`, 20 px), nunca en las esquinas y centrados (medio paso sobrante a cada extremo). Cada candidato proyecta su línea a la grilla, así el riel sale perpendicular y los vértices quedan a 90°.
- Para cada relación el router prueba todas las parejas origen × destino (búsqueda multi-origen y multi-destino sobre el campo de factores) y se queda con la más barata; un puerto tomado por una arista ajena no se reutiliza. Cada riel guarda su costo (`RouteResult.costs`), y los remates se pintan en el puerto que eligió el router (`fromPorts`/`toPorts`).
- Los valores del campo (radios, brillos, límites) salen de `routing-costs.ts` (publicado como `dist/cdn/diagrams/routing-costs.json`). Cualquier diagrama los sobreescribe desde su payload: `layout.routing = { share: { radius: 200 }, rail: { near: 10 } }`.
- Pendiente: el `-(O-` de componentes todavía fija la posición del conector con `planPorts`/`wire` (el glifo y su hitbox dependen de ella). Evaluar todas sus posiciones exige recolocar el glifo tras el ruteo.

## Estilo `vp` (Visual Paradigm / InSoft) — el del payload

Referencia: los diagramas de componentes de los servidores hechos en Visual Paradigm.

- Paquetes: carpeta con pestaña corta a la izquierda, borde negro de 1 px, relleno de paleta InSoft (`#FFFFC1` contenedor, `#7ACFF4` subpaquete, `#81FF81` externo) y rótulo centrado. Si el rótulo centrado cae sobre la vertical de una clase directa, se corre junto a la pestaña para no obligar a rodearlo.
- Clases: caja recta con relleno pastel por paquete (`classFill`: `#BCFFBB` controllers, `#EAB6B0` models), borde negro, «estereotipo» y nombre en negrita centrados, compartimentos con línea negra y visibilidad UML (`+ - # ~`) en el texto.
- Remates 10 % más grandes y rellenos del color de la arista (nunca blancos).

## Estilo `card`

Tarjeta blanca con sombra, cabecera del acento y glifos de visibilidad de color. Sigue disponible con `layout.boxStyle: 'card'`.

## Decisiones de contenido

- `TObject` no se dibuja: los diez models heredan de él y diez flechas largas tapaban todo. Lo dice el título del paquete («models · extienden TObject (ispgen)»).
- Los controllers SDK (`client`) quedan fuera: este diagrama es del servidor; el SDK está en el diagrama de capas.
- Cada controller con tabla lleva `- nTbl = patyia_*` y una dependencia a su model.
