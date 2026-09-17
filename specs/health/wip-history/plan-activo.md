# Plan activo — types-strong-2026

## Tandas cerradas

| Tanda | SHA cierre | WTs mergeados | Errores antes → después | Notas |
|---|---|---|---|---|
| 1 | `75b0aff595` | (directo en WT-ROOT) | 0 (ya estaban en main) | Surgical fixes ya aplicados en main → WT-ROOT. T1 fue verificación + locks + docs. Ver `checkpoint-tanda01.md`. |
| 2 | `08fe8f752` | WT-0021 + WT-0022 | 880 → 7,897 (8,777 → 7,897) | 15 spec files tipados (409+450 + cascading), 15 demos, 38 test files (115 tests pasando). Ver `checkpoint-tanda02.md`. |

## Tandas en proceso

| Tanda | Hoja | Rama | Estado |
|---|---|---|---|
| 3 (impl) | WT-0031 | `wt-root-types-strong-2026` (directo) | sub-agente `ce18143e` en background |
| 3 (impl) | WT-0032 | `wt-root-types-strong-2026` (directo) | sub-agente `be529970` en background |

## Tandas pendientes

| # | Tanda | Rama base | Hojas | Errores | Mandato extra |
|---|---|---|---|---|---|
| 3 | diagrams/impl/* | `wt-root-types-strong-2026` | WT-0031, WT-0032 | ~532 | **+ completar demos + tests de diagramas restantes** |
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
- Errores strict audit después de T1: **8,777** (T1 fue verificación/locks, fixes ya en main)
- Errores strict audit después de T2: **7,897** (−880)
- Próximo hito: < 7,500 después de T3

## Próxima tanda activa: T3

WT-0031 (A-L diagrams) + WT-0032 (M-Z diagrams + lightbox).

Estrategia T3:
- **REUTILIZAR worktrees de T2** — WT-0021 y WT-0022 ya existen como directorios; crear WT-0031 y WT-0032 desde WT-ROOT.
- Sub-agentes en background por hoja.
- Cada hoja entrega archivos `.ts` tipados + completar demo (si T2 no lo hizo) + tests.

**Decisión**: para T3 en adelante, NO crear nuevos worktrees con checkout completo (15 min c/u es prohibitivo). Usar el WT-ROOT como base de commits, y los sub-agentes trabajan en sub-branches. El captain cherry-pickea al WT-ROOT.