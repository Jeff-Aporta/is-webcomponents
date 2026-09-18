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

[2026-09-18T20:15:00Z] — WT-0042-bis listo. Errores: 6,872 → 6,653 (−219, scope 219→0). SHAs: 9e7c475409 (feat:icon-explorer-preview 219→0). Gates: PASS.

[2026-09-19T22:30:00Z] — WT-0052 listo. Errores: scope 337→0. SHAs: 6b706f1ac1 (feat:row-adapter-base 73→0), 0a3df78cce (feat:row-adapter-drag 58→0), 83aa001aaa (feat:md-editor 87→0), 23664980bd (feat:popover 70→0), 7cdbb9e87d (feat:format 49→0), 694727b9d7 (test:types-strong-wt0052 35/35 PASS). Gates: PASS.

[2026-09-19T23:30:00Z] — WT-0051 listo. Errores: 5,862 → 5,135 (−727 total; scope 650→0 + 14 extra en 01-contract.ts no-locked). SHAs: 7718bb3e0d (feat:_types shared infra: TNode/TreeCustoms/CustomsRuntime), 189b34d7da (feat:00-as-row 125→0), 1702c8fe2e (feat:02-model 71→0), 7afc320270 (feat:01-contract signatures + module augmentation para subclass compat), d91aef440d (feat:03-tree-shape 78→0), c703b4c03f (feat:04-tree-flow 104→0), dd6c4bbb7f (feat:05-view 50→0), 95f6c91ada (feat:06-mutations 112→0), b13401489d (feat:06b-history 59→0), 60a7b81f64 (feat:render-rows 51→0), 93ae751c76 (test:tree-view.smoke 21/21 PASS). Gates: PASS.

[2026-09-20T00:30:00Z] — WT-0062-bis listo. Errores: scope 100→0. SHAs: a1d19771d9 (feat:gallery-app 100→0). Gates: PASS.

[2026-09-18T13:50:00Z] — WT-0091 listo. Errores: scope ~165→0 (theming 75, palette-selector 56, ecosystem 15, home 4, stagehand 3, run-all 5, home-cdn 2, catalog 2, consistency 1 + types.d.ts + popup-dismiss.ts signature). SHAs: 59dd5fc55d (run-all 5→0), 38a76f00ba (home-cdn 2→0), cb808c5c4b (consistency 1→0), 37e7170864 (catalog 2→0), 3e9ed227ed (stagehand 3→0), 32a609a3a9 (preview-kit-types signal?+), e4350fa9ef (popup-dismiss PopupDismissOpciones), 0148d4249c (home 4→0), 7aef74e54c (ecosystem 15→0), 493e7abbbd (theming 75→0), 6b5d3704e8 (palette-selector 56→0). Gates: PASS.

[2026-09-20T03:30:00Z] — WT-0081 listo. Errores: navigation/ 82→0 (tab-group 19→0, tree 21→0, stepper 12→0, carousel 8→0, mega-menu 7→0, breadcrumb-item 6→0, scroller 4→0, mega-menu.preview 4→0, breadcrumb 1→0). SHAs: 88ea7b1241 (feat:tab-group 19→0, junto signature.preview), 7bc4b3c2c7 (feat:tree 21→0), 35bd4e87fa (feat:stepper 12→0), dc6ac8869e (feat:carousel 8→0), 0b1ebed4fe (feat:mega-menu 7→0), 886214e8db (feat:breadcrumb-item 6→0), 48c9de4359 (feat:scroller 4→0), 6a0d64502f (feat:mega-menu.preview 4→0), 44db4f42c0 (feat:breadcrumb 1→0). Gates: PASS.

## Gate status (Tanda 3 — WT-0032-bis cierre)

- npm run typecheck: ✓ verde
- strict audit: 7,520 → 7,384 (−136) — 5/5 archivos del scope con 0 errores strict audit
- tests básicos (.test.mjs): timeline 8/8, component 10/10, org-chart 6/6 verde
- Demos HTML: timeline, component, org-chart existen en `demos/diagramas/<nombre>/<nombre>.html`
- Tests exhaustivos: timeline, component, org-chart tienen `.test.mjs` + `.stagehand.test.mjs`
- round-trip JSON: ✓ preservado