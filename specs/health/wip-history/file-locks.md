# File locks — types-strong-2026

## Locks activos (T1 cerrado)

| Archivo | WT que lo lockea | Locked desde | Notas |
|---|---|---|---|
| `src/components/_shared/svg-chart-engine.ts` | WT-0001 (cerrado, lock permanente) | T1 | `roundedBarRect` firma cambiada a `number`; no tocar en T2-T9. Solo lectura. |
| `src/components/_shared/diagram-element-base.ts` | WT-0001 (cerrado, lock permanente) | T1 | Cast HTMLScriptElement añadido; no tocar en T2-T9. Solo lectura. |
| `src/components/diagrams/diagram-types.ts` | (read-only permanente) | baseline | Shape server de tipos compartidos. NO modificar firmas. Solo añadir al final. |

## Locks de T4 (temporales — vigentes durante T4)

| Archivo | WT que lo lockea | Locked desde | Notas |
|---|---|---|---|
| `src/components/data/data-grid.ts` | WT-0041 | T4 | 534 errores |
| `src/components/data/data-grid.preview.ts` | WT-0041 | T4 | 210 errores |
| `src/components/data/ag-grid.ts` | WT-0042 | T4 | 206 errores |
| `src/components/data/spreadsheet.ts` | WT-0042 | T4 | 82 errores |
| `src/components/media/icon-explorer.preview.ts` | WT-0042 | T4 | 219 errores |

## Locks liberados

- T1: archivos cerrados
- T2: 15 spec files (liberados al cerrar T2)
- T3: 15 diagram files + 5 lightbox/preview (liberados al cerrar T3)

## Estrategia T+ — sin nuevos worktrees

**Decisión del capitán**: para T+ los sub-agentes NO crean nuevos worktrees (15 min c/u = 4+ horas solo setup). En su lugar:
- Trabajan directamente en WT-ROOT (`C:\ContaPyme\Personal\apps\WT\is-webcomponents-wt-root-types-strong-2026`).
- File partitioning estricto: cada sub-agente tiene sus archivos lockeados (ver tabla arriba).
- Conflictos improbables porque cada sub-agente toca archivos disjuntos.
- Capitán media si surge conflicto (raro).

## Reglas de lock

- **Lock permanente**: archivo congelado para T+. Solo se desbloquea en T10 si hay necesidad crítica.
- **Lock temporal (T+)**: archivo bloqueado por una hoja activa; se libera al cerrar la hoja.
- Capitán media si dos hojas piden el mismo archivo (lock temporal).
- Cualquier propuesta de cambio a un archivo con lock permanente debe pasar por el captain y aprobarse en `plan-activo.md` antes de tocarse.