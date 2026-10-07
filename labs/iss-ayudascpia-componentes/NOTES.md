# Lab · iss-ayudascpia-componentes

**Inicio:** 2026-10-05  
**Proyecto destino:** `PatyIA/_experimental/ISS-AyudasCPIA` (docs `999-Adjuntos/010-Diagramas`)  
**Kit:** `<iswc-component-diagram theme="insoft">`

## Objetivo

Diagrama de componentes de servidores (API + apps ISW + DB + externos) con el
theme InSoft **de componentes** (no el de ER): Poppins, cajas `#C1BFFF`,
agrupadores `#7ACFF4/#FFFFC1/#BCFFBB/#EAB6B0/#81FF81/#01C000`, O/C `#7ACFF4`.

## Fases

| Fase | Artefacto | Estado |
| --- | --- | --- |
| 1 | Recrear layout de la imagen histórica (MSSQL / 8 HTTP fn) | `payload-v1-legacy.json` |
| 2 | Actualizar a PG + endpoints actuales + ISW + OpenAI + DSCLIENTES + R2 | `payload.json` |
| 3 | Export SVG (`deno task` / `render.mjs`) → copiar a ISS docs | `out/*.svg` listos · publish ISS pendiente |

## Observaciones

- Lab **persiste en el repo**; no se documenta en demos/galería.
- El render usa `src/cdn/tools` (vendor `dist/cdn/tools`) + CDN **local**
  (`dist/cdn`). Playwright se inyecta; el lab solo arma payloads. Mismo
  contrato que puede consumir el ISS desde Deno/vendor.
- Theme InSoft CD: `theme="insoft-cd"` (paleta CD + `invertAssembly`).
- `@Azure` anida API + PG (`packages[].parent`).
- EPs consolidados (`GET|PUT`, …) → una row; fondo transparente, borde blanco α.
- InSoft: `-(`` expone / `-O` consume (`invertAssembly`); un `-(`` por expositor.
- Relleno de la O = `#7ACFF4` (expositor); aristas ortogonales oscuras (`#0F172A`).
- `layout.allowDiagonal: false` — solo ortogonales.
- Sin O/C huérfanos: solo interfaces cableadas.
- Themes: `themes/insoft.json` (ER genérico) · `themes/insoft-cd.json` (componentes).
- SVG regenerados 2026-10-05: `out/v1-legacy.svg`, `out/componentes.svg`.

## Ajustes de kit tocados en este lab

1. `component-diagram.ts` — theme, paletas, títulos sin bg, Poppins, O `#7ACFF4`.
2. `component-spec.ts` — `allowDiagonal`, consolidate HTTP, prune ifaces, noTab rect.
3. `component-pack.ts` — nesting parent/child; AABB en anidados (sin outline folder).
4. `themes/insoft.json` — `component.*` + paletas api/db/openai/ds/r2/apps/azure.

## Cómo regenerar

```bash
cd Personal/apps/is-webcomponents
deno run -A --no-check scripts/_tmp/_rebuild-component-diagram.mjs
deno run -A --no-check labs/iss-ayudascpia-componentes/render.mjs
# preview: deno task dev → /labs/iss-ayudascpia-componentes/preview.html
```

Vendor / Deno (otro repo): copiar `dist/cdn/tools/*.ts` e inyectar Playwright:

```js
import { createRequire } from 'node:module';
import { renderDiagram, writeDiagramOutputs } from './vendor/iswc-tools/index.ts';
const { chromium } = createRequire(import.meta.url)('playwright');
const r = await renderDiagram(
  { scriptUrl: 'diagrams/component-diagram.min.js', payload, attrs: { theme: 'insoft-cd' } },
  { chromium, serveRoot: pathToDistCdnParentOrKitRoot, timeoutMs: 900_000 },
);
await writeDiagramOutputs(r, 'out/componentes.svg');
```

## Salidas

- `out/v1-legacy.svg` — fidelidad a la imagen original
- `out/componentes.svg` — estado actual (canónico del lab)

## Siguiente (fuera de este lab)

Copiar `out/componentes.svg` a  
`PatyIA/_experimental/ISS-AyudasCPIA/docs/010-General/999-Adjuntos/010-Diagramas/`  
cuando se cierre el diseño (publish-iswc-svg o a mano).
