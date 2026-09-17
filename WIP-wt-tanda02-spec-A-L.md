# WIP-WT-0021 — tanda02-spec-A-L

**WT-ID**: 0021
**Nivel**: 2 (hijo de WT-ROOT, hermano de WT-0022)
**Padre**: WT-ROOT (`wt-root-types-strong-2026`)
**Hermanos activos**: WT-0022
**Hijos (si los tiene)**: ninguno
**Worktree**: `C:\ContaPyme\Personal\apps\WT\is-webcomponents-wt-tanda02-spec-A-L`
**Rama**: `wt/tanda02-spec-A-L`
**Estado**: en-progreso
**Tarea**: Tipar agresivamente los spec files de diagramas A-L + crear demos + tests + stagehand tests

## Plan

1. Tipar `src/components/diagrams/sequence-spec.ts` (83 errores → 0)
2. Tipar `src/components/diagrams/swimlane-spec.ts` (77 errores → 0)
3. Tipar `src/components/diagrams/flowchart-spec.ts` (60 errores → 0)
4. Tipar `src/components/diagrams/sankey-spec.ts` (51 errores → 0)
5. Tipar `src/components/diagrams/timeline-spec.ts` (47 errores → 0)
6. Tipar `src/components/diagrams/use-case-spec.ts` (46 errores → 0)
7. Tipar `src/components/diagrams/state-spec.ts` (45 errores → 0)

Total: 409 errores objetivo → 0

## Plan paralelo — Demos + Tests

Por CADA diagrama del scope (sequence, swimlane, flowchart, sankey, timeline, use-case, state):

1. Demo HTML en `demos/diagramas/<nombre>/<nombre>.html`
   - Carga `dist/cdn/diagrams/<nombre>.min.js`
   - Tiene al menos 1 caso representativo del diagrama
   - Visualmente decente (no necesita CSS perfecto)
2. Test básico en `demos/diagramas/<nombre>/_testing/<nombre>.test.mjs`
   - Smoke: el componente renderiza sin errores
   - Snapshot del SVG output
   - Round-trip JSON si aplica
   - Edge cases: payload vacío, malformed
3. Stagehand test en `demos/diagramas/<nombre>/_testing/<nombre>.stagehand.test.mjs`
   - Renderiza el HTML en Chromium
   - Verifica nodos/aristas/labels esperados
   - Verifica a11y básica cuando aplique
   - Verifica prefers-reduced-motion si hay animación

## Archivos lockeados

| Archivo | Lock desde |
|---|---|
| `src/components/_shared/svg-chart-engine.ts` | T1 (permanente, no tocar) |
| `src/components/_shared/diagram-element-base.ts` | T1 (permanente, no tocar) |
| `src/components/diagrams/diagram-types.ts` | baseline (read-only) |

## Mensajes con hermanas

(Ninguno aún)

## Gate status

- npm run typecheck: pendiente
- strict audit (en WT-0021): pendiente
- Playwright 19/19 (en WT-0021): pendiente
- Demos + tests nuevos: pendiente

## Cómo reporta el sub-agente

Al cerrar, deja en este WIP:
- SHAs de commits (formato: `feat(<nombre>): tipo X → 0 errores`)
- Resumen de archivos tocados
- Conteo de errores antes/después (debe ser -N donde N = errores objetivo)
- Resultados de gates
- Lista de demos + tests creados