# Tests a implementar (F0.4) — cola priorizada

**Proyecto**: .
**Generado**: 2026-09-10T13:57:12.918Z
**Resumen**: 436 propuestas | 12 nuevas | 424 duplicadas | top-30 priorizadas por impacto

## Top 30 (orden de implementación sugerido)

| # | Grupo | Testable | Propuesta | Impacto |
|---|---|---|---|---|
| 1 | g-navigation | is-carousel | Autoplay pausa al hacer hover | 0 |
| 2 | g-navigation | is-breadcrumb | JSON-LD BreadcrumbList | 0 |
| 3 | g14 | er-spec (entity-relationship) | Atributo multivaluado: ellipse doble | 0 |
| 4 | g14 | value-formatter | cellText combina getCellValue + formatCellValue | 0 |
| 5 | g14 | server-datasource (SQL generation + fake server) | buildJSONFiltro: startRow=0,endRow=100 → pagina... | 0 |
| 6 | g16 | masks-tokens (input masking tokens) | Máscara teléfono MX `(##) ####-####` | 0 |
| 7 | g16 | masks-tokens (input masking tokens) | Máscara RFC `AAAA######XXX` | 0 |
| 8 | g18 | toast-item (countdown + pause/resume) | mouseleave reanuda con remaining | 0 |
| 9 | g18 | controller-from-config (catálogo + btnRef HTTP+mock) | createCatalogController con mock data → filas d... | 0 |
| 10 | g18 | pipeline-filtering (filterRows, uniqueValues) | uniqueValues retorna sorted unique values | 0 |
| 11 | g8 | date-utils (parseISO / formatTime / firstDayOfWeek / uses12Hour / isoWeek) | firstDayOfWeek('en-US') === 0 (domingo), 'es-CO... | 0 |
| 12 | g8 | cdn-ref (http-client + storage) | Cache quota exceeded → degradar a network sin t... | 0 |

## Detalle de las top-15 (con descripción completa)

### 1. Autoplay pausa al hacer hover
- **Testable**: `is-carousel`
- **Grupo**: g-navigation · **Impacto**: 0
- **Descripción**: mouseenter congela, mouseleave reanuda con remaining.

### 2. JSON-LD BreadcrumbList
- **Testable**: `is-breadcrumb`
- **Grupo**: g-navigation · **Impacto**: 0
- **Descripción**: *(gap SEO)*.

### 3. Atributo multivaluado: ellipse doble
- **Testable**: `er-spec (entity-relationship)`
- **Grupo**: g14 · **Impacto**: 0
- **Descripción**: Categoría: UI. Localizador: `ellipse.attr`. Acción: entity.attr `multivalued: true`. Aserción: 2 ellipses concentric. Si ya existe: NA.

### 4. cellText combina getCellValue + formatCellValue
- **Testable**: `value-formatter`
- **Grupo**: g14 · **Impacto**: 0
- **Descripción**: Categoría: integration. Acción: con def custom. Aserción: retorna formatted del valueGetter. Si ya existe: NA.

### 5. buildJSONFiltro: startRow=0,endRow=100 → pagina=1, qregistros=100
- **Testable**: `server-datasource (SQL generation + fake server)`
- **Grupo**: g14 · **Impacto**: 0
- **Descripción**: Categoría: integration. Acción: `buildJSONFiltro({request:{startRow:0,endRow:100}})`. Aserción: `{pagina:1, qregistros:100}`. Si ya existe: NA.

### 6. Máscara teléfono MX `(##) ####-####`
- **Testable**: `masks-tokens (input masking tokens)`
- **Grupo**: g16 · **Impacto**: 0
- **Descripción**: Categoría: integration. Acción: applyMask('5512345678'). Aserción: '(55) 1234-5678'. Si ya existe: NA.

### 7. Máscara RFC `AAAA######XXX`
- **Testable**: `masks-tokens (input masking tokens)`
- **Grupo**: g16 · **Impacto**: 0
- **Descripción**: Categoría: integration. Acción: applyMask('XAXX010101ABC'). Aserción: 'XAXX010101ABC'. Si ya existe: NA.

### 8. mouseleave reanuda con remaining
- **Testable**: `toast-item (countdown + pause/resume)`
- **Grupo**: g18 · **Impacto**: 0
- **Descripción**: Categoría: UX. Acción: mouseenter a 2s, wait 1s, mouseleave. Aserción: nuevo timer se acerca a 3s total. Si ya existe: NA.

### 9. createCatalogController con mock data → filas devueltas
- **Testable**: `controller-from-config (catálogo + btnRef HTTP+mock)`
- **Grupo**: g18 · **Impacto**: 0
- **Descripción**: Categoría: integration. Acción: `controller.getRows({request:{startRow:0,endRow:50}})`. Aserción: `success({rowData: mockRows})`. Si ya existe: NA.

### 10. uniqueValues retorna sorted unique values
- **Testable**: `pipeline-filtering (filterRows, uniqueValues)`
- **Grupo**: g18 · **Impacto**: 0
- **Descripción**: Categoría: unit. Acción: `uniqueValues(rows, countryCol)`. Aserción: `['AR', 'CL', 'MX']` (ordenado). Si ya existe: NA.

### 11. firstDayOfWeek('en-US') === 0 (domingo), 'es-CO' === 1 (lunes)
- **Testable**: `date-utils (parseISO / formatTime / firstDayOfWeek / uses12Hour / isoWeek)`
- **Grupo**: g8 · **Impacto**: 0
- **Descripción**: Categoría: i18n. Acción: `firstDayOfWeek('en-US')`. Aserción: `=== 0`. `firstDayOfWeek('es-CO') === 1`. Si ya existe: NA.

### 12. Cache quota exceeded → degradar a network sin throw
- **Testable**: `cdn-ref (http-client + storage)`
- **Grupo**: g8 · **Impacto**: 0
- **Descripción**: Categoría: error-handling. Acción: spy `cache.put` rechaza QuotaExceededError; spy `fetch` ok. Aserción: retorna texto sin throw. Si ya existe: NA.

## Duplicadas (descartadas)

Total: 424. Ya cubiertas por tests existentes.