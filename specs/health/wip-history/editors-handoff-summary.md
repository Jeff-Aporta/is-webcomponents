# is-editors handoff — Resumen ejecutivo

> **Origen**: `C:\Users\JAGUDELOE\handoff-is-editors.md` (59KB, 1341 líneas, versión 1.0 final).
> **Este doc**: resumen condensado en WT-ROOT para referencia rápida del capitán.
> **Estado**: PLAN CONSOLIDADO — pendiente SOLO de luz verde humana.

## §0 — 13 Decisiones bloqueadas

| ID | Decisión |
|---|---|
| `architecture` | 16 wrappers `<is-X-editor>` (uno por diagrama) |
| `persistence` | Solo `is-state-change` event (sin auto-storage) |
| `gantt-deps` | `dependsOn: string[]` en spec de Gantt |
| `org-photo` | `photo` acepta URL o data URL (base64) |
| `self-loop` | Per-diagrama configurable; default `reject`; override `allow-self-loop="true"` |
| `cycles` | Permitidos en UML (class, state); rechazados en mindmap |
| `ui-actions` | Toolbar (canvas) + panel lateral |
| `demos` | 16 demos, uno por editor (`demos/diagramas/<kind>/<kind>-editor.html`) |
| `nesting-scope` | 12/16 admiten nesting; 4 posicionales NO |
| `nesting-trigger` | Doble-click + botón 🔍+ en toolbar |
| `nesting-anim` | CSS viewBox animado + crossfade, respeta `prefers-reduced-motion` |
| `nesting-editor` | Modal overlay recursivo |
| `nesting-depth` | 5 niveles máximo |

## §3 — Árbol de WTs (binario, profundidad ≤4)

```
is-wc-wt-root-editors-2026 (root)
├── WT-0001 (master orchestrator)
│   ├── WT-0011 (infra — diagram-edit shell, contract)
│   │   ├── WT-00111 (panel lateral)
│   │   └── WT-00112 (toolbar unificada)
│   └── WT-0012 (campaign 12 editores con nesting)
│       ├── WT-00121 (er-editor + class-editor + state-editor: UML)
│       └── WT-00122 (mindmap + org-chart + journey: jerárquicos)
├── WT-0002 (campaign 4 posicionales: flowchart + sequence + gantt + swimlane)
│   ├── WT-0021 (flowchart + sequence)
│   └── WT-0022 (gantt + swimlane)
```

9 WTs, profundidad 4 (root → level 1 → level 2 → level 3).

## §5 — Contrato canónico del editor

- `<is-X-editor>` extiende `<is-X-diagram>` (lite) y le añade:
  - Toolbar (canvas): botones add/delete/connect/undo/redo/zoom-in-out/fit
  - Panel lateral: lista de nodos + props del nodo seleccionado
  - Evento `is-state-change` con payload `{ spec: Spec }`
  - Atributo `mode="view" | "edit"` (default "edit")
  - Slot oculto `<slot>` para JSON inicial (igual que el lite)
- Doble-click en nodo → drill-down (si admite nesting)
- `prefers-reduced-motion` desactiva animaciones de drill-down
- Round-trip JSON determinista (byte-identical)

## §6 — Diagramas anidados (12 de 16 admiten nesting)

| Admite nesting | NO admite |
|---|---|
| er, class, state, mindmap, org-chart, journey, sankey, venn, gantt, quadrant, use-case, component | flowchart, sequence, swimlane, timeline |

Data model: cada nodo tiene `children?: Node[]` (recursive type). Viewer/editor behavior diferenciados: viewer solo renderiza, editor permite drill-down modal recursivo (max 5 niveles).

## §7 — F0 deep-test proposals por leaf

Cada leaf corre F0 (DISCOVER → GROUP → PROPOSE → GATE → IMPLEMENT → ITERATE) antes de merge. Output en `.audit/proposals/g<N>.md`.

## §9 — Tandas (ciclo 1→N→1, orden por invasividad)

| Tanda | Invasividad | WT |
|---|---|---|
| T0 | preflight | — |
| T1 | #2 (rename) | WT-0001 |
| T2 | #3 (consolidation) | WT-0011, WT-0012 |
| T3 | #4-5 (folders + features) | WT-0021, WT-0022 |

## §10 — Gates por nivel

| Gate | Cuándo |
|---|---|
| Pre-WT | npm run typecheck, npm run test:demos, strict audit ≤baseline |
| Pre-merge | F0 cerrado en el leaf, tests ≥baseline, round-trip preservado |
| Pre-merge-to-main | single gate humano |

## §14 — Criterios de éxito

- 16 web components `<is-X-editor>` implementados
- 16 demos HTML funcionales en `demos/diagramas/<kind>/<kind>-editor.html`
- ≥290 tests (42 baseline + 250 nuevos)
- Round-trip JSON determinista preservado
- 0 skipped (regla dura)
- Strict audit ≤baseline en archivos del scope

## §16 — Comandos de arranque

```powershell
cd C:\ContaPyme\Personal\apps\is-webcomponents
git status --short  # debe estar limpio
npm run typecheck    # debe pasar
npm run test:demos   # 42/42 PASS
git worktree add C:\ContaPyme\Personal\apps\WT\is-wc-wt-root-editors-2026 -b wt-root-editors-2026 main
```

## §15 — Lo que NO está en el plan

- No se cambia la firma de los lites (`<is-X-diagram>`)
- No se refactoriza el core (`diagram-types.ts`)
- No se migra a un framework (sigue vanilla JS)
- No se introduce un build pipeline nuevo
- No se sube a npm

## Estrategia de integración con types-strong-2026

**Secuencia propuesta**:
1. **Terminar types-strong-2026 (T4-T10)** — actual workstream. ~7 tandas × 1 round/tanda = 7 rounds.
2. **Iniciar is-editors** cuando WT-ROOT de types-strong esté consolidado y limpio. ~10 rounds.
3. **Total estimado**: 17 rounds de las 40 disponibles.

**Por qué secuencial y no paralelo**: ambos workstreams modifican `src/components/diagrams/*` y podrían colisionar. Secuencial evita refactor-merging hell.

**Trigger para arrancar is-editors**: cuando strict audit baje a <500 y types-strong T10 esté cerrado.