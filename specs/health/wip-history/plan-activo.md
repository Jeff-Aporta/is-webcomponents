# Plan activo — types-strong-2026

## Tandas cerradas

| Tanda | SHA cierre | WTs mergeados | Errores antes → después | Notas |
|---|---|---|---|---|
| 1 | `75b0aff595` | (directo en WT-ROOT) | 0 (ya estaban en main) | Surgical fixes ya aplicados en main → WT-ROOT. T1 fue verificación + locks + docs. Ver `checkpoint-tanda01.md`. |
| 2 | `08fe8f752` | WT-0021 + WT-0022 | 880 → 7,897 (8,777 → 7,897) | 15 spec files tipados (409+450 + cascading), 15 demos, 38 test files (115 tests pasando). Ver `checkpoint-tanda02.md`. |
| 3 | `f969580589` | WT-0031 + WT-0032 + WT-0032-bis | 513 → 7,384 (7,897 → 7,384) | 15 diagram files tipados + 5 lightbox/preview files. Tests extras para org-chart. Ver `checkpoint-tanda03.md`. |
| 4 | `a2d223afa` | WT-0041 + WT-0042 + WT-0042-bis | 1,238 → 6,146 (7,384 → 6,146) | data-grid family completo. WT-0041 hizo data-grid + preview + smoke. WT-0042-bis hizo icon-explorer.preview. Capitán commiteó grid-shared + ag-grid (sub-agents no commiteaban). Ver `checkpoint-tanda04.md`. |
| 5 | `68492c97e` | WT-0051 + WT-0052 | 1,011 → 5,135 (6,146 → 5,135) | tree-view + helpers completo. _types.ts nuevo. Ver `checkpoint-tanda05.md`. |
| 6 | `9241ea4ce` | WT-0061-quad + WT-0062 + WT-0062-bis | 697 → 4,438 (5,135 → 4,438) | 7 archivos: code, split-panel, chart, gallery/app, catalogo-gen, controller-from-config, date-field-core. Ver `checkpoint-tanda06.md`. |
| 7 | `c763849`+ | WT-0071 + WT-0072 + WT-0073 | 1,216 → 3,222 (4,438 → 3,222) | 36 archivos forms (24 .ts + 12 .preview.ts). WT-0073 cerró los 15+ pendientes. Ver `checkpoint-tanda07.md`. |
| 8 | `2d435f8f` | WT-0081 + WT-0082 | 609 → ~2,613 (3,222 → ~2,613) | 24 archivos (8 nav + 15 media). Ver `checkpoint-tanda08.md`. |
| 9 | `afb415890a` | WT-0091 + WT-0092 | 1,439 → ~1,783 (3,222 → ~1,783) | 50+ archivos (pages + utils + 41 _shared/ + palette-selector). Ver `checkpoint-tanda09.md`. |
| 10 | TBD | WT-0101 a WT-0105 + WT-0106 a/b/c | 1,783 → **0** | ✅ cerrada — STRICT_NOW=0, typecheck verde, 21/21 tests. Ver `checkpoint-tanda10.md`. |

## Tandas en proceso

(Ninguna — T10 cerrada)

## Tandas pendientes

| # | Tanda | Rama base | Hojas | Errores | Mandato extra |
|---|---|---|---|---|---|
| 3 | diagrams/impl/* | `wt-root-types-strong-2026` | (cerrada) | ~532 | cerrada con WT-0031 + WT-0032-bis |
| 4 | data-grid family | `wt-root-types-strong-2026` | cerrada | ~1,250 | cerrada |
| 5 | tree-view + helpers | `wt-root-types-strong-2026` | cerrada | ~987 | cerrada |
| 6 | layout + catalog + code | `wt-root-types-strong-2026` | cerrada | ~800 | cerrada (WT-0061-quad + WT-0062 + WT-0062-bis) |
| 7 | forms | `wt-root-types-strong-2026` | cerrada | ~450 | cerrada (36 archivos) |
| 8 | nav + media | `wt-root-types-strong-2026` | WT-0081, WT-0082 | ~700 | **+ stagehand tests para componentes UX** |
| 9 | pages + utils + shared | `wt-root-types-strong-2026` | WT-0091, WT-0092 | ~600 | ninguno |
| 10 | Sweep final + merge prep | `wt-root-types-strong-2026` | WT-0101 a WT-0105, WT-0106 a/b/c | 1783 → 0 | ✅ CERRADA — gate humano pendiente para merge a main |

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
- Errores strict audit después de T5: **5,135** (−1,011)
- Errores strict audit después de T6: **4,438** (−697)
- Errores strict audit después de T7: **3,222** (−1,216)
- Errores strict audit después de T8: **~2,613** (−609)
- Errores strict audit después de T9: **~1,783** (−1,439 acumulado)
- Errores strict audit después de T10: **0** ✅ (−1,783 acumulado, meta <100 cumplida con creces)
- Próximo hito: gate humano para merge `wt-root → main`

## Próxima tanda activa: ninguna (T10 cerrada, gate humano pendiente)

**Mandatos pendientes (post-merge):**
- M17 — Lab completo de testing (259 componentes × demo + 2 tests)
- M18 — specs/constraints.md + lessons.md + guardianes
- M19 — `test:all` verde
- M20 — Workstream editors (preguntar al humano antes de arrancar)

Estrategia T3:
- **REUTILIZAR worktrees de T2** — WT-0021 y WT-0022 ya existen como directorios; crear WT-0031 y WT-0032 desde WT-ROOT.
- Sub-agentes en background por hoja.
- Cada hoja entrega archivos `.ts` tipados + completar demo (si T2 no lo hizo) + tests.

**Decisión**: para T3 en adelante, NO crear nuevos worktrees con checkout completo (15 min c/u es prohibitivo). Usar el WT-ROOT como base de commits, y los sub-agentes trabajan en sub-branches. El captain cherry-pickea al WT-ROOT.