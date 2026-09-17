# File locks — types-strong-2026

## Locks activos (T1 cerrado)

| Archivo | WT que lo lockea | Locked desde | Notas |
|---|---|---|---|
| `src/components/_shared/svg-chart-engine.ts` | WT-0001 (cerrado, lock permanente) | T1 | `roundedBarRect` firma cambiada a `number`; no tocar en T2-T9. Solo lectura. |
| `src/components/_shared/diagram-element-base.ts` | WT-0001 (cerrado, lock permanente) | T1 | Cast HTMLScriptElement añadido; no tocar en T2-T9. Solo lectura. |
| `src/components/diagrams/diagram-types.ts` | (read-only permanente) | baseline | Shape server de tipos compartidos. NO modificar firmas. Solo añadir al final. |

## Locks de T6 (temporales — vigentes durante T6)

| Archivo | WT que lo lockea | Locked desde | Notas |
|---|---|---|---|
| `src/components/code/code.ts` | WT-0061 | T6 | 120 errores |
| `src/components/layout/split-panel.ts` | WT-0061 | T6 | 113 |
| `src/components/_shared/grid-data.ts` | WT-0061 | T6 | 108 (compartido con T4 — ya tipado, verificar) |
| `src/components/charts/chart.ts` | WT-0061 | T6 | 104 |
| `src/gallery/app.ts` | WT-0062 | T6 | 100 |
| `src/components/isp/catalogo-gen.ts` | WT-0062 | T6 | 90 |
| `src/components/isp/controller-from-config.ts` | WT-0062 | T6 | 87 |
| `src/components/_shared/date-field-core.ts` | WT-0062 | T6 | 80 |

## Locks liberados

- T1: archivos cerrados
- T2: 15 spec files
- T3: 15 diagram files + 5 lightbox/preview
- T4: data-grid + data-grid.preview + grid-shared + ag-grid + spreadsheet + icon-explorer.preview
- T5: 13 tree-view + helpers files (incluyendo _types.ts)

## Estrategia T+ — sin nuevos worktrees

Sub-agentes trabajan directamente en WT-ROOT con file partitioning.