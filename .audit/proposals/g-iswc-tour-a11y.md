# F0.3 iswc TOUR & A11Y (Top-50 priorizado, 522 testables)

## Resumen ejecutivo

| Categoría | Detectados | Cubiertos 07-a11y-gaps | Pendientes |
|---|---|---|---|
| tour | 128 | 4 | 40+ |
| animation | 80 | 1 | +60 |
| css-part | 75 | 0 | 70 |
| webcomponent role=tablist | 1 | 1 | 0 |
| **TOTAL gaps nuevos** | | | **≥500 tests** |

## Top-50 priorizado por score impacto × frecuencia × WAI-APG × transversalidad

| # | Testable | Gap | Score | Tests ≥ |
|---|---|---|---|---|
| 1 | is-tab-group | role=tablist/aria-controls/aria-labelledby/scrollIntoView/roving | 100 | 12 |
| 2 | is-toast (danger/warning) | role=alert+aria-live=assertive cuando color=danger | 98 | 10 |
| 3 | is-dialog | focus-trap OK en modal-base; drawer/window/modal-verificacion/confirm-delete NO | 95 | 14 |
| 4 | is-drawer | role=dialog+aria-modal pero sin inert/focus-trap/reduced-motion | 93 | 12 |
| 5 | is-window | "NO modal" pero focus-robbing; sin aria-modal/return-focus/trap | 90 | 11 |
| 6 | is-command-palette | dialog nativo OK; sin aria-controls/aria-activedescendant | 88 | 11 |
| 7 | is-progress-bar indeterminate | prefers-reduced-motion no desactiva | 85 | 10 |
| 8 | is-progress-ring | igual que progress-bar | 83 | 10 |
| 9 | is-tree | role=tree+group pero sin aria-level/posinset/setsize/expanded | 82 | 12 |
| 10 | is-tree-view (ISP) | mismo + animación reduced-motion | 80 | 11 |
| 11 | is-spinner | reduced-motion OK pero sin role=status+aria-live/label | 78 | 10 |
| 12 | is-skeleton | shimmer sin reduced-motion; sin aria-busy/aria-hidden | 76 | 10 |
| 13 | is-carousel | Space NO pausa; sin aria-roledescription; reduced-motion NO | 75 | 12 |
| 14 | is-dropdown | role=menu pero sin aria-haspopup/expanded/activedescendant | 73 | 11 |
| 15 | is-select | sin aria-activedescendant/multiselectable/labelledby | 72 | 11 |
| 16 | is-combobox | sin aria-expanded/controls/activedescendant/labelledby | 71 | 11 |
| 17 | is-radio-group | sin role=radiogroup/aria-required/aria-checked | 70 | 10 |
| 18 | is-rating | sin role=slider ni radiogroup ni teclado | 68 | 10 |
| 19 | is-slider | animación thumb sin reduced-motion; sin aria-valuetext | 66 | 10 |
| 20 | is-switch | sin aria-label cuando slot vacío; reduced-motion thumb | 64 | 10 |
| 21 | is-anchor/is-button-group | sin role=group+aria-label cuando varios botones | 62 | 10 |
| 22 | is-copy-button | ripple sin reduced-motion; sin aria-live "Copiado" | 60 | 10 |
| 23 | is-speed-dial | sin aria-haspopup/expanded; animación sin reduced-motion | 60 | 10 |
| 24 | is-tooltip | sin role=tooltip/aria-describedby; delay sin escape | 58 | 10 |
| 25 | is-popconfirm | sin focus-trap | 57 | 10 |
| 26 | is-popover | sin aria-modal/focus management al abrir | 56 | 10 |
| 27 | is-modal-verificacion | NO extiende modal-base; trap manual o ausente | 85 | 12 |
| 28 | is-confirm-modal | sin foco inicial en Cancelar (WAI-APG) | 55 | 10 |
| 29 | is-confirm-delete | mismo | 54 | 10 |
| 30 | is-lightbox | sin focus-trap/Escape; animación zoom sin reduced-motion | 62 | 11 |
| 31 | is-date-picker | sin role=grid/aria-current para hoy; animación sin corto | 58 | 12 |
| 32 | is-month-calendar | sin role=grid/aria-selected | 52 | 10 |
| 33 | is-year-calendar | igual | 50 | 10 |
| 34 | is-digital-clock | sin role=timer ni aria-atomic | 48 | 10 |
| 35 | is-time-clock | sin role=listbox ni aria-activedescendant | 48 | 10 |
| 36 | is-duration-picker | sin role=group+aria-label | 46 | 10 |
| 37 | is-pin-input | sin aria-label indexado; paste no anuncia | 52 | 10 |
| 38 | is-masked-input | sin aria-describedby al patrón | 46 | 10 |
| 39 | is-mention | sin aria-activedescendant en textarea | 55 | 10 |
| 40 | is-color-picker | sin role=slider en R/G/B/A; sin aria-valuetext | 52 | 10 |
| 41 | is-file-input/is-dropzone | sin aria-describedby; dropzone sin role=button/label | 50 | 10 |
| 42 | is-doc-editor | contenteditable sin labelling; animación sin reduced-motion | 48 | 10 |
| 43 | is-inline-edit | display→input sin aria-live | 46 | 10 |
| 44 | is-md-editor/is-md-render | toolbar sin role=toolbar/aria-controls | 48 | 10 |
| 45 | is-data-grid/is-ag-grid | header sin role=row/columnheader; sin aria-rowcount | 92 | 14 |
| 46 | is-spreassheet | sin role=gridcell/aria-readonly | 80 | 12 |
| 47 | is-transfer | sin foco inicial al abrir; sin aria-labelledby por panel | 55 | 10 |
| 48 | is-chart | sin role=img+aria-label resumen; animación sin corto | 55 | 10 |
| 49 | is-video/is-video-playlist | sin aria-keyshortcuts; animación sin reduced-motion | 52 | 10 |
| 50 | is-breadcrumb/breadcrumb-item | sin aria-label en nav; falta JSON-LD BreadcrumbList (SEO) | 40 | 10 |

## 15 Gaps transversales

| Gap | Testables | Patrón violado | Fix |
|---|---|---|---|
| G1. role=tablist ausente | is-tab-group | APG Tabs | Setear role=tablist+tab+tabpanel+aria-controls/labelledby |
| G2. aria-activedescendant ausente en listbox | select/combobox/palette/mention/command-palette | APG Combobox | Input trigger aria-controls+aria-activedescendant |
| G3. Focus-trap ausente en overlays no-modales | drawer/window/modal-verificacion/confirm-delete/lightbox | APG Modal Dialog | Extraer modal-base a mixin reutilizable |
| G4. aria-live polite por defecto en críticos | toast/alert/notification-stack | APG Live Regions | color=danger/warning → role=alert+aria-live=assertive+aria-atomic |
| G5. prefers-reduced-motion solo en 22 CSS | ~13 CSS sin wrap (video/presentation/shell/data-grid/chart/speed-dial/...) | WCAG 2.3.3 | Wrap @keyframes/transition en `@media (prefers-reduced-motion: no-preference)` |
| G6. CSS parts no documentados | ~30 archivos sin part= | Shadow DOM contract | Inventariar componente×part×css-var |
| G7. prefers-color-scheme dark NO respetado | todos CSS | WCAG 1.4.3 | Añadir bloque en presentation.css |
| G8. role=dialog/aria-modal inconsistente | window/modal-verificacion/confirm-delete/lightbox/popover/popconfirm/command-palette | APG Dialog | Definir matriz overlay×role×aria-modal |
| G9. aria-keyshortcuts ausente en hotkeys | command-palette/modal-verificacion | WAI-ARIA 1.2 | dialog.setAttribute('aria-keyshortcuts', 'Escape') |
| G10. dialog nativo sin inert en browsers viejos | command-palette/popover | Compatibilidad | Verificar <dialog>.showModal()+inert en body; fallback |
| G11. ::slotted vs ::part mal usados | ~10 archivos | Shadow DOM scoping | Auditar cada ::slotted(*), confirmar |
| G12. @container queries mal aplicadas | form.css único | CSS Containment L3 | Generalizar a split-panel/dock/tree |
| G13. tabindex cycling ausente en menús | dropdown/tree/tree-view/mega-menu | APG Menu | Roving tabindex (-1 en inactivos, 0 en activo) |
| G14. Foco no restaurado al cerrar overlay | drawer/window/lightbox | APG Modal | lastFocus saving en todos los overlays |
| G15. aria-describedby ausente desde trigger | tooltip/popover/popconfirm/dropdown | APG Tooltip/Menu | trigger→popup con aria-describedby |

## Categorías NO exploradas a fondo (F0.4)

- css-part inventario: 75 archivos, ~12 con part= consistente → matriz componente×part×css-variable.
- animation prefers-reduced-motion: 80 CSS, 22 con media query → 27% cobertura debería ser 100%.
- @container queries: solo 1 archivo, generalizar.

## Archivos a tocar (orden F0.4)

1. `src/utils/testing/e2e/07-a11y-gaps.test.ts` — extender con 50 grupos.
2. `src/components/_shared/modal-base.ts` — extraer a mixin `withFocusTrap`.
3. `src/components/feedback/toast.ts` + `toast-item.ts` — elevar color=danger.
4. `src/components/navigation/tab-group.ts` — role=tablist+aria-controls+labelledby+scrollIntoView.
5. `src/styles/presentation.css` — prefers-color-scheme dark global.
6. 13 CSS huérfanos de prefers-reduced-motion — añadir wrapper.
