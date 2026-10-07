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
- Ruteo: `component-router` con paquetes y títulos como obstáculos. Para clases el costo de borde está relajado (`pkgBorderClearance: 16`, `pkgBorderNearFactor: 2`, `pkgCrossFactor: 1.2`): con los valores de componentes el pasillo interior de 40 px era caro y las aristas rodeaban el paquete por fuera.
- Orden de franjas: ancestros primero (stack, base) y descendientes después, así la herencia apunta hacia arriba.

## Herencia en bus

Un padre con 3 o más hijos en otra franja recibe un **conjunto de generalización**: cada hijo sube a una barra común en el corredor entre franjas y un solo tronco llega al único triángulo. El hijo con el camino libre sale por arriba; uno con otra clase o un rótulo encima sale por el lateral hacia el primer pasillo libre **dentro de su paquete** (≥ 28 px del borde). Dos llegadas a la misma x se corren un carril.

## Estilo (`layout.boxStyle: 'card'`, default en modo paquetes)

- Tarjeta blanca con sombra y borde del acento; cabecera llena del acento con «estereotipo» y nombre.
- Acento: `class.color` > `package.accent` > derivado de `package.palette` (mismo tono, más saturado y oscuro).
- Miembros en monoespaciada con glifo de visibilidad: `+` verde, `-` rojo, `#` ámbar, `~` azul.
- Aristas del color de la clase que las emite; herencia con triángulo hueco blanco.

## Decisiones de contenido

- `TObject` no se dibuja: los diez models heredan de él y diez flechas largas tapaban todo. Lo dice el título del paquete («models · extienden TObject (ispgen)»).
- Los controllers SDK (`client`) quedan fuera: este diagrama es del servidor; el SDK está en el diagrama de capas.
- Cada controller con tabla lleva `- nTbl = patyia_*` y una dependencia a su model.
