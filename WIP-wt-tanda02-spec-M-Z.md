# WIP-WT-0022 — tanda02-spec-M-Z

**WT-ID**: 0022
**Nivel**: 2 (hijo de WT-ROOT, hermano de WT-0021)
**Padre**: WT-ROOT (`wt-root-types-strong-2026`)
**Hermanos activos**: WT-0021
**Hijos (si los tiene)**: ninguno
**Worktree**: `C:\ContaPyme\Personal\apps\WT\is-webcomponents-wt-tanda02-spec-M-Z`
**Rama**: `wt/tanda02-spec-M-Z`
**Estado**: pendiente (esperando WT checkout)
**Tarea**: Tipar agresivamente los spec files de diagramas M-Z + crear demos + tests + stagehand tests

## Plan

1. Tipar `src/components/diagrams/venn-spec.ts` (43 errores → 0)
2. Tipar `src/components/diagrams/gantt-spec.ts` (41 errores → 0)
3. Tipar `src/components/diagrams/block-spec.ts` (40 errores → 0)
4. Tipar `src/components/diagrams/mindmap-spec.ts` (23 errores → 0)
5. Tipar `src/components/diagrams/quadrant-spec.ts` (22 errores → 0)
6. Tipar `src/components/diagrams/journey-spec.ts` (22 errores → 0)
7. Tipar `src/components/diagrams/component-spec.ts` (105 errores → 0)
8. Tipar `src/components/diagrams/component-pack.ts` (154 errores → 0)

Total: 450 errores objetivo → 0

## Plan paralelo — Demos + Tests

Por CADA diagrama del scope (venn, gantt, block, mindmap, quadrant, journey, component, component-pack):

1. Demo HTML en `demos/diagramas/<nombre>/<nombre>.html`
2. Test básico en `demos/diagramas/<nombre>/_testing/<nombre>.test.mjs`
3. Stagehand test en `demos/diagramas/<nombre>/_testing/<nombre>.stagehand.test.mjs`

(Ver WIP-WT-0021 para detalle de lo que cada test debe cubrir)

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
- strict audit (en WT-0022): pendiente
- Playwright 19/19 (en WT-0022): pendiente
- Demos + tests nuevos: pendiente

## Cómo reporta el sub-agente

Al cerrar, deja en este WIP:
- SHAs de commits
- Resumen de archivos tocados
- Conteo de errores antes/después
- Resultados de gates
- Lista de demos + tests creados