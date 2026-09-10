# F0.3 is-webcomponents — Todas las propuestas

| Grupo | Testables | Propuestas | Archivo |
|---|---|---|---|
| g-navigation (sub-agente previo) | 7 | 109 | g-navigation.md (existente) |
| g-shared (g8+g14+g16+g18) | 41 | 410 | g-shared.md |
| g-iswc-tour-a11y (Top-50) | 50 | 500+ | g-iswc-tour-a11y.md |
| **TOTAL** | **98+** | **1,000+** | |

## Hallazgos consolidados

### GREENFIELD confirmado
0 archivos `*.test.ts` en `src/`. Las ~1,000 propuestas son 100% netas.

### P0 Críticos

1. **modal-base focus-trap sin focusables** (g8-2): Tab cycling con `<dialog>` vacío puede perder foco. WCAG 2.4.3.
2. **server-datasource SQL parser** (g14-7): regex-based quoted string handling → SQL injection O'Brien.
3. **sheet-cache monkey-patch global** (g16-1): `ShadowRoot.prototype.prepend` sin dispose simétrico.
4. **form-json radios null** (g18-form-json-3): rompe formularios con required radio.
5. **toast-item countdown race conditions** (g18): 9 propuestas sobre timers sutiles.
6. **is-tab-group role=tablist/aria-controls/aria-labelledby/scrollIntoView** ausentes.
7. **is-toast color=danger** NO eleva role=alert/aria-live=assertive.
8. **is-progress-bar indeterminate** no desactiva con prefers-reduced-motion.

### Gaps transversales (15 identificados)

| Gap | Testables afectados | Patrón WAI-APG |
|---|---|---|
| G1 role=tablist ausente | is-tab-group | APG Tabs |
| G2 aria-activedescendant ausente | select/combobox/palette/mention/command-palette | APG Combobox |
| G3 focus-trap ausente en overlays | drawer/window/modal-verificacion/confirm-delete/lightbox | APG Modal |
| G4 aria-live polite por defecto en críticos | toast/alert/notification-stack | APG Live Regions |
| G5 prefers-reduced-motion 27% cobertura | ~13 CSS sin wrap | WCAG 2.3.3 |
| G7 prefers-color-scheme dark NO respetado | todos CSS | WCAG 1.4.3 |
| G8 role=dialog/aria-modal inconsistente | 8 overlays | APG Dialog |
| G13 tabindex cycling ausente | dropdown/tree/mega-menu | APG Menu |
| G14 foco no restaurado al cerrar | drawer/window/lightbox | APG Modal |
| G15 aria-describedby ausente | tooltip/popover/popconfirm/dropdown | APG Tooltip |

### Categorías UI obligatorias aplicadas

✅ tour/onboarding
✅ focus management (focus-trap, focus restoration, roving)
✅ ARIA/screen reader
✅ teclado (Tab/Shift+Tab/Enter/Space/Escape/Arrow/Home/End)
✅ reduced-motion (prefers-reduced-motion)
✅ browser APIs (clipboard, fullscreen, getUserMedia, Notification)
✅ storage (localStorage, sessionStorage, IndexedDB)
✅ Performance / memoization
✅ Internacionalización
✅ Integración cross-component
