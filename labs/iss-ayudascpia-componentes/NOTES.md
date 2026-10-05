# Lab · iss-ayudascpia-componentes

**Inicio:** 2026-10-05  
**Proyecto destino:** `PatyIA/_experimental/ISS-AyudasCPIA` (docs `999-Adjuntos/010-Diagramas`)  
**Kit:** `<iswc-component-diagram theme="insoft">`

## Objetivo

Diagrama de componentes de servidores (API + apps ISW + DB + externos) con el
mismo theme InSoft que el DER (`themes/insoft.json`: Poppins, naranja entidad,
cajones de capa, borde negro).

## Fases

| Fase | Artefacto | Estado |
| --- | --- | --- |
| 1 | Recrear layout de la imagen histórica (MSSQL / 8 HTTP fn) | `payload-v1-legacy.json` |
| 2 | Actualizar a PG + endpoints actuales + ISW + OpenAI + DSCLIENTES + R2 | `payload.json` |
| 3 | Export SVG (`deno task` / `render.mjs`) → copiar a ISS docs | `out/*.svg` listos · publish ISS pendiente |

## Observaciones

- Lab **persiste en el repo**; no se documenta en demos/galería.
- El render usa el CDN **local** (`dist/cdn`) para validar ajustes del kit
  antes de publicar. Mismo patrón que `ISS…/docs-experimental/gen/tools/render-iswc.mjs`.
- Theme InSoft en component-diagram: attr `theme="insoft"` (añadido 2026-10-05).
- Margen `-(O-`: `enforceAssemblyEntityMargins` (69 px) ya en component-spec.
- SVG regenerados 2026-10-05: `out/v1-legacy.svg`, `out/componentes.svg`.

## Ajustes de kit tocados en este lab

1. `component-diagram.ts` — soporte `theme` / paletas de paquete.
2. `themes/insoft.json` — paletas `api|db|openai|ds|r2|apps|azure`.
3. `theme.ts` — `resolveErTheme` también lee `componentDiagram.theme`.

## Cómo regenerar

```bash
cd Personal/apps/is-webcomponents
deno run -A --no-check scripts/_tmp/_rebuild-component-diagram.mjs
deno run -A --no-check labs/iss-ayudascpia-componentes/render.mjs
# preview: deno task dev → /labs/iss-ayudascpia-componentes/preview.html
```

## Salidas

- `out/v1-legacy.svg` — fidelidad a la imagen original
- `out/componentes.svg` — estado actual (canónico del lab)

## Siguiente (fuera de este lab)

Copiar `out/componentes.svg` a  
`PatyIA/_experimental/ISS-AyudasCPIA/docs/010-General/999-Adjuntos/010-Diagramas/`  
cuando se cierre el diseño (publish-iswc-svg o a mano).
