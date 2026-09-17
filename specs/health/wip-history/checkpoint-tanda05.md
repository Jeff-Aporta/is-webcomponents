# Checkpoint Tanda 5 — tree-view + helpers

**Estado**: CERRADA ✓
**SHA cierre**: `68492c97ef`
**WT-RAMA base**: `wt-root-types-strong-2026`

## Resumen

- **Strict audit**: 6,146 → **5,135** errores (−1,011)
- **typecheck**: verde
- **Tests**: 56/56 pasando (21 WT-0051 + 35 WT-0052)

## Archivos tocados (13 archivos)

### WT-0051 (8 archivos, 650 → 0 + 14 extra en 01-contract)

| Archivo | Errores | SHA |
|---|---|---|
| `_types.ts` (nuevo) | n/a (shared infra) | `7718bb3e0d` |
| `01-contract.ts` (sin lock, −14) | −14 | `7afc320270` |
| `00-as-row.ts` | 125 → 0 | `189b34d7da` |
| `02-model.ts` | 71 → 0 | `1702c8fe2e` |
| `03-tree-shape.ts` | 78 → 0 | `d91aef440d` |
| `04-tree-flow.ts` | 104 → 0 | `c703b4c03f` |
| `05-view.ts` | 50 → 0 | `dd6c4bbb7f` |
| `06-mutations.ts` | 112 → 0 | `95f6c91ada` |
| `06b-history.ts` | 59 → 0 | `b13401489d` |
| `render-rows.ts` | 51 → 0 | `60a7b81f64` |

### WT-0052 (5 archivos, 337 → 0)

| Archivo | Errores | SHA |
|---|---|---|
| `row-adapter-base.ts` | 73 → 0 | `6b706f1ac1` |
| `row-adapter-drag.ts` | 58 → 0 | `0a3df78cce` |
| `helpers/md-editor.ts` | 87 → 0 | `83aa001aaa` |
| `helpers/popover.ts` | 70 → 0 | `23664980bd` |
| `helpers/format.ts` | 49 → 0 | `7cdbb9e87d` |

## Decisiones de diseño no triviales

1. **`_types.ts` (nuevo, shared infra)**: tipos `TNode`, `TreeCustoms`, `CustomsRuntime`, `RowConfig`, helpers `asRecord/asString/asNumber/asBool/asActionSpec`. Module augmentation para reabrir `TTreeAdapterContext/TTreeAdapterContract` y declarar campos heredados vía `__publicField`.
2. **`01-contract.ts` modificado (sin lock)**: −14 errores extra con tipos concretos en stubs para que las subclases puedan overridear sin incompatibilidades TS2416.
3. **Bypass del setter heredado `focusedNode`/`selectedNode`**: setter con `any` narrowing rechaza `TNode | null`. Solución: escribir `_focusedFlatPath` / `_selectedFlatPath` directamente.
4. **MD-editor tipos inline**: declaración local de `IsMdEditorDocument/ApiConfig/Actions` para evitar alias circular con `md-editor-api.js`.

## Lock permanente respetado

NO se tocaron: `svg-chart-engine.ts`, `diagram-element-base.ts`, `diagram-types.ts`.

## Próxima tanda

**Tanda 6: layout + catalog + code (~800 errores)**

- WT-0061: `code.ts` (120) + `split-panel.ts` (113) + `grid-data.ts` (108) + `chart.ts` (104) = 445
- WT-0062: `gallery/app.ts` (100) + `catalogo-gen.ts` (90) + `controller-from-config.ts` (87) + `date-field-core.ts` (80) = 357