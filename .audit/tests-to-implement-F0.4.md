# Tests a implementar (F0.4) — cola priorizada

**Proyecto**: .
**Generado**: 2026-09-18T04:46:09.367Z
**Resumen**: 4102 propuestas | 286 nuevas | 3816 duplicadas | top-30 priorizadas por impacto

## Top 30 (orden de implementación sugerido)

| # | Grupo | Testable | Propuesta | Impacto |
|---|---|---|---|---|
| 1 | g39 | `dom-utils.ts` (src/components/_shared/dom-utils.ts — 220 LOC) | SQL escape: previene injection en atributos | 20 |
| 2 | g41 | checkbox.ts (279 LOC, webcomponent+event) | `escapeHtml` aplicado a label dinámico — XSS pr... | 20 |
| 3 | g41 | full-calendar.ts (~255 LOC, webcomponent+event) | `escapeHtml` en títulos de eventos — XSS preven... | 20 |
| 4 | g43 | `src/components/isp/block-layout.ts` (block-layout — 340 LOC) | SQL parametrizada: input del usuario nunca va l... | 20 |
| 5 | g43 | `src/components/isp/tree-view.ts` (tree-view — 420 LOC) | SQL parametrizada en queries de hijos | 20 |
| 6 | g17 | `src/previews/_kit/render.ts` (~228 LOC) | renderBlock 'table' genera thead/tbody correctos | 15 |
| 7 | g43 | `src/components/isp/_shared/tree-view/00-as-row.ts` (00-as-row — 180 LOC) | SQL injection en `label` se escapa al renderizar | 15 |
| 8 | g39 | `server.ts` (src/utils/testing/e2e/lib/server.ts — 480 LOC) | Database: pool de conexiones | 12 |
| 9 | g39 | `server.ts` (src/utils/testing/e2e/lib/server.ts — 480 LOC) | Database: timeout en query lenta | 12 |
| 10 | g39 | `server.ts` (src/utils/testing/e2e/lib/server.ts — 480 LOC) | Cleanup: shutdown cierra conexiones DB | 12 |
| 11 | g42 | `src/components/helpers/format-bytes.ts` (121 LOC — `<is-format-bytes>` + `formatBytes`/`toBytes`) | Petabytes: `formatBytes(1125899906842624)` → `1... | 12 |
| 12 | g44 | `src/components/layout/main.ts` (webcomponent,database,storage) | Migración concurrente detectada y rechazada (lock) | 12 |
| 13 | g44 | `src/components/layout/main.ts` (webcomponent,database,storage) | Race: `connectedCallback` llamado antes de migr... | 12 |
| 14 | g17 | `src/components/_shared/diagram-edit.ts` (~319 LOC) | openInlineEditor Escape llama onCancel y remuev... | 10 |
| 15 | g17 | `src/components/_shared/prompt-md.ts` (~291 LOC) | extractPromptVariables deduplica en orden de ap... | 10 |
| 16 | g17 | `src/components/_shared/prompt-md.ts` (~291 LOC) | renamePromptVariable rechaza newName inválido y... | 10 |
| 17 | g17 | `src/components/helpers/md-lite.ts` (~256 LOC) | mdToHtml tablas GFM con alineación :--- / ---: ... | 10 |
| 18 | g17 | `src/utils/system/controles.ts` (~199 LOC) | montarControles acumula errores y loggea una so... | 10 |
| 19 | g26 | `duration-picker.preview.ts` (src/components/forms/duration-picker.preview.ts — 17 LOC) | `console.log` no debe ser usado en producción | 10 |
| 20 | g39 | `server.ts` (src/utils/testing/e2e/lib/server.ts — 480 LOC) | X-Frame-Options: DENY | 10 |
| 21 | g39 | `server.ts` (src/utils/testing/e2e/lib/server.ts — 480 LOC) | Database: conexión con SQLite | 10 |
| 22 | g39 | `server.ts` (src/utils/testing/e2e/lib/server.ts — 480 LOC) | CORS headers | 10 |
| 23 | g40 | `src/components/feedback/toast-item.ts` (239 LOC) | `focusin` pausa, `focusout` reanuda | 10 |
| 24 | g40 | `scripts/serve.mjs` (100 LOC) | Path traversal bloqueado | 10 |
| 25 | g41 | duration-picker.ts (183 LOC, webcomponent+sql-query+event) | ArrowUp/ArrowDown incrementan/decrementan el ca... | 10 |
| 26 | g41 | slider.ts (780 LOC, webcomponent+event) | `Home` y `End` van a min/max | 10 |
| 27 | g41 | isp/_shared/tree-view/05-view.ts (~160 LOC, worker) | `resyncExpandedToCurrentTree` añade ancestros d... | 10 |
| 28 | g42 | `src/components/_shared/popup-dismiss.ts` (135 LOC — listener lifecycle factory) | `onEscape`/`onKeydown`/`onOutside` opcionales →... | 10 |
| 29 | g42 | `src/components/isp/_shared/tree-view/render-rows.ts` (298 LOC — pintado DOM de filas recursivo) | Children: `hasChildren && isNodeOpen` → crea `.... | 10 |
| 30 | g43 | `src/components/isp/form.ts` (form — 380 LOC) | CSRF token automático via cookie | 10 |

## Detalle de las top-15 (con descripción completa)

### 1. SQL escape: previene injection en atributos
- **Testable**: ``dom-utils.ts` (src/components/_shared/dom-utils.ts — 220 LOC)`
- **Grupo**: g39 · **Impacto**: 20
- **Descripción**: [security, sql-query]

### 2. `escapeHtml` aplicado a label dinámico — XSS prevention
- **Testable**: `checkbox.ts (279 LOC, webcomponent+event)`
- **Grupo**: g41 · **Impacto**: 20
- **Descripción**: [cat: security]

### 3. `escapeHtml` en títulos de eventos — XSS prevention
- **Testable**: `full-calendar.ts (~255 LOC, webcomponent+event)`
- **Grupo**: g41 · **Impacto**: 20
- **Descripción**: [cat: security]

### 4. SQL parametrizada: input del usuario nunca va literal
- **Testable**: ``src/components/isp/block-layout.ts` (block-layout — 340 LOC)`
- **Grupo**: g43 · **Impacto**: 20
- **Descripción**: [security,database]

### 5. SQL parametrizada en queries de hijos
- **Testable**: ``src/components/isp/tree-view.ts` (tree-view — 420 LOC)`
- **Grupo**: g43 · **Impacto**: 20
- **Descripción**: [security,database]

### 6. renderBlock 'table' genera thead/tbody correctos
- **Testable**: ``src/previews/_kit/render.ts` (~228 LOC)`
- **Grupo**: g17 · **Impacto**: 15
- **Descripción**: [BR]

### 7. SQL injection en `label` se escapa al renderizar
- **Testable**: ``src/components/isp/_shared/tree-view/00-as-row.ts` (00-as-row — 180 LOC)`
- **Grupo**: g43 · **Impacto**: 15
- **Descripción**: [security,xss]

### 8. Database: pool de conexiones
- **Testable**: ``server.ts` (src/utils/testing/e2e/lib/server.ts — 480 LOC)`
- **Grupo**: g39 · **Impacto**: 12
- **Descripción**: [database, edge-case]

### 9. Database: timeout en query lenta
- **Testable**: ``server.ts` (src/utils/testing/e2e/lib/server.ts — 480 LOC)`
- **Grupo**: g39 · **Impacto**: 12
- **Descripción**: [database, edge-case]

### 10. Cleanup: shutdown cierra conexiones DB
- **Testable**: ``server.ts` (src/utils/testing/e2e/lib/server.ts — 480 LOC)`
- **Grupo**: g39 · **Impacto**: 12
- **Descripción**: [edge-case, database]

### 11. Petabytes: `formatBytes(1125899906842624)` → `1 PB`
- **Testable**: ``src/components/helpers/format-bytes.ts` (121 LOC — `<is-format-bytes>` + `formatBytes`/`toBytes`)`
- **Grupo**: g42 · **Impacto**: 12
- **Descripción**: [categoria: PF/edge-case]

### 12. Migración concurrente detectada y rechazada (lock)
- **Testable**: ``src/components/layout/main.ts` (webcomponent,database,storage)`
- **Grupo**: g44 · **Impacto**: 12
- **Descripción**: [database, edge-case, ER]

### 13. Race: `connectedCallback` llamado antes de migraciones completadas
- **Testable**: ``src/components/layout/main.ts` (webcomponent,database,storage)`
- **Grupo**: g44 · **Impacto**: 12
- **Descripción**: [database, edge-case, ER]

### 14. openInlineEditor Escape llama onCancel y remueve el editor
- **Testable**: ``src/components/_shared/diagram-edit.ts` (~319 LOC)`
- **Grupo**: g17 · **Impacto**: 10
- **Descripción**: [UX/a11y]

### 15. extractPromptVariables deduplica en orden de aparición
- **Testable**: ``src/components/_shared/prompt-md.ts` (~291 LOC)`
- **Grupo**: g17 · **Impacto**: 10
- **Descripción**: [BR]

## Duplicadas (descartadas)

Total: 3816. Ya cubiertas por tests existentes.