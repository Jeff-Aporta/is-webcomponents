# Lab · iss-ayudascpia-der

**Inicio:** 2026-10-06
**Fuente:** `PatyIA/_experimental/ISS-AyudasCPIA/docs-experimental/gen/diagrams/iswc/html/der.html` (cfg → `payload.json`)
**Destino:** `ISS-AyudasCPIA/docs/010-General/999-Adjuntos/010-Diagramas/der.svg`
**Kit:** `<iswc-er-diagram theme="insoft">`

## Cómo regenerar

```bash
cd Personal/apps/iswc-root
deno run -A --no-check labs/iss-ayudascpia-der/audit.mjs      # reglas + métricas, sin navegador
deno run -A --no-check scripts/_tmp/_rebuild-component-diagram.mjs
deno run -A --no-check labs/iss-ayudascpia-der/render.mjs     # out/der.svg + out/der.png
```

## Mismo sistema que el diagrama de componentes

El DER usa `component-router.ts` igual que componentes; solo cambia el glifo
del extremo (pata de gallo en vez de `-(O-`):

- `planPorts`: puertos repartidos por el **perímetro** de cada entidad (cara
  por costo, capacidad por cara, orden angular, paso `lanePitch`); títulos de
  cajón tapan la cara de abajo; auto-lazos entre caras adyacentes.
- `routeEdges`: grilla 20 px, nodos sobre entidades/títulos inexistentes,
  stub recto ≥ 32 px para la marca, costos aditivos, negociación, atajos que
  no empeoran cruces ni recorrido pegado a bordes, `validateRoute`.

## Distribución (`er-spec.ts`)

- Cajones en **filas** (permutaciones × cortes): compacto + ratio + relaciones
  cortas; filas centradas y cajones centrados en su fila.
- Corredor entre cajones = 2 × 40 (aire de borde) + 2 carriles (128 px).
- Aire bajo el título del cajón para stub + holgura.
- Lienzo ajustado a cajones + entidades + rieles con margen uniforme (32 px);
  título centrado. Leyenda omitida cuando los grupos ya son cajones con título
  (antes se pintaba fuera del viewBox y reservaba ~1000 px vacíos).

## Agrupadores y paleta (referencia InSoft / Visual Paradigm)

- Dominios raíz: **PatyIA** y **ClientesIS** (`#FFFFBA`; ClientesIS `external`).
- Subdominios: Operativa, Config y SEG `#7ACFF4`. Anidado sin paleta propia alterna con su padre (turquesa ↔ azul): el cajón de tablas sin relaciones en `#00C3C4`.
- Otro dominio con < 3 tablas (Terceros): `neutral` gris.
- Tablas sin relaciones: cajón anidado automático dentro de su grupo, sin título; lo marca el icono `mdi:link-variant-off`.
- Relaciones con trazo continuo (theme `insoft`: `edge.dasharray` vacío).
- Payload de grupo: `parent`, `external: true`, `palette: "<clave theme.cluster.palettes>" | "#RRGGBB"`.
- Títulos sin contadores ni sufijos de dominio (el padre ya lo dice).

## Pendiente

- Etiquetas de relación ("1 a N") ocultas por el theme `insoft` (`edge.hideLabels: true`); decidir si se muestran.
- La distribución interna de cada cajón sigue siendo el layout por capas + rejilla de sueltas.
