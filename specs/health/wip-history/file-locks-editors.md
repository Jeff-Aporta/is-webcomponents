# File locks — is-editors

## Locks permanentes (T1 cerrado)

| Archivo | Locked desde | Notas |
|---|---|---|
| `src/components/diagrams/diagram-types.ts` | baseline | READ-ONLY (lock permanente heredado de types-strong-2026) |
| `src/components/_shared/svg-chart-engine.ts` | baseline | READ-ONLY |
| `src/components/_shared/diagram-element-base.ts` | baseline | READ-ONLY |
| `src/components/diagrams/diagram-edit.ts` | baseline | READ-ONLY (motor de edición compartido) |
| `src/previews/_shell.html` | baseline | READ-ONLY |

## Locks de T1 — WT-0001 (master orchestrator + infra)

| Archivo | WT que lo lockea | Notas |
|---|---|---|
| `src/components/diagrams/er-editor.ts` | WT-0001 | refactor al contrato canónico (§5) |
| `src/components/diagrams/_editor-base.ts` (NUEVO) | WT-0001 | clase base `IsEditorBase<Spec>` para los 16 wrappers |
| `src/components/diagrams/_editor-toolbar.ts` (NUEVO) | WT-0001 | toolbar unificada |
| `src/components/diagrams/_editor-panel.ts` (NUEVO) | WT-0001 | panel lateral |
| `src/components/diagrams/_editor-nesting.ts` (NUEVO) | WT-0001 | modal overlay recursivo |

## Locks de T3 — WT-0012 / WT-0001 (UML editores)

| Archivo | WT | Notas |
|---|---|---|
| `src/components/diagrams/class-editor.ts` (NUEVO) | WT-0012 | extiende `<is-class-diagram>` + base |
| `src/components/diagrams/state-editor.ts` (NUEVO) | WT-0012 | extiende `<is-state-diagram>` + base |

## Locks de T4 — WT-00122 (jerárquicos)

| Archivo | WT | Notas |
|---|---|---|
| `src/components/diagrams/mindmap-editor.ts` (NUEVO) | WT-00122 | árbol estricto, sin ciclos |
| `src/components/diagrams/org-chart-editor.ts` (NUEVO) | WT-00122 | + photo drop |
| `src/components/diagrams/journey-map-editor.ts` (NUEVO) | WT-00122 | |

## Locks de T5 — WT-00121 (otros con nesting)

| Archivo | WT | Notas |
|---|---|---|
| `src/components/diagrams/sankey-editor.ts` (NUEVO) | WT-00121 | |
| `src/components/diagrams/venn-editor.ts` (NUEVO) | WT-00121 | |
| `src/components/diagrams/gantt-editor.ts` (NUEVO) | WT-00121 | + dependsOn[] |
| `src/components/diagrams/quadrant-chart-editor.ts` (NUEVO) | WT-00121 | |
| `src/components/diagrams/use-case-editor.ts` (NUEVO) | WT-00121 | |
| `src/components/diagrams/component-editor.ts` (NUEVO) | WT-00121 | |

## Locks de T6 — WT-0002 (posicionales)

| Archivo | WT | Notas |
|---|---|---|
| `src/components/diagrams/flowchart-editor.ts` (NUEVO) | WT-0021 | NO nesting |
| `src/components/diagrams/sequence-diagram-editor.ts` (NUEVO) | WT-0021 | NO nesting |
| `src/components/diagrams/swimlane-diagram-editor.ts` (NUEVO) | WT-0022 | NO nesting |
| `src/components/diagrams/timeline-editor.ts` (NUEVO) | WT-0022 | NO nesting |

## Locks de T7 — WT-final (demos + tests)

| Archivo | WT | Notas |
|---|---|---|
| `demos/diagramas/<kind>/<kind>-editor.html` (16 NUEVOS) | WT-final | patrón `demos/diagramas/ER/er-editor.html` |
| `demos/diagramas/<kind>/_testing/<kind>-editor.test.mjs` (16 NUEVOS) | WT-final | |
| `demos/diagramas/<kind>/_testing/<kind>-editor.stagehand.test.mjs` (16 NUEVOS) | WT-final | |
| `src/utils/health/exhaustive/diagrams/<kind>-editor.test.ts` (16 NUEVOS) | WT-final | |

## Estrategia — sin nuevos worktrees

Sub-agentes trabajan directamente en WT-ROOT con file partitioning. NO crear nuevos worktrees (320,773 archivos = 15min c/u).
