# Checkpoint Tanda 4 — data-grid family

**Estado**: CERRADA ✓
**SHA cierre**: `a2d223afa` (cierre WT-0041) + cascada posterior hasta 6,146
**WT-RAMA base**: `wt-root-types-strong-2026`

## Resumen

- **Strict audit**: 7,384 → **6,146** errores (−1,238)
- **typecheck**: verde
- **Tests**: 21/21 PASS (+ smoke test data-grid 19/19)
- **WT-ROOT**: ciclo 1→N→1 (WT-0041 + WT-0042 + WT-0042-bis creados y eliminados)

## Archivos tocados (~10 archivos)

### WT-0041 — data-grid core (744 → 0)

| Archivo | Errores | SHA |
|---|---|---|
| `data-grid/data-grid.ts` | 534 → 0 | `790b64ae1f` |
| `data-grid/data-grid.preview.ts` | 210 → 0 | `154dbca120` |
| (test) `data-grid/__tests__/smoke.test.ts` | 19/19 PASS | `d6d970849a` |
| `docs(wip): cierre WT-0041` | — | `a2d223afa` |

### WT-0042 — grid-shared + ag-grid + spreadsheet + icon-explorer

| Archivo | Errores | SHA |
|---|---|---|
| `_shared/grid-shared.ts` (grid-types + grid-data) | n/a (shared infra) | `a7eee18284` |
| `data-grid/ag-grid.ts` (initial) | parcial | `7f90b0e491` |
| `data-grid/spreadsheet.ts` | 82 → 0 | `ef6597ee12` |

### WT-0042-bis — icon-explorer.preview (cierre final)

| Archivo | Errores | SHA |
|---|---|---|
| `data-grid/icon-explorer.preview.ts` | 219 → 0 | `9e7c475409` |
| (docs) `docs(wip): WT-0042-bis cierre` | — | `af8fbb6b10` |

### Cascada post-WT (commit extra del capitán)

| Archivo | Errores | SHA |
|---|---|---|
| `ag-grid.preview.ts` | 23 → 0 | `f717023bcb` |
| `data-grid.ts` (cascading) | parcial | `192fb53462` |
| `ag-grid.ts` (cascading 1) | parcial | `c15f6ab13f` |
| `ag-grid.ts` (cascading 2: Intl.* locale→string) | 15 → 0 | `be088bd90d` |

## Cierre de T4 → apertura T5

- `db1f38e462` — `chore(tanda04-05): cerrar T4 + abrir T5`
- `495e4616b1` — `chore: remove icon-explorer-errors.txt stray` (limpieza)

## Decisiones de diseño no triviales

1. **`grid-shared.ts`** (`a7eee18284`) — extracción de `grid-types.ts` + `grid-data.ts` a archivo único compartido entre `data-grid` y `ag-grid` para evitar duplicación de tipos. Marcado como read-only al cierre de T4.
2. **`Intl.* locale cast`** (ag-grid 15→0) — `Intl.Collator().resolvedOptions().locale` retorna `string | undefined`. Cast explícito a `string` cuando sabemos que el locale está resuelto (caso común en runtime).
3. **`AgGridApi` + `IsAgGridEl`** (ag-grid.preview) — patrón estándar de previews: typedef local + CustomEvent cast para `.detail`.
4. **`PrefsEntry/TextFilterOp/MouseEvent/ColumnState|undefined`** (ag-grid cascading) — type guards con `instanceof MouseEvent`, narrowing para `ColumnState | undefined`.

## Lock permanente respetado

NO se tocaron: `svg-chart-engine.ts`, `diagram-element-base.ts`, `diagram-types.ts`.
NO se tocó: `grid-types.ts` (read-only post-T4).

## Sub-agentes que cerraron T4

- WT-0041 (data-grid + preview) — agente único, exitoso
- WT-0042 (grid-shared + ag-grid + spreadsheet) — falló parcialmente, capitán commiteó
- WT-0042-bis (icon-explorer.preview 219→0) — agente único, exitoso

**Patrón recurrente**: sub-agentes en `data-grid/` tienen dificultad cerrando porque hay tipos inter-dependientes entre `data-grid`, `ag-grid`, `spreadsheet`, e `icon-explorer.preview`. Capitán commiteó manualmente los archivos que los sub-agentes modificaron sin commitear.

## Próxima tanda

**Tanda 5: tree-view + helpers (~720 errores)**

WT-0051 (tree-view family) + WT-0052 (helpers varios).
