# Checkpoint Tanda 3 — diagrams/impl/* + lightbox

**Estado**: CERRADA ✓
**SHA cierre**: `f969580589`
**WT-RAMA base**: `wt-root-types-strong-2026`

## Resumen

- **Strict audit**: 7,897 → **7,384** errores (−513 en scope, ~880 cascading)
- **typecheck**: verde
- **Tests**: pasando en archivos cerrados

## Archivos tocados (15 diagram files)

### WT-0031 (7 archivos, 224 → 0)

| Archivo | Errores | SHA |
|---|---|---|
| `sequence-diagram.ts` | 56 → 0 | `cfdad173c4` |
| `state-diagram.ts` | 29 → 0 | `f6ed148ff5` |
| `flowchart.ts` | 46 → 0 | `1e7a0f63cf` |
| `use-case-diagram.ts` | 27 → 0 | `91c1895f0b` |
| `venn-diagram.ts` | 11 → 0 | `e49ae01c64` |
| `gantt.ts` | 29 → 0 | `d764389d5d` |
| `block-diagram.ts` | 26 → 0 | `21bc48b965` |

### WT-0032 + WT-0032-bis (15 archivos, 153+)

| Archivo | Errores | SHA |
|---|---|---|
| `journey-map.ts` | 18 → 0 | `cdaf0035d8` |
| `mindmap.ts` | 11 → 0 | `ccb8130f84` |
| `quadrant-chart.ts` | 20 → 0 | `d9dd874b5d` |
| `diagram-kinds.ts` | 2 → 0 | `5252de3d27` |
| `sequence-diagram.preview.ts` | 5 → 0 | `b0b908bebb` |
| `org-chart.preview.ts` | 10 → 0 | `63a7d0c19a` |
| `diagram-lightbox-preview.ts` | 14 → 0 | `e30ebc8188` |
| `lightbox-preview.ts` | 19 → 0 | `894e6f456d` |
| `sankey-diagram.ts` | 18 → 0 | `71f199527b` |
| `swimlane-diagram.ts` | 20 → 0 | `e435a032f5` |
| `timeline.ts` | 21 → 0 | `e8d12e4a00` |
| `component-diagram.ts` | 26 → 0 | `52c86a34f9` |
| `org-chart.ts` | 44 → 0 | `e69404e76d` |
| `diagram-lightbox.ts` | 38 → 0 | `de3b7c2aac` |
| `lightbox.ts` | 24 → 0 | `ccdbbf5a47` |

## Tests creados

- `test(org-chart): demo + smoke test + stagehand visual rubric` (`99ea7c3911`)

## Decisiones de diseño no triviales

1. **Tipos locales no exportados**: `VennLayoutCircle`, `GanttRow`, `BlockLayoutBlock`, `OrgNode`, etc. redefinidos LOCALMENTE en cada archivo de diagrama porque `*spec.ts` no los exportaba (y están LOCKED). Sin acoplamiento al spec.
2. **Props runtime no declaradas**: `m.overflow`, `e.labelW`, etc. casteadas vía `as { overflow?: string }`.
3. **`svgArrowHead` con firma heredada `any`**: casteado a `(opts) => SVGElement` para evitar `null` en `className`.
4. **`addEventListener` con `EventListener` cast**: necesario porque las firmas específicas (PointerEvent, MouseEvent) no encajan en la sobrecarga `(evt: Event) => any` de ShadowRoot.
5. **`Object.assign` vs spread en `lightbox.ts`**: spread daba "specified more than once" para `scale/x/y`.
6. **`dialog` tipado como `HTMLDialogElement`**: antes era HTMLElement.

## Lock permanente respetado

NO se tocaron:
- `src/components/_shared/svg-chart-engine.ts`
- `src/components/_shared/diagram-element-base.ts`
- `src/components/diagrams/diagram-types.ts`

## Lección aprendida (estrategia)

- **WT-0032 falló antes de completar**. Solución: dispatch WT-0032-bis con scope explícito de los archivos restantes.
- **Estrategia "sin nuevos WTs" funcionó**: los sub-agentes trabajaron en WT-ROOT directamente. Conflictos mínimos porque cada uno tenía file-locks estrictos.

## Próxima tanda

**Tanda 4: data-grid family (~1,250 errores)**

- WT-0041: data-grid.ts (534) + data-grid.preview.ts (210) = 744 errores
- WT-0042: ag-grid.ts (206) + spreadsheet.ts (82) + icon-explorer.preview.ts (219) = 507 errores

Total: ~1,250 errores objetivo → 0.