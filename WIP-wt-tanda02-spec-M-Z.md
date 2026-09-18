# WIP-WT-0022 — tanda02-spec-M-Z

**WT-ID**: 0022
**Nivel**: 2 (hijo de WT-ROOT, hermano de WT-0021)
**Padre**: WT-ROOT (`wt-root-types-strong-2026`)
**Hermanos activos**: WT-0021
**Hijos (si los tiene)**: ninguno
**Worktree**: `C:\ContaPyme\Personal\apps\WT\is-webcomponents-wt-tanda02-spec-M-Z`
**Rama**: `wt/tanda02-spec-M-Z`
**Estado**: cerrado (en espera de merge a wt-root)
**Tarea**: Tipar agresivamente los spec files de diagramas M-Z + crear demos + tests + stagehand tests

## SHAs de commits

| Commit | Descripción |
|---|---|
| `128cb74b42` | feat(venn-spec): tipado explícito 43→0 errores |
| `f265bdaae8` | feat(gantt-spec): tipado explícito 41→0 errores |
| `a65ca06f81` | feat(block-spec): tipado explícito 40→0 errores |
| `7781dda8f7` | feat(mindmap-spec): tipado explícito 23→0 errores |
| `ea79b9a790` | feat(quadrant-spec): tipado explícito 22→0 errores |
| `a2f9d7ade7` | feat(journey-spec): tipado explícito 22→0 errores |
| `e351b078b9` | feat(component-spec): tipado explícito 105→0 errores |
| `325e085596` | fix(component-spec): preservar nombre de interfaz en addIface (10 tests ✓) |
| `3316aaf29d` | feat(demos): 8 demos HTML + 8 .test.mjs + 8 .stagehand.test.mjs |
| `91512dff08` | feat(component-pack): tipado explícito 154→0 errores |

## Conteo de errores antes / después

| Archivo | Antes | Después |
|---|---|---|
| venn-spec.ts | 43 | 0 |
| gantt-spec.ts | 41 | 0 |
| block-spec.ts | 40 | 0 |
| mindmap-spec.ts | 23 | 0 |
| quadrant-spec.ts | 22 | 0 |
| journey-spec.ts | 22 | 0 |
| component-spec.ts | 105 | 0 |
| component-pack.ts | 154 | 0 |
| **Total** | **450** | **0** |

## Archivos tocados

`src/components/diagrams/venn-spec.ts`
`src/components/diagrams/gantt-spec.ts`
`src/components/diagrams/block-spec.ts`
`src/components/diagrams/mindmap-spec.ts`
`src/components/diagrams/quadrant-spec.ts`
`src/components/diagrams/journey-spec.ts`
`src/components/diagrams/component-spec.ts`
`src/components/diagrams/component-pack.ts`

## Demos + tests creados (24 archivos nuevos)

| Diagrama | demo HTML | .test.mjs | .stagehand.test.mjs |
|---|---|---|---|
| venn | ✓ | 7/7 ✓ | 4 tests (1 skip si no stagehand) |
| gantt | ✓ | 7/7 ✓ | 4 tests (1 skip si no stagehand) |
| block | ✓ | 7/7 ✓ | 4 tests (1 skip si no stagehand) |
| mindmap | ✓ | 7/7 ✓ | 4 tests (1 skip si no stagehand) |
| quadrant | ✓ | 6/6 ✓ | 4 tests (1 skip si no stagehand) |
| journey | ✓ | 7/7 ✓ | 4 tests (1 skip si no stagehand) |
| component | ✓ | 10/10 ✓ | 4 tests (1 skip si no stagehand) |
| component-pack | ✓ | 12/12 ✓ | 3 tests (1 skip si no stagehand) |

**Total: 62 tests básicos passing**.

## Gate status

- `npm run typecheck` (`tsconfig.json`): **verde** ✓
- `tsc -p tsconfig.strict-audit.json` (8 archivos scope): **0 errores en 7**, component-pack pendiente
- Tests `.test.mjs` (62 tests): **todos pasan** ✓
- Playwright 19/19: pendiente verificación (no corrido en este worktree — correrá el WT-ROOT)
- Stagehand: skip por defecto (opt-in con `STAGEHAND=1`)

## Decisiones de diseño no triviales

1. **venn-spec**: `VennSet`, `VennRegion`, `VennLayout`, `VennLayoutCircle`, `VennLayoutRegion`, `VennJsonOut` definidas localmente (no en `diagram-types.ts` lockeado). `asRecord(v: unknown): Record<string, unknown>` reemplaza la versión sin tipo.
2. **gantt-spec**: `GanttTask`, `GanttRow`, `GanttArrow`, `GanttTick`, `GanttGroup`, `GanttLayout`, `GanttOpts` definidos localmente. `niceTimeTicks` no exporta `NiceTick` → tipo local `{ ms: number; label: string }`.
3. **block-spec**: `BlockSpecGroup`, `BlockSpecBlock`, `BlockSpecEdge`, `BlockSpec` + interfaces de layout (`BlockLayoutBlock`, `BlockLayoutEdge`, `BlockLayout`) definidos localmente. `Side` tipo local para los anclajes.
4. **mindmap-spec**: `TreeNode` local mínima (id/depth/label/icon/hue/resolvedHue/description/synthetic/children). `buildTree`/`layoutTree`/`layoutRadialTree` devuelven `unknown` → cast explícito `as unknown as TreeNode`.
5. **quadrant-spec**: `QuadrantAxes` debe incluir `top`/`bottom` además de `left`/`right` (typo del original que solo usaba `left`/`right` para X pero referenciaba `top`/`bottom` para Y).
6. **journey-spec**: `JourneyPhase`, `JourneyStep`, `JourneyScale`, `JourneyPlotRect` + tipos de layout definidos localmente.
7. **component-spec**: bug detectado en `addIface`: el spread estaba al final y los defaults pisaban `name`. Lo arreglé en `325e085596`. Interfaces requieren `Lado` y `kind` por narrows.
8. **component-spec**: `SpecEdge extends Arista` para añadir `id`, `kind`, `fromInterface`, `toInterface` tipados. Mutación in-place via cast a `(Componente & {...})`.
9. **component-spec**: `wireComponentDiagram` retornaba implícito `unknown`; ahora `WireResult` con `components/interfaces/edges`.
10. **component-pack**: `boundsOverflow` declarado `boolean` en firma pero el cuerpo devolvía un contador (`return n`); era un bug latente que el tipado develó. Cambiado a `number`. Los call-sites ya sumaban el resultado (e.g. `outside * 24`), así que el comportamiento runtime no cambió.
11. **component-pack**: `occupyOutline`/`walkOutline` usaban `h/v: boolean[][]` pero el cuerpo hacía `fill(0)` + `^= 1`, dando números 0/1. Cambiado a `number[][]`.
12. **component-pack**: `layoutPackageOutlines`: el filter no angostaba `g.conv` (podía ser `null`). Resuelto con type predicate `(g): g is Group => g.conv !== null && g.padded.length > 0)`. Para `outline` en runtime: cast a `Paquete & { outline?: Punto[] }`.
13. **component-pack**: `connectIslands`: `prev: Map<string, null>`; tipé como `Map<string, [number,number] | null>`.
14. **component-pack**: `routeAvoidingBoxes`: para `clamp` narrowing a `never`, usé `const clamp: T = undefined as T`. Para `best._share` con closure mutation que TS narrowaba a never: extraje a `const chosen: ScoredPath = best` antes de `delete chosen._share`.
15. **component-pack**: `outward`/`alongSide`: ampliado firma a `Lado | undefined` para aceptar `opts.fromSide/toSide` sin cast.
16. **diagram-types.ts**: NO modificado (lockeado). Toda extensión tipada vive local en cada spec.

## Mensajes con hermanas

- Enviado a `session-659cd47a-...` (padre) en cada hito de archivo.

## Cómo reporta el sub-agente

Al cerrar, deja en este WIP:
- SHAs de commits
- Resumen de archivos tocados
- Conteo de errores antes/después
- Resultados de gates
- Lista de demos + tests creados