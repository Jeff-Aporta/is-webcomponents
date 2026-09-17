# Plan activo — types-strong-2026

## Tandas cerradas

| Tanda | SHA cierre | WTs mergeados | Errores antes → después | Notas |
|---|---|---|---|---|
| 1 | `75b0aff595` | (directo en WT-ROOT) | 0 (ya estaban en main) | Surgical fixes ya aplicados en main → WT-ROOT. T1 fue verificación + locks + docs. Ver `checkpoint-tanda01.md`. |
| 2 | `08fe8f752` | WT-0021 + WT-0022 | 880 → 7,897 (8,777 → 7,897) | 15 spec files tipados (409+450 + cascading), 15 demos, 38 test files (115 tests pasando). Ver `checkpoint-tanda02.md`. |
| 3 | `f969580589` | WT-0031 + WT-0032 + WT-0032-bis | 513 → 7,384 (7,897 → 7,384) | 15 diagram files tipados + 5 lightbox/preview files. Tests extras para org-chart. Ver `checkpoint-tanda03.md`. |
| 4 | `a2d223afa` | WT-0041 + WT-0042 + WT-0042-bis | 1,238 → 6,146 (7,384 → 6,146) | data-grid family completo. WT-0041 hizo data-grid + preview + smoke. WT-0042-bis hizo icon-explorer.preview. Capitán commiteó grid-shared + ag-grid (sub-agents no commiteaban). Ver `checkpoint-tanda04.md`. |

## Tandas en proceso

| Tanda | Hoja | Rama | Estado |
|---|---|---|---|
| 5 (tree-view + helpers) | WT-0051 | `wt-root-types-strong-2026` | sub-agente `d97d4668` background |
| 5 (tree-view + helpers) | WT-0052 | `wt-root-types-strong-2026` | sub-agente `915534ac` background |

## Tandas pendientes

| # | Tanda | Rama base | Hojas | Errores | Mandato extra |
|---|---|---|---|---|---|
| 3 | diagrams/impl/* | `wt-root-types-strong-2026` | (cerrada) | ~532 | cerrada con WT-0031 + WT-0032-bis |
| 4 | data-grid family | `wt-root-types-strong-2026` | cerrada | ~1,250 | cerrada |
| 5 | tree-view + helpers | `wt-root-types-strong-2026` | WT-0051, WT-0052 | ~987 | sub-agentes `d97d4668` y `915534ac` en background |
| 6 | layout + catalog + code | `wt-root-types-strong-2026` | WT-0061, WT-0062 | ~800 | ninguno |
| 7 | forms | `wt-root-types-strong-2026` | WT-0071, WT-0072 | ~450 | **+ tests para forms críticos** |
| 8 | nav + media | `wt-root-types-strong-2026` | WT-0081, WT-0082 | ~700 | **+ stagehand tests para componentes UX** |
| 9 | pages + utils + shared | `wt-root-types-strong-2026` | WT-0091, WT-0092 | ~600 | ninguno |
| 10 | Sweep final + merge prep | `wt-root-types-strong-2026` | WT-0101, WT-0102 | ~300 | validación global + merge prep |

## Tareas nuevas en cola

### Workstream paralelo: is-editors (handoff `C:\Users\JAGUDELOE\handoff-is-editors.md`)

**Estado**: plan consolidado pendiente de luz verde. Resumen en `specs/health/wip-history/editors-handoff-summary.md`.

**Objetivo**: 16 wrappers `<is-X-editor>` + 16 demos + ≥290 tests + round-trip determinista + 0 skipped.

**Árbol WTs** (binario, profundidad ≤4, 9 WTs):
- WT-ROOT (`is-wc-wt-root-editors-2026`)
- WT-0001 master orchestrator
  - WT-0011 infra (diagram-edit shell, contract)
  - WT-0012 campaign 12 editores con nesting
- WT-0002 campaign 4 posicionales

**13 decisiones bloqueadas** (§0 handoff): todas cerradas vía `/grill-me`, no se reabren.

**Estrategia de integración**: secuencial después de types-strong-2026. Cuando strict audit <500 y T10 cerrado, arrancar is-editors.

**Trigger de arranque**:
1. types-strong T10 cerrado (checkpoint-tanda10.md escrito)
2. WT-ROOT de types-strong consolidado y limpio
3. Capitán pregunta al humano: "¿Arranco is-editors o prefieres parar?"
4. Si OK: `git worktree add C:\ContaPyme\Personal\apps\WT\is-wc-wt-root-editors-2026 -b wt-root-editors-2026 main`

**Riesgo de colisión**: ambos workstreams tocan `src/components/diagrams/*`. Secuencial obligatorio.

## Métricas live

- Errores strict audit al inicio: **8,777**
- Errores strict audit después de T1: **8,777** (T1 fue verificación/locks, fixes ya en main)
- Errores strict audit después de T2: **7,897** (−880)
- Errores strict audit después de T3: **7,384** (−513)
- Errores strict audit después de T4: **6,146** (−1,238 acumulado en T4)
- Próximo hito: < 5,500 después de T5

## Próxima tanda activa: T3

WT-0031 (A-L diagrams) + WT-0032 (M-Z diagrams + lightbox).

Estrategia T3:
- **REUTILIZAR worktrees de T2** — WT-0021 y WT-0022 ya existen como directorios; crear WT-0031 y WT-0032 desde WT-ROOT.
- Sub-agentes en background por hoja.
- Cada hoja entrega archivos `.ts` tipados + completar demo (si T2 no lo hizo) + tests.

**Decisión**: para T3 en adelante, NO crear nuevos worktrees con checkout completo (15 min c/u es prohibitivo). Usar el WT-ROOT como base de commits, y los sub-agentes trabajan en sub-branches. El captain cherry-pickea al WT-ROOT.