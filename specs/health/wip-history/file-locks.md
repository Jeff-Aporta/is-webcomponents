# File locks — types-strong-2026

## Locks activos (T1 cerrado)

| Archivo | WT que lo lockea | Locked desde | Notas |
|---|---|---|---|
| `src/components/_shared/svg-chart-engine.ts` | WT-0001 (cerrado, lock permanente) | T1 | `roundedBarRect` firma cambiada a `number`; no tocar en T2-T9. Solo lectura. |
| `src/components/_shared/diagram-element-base.ts` | WT-0001 (cerrado, lock permanente) | T1 | Cast HTMLScriptElement añadido; no tocar en T2-T9. Solo lectura. |
| `src/components/diagrams/diagram-types.ts` | (read-only permanente) | baseline | Shape server de tipos compartidos. NO modificar firmas. Solo añadir al final. |

## Locks de T5 (temporales — vigentes durante T5)

| Archivo | WT que lo lockea | Locked desde | Notas |
|---|---|---|---|
| `src/components/isp/_shared/tree-view/00-as-row.ts` | WT-0051 | T5 | 125 errores |
| `src/components/isp/_shared/tree-view/02-model.ts` | WT-0051 | T5 | 71 |
| `src/components/isp/_shared/tree-view/03-tree-shape.ts` | WT-0051 | T5 | 78 |
| `src/components/isp/_shared/tree-view/04-tree-flow.ts` | WT-0051 | T5 | 104 |
| `src/components/isp/_shared/tree-view/05-view.ts` | WT-0051 | T5 | 50 |
| `src/components/isp/_shared/tree-view/06-mutations.ts` | WT-0051 | T5 | 112 |
| `src/components/isp/_shared/tree-view/06b-history.ts` | WT-0051 | T5 | 59 |
| `src/components/isp/_shared/tree-view/render-rows.ts` | WT-0051 | T5 | 51 |
| `src/components/isp/_shared/tree-view/row-adapter-base.ts` | WT-0052 | T5 | 73 |
| `src/components/isp/_shared/tree-view/row-adapter-drag.ts` | WT-0052 | T5 | 58 |
| `src/components/helpers/md-editor.ts` | WT-0052 | T5 | 87 |
| `src/components/helpers/popover.ts` | WT-0052 | T5 | 70 |
| `src/components/helpers/format.ts` | WT-0052 | T5 | 49 |

## Locks liberados

- T1: archivos cerrados
- T2: 15 spec files
- T3: 15 diagram files + 5 lightbox/preview
- T4: data-grid + data-grid.preview + grid-shared + ag-grid + spreadsheet + icon-explorer.preview

## Estrategia T+ — sin nuevos worktrees

Sub-agentes trabajan directamente en WT-ROOT con file partitioning.

## Reglas de lock

- **Lock permanente**: archivo congelado para T+. Solo se desbloquea en T10.
- **Lock temporal**: archivo bloqueado por una hoja activa; se libera al cerrar.
- Capitán media si dos hojas piden el mismo archivo.