# Checkpoint Tanda 2 — diagrams/spec/*

**Estado**: CERRADA ✓
**SHA cierre**: `08fe8f7524b81749a185db49e1ec533dfee298d5`
**WT-RAMA base**: `wt-root-types-strong-2026`

## Resumen

- **Strict audit**: 8,777 → **7,897** errores (−880)
- **typecheck**: verde
- **Tests**: 115/115 pasando (53 WT-0021 + 62 WT-0022)
- **Demos HTML**: 15 (uno por diagrama)
- **Test files**: 38 (15 .test.mjs + 15 .stagehand.test.mjs + 8 .test.mjs adicionales en WT-0022)

## Archivos tocados

### WT-0021 (7 archivos, 409 → 0)

| Archivo | Errores | SHA |
|---|---|---|
| `sequence-spec.ts` | 83 → 0 | `a58b6b2d` |
| `swimlane-spec.ts` | 77 → 0 | `1e222e5d` |
| `flowchart-spec.ts` | 60 → 0 | `554f4376` |
| `sankey-spec.ts` | 51 → 0 | `c5b93853` |
| `timeline-spec.ts` | 47 → 0 | `df04d61d` |
| `use-case-spec.ts` | 46 → 0 | `ec1ea812` |
| `state-spec.ts` | 45 → 0 | `412bb450` |

### WT-0022 (8 archivos, 450 → 0)

| Archivo | Errores | SHA |
|---|---|---|
| `venn-spec.ts` | 43 → 0 | `128cb74b` |
| `gantt-spec.ts` | 41 → 0 | `f265bdaa` |
| `block-spec.ts` | 40 → 0 | `a65ca06f` |
| `mindmap-spec.ts` | 23 → 0 | `7781dda8` |
| `quadrant-spec.ts` | 22 → 0 | `ea79b9a7` |
| `journey-spec.ts` | 22 → 0 | `a2f9d7ad` |
| `component-spec.ts` | 105 → 0 | `e351b078` + `325e0855` (fix `addIface`) |
| `component-pack.ts` | 154 → 0 | `91512dff` |

## Demos + tests creados

Por cada uno de los 15 diagramas:
- `demos/diagramas/<nombre>/<nombre>.html`
- `demos/diagramas/<nombre>/_testing/<nombre>.test.mjs`
- `demos/diagramas/<nombre>/_testing/<nombre>.stagehand.test.mjs`

15 demos HTML + 15 tests básicos + 15 stagehand tests.

## Decisiones de diseño no triviales

1. **Tipos definidos localmente en cada spec file**: `diagram-types.ts` está LOCKED por T1 (read-only). Los sub-agentes definieron tipos locales para evitar modificación.
2. **Bug latente en `addIface` (component-spec)**: el spread final pisaba `name` (default undefined). Arreglado en commit `325e0855`. Detectado gracias al tipado.
3. **Bug latente en `boundsOverflow` (component-pack)**: declarado `boolean` pero devolvía contador (number). Tipado como `number` y arreglado.
4. **`h/v` en `occupyOutline` (component-pack)**: declarados `boolean[][]` pero se llenan con `fill(0)` y `^= 1` (numbers). Tipados como `number[][]`.
5. **Type predicates**: casts controlados a `Paquete & { outline?: Punto[] }`, `Caja & { id?: string }` donde el tipo base es menos específico.

## Lock permanente respetado

NO se tocaron:
- `src/components/_shared/svg-chart-engine.ts`
- `src/components/_shared/diagram-element-base.ts`
- `src/components/diagrams/diagram-types.ts`

## Gates verificados

- ✓ `npm run typecheck` (tsconfig.json): verde
- ✓ `npx tsc -p tsconfig.strict-audit.json`: 7,897 errores (de 8,777 baseline)
- ✓ Tests básicos: 115/115 pasando
- ✓ Stagehand: skip graceful (sin LLM; opt-in con STAGEHAND=1)
- ⚠ Round-trip JSON: solo verificado en sub-componentes que aplican (component-spec, etc.) — el ER tiene sus propios tests que pasan

## Próxima tanda

**Tanda 3: diagrams/impl/* (~532 errores)**

WT-0031 (A-L diagrams): sequence-diagram (65), state-diagram (30), flowchart (47), use-case-diagram (29), venn-diagram (11), gantt (29), block-diagram (27) = 238 errores
WT-0032 (M-Z diagrams + lightbox): journey-map (18), quadrant-chart (20), mindmap (11), sankey-diagram (22), swimlane-diagram (22), org-chart (44), timeline (21), component-diagram (26), diagram-lightbox (38), lightbox (24), lightbox.preview (19), diagram-lightbox.preview (14), org-chart.preview (10), sequence-diagram.preview (5), diagram-kinds (2) = 294 errores

## Cómo reanudar

Si T3 falla:
1. `git -C <wt-root> reset --hard 08fe8f7524b81749a185db49e1ec533dfee298d5` → vuelve a inicio de T3
2. Re-arrancar WT-0031 / WT-0032 desde el SHA actual del WT-ROOT

## Lección aprendida (estrategia)

- **15 min de checkout por WT** es prohibitivo para el plan (4+ horas solo setup para 17 hojas restantes).
- **Decisión para T3+**: sub-agentes trabajan en sub-branches de WT-ROOT, captain cherry-pickea. Sin nuevos worktrees.