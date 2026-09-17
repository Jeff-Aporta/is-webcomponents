# File locks — types-strong-2026

## Locks activos (T1 cerrado)

| Archivo | WT que lo lockea | Locked desde | Notas |
|---|---|---|---|
| `src/components/_shared/svg-chart-engine.ts` | WT-0001 (cerrado, lock permanente) | T1 | `roundedBarRect` firma cambiada a `number`; no tocar en T2-T9. Solo lectura. |
| `src/components/_shared/diagram-element-base.ts` | WT-0001 (cerrado, lock permanente) | T1 | Cast HTMLScriptElement añadido; no tocar en T2-T9. Solo lectura. |
| `src/components/diagrams/diagram-types.ts` | (read-only permanente) | baseline | Shape server de tipos compartidos. NO modificar firmas. Solo añadir al final. |

## Locks de T2 (liberados al cerrar)

| Archivo | WT que lo lockeaba | Locked desde | Liberado en |
|---|---|---|---|
| 15 spec files en `diagrams/*-spec.ts` | WT-0021 + WT-0022 | T2 | Cierre T2 |

## Locks de T3 (temporales — vigentes durante T3)

| Archivo | WT que lo lockea | Locked desde | Notas |
|---|---|---|---|
| `src/components/diagrams/sequence-diagram.ts` | WT-0031 | T3 | A-L diagrams batch |
| `src/components/diagrams/state-diagram.ts` | WT-0031 | T3 | |
| `src/components/diagrams/flowchart.ts` | WT-0031 | T3 | |
| `src/components/diagrams/use-case-diagram.ts` | WT-0031 | T3 | |
| `src/components/diagrams/venn-diagram.ts` | WT-0031 | T3 | |
| `src/components/diagrams/gantt.ts` | WT-0031 | T3 | |
| `src/components/diagrams/block-diagram.ts` | WT-0031 | T3 | |
| `src/components/diagrams/journey-map.ts` | WT-0032 | T3 | M-Z diagrams batch |
| `src/components/diagrams/quadrant-chart.ts` | WT-0032 | T3 | |
| `src/components/diagrams/mindmap.ts` | WT-0032 | T3 | |
| `src/components/diagrams/sankey-diagram.ts` | WT-0032 | T3 | |
| `src/components/diagrams/swimlane-diagram.ts` | WT-0032 | T3 | |
| `src/components/diagrams/org-chart.ts` | WT-0032 | T3 | |
| `src/components/diagrams/org-chart.preview.ts` | WT-0032 | T3 | |
| `src/components/diagrams/timeline.ts` | WT-0032 | T3 | |
| `src/components/diagrams/component-diagram.ts` | WT-0032 | T3 | |
| `src/components/diagrams/sequence-diagram.preview.ts` | WT-0032 | T3 | |
| `src/components/diagrams/diagram-kinds.ts` | WT-0032 | T3 | |
| `src/components/diagrams/diagram-lightbox.ts` | WT-0032 | T3 | |
| `src/components/diagrams/diagram-lightbox.preview.ts` | WT-0032 | T3 | |
| `src/components/diagrams/lightbox.ts` | WT-0032 | T3 | |
| `src/components/diagrams/lightbox.preview.ts` | WT-0032 | T3 | |

## Estrategia T3+ — sin nuevos worktrees

**Decisión del capitán**: para T3-T10, los sub-agentes NO crean nuevos worktrees (15 min c/u = 4+ horas solo setup). En su lugar:
- Trabajan directamente en WT-ROOT (`C:\ContaPyme\Personal\apps\WT\is-webcomponents-wt-root-types-strong-2026`).
- File partitioning estricto: cada sub-agente tiene sus archivos lockeados (ver tabla arriba).
- Conflictos improbables porque cada sub-agente toca archivos disjuntos.
- Capitán media si surge conflicto (raro).

## Reglas de lock

- **Lock permanente**: archivo congelado para T2-T9. Solo se desbloquea en T10 si hay necesidad crítica.
- **Lock temporal (T3+)**: archivo bloqueado por una hoja activa; se libera al cerrar la hoja.
- Capitán media si dos hojas piden el mismo archivo (lock temporal).
- Cualquier propuesta de cambio a un archivo con lock permanente debe pasar por el captain y aprobarse en `plan-activo.md` antes de tocarse.