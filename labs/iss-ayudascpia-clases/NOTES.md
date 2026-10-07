# Lab · iss-ayudascpia-clases

**Inicio:** 2026-10-07
**Fuente:** `PatyIA/_experimental/ISS-AyudasCPIA/src/sources` (controllers `server` + `010 Objetos/models`)
**Destino:** `ISS-AyudasCPIA/docs/010-General/999-Adjuntos/010-Diagramas/clases.svg` (editable `docs-experimental/diagramas/clases.json`)
**Kit:** `<iswc-class-diagram>` en modo paquetes

## Cómo regenerar

```bash
cd Personal/apps/is-webcomponents
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

Un padre con 3 o más hijos en otra franja recibe **un conjunto de generalización por paquete de hijos** (2026-10-07): los hijos de cada paquete suben a una barra propia, en su propio carril del corredor, y un tronco propio llega a su triángulo en la cara inferior del padre. Una única barra para los 14 controllers era un riel compartido por todas las aristas. El grupo más alejado del padre va en el carril superior y los troncos siguen el orden horizontal de los grupos, así barras y troncos nunca se cruzan. Barra y tronco son muros con medio carril de aire para el router: ninguna otra arista corre encima ni pegada. El hijo con el camino libre sale por arriba; uno con otra clase o un rótulo encima sale por el lateral hacia el primer pasillo libre **dentro de su paquete** (≥ 28 px del borde). Dos llegadas a la misma x se corren un carril.

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
