# Tests a implementar (F0.4) — cola priorizada

**Proyecto**: .
**Generado**: 2026-09-18T11:01:57.802Z
**Resumen**: 310 propuestas | 18 nuevas | 292 duplicadas | top-30 priorizadas por impacto

## Top 30 (orden de implementación sugerido)

| # | Grupo | Testable | Propuesta | Impacto |
|---|---|---|---|---|
| 1 | g-captain-2026 | `xss-escape` (cross-cutting — affects 8+ files) | `escapeHtml()` aplicado en `maps.ts` attribution | 20 |
| 2 | g-captain-2026 | `xss-escape` (cross-cutting — affects 8+ files) | `escapeHtml()` aplicado en `checkbox.preview.ts... | 20 |
| 3 | g-captain-2026 | `xss-escape` (cross-cutting — affects 8+ files) | `esc()` no escapa backticks: tests que comprueb... | 10 |
| 4 | g-captain-2026 | `xss-escape` (cross-cutting — affects 8+ files) | XSS payload collection: 20+ vectores comunes | 10 |
| 5 | g-captain-2026 | `xss-escape` (cross-cutting — affects 8+ files) | `allowHtml: true` en toast sanitiza | 10 |
| 6 | g-captain-2026 | `xss-escape` (cross-cutting — affects 8+ files) | CSP header recomendado para demos hosted | 10 |
| 7 | g-captain-2026 | `gpu-animation` (cross-cutting: `org-chart.css`, `quadrant-chart.css`) | `quadrant-chart.css`: NO `transition: d` | 7 |
| 8 | g-captain-2026 | `wakelock-typing` (single-file: `wake-lock.ts`) | Release sentinel: `release()` al `disconnectedC... | 0 |
| 9 | g-captain-2026 | `theme-cast` (cross-cutting: 7 diagram files) | DiagramTheme extendido con índice signature com... | 0 |
| 10 | g-captain-2026 | `tree-node-unified` (single-file: `mindmap-spec.ts`) | `mindmap-spec.ts`: `import TreeNode as Imported... | 0 |
| 11 | g-captain-2026 | `tree-node-unified` (single-file: `mindmap-spec.ts`) | Cast `as unknown as ImportedTreeNode` en `layou... | 0 |
| 12 | g-captain-2026 | `prefs-quota-error` (single-file: `src/components/_shared/prefs.ts`) | `prefs.ts`: log warning al tragar `QuotaExceede... | 0 |
| 13 | g-navigation | is-carousel | Autoplay pausa al hacer hover | 0 |
| 14 | g-navigation | is-breadcrumb | JSON-LD BreadcrumbList | 0 |
| 15 | g16 | masks-tokens (input masking tokens) | Máscara teléfono MX `(##) ####-####` | 0 |
| 16 | g16 | masks-tokens (input masking tokens) | Máscara RFC `AAAA######XXX` | 0 |
| 17 | g8 | date-utils (parseISO / formatTime / firstDayOfWeek / uses12Hour / isoWeek) | firstDayOfWeek('en-US') === 0 (domingo), 'es-CO... | 0 |
| 18 | g8 | cdn-ref (http-client + storage) | Cache quota exceeded → degradar a network sin t... | 0 |

## Detalle de las top-15 (con descripción completa)

### 1. `escapeHtml()` aplicado en `maps.ts` attribution
- **Testable**: ``xss-escape` (cross-cutting — affects 8+ files)`
- **Grupo**: g-captain-2026 · **Impacto**: 20
- **Descripción**: [security, xss] — HALLAZGO gap-3

### 2. `escapeHtml()` aplicado en `checkbox.preview.ts` labelHtml
- **Testable**: ``xss-escape` (cross-cutting — affects 8+ files)`
- **Grupo**: g-captain-2026 · **Impacto**: 20
- **Descripción**: [security, xss] — HALLAZGO gap-3

### 3. `esc()` no escapa backticks: tests que comprueban bypass
- **Testable**: ``xss-escape` (cross-cutting — affects 8+ files)`
- **Grupo**: g-captain-2026 · **Impacto**: 10
- **Descripción**: [security, regression]

### 4. XSS payload collection: 20+ vectores comunes
- **Testable**: ``xss-escape` (cross-cutting — affects 8+ files)`
- **Grupo**: g-captain-2026 · **Impacto**: 10
- **Descripción**: [security, regression]

### 5. `allowHtml: true` en toast sanitiza
- **Testable**: ``xss-escape` (cross-cutting — affects 8+ files)`
- **Grupo**: g-captain-2026 · **Impacto**: 10
- **Descripción**: [security, xss] — HALLAZGO gap-18

### 6. CSP header recomendado para demos hosted
- **Testable**: ``xss-escape` (cross-cutting — affects 8+ files)`
- **Grupo**: g-captain-2026 · **Impacto**: 10
- **Descripción**: [security, a11y]

### 7. `quadrant-chart.css`: NO `transition: d`
- **Testable**: ``gpu-animation` (cross-cutting: `org-chart.css`, `quadrant-chart.css`)`
- **Grupo**: g-captain-2026 · **Impacto**: 7
- **Descripción**: [performance, regression] — HALLAZGO gpu-animation

### 8. Release sentinel: `release()` al `disconnectedCallback`
- **Testable**: ``wakelock-typing` (single-file: `wake-lock.ts`)`
- **Grupo**: g-captain-2026 · **Impacto**: 0
- **Descripción**: [browser-api, lifecycle]

### 9. DiagramTheme extendido con índice signature compatible con TurtleTheme
- **Testable**: ``theme-cast` (cross-cutting: 7 diagram files)`
- **Grupo**: g-captain-2026 · **Impacto**: 0
- **Descripción**: [typing, architecture]

### 10. `mindmap-spec.ts`: `import TreeNode as ImportedTreeNode`
- **Testable**: ``tree-node-unified` (single-file: `mindmap-spec.ts`)`
- **Grupo**: g-captain-2026 · **Impacto**: 0
- **Descripción**: [typing, regression] — HALLAZGO tree-node-unified

### 11. Cast `as unknown as ImportedTreeNode` en `layoutTree`
- **Testable**: ``tree-node-unified` (single-file: `mindmap-spec.ts`)`
- **Grupo**: g-captain-2026 · **Impacto**: 0
- **Descripción**: [typing, regression]

### 12. `prefs.ts`: log warning al tragar `QuotaExceededError`
- **Testable**: ``prefs-quota-error` (single-file: `src/components/_shared/prefs.ts`)`
- **Grupo**: g-captain-2026 · **Impacto**: 0
- **Descripción**: [error-handling, regression] — HALLAZGO prefs-quota-error

### 13. Autoplay pausa al hacer hover
- **Testable**: `is-carousel`
- **Grupo**: g-navigation · **Impacto**: 0
- **Descripción**: mouseenter congela, mouseleave reanuda con remaining.

### 14. JSON-LD BreadcrumbList
- **Testable**: `is-breadcrumb`
- **Grupo**: g-navigation · **Impacto**: 0
- **Descripción**: *(gap SEO)*.

### 15. Máscara teléfono MX `(##) ####-####`
- **Testable**: `masks-tokens (input masking tokens)`
- **Grupo**: g16 · **Impacto**: 0
- **Descripción**: Categoría: integration. Acción: applyMask('5512345678'). Aserción: '(55) 1234-5678'. Si ya existe: NA.

## Duplicadas (descartadas)

Total: 292. Ya cubiertas por tests existentes.