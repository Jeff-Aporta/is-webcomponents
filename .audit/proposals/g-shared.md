# F0.3 iswc g8+g14+g16+g18 (255 testables, 410 propuestas)

## Hallazgo crítico transversal

**GREENFIELD**: 0 archivos `*.test.ts` en `src/`. Las 410 propuestas son 100% netas.

## Grupos

| Grupo | Testables | Top-10 | Propuestas | Gaps |
|---|---|---|---|---|
| g8 (_shared+feedback+pages+core+scripts+data-viz+overlays) | 65 | 10 (form-control-mixin, modal-base, picker-element, scroll-memory, date-utils, intent, cdn-ref, theme-scope, prefs, diagram-element-base) | 100 | 6 |
| g14 (diagrams+forms+media+scripts+data+navigation+data-viz) | 77 | 10 (component-spec, sequence-spec, er-spec, flowchart-spec, csv-export, value-formatter, server-datasource, icon-explorer, media-recorder, heatmap) | 100 | 7 |
| g16 (forms+components+feedback+cdn) | 43 | 10 (sheet-cache, ensure-element, load-plan, collect-is-tags, masks-tokens, input.preview, select.preview, slider.preview, rte.preview + 1 más) | 100 | 4+ |
| g18 (isp+feedback+data+_shared+charts+overlays+layout+styles+scripts+utils) | 70 | 11 (toast-item, toast, tooltip, palette-selector, form-json, controller-from-config, grid-model, column-state, pipeline-filtering, selection, viewport) | 110 | 5+ |
| **TOTAL** | **255** | **41** | **410** | **22+** |

## Top-5 gaps a priorizar

1. **modal-base focus-trap sin focusables** (g8-2): Tab cycling con `<dialog>` vacío puede perder foco. WCAG 2.4.3 violation.
2. **server-datasource SQL parser** (g14-7): regex-based quoted string handling — riesgo de SQL injection si se filtra `O'Brien`. Necesita fuzz tests.
3. **sheet-cache monkey-patch global** (g16-1): `ShadowRoot.prototype.prepend` parcheado sin dispose simétrico.
4. **form-json radios null cuando ninguno checkeado** (g18-form-json-3): rompe formularios con required radio.
5. **toast-item countdown + pause/resume race conditions** (g18-toast-item-2..10): 9 propuestas sin tests.

## Discrepancias de nomenclatura

- `theme-scope.ts`, `diagram-element-base.ts` mencionados en prompts pero NO encontrados en `_shared/` directo.
- `palette-selector.test.ts` listado 2× en prompt g18, `chart.test.ts` y `treemap.test.ts` duplicados.
- `data/ag-grid.preview.ts` vs `data-grid.preview.ts` — ¿mismo archivo renombrado?
- `scripts/serve.mjs`: en listado de testables pero NO debería tener test unit (es dev server).
- `cdn/loader.ts` aparece en filesystem pero NO en discovery de g16.

## Categorías cubiertas (8 obligatorias)

✅ Input validation & error handling
✅ Performance / memoization / debounce / throttle
✅ Internacionalización (locale/timezone)
✅ Accesibilidad (screen reader, keyboard)
✅ Integración cross-component
✅ Security (XSS, focus-trap, sanitization)
✅ Reduced motion / prefers-color-scheme
✅ Edge cases / race conditions

## F0.4 batch recomendado

- **A** (mixins/bases): form-control-mixin, modal-base, picker-element (g8)
- **B** (data cores): value-formatter, csv-export, server-datasource, pipeline-filtering, grid-model (g14/g18)
- **C** (broadcasters): toast, toast-item, tooltip, theme-toggle, palette-selector (g18)
- **D** (puentes): form-json, controller-from-config (g18)
- **E** (CDN): sheet-cache, ensure-element, load-plan (g16)
