# WIP-ROOT — is-editors

**WT-ID**: WT-ROOT-EDITORS
**WT-RUTA**: `C:\ContaPyme\Personal\apps\WT\is-wc-wt-root-editors-2026`
**RAMA**: `wt-root-editors-2026`
**Estado**: activo
**Objetivo**: 16 web components `<is-X-editor>` + 16 demos + ≥290 tests, round-trip JSON determinista, 0 skipped.

## Baseline (Phase 0 cerrado)

- **Commit semilla**: `39e4867a96` (main, post-merge types-strong-2026 + lab + dist/cdn regenerate)
- **typecheck**: verde (0 errores)
- **Playwright tests**: 21/21 PASS, 0 fail, 0 skipped
- **strict audit**: **0 errores** en src/ (post-types-strong)
- **Worktrees**: main + wt-root-editors-2026

## Tandas (ciclo 1→N→1)

| # | Tanda | Rama WT | Hojas | Estado |
|---|---|---|---|---|
| 1 | T0 preflight | — | — | ✅ cerrada |
| 2 | T1 infra (diagram-edit shell, contract) | `wt/tanda01-infra` | 1 | pendiente |
| 3 | T2 panel lateral + toolbar unificada | `wt/tanda02-ui` | 2 | pendiente |
| 4 | T3 UML editores (er + class + state) | `wt/tanda03-uml` | 1 | pendiente |
| 5 | T4 jerárquicos (mindmap + org + journey) | `wt/tanda04-hier` | 1 | pendiente |
| 6 | T5 otros con nesting (sankey + venn + gantt + quadrant + use-case + component) | `wt/tanda05-other-nesting` | 1 | pendiente |
| 7 | T6 posicionales (flowchart + sequence + swimlane + timeline) | `wt/tanda06-positional` | 1 | pendiente |
| 8 | T7 demos + tests + sweep final | `wt/tanda07-final` | 1 | pendiente |

(8 WT sub-tandas + WT-ROOT = 9 total, profundidad 4 ✓)

## Reglas del capitán

- ❌ NUNCA push, NUNCA squash
- ❌ NO commits directos a `main` (todo va a `wt-root-editors-2026`)
- ❌ NO modificar package.json / lock files
- ❌ NO borrar archivos sin propuesta explícita en WIP
- ✅ Sub-agentes trabajan en WT-ROOT con file partitioning (NO crear nuevos worktrees — 320k files = 15min c/u)
- ✅ Capitán corre F0 deep-test proposals sobre el área tocada al cierre de cada hoja
- ✅ Capitán media en colisiones (file-locks.md)
- ✅ Capitán commitea manualmente si sub-agente falla

## Contrato canónico del editor (§5 handoff)

- `<is-X-editor>` extiende `<is-X-diagram>` (lite) y le añade:
  - Toolbar (canvas): add/delete/connect/undo/redo/zoom-in-out/fit
  - Panel lateral: lista de nodos + props del nodo seleccionado
  - Evento `is-state-change` con payload `{ spec: Spec }`
  - Atributo `mode="view" | "edit"` (default "edit")
  - Slot oculto `<slot>` para JSON inicial (igual que el lite)
- Doble-click en nodo → drill-down (si admite nesting)
- `prefers-reduced-motion` desactiva animaciones
- Round-trip JSON determinista (byte-identical)

## 16 editores planificados

| # | Editor | Nesting | Tanda | Notas |
|---|---|---|---|---|
| 1 | `<is-er-editor>` | ✅ | T3 | ya existe (31 tests), refactor al contrato nuevo |
| 2 | `<is-class-editor>` | ✅ | T3 | UML |
| 3 | `<is-state-editor>` | ✅ | T3 | UML |
| 4 | `<is-mindmap-editor>` | ✅ | T4 | árbol estricto |
| 5 | `<is-org-chart-editor>` | ✅ | T4 | + photo drop |
| 6 | `<is-journey-map-editor>` | ✅ | T4 | jerárquico |
| 7 | `<is-sankey-editor>` | ✅ | T5 | nesting permitido |
| 8 | `<is-venn-editor>` | ✅ | T5 | nesting permitido |
| 9 | `<is-gantt-editor>` | ✅ | T5 | + dependsOn |
| 10 | `<is-quadrant-chart-editor>` | ✅ | T5 | |
| 11 | `<is-use-case-editor>` | ✅ | T5 | |
| 12 | `<is-component-editor>` | ✅ | T5 | |
| 13 | `<is-flowchart-editor>` | ❌ | T6 | posicional |
| 14 | `<is-sequence-diagram-editor>` | ❌ | T6 | posicional |
| 15 | `<is-swimlane-diagram-editor>` | ❌ | T6 | posicional |
| 16 | `<is-timeline-editor>` | ❌ | T6 | posicional |

## Mandato transversal — Testing exhaustivo (T7)

Cada editor terminado debe tener:
1. **Demo HTML funcional** en `demos/diagramas/<kind>/<kind>-editor.html`
   - Carga via CDN `dist/cdn/diagrams/<kind>.min.js`
   - Mismo patrón canónico que `demos/diagramas/ER/er-editor.html`
2. **Tests básicos `.test.mjs`** en `demos/diagramas/<kind>/_testing/<kind>-editor.test.mjs`
   - Smoke, CRUD, undo/redo, JSON round-trip, eventos
3. **Tests stagehand `.stagehand.test.mjs`** en mismo path
   - Render, keyboard, a11y, drag/click
4. **Tests unitarios `.test.ts`** en `src/utils/health/exhaustive/diagrams/<kind>-editor.test.ts`
   - Contrato, is-state-change, mode toggle
5. **Registro en `_testing/run.mjs`** (si se crea nuevo) o existente

Total target: ≥290 tests (42 baseline + 250 nuevos, ~16/editor).

## Mandato transversal — Guards y validaciones

Para cada editor se debe verificar:
- ✅ `npm run typecheck` verde
- ✅ `npm test` 21/21 (mínimo baseline, +nuevos)
- ✅ Round-trip JSON byte-identical (`spec → serialize → parse → serialize === original`)
- ✅ `prefers-reduced-motion` desactiva animaciones de drill-down
- ✅ Focus management al abrir/cerrar editor
- ✅ Atributo `mode="view"` deshabilita toolbar
- ✅ Sin memory leaks en `disconnectedCallback`

## Criterios de éxito (cierre)

- 16 web components `<is-X-editor>` implementados
- 16 demos HTML funcionales en `demos/diagramas/<kind>/<kind>-editor.html`
- ≥290 tests (42 baseline + 250 nuevos), 0 skipped
- Round-trip JSON determinista preservado
- 0 skipped (regla dura)
- Strict audit ≤baseline en archivos del scope
- `git worktree list` == `[main, wt-root-editors-2026]`

## Decisiones bloqueadas (§0 handoff)

Las 13 decisiones del handoff ya están cerradas (vía /grill-me). No se reabren durante la ejecución.

## Filosofía

> **TODO lo testeable debe quedar testeado.** Regla dura de deep-test-proposals skill.
> **TODO editor debe tener demo + 2 tests + is-state-change contract.** Regla de is-editors.
