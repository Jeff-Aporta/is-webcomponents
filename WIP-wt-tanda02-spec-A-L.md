# WIP-WT-0021 — tanda02-spec-A-L

**WT-ID**: 0021
**Nivel**: 2 (hijo de WT-ROOT, hermano de WT-0022)
**Padre**: WT-ROOT (`wt-root-types-strong-2026`)
**Hermanos activos**: WT-0022
**Hijos (si los tiene)**: ninguno
**Worktree**: `C:\ContaPyme\Personal\apps\WT\is-webcomponents-wt-tanda02-spec-A-L`
**Rama**: `wt/tanda02-spec-A-L`
**Estado**: cerrado
**Tarea**: Tipar agresivamente los spec files de diagramas A-L + crear demos + tests + stagehand tests

## Plan

1. ✅ Tipar `src/components/diagrams/sequence-spec.ts` (83 → 0)
2. ✅ Tipar `src/components/diagrams/swimlane-spec.ts` (77 → 0)
3. ✅ Tipar `src/components/diagrams/flowchart-spec.ts` (60 → 0)
4. ✅ Tipar `src/components/diagrams/sankey-spec.ts` (51 → 0)
5. ✅ Tipar `src/components/diagrams/timeline-spec.ts` (47 → 0)
6. ✅ Tipar `src/components/diagrams/use-case-spec.ts` (46 → 0)
7. ✅ Tipar `src/components/diagrams/state-spec.ts` (45 → 0)

Total: **409 → 0 errores en scope**. **8,777 → 8,349 errores totales** (−428).

## Plan paralelo — Demos + Tests

Por CADA diagrama del scope:

1. ✅ Demo HTML en `demos/diagramas/<nombre>/<nombre>.html`
2. ✅ Test básico `.test.mjs` (node:assert, sin DOM — corre con `node`)
3. ✅ Stagehand test `.stagehand.test.mjs` (skip graceful si no hay LLM)

## Archivos lockeados (NO tocados)

| Archivo | Lock desde |
|---|---|
| `src/components/_shared/svg-chart-engine.ts` | T1 (permanente, no tocar) |
| `src/components/_shared/diagram-element-base.ts` | T1 (permanente, no tocar) |
| `src/components/diagrams/diagram-types.ts` | baseline (read-only) |

Decisiones de diseño no triviales (inline en código):

- **`asRecord(v: unknown): Record<string, unknown>`** en cada spec — strict null safety. El helper rechaza arrays.
- **`AnchorSide = 'left' | 'right' | 'top' | 'bottom'`** en flowchart/state — narrowed de `BoxSide` que admite `'auto'`, para satisfacer la firma de `edgeAnchor`. Cast explícito en el caller.
- **`LeadingIconToken` interface local** en sequence-spec — workaround del retorno implícito `null` de `extractLeadingIconToken` (no se modifica `_shared/`).
- **Dangling messages en sequence** — el spec degrada el destino desconocido colapsándolo al origen (en vez de crashear). El test verifica que `fromX === toX`, no que se descarte.
- **`'now' | undefined` narrowing** en timeline-spec — `Number.isFinite(now)` no narrowa de `undefined`, así que se chequea `now !== undefined` primero.

## Mensajes con hermanas

(Ninguno aún — WT-0022 no reportó colisiones durante esta tanda)

## Gate status

- npm run typecheck: ✅ verde
- strict audit: 8,777 → 8,349 (−428; baseline se mantiene, no se rompió nada en otros archivos)
- typecheck en mis 7 archivos: ✅ 0 errores
- tests básicos (53/53 verde): ✅ sequence 9, swimlane 7, flowchart 8, sankey 7, timeline 8, use-case 7, state 7
- stagehand tests: skip graceful (no LLM configurado), no fallan la suite

## Cómo reporta el sub-agente

### Conteo de errores antes/después

| Archivo | Antes | Después |
|---|---|---|
| sequence-spec.ts | 83 | 0 |
| swimlane-spec.ts | 77 | 0 |
| flowchart-spec.ts | 60 | 0 |
| sankey-spec.ts | 51 | 0 |
| timeline-spec.ts | 47 | 0 |
| use-case-spec.ts | 46 | 0 |
| state-spec.ts | 45 | 0 |
| **TOTAL scope** | **409** | **0** |

Strict audit total: **8,777 → 8,349** (−428).

### SHAs de commits (28 total)

#### Tipado (7 commits)
- `a58b6b2d37` feat(sequence-spec): typing explícito 83→0 errores
- `1e222e5d65` feat(swimlane-spec): typing explícito 77→0 errores
- `554f437687` feat(flowchart-spec): typing explícito 60→0 errores
- `c5b9385307` feat(sankey-spec): typing explícito 51→0 errores
- `df04d61da3` feat(timeline-spec): typing explícito 47→0 errores
- `ec1ea812e4` feat(use-case-spec): typing explícito 46→0 errores
- `412bb45034` feat(state-spec): typing explícito 45→0 errores

#### Demos (7 commits)
- `c7a97f5ac0` feat(sequence-demo): demo HTML
- `0835c7c651` feat(swimlane-demo): demo HTML
- `47f7ee2355` feat(flowchart-demo): demo HTML
- `f41233e584` feat(sankey-demo): demo HTML
- `42ac5de70c` feat(timeline-demo): demo HTML
- `081cf3e880` feat(use-case-demo): demo HTML
- `50a293a3e5` feat(state-demo): demo HTML

#### Tests básicos (7 commits)
- `8e135f525c` test(sequence-spec): tests exhaustivos del spec (node:assert, sin DOM)
- `6fe0e3424c` test(swimlane-spec): tests exhaustivos del spec (node:assert, sin DOM)
- `d48b92895c` test(flowchart-spec): tests exhaustivos del spec (node:assert, sin DOM)
- `318d7d665e` test(sankey-spec): tests exhaustivos del spec (node:assert, sin DOM)
- `e712064f37` test(timeline-spec): tests exhaustivos del spec (node:assert, sin DOM)
- `002e278448` test(use-case-spec): tests exhaustivos del spec (node:assert, sin DOM)
- `25b1837b58` test(state-spec): tests exhaustivos del spec (node:assert, sin DOM)

#### Stagehand tests (7 commits)
- `9dbc2b5deb` test(sequence-stagehand): visual rubric con Stagehand (skip graceful si no hay LLM)
- `6395562fc5` test(swimlane-stagehand): visual rubric con Stagehand (skip graceful si no hay LLM)
- `562baaa3fa` test(flowchart-stagehand): visual rubric con Stagehand (skip graceful si no hay LLM)
- `58bade414d` test(sankey-stagehand): visual rubric con Stagehand (skip graceful si no hay LLM)
- `82fbc247ad` test(timeline-stagehand): visual rubric con Stagehand (skip graceful si no hay LLM)
- `af60f7ac15` test(use-case-stagehand): visual rubric con Stagehand (skip graceful si no hay LLM)
- `866cd2142d` test(state-stagehand): visual rubric con Stagehand (skip graceful si no hay LLM)

### Demos + tests creados (rutas)

**Demos** (`demos/diagramas/<nombre>/<nombre>.html`):
- `sequence/sequence.html`
- `swimlane/swimlane.html`
- `flowchart/flowchart.html`
- `sankey/sankey.html`
- `timeline/timeline.html`
- `use-case/use-case.html`
- `state/state.html`

**Tests básicos** (`demos/diagramas/<nombre>/_testing/<nombre>.test.mjs`):
- 7 archivos (uno por diagrama). Patrón: smoke + edge cases + round-trip JSON.

**Stagehand tests** (`demos/diagramas/<nombre>/_testing/<nombre>.stagehand.test.mjs`):
- 7 archivos (uno por diagrama). Patrón: renderiza HTML en Chromium, aplica visual rubric con Stagehand (skip si no hay LLM).