# File locks — types-strong-2026

## Locks activos (T1 cerrado)

| Archivo | WT que lo lockea | Locked desde | Notas |
|---|---|---|---|
| `src/components/_shared/svg-chart-engine.ts` | WT-0001 (cerrado, lock permanente) | T1 | Solo lectura |
| `src/components/_shared/diagram-element-base.ts` | WT-0001 (cerrado, lock permanente) | T1 | Solo lectura |
| `src/components/diagrams/diagram-types.ts` | (read-only permanente) | baseline | Solo añadir al final |

## Locks de T7 (temporales — vigentes durante T7)

| Archivo | WT que lo lockea | Locked desde | Notas |
|---|---|---|---|
| `src/components/forms/select.ts` | WT-0071 | T7 | 79 errores |
| `src/components/forms/date-picker.ts` | WT-0071 | T7 | 69 |
| `src/components/forms/combobox.ts` | WT-0071 | T7 | 58 |
| `src/components/forms/slider.ts` | WT-0071 | T7 | 57 |
| `src/components/forms/input.ts` | WT-0071 | T7 | 47 |
| (resto de forms) | WT-0072 | T7 | ~10 archivos |

## Locks liberados

- T1-T6 cerradas

## Estrategia T+ — sin nuevos worktrees

Sub-agentes trabajan directamente en WT-ROOT con file partitioning.