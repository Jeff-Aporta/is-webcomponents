# WIP-ROOT — types-strong-2026

**WT-ID**: WT-ROOT
**WT-RUTA**: `C:\ContaPyme\Personal\apps\WT\is-webcomponents-wt-root-types-strong-2026`
**RAMA**: `wt-root-types-strong-2026`
**Estado**: activo
**Objetivo**: Bajar `npx tsc -p tsconfig.strict-audit.json` de 8,777 errores a <100, manteniendo `npm run typecheck` verde y Playwright 19/19.

## Baseline (Phase 0 cerrado)

- **Commit semilla**: `df2f4ec924e7344a8e87434328fcd0451ae31c04` (main, post-chore)
- **typecheck**: verde
- **strict audit**: **8,777 errores** en 322 archivos
- **Playwright**: 21/21 (2 stagehand skipped, no fallidos)
- **Round-trip JSON**: preservado

## Tandas

| # | Tanda | Rama WT | Hojas | Errores objetivo | Estado |
|---|---|---|---|---|---|
| 1 | In-progress surgical | `wt/tanda01-in-progress-surgical` | 1 | 17 | pendiente |
| 2 | diagrams/spec/* | `wt/tanda02-diagrams-spec` | 2 | ~600 | pendiente |
| 3 | diagrams/impl/* | `wt/tanda03-diagrams-impl` | 2 | ~370 | pendiente |
| 4 | data-grid family | `wt/tanda04-data-grid-family` | 2 | ~1,250 | pendiente |
| 5 | tree-view + helpers | `wt/tanda05-tree-view-helpers` | 2 | ~720 | pendiente |
| 6 | layout + catalog + code | `wt/tanda06-layout-catalog-code` | 2 | ~800 | pendiente |
| 7 | forms | `wt/tanda07-forms` | 2 | ~450 | pendiente |
| 8 | nav + media | `wt/tanda08-nav-media` | 2 | ~700 | pendiente |
| 9 | pages + utils + shared | `wt/tanda09-pages-utils-shared` | 2 | ~600 | pendiente |
| 10 | Sweep final + merge prep | `wt/tanda10-sweep` | 2 | ~300 | pendiente |

## Reglas del captain

- NO `git push` sin OK humano.
- NO squash (todos los commits se preservan en merge a main).
- NO commit a `main` directo (todo va por WT-ROOT).
- NO modificar `package.json` / lock files.
- NO borrar archivos sin propuesta explícita en WIP.
- Sub-agentes: solo `npm run test` + `pre:push` (health básico). NO deep-test.
- Capitán corre F0 deep-test-proposals sobre el área tocada al cierre de cada hoja.
- Capitán media en colisiones (file-locks.md).

## Mandato transversal — Test exhaustivo por diagrama (T2-T3)

Cada diagrama tocado por Tanda 2 o Tanda 3 debe terminar con:
1. **Demo HTML funcional** en `demos/diagramas/<nombre>/<nombre>.html`
   - Carga la librería via CDN local
   - Tiene al menos 1 caso de uso representativo del diagrama
   - Visible sin servidor (solo abrir el HTML)
2. **Tests básicos `.test.mjs`** en `demos/diagramas/<nombre>/_testing/<nombre>.test.mjs`
   - Smoke: el componente renderiza sin errores
   - Snapshot del SVG output (estabilidad)
   - Round-trip JSON si aplica (mermaid-like)
   - Edge cases: payload vacío, malformed, con nodos sueltos
3. **Stagehand tests** en `demos/diagramas/<nombre>/_testing/<nombre>.stagehand.test.mjs`
   - Renderiza el HTML en Chromium
   - Verifica presencia de nodos, aristas, labels esperados
   - Verifica accesibilidad (aria-* cuando aplique)
   - Verifica `prefers-reduced-motion` cuando haya animación
   - Verifica interacción mínima (hover, click si aplica)
4. **Tests unitarios `.test.ts`** en `src/components/diagrams/__tests__/<nombre>.test.ts` (opcional pero recomendado)
   - Funciones puras del spec (resolveClassSpec, computeClassLayout, etc.)
   - Validación de input / normalización

Las hojas de T2-T3 entregan:
- Archivos `.ts` tipados
- Demo + test básico + stagehand test para cada diagrama del scope
- Verificación local: `npm run typecheck` + `npx tsc -p tsconfig.strict-audit.json` + Playwright 19/19 + los nuevos tests del scope

## Ubicación canónica de demos

- Raíz: `demos/diagramas/`
- Subcarpeta por diagrama: `demos/diagramas/<nombre>/`
- Testing: `demos/diagramas/<nombre>/_testing/`
- Solo existe `ER/` actualmente; T2-T3 crean las demás subcarpetas.

## Inventario (clean-room)

| Artefacto | Ruta | Rama | HEAD | Estado |
|---|---|---|---|---|
| worktree main | `C:\ContaPyme\Personal\apps\is-webcomponents` | `main` | `df2f4ec92` | activo (limpio post-commit) |
| worktree root | `C:\ContaPyme\Personal\apps\WT\is-webcomponents-wt-root-types-strong-2026` | `wt-root-types-strong-2026` | `df2f4ec92` | activo |
| manifest root | `WIP-wt-root-types-strong-2026.md` | — | — | activo |
| plan-activo | `specs/health/wip-history/plan-activo.md` | — | — | activo |
| checkpoint-actual | `specs/health/wip-history/checkpoint-actual.md` | — | — | activo |
| file-locks | `specs/health/wip-history/file-locks.md` | — | — | activo |

## Mensajes recientes con hermanas

(Ninguno aún — Tanda 1 no ha arrancado)

## Gate status (Tanda 0 — baseline)

- npm run typecheck: ✓ verde
- strict audit: 8,777 errores (baseline)
- Playwright 19/19: ✓ 21/21 (2 skipped)
- round-trip JSON: ✓ preservado