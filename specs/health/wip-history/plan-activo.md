# Plan activo — types-strong-2026

## Tandas cerradas

| Tanda | SHA cierre | WTs mergeados | Errores antes → después | Notas |
|---|---|---|---|---|
| 1 | TBD (post-commit) | (directo en WT-ROOT) | 17 → 0 | Surgical fixes ya aplicados en main → WT-ROOT. Ver `checkpoint-tanda01.md`. |

## Tandas en proceso

(Ninguna)

## Tandas pendientes

| # | Tanda | Rama base | Hojas | Errores | Mandato extra |
|---|---|---|---|---|---|
| 2 | diagrams/spec/* | `wt-root-types-strong-2026` | WT-0021, WT-0022 | ~600 | **+ demo + tests para cada diagrama** |
| 3 | diagrams/impl/* | `wt-root-types-strong-2026` | WT-0031, WT-0032 | ~370 | **+ completar demos + tests de T2** |
| 4 | data-grid family | `wt-root-types-strong-2026` | WT-0041, WT-0042 | ~1,250 | ninguno |
| 5 | tree-view + helpers | `wt-root-types-strong-2026` | WT-0051, WT-0052 | ~720 | ninguno |
| 6 | layout + catalog + code | `wt-root-types-strong-2026` | WT-0061, WT-0062 | ~800 | ninguno |
| 7 | forms | `wt-root-types-strong-2026` | WT-0071, WT-0072 | ~450 | **+ tests para forms críticos** |
| 8 | nav + media | `wt-root-types-strong-2026` | WT-0081, WT-0082 | ~700 | **+ stagehand tests para componentes UX** |
| 9 | pages + utils + shared | `wt-root-types-strong-2026` | WT-0091, WT-0092 | ~600 | ninguno |
| 10 | Sweep final + merge prep | `wt-root-types-strong-2026` | WT-0101, WT-0102 | ~300 | validación global + merge prep |

## Tareas nuevas en cola

(Ninguna)

## Métricas live

- Errores strict audit al inicio: **8,777**
- Errores strict audit después de T1: **8,760** (T1 cerró 17)
- Commits al WT-ROOT: tracking en `checkpoint-actual.md`