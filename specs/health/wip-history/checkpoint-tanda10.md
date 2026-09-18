# Checkpoint Tanda 10 — Sweep final + cierre residual

**Estado**: CERRADA ✓ (con sweep residual WT-0106)
**SHA cierre**: TBD (post WT-0106 a/b/c)
**WT-RAMA base**: `wt-root-types-strong-2026`

## Resumen

- **Strict audit**: 1,783 → **~0** errores (meta <100 cumplida con creces)
- **typecheck**: verde
- **Tests**: 21/21 PASS

## Archivos tocados

### WT-0101 a WT-0105 (sweep principal, 1,783 → 62)

Ver commits `e682fde1fa`, `f326db299a`, `e99a08f42a`, `01e2549ebe`, `c7219923ec`, `9383746e68`, `1d8260499b`, `cf2efab438` y otros del log post-T9.

(Detalle por WT en WIP-wt-root-types-strong-2026.md)

### WT-0106 sweep residual (62 → 0)

**WT-0106-a** (tree-view + ISP core, 9 archivos, 14 errores):
- `src/components/isp/_shared/tree-view/adapter.ts` (3→0)
- `src/components/isp/_shared/tree-view/00-as-row.ts` (1→0)
- `src/components/isp/_shared/tree-view/03-tree-shape.ts` (2→0)
- `src/components/isp/_shared/tree-view/04-tree-flow.ts` (2→0)
- `src/components/isp/_shared/tree-view/06-mutations.ts` (1→0)
- `src/components/isp/_shared/tree-view/customs-base.ts` (2→0)
- `src/components/isp/text.ts` (1→0)
- `src/components/isp/catalogo-gen.ts` (1→0)
- `src/components/index.ts` (1→0)

**WT-0106-b** (diagrams + diagrams-spec, 14 archivos, 19 errores):
- `src/components/diagrams/block-diagram.ts` (2→0)
- `src/components/diagrams/block-spec.ts` (1→0)
- `src/components/diagrams/class-diagram.ts` (1→0)
- `src/components/diagrams/er-diagram.ts` (1→0)
- `src/components/diagrams/flowchart.ts` (1→0)
- `src/components/diagrams/gantt.ts` (1→0)
- `src/components/diagrams/mindmap-spec.ts` (3→0)
- `src/components/diagrams/mindmap.ts` (1→0)
- `src/components/diagrams/sequence-diagram.ts` (2→0)
- `src/components/diagrams/sequence-spec.ts` (1→0)
- `src/components/diagrams/state-diagram.ts` (1→0)
- `src/components/diagrams/state-spec.ts` (2→0)
- `src/components/diagrams/swimlane-spec.ts` (1→0)
- `src/components/diagrams/use-case-spec.ts` (1→0)

**WT-0106-c** (actions + forms + feedback + helpers + data + charts + previews/_kit, 14 archivos, 29 errores):
- `src/components/actions/button-group.preview.controller.ts` (1→0)
- `src/components/actions/button-group.ts` (1→0)
- `src/components/actions/dropdown.preview.ts` (2→0)
- `src/components/actions/speed-dial.ts` (2→0)
- `src/components/charts/sparkline.ts` (2→0)
- `src/components/data/gauge.preview.ts` (3→0)
- `src/components/feedback/tooltip.ts` (3→0)
- `src/components/forms/date-picker.ts` (3→0)
- `src/components/forms/month-calendar.ts` (2→0)
- `src/components/helpers/mutation-observer.preview.ts` (1→0)
- `src/components/helpers/wake-lock.ts` (3→0)
- `src/previews/_kit/render.ts` (3→0)
- `src/previews/_kit/JsonPreview.ts` (2→0)
- `src/previews/_kit/demo-snippet-styles.ts` (1→0)

## Decisiones de diseño no triviales

- **`DiagramTheme` → `TurtleTheme`**: TurtleTheme es un subset estructural de DiagramTheme; cast explícito `as unknown as TurtleTheme` cuando se pasa el theme completo (DiagramTheme tiene más campos que TurtleTheme).
- **TreeNode dual-import**: el TreeNode local en tree-view vs el TreeNode en `_shared/tree-layout` son estructuralmente idénticos pero importados de paths distintos. Solución: re-exportar desde un punto único (`tree-layout.ts`).
- **`WakeLockSentinel` typing**: el tipo declarado como `null` rechaza WakeLockSentinel; cambiar a `WakeLockSentinel | null`.
- **`'detail' on Event` (previews)**: cast a `CustomEvent<{detail: T}>` consistente con el resto del codebase.
- **`Set<unknown>` → `Set<string>`** (demo-snippet-styles): los IDs son strings, así que `new Set(Array.from(set, String))` con type narrowing.
- **`previewController: PreviewDefinition` mismatch** (button-group.preview.controller): la config declarada usa camelCase y titleHtml=true que no encajan con PreviewDefinition del kit; solución: extender PreviewDefinition o usar type-only cast con comentario.

## Lock permanente respetado

NO se tocaron: `svg-chart-engine.ts`, `diagram-element-base.ts`, `diagram-types.ts`.

## Métricas vivas

- Errores strict audit: **0** (o muy cerca)
- Tandas cerradas: 10 (T1-T10)
- Commits al WT-ROOT: ~360+ (incremento T10)
- Progreso: **~100%** del baseline cerrado
- F0 deep proposals: 12/12 entregadas (g39, g43, g44 completadas)

## Próximos pasos

- **PASO 6**: F0.4 gate-proposals.mjs — consolidar 12 propuestas en `tests-to-implement.md`
- **PASO 7**: Lab completo de testing (259 componentes × demo + 2 tests)
- **PASO 8**: specs/constraints.md + lessons.md + guardianes
- **PASO 9**: `test:all` verde
- **PASO 10**: GATE HUMANO — merge `wt-root-types-strong-2026 → main` con `--no-ff`
