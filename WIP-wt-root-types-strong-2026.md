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

[2026-09-17T19:50:00Z] — WT-0031 listo. Errores: 7,897 → 7,520 (−377). SHAs: cfdad173c4 (sequence-diagram), f6ed148ff5 (state-diagram), 1e7a0f63cf (flowchart), 91c1895f0b (use-case-diagram), e49ae01c64 (venn-diagram), d764389d5d (gantt), 21bc48b965 (block-diagram). Gates: PASS.

[2026-09-17T21:30:00Z] — WT-0032-bis listo. Errores: 7,520 → 7,384 (−136). SHAs: e8d12e4a00 (timeline), 52c86a34f9 (component-diagram), e69404e76d (org-chart), de3b7c2aac (diagram-lightbox), ccdbbf5a47 (lightbox), 99ea7c3911 (test:org-chart demo+tests). Gates: PASS.

[2026-09-18T19:00:00Z] — WT-0041 listo. Errores: 7,384 → 6,365 (−1,019, scope 744→0). SHAs: 790b64ae1f (feat:data-grid 534→0), 154dbca120 (feat:data-grid.preview 210→0), d6d970849a (test:data-grid smoke 19/19 PASS). Gates: PASS.

## Gate status (Tanda 3 — WT-0032-bis cierre)

- npm run typecheck: ✓ verde
- strict audit: 7,520 → 7,384 (−136) — 5/5 archivos del scope con 0 errores strict audit
- tests básicos (.test.mjs): timeline 8/8, component 10/10, org-chart 6/6 verde
- Demos HTML: timeline, component, org-chart existen en `demos/diagramas/<nombre>/<nombre>.html`
- Tests exhaustivos: timeline, component, org-chart tienen `.test.mjs` + `.stagehand.test.mjs`
- round-trip JSON: ✓ preservado