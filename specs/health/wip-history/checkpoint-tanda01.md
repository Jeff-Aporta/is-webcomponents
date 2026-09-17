# Checkpoint Tanda 1 — In-progress surgical

**Estado**: CERRADA ✓
**WT-RAMA**: `wt-root-types-strong-2026` (sin sub-ramas; cambios aplicados directo en WT-ROOT)
**SHA cierre**: TBD (post-commit)

## Archivos tocados

- `src/components/_shared/svg-chart-engine.ts` — 8 → 0 errores
- `src/components/_shared/diagram-element-base.ts` — 1 → 0 errores
- `src/components/diagrams/class-spec.ts` — 8 → 0 errores

## Cambios aplicados

1. **svg-chart-engine.ts**: `roundedBarRect(x, y)` firma cambiada de `string` a `number` para que las operaciones aritméticas internas (`x + r`, `y + h`, etc.) tipen correctamente. Los call sites ya pasaban numbers (`rect.x`, `rect.y`).
2. **diagram-element-base.ts**: En `#readJsonSlot`, `(c).type` ahora hace cast explícito `(c as HTMLScriptElement).type` para que TS no proteste por el tipo base `Element` que no tiene `.type`.
3. **class-spec.ts**:
   - `classes` ahora tiene tipo explícito `ClassSpecClass[]` (antes inferido en self-reference).
   - `readClass(c, i)` se llama con `i` directamente (antes `classes?.length ?? 0` que provocaba recursión de tipos).
   - `classGeometry` ahora retorna `headerH: number` además de los otros campos (antes el retorno no lo declaraba).

## Verificación

- ✓ `npm run typecheck` verde
- ✓ `npx tsc -p tsconfig.strict-audit.json --noEmit` — los 3 archivos en 0 errores
- N/A Playwright (no se tocaron demos)
- N/A round-trip JSON (no se tocó er-archify)

## Decisiones

- **svg-chart-engine**: cambio de firma a `number`. Tradeoff: los call sites pasan `rect.x`/`rect.y` que son `number`, así que no hay ruptura.
- **diagram-element-base**: cast explícito, no se cambia la estructura.
- **class-spec**: tipo explícito y un cambio de `readClass(c, classes?.length ?? 0)` a `readClass(c, i)` porque el primero era lógicamente erróneo (siempre daba 0 al estar evaluándose dentro del .map).

## Lock permanente aplicado

Ver `specs/health/wip-history/file-locks.md` — los 3 archivos quedan **solo-lectura** para T2-T9.

## Próxima tanda

**Tanda 2: diagrams/spec/* (~600 errores, 2 hojas)**
- WT-0021 (A-L): sequence-spec + swimlane-spec + flowchart-spec + sankey-spec + timeline-spec + use-case-spec + state-spec
- WT-0022 (M-Z): venn-spec + gantt-spec + block-spec + journey-spec + quadrant-spec + mindmap-spec + component-spec + component-pack

Cada hoja debe entregar:
- Archivos `.ts` tipados agresivamente
- Demo HTML funcional en `demos/diagramas/<nombre>/<nombre>.html`
- Test básico `.test.mjs` en `demos/diagramas/<nombre>/_testing/<nombre>.test.mjs`
- Stagehand test en `demos/diagramas/<nombre>/_testing/<nombre>.stagehand.test.mjs`

## Cómo reanudar

Si T2 falla:
1. `git -C <wt-root> reset --hard <sha-de-este-checkpoint>` → vuelve a inicio de T2
2. Re-arrancar WT-0021 / WT-0022 desde el SHA actual del WT-ROOT