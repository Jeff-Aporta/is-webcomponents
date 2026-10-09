# Auditoría del kit iswc (iswc-audit)

- **Motor**: v1.0.0
- **Inicio**: 2026-09-10T03:04:10.454Z
- **Fin**: 2026-09-10T03:04:10.698Z
- **Duración**: 0.24s
- **Componentes auditados**: 185

## Resumen

| Estado | Cantidad |
|--------|----------|
| ✅ ok | 185 |
| ⚠️ warning | 0 |
| ❌ fail | 0 |

### Hallazgos por severidad

| Severidad | Cantidad |
|-----------|----------|
| 🛑 fatal | 0 |
| 🔴 error | 0 |
| 🟡 warn | 0 |
| 🔵 info | 6 |

## Componentes con hallazgos

### ✅ `iswc-demo` — Demo `(layout)`

- **Ruta JSON**: ``
- **Ruta módulo**: `src/components/layout/demo.ts`

- 🔵 📐 **json-schema** — No se encontró JSON de preview para <iswc-demo>.
  - 💡 Creá un archivo de definición siguiendo el esquema iswc-preview/v1.

### ✅ `iswc-preview-component` — Preview Component `(preview)`

- **Ruta JSON**: ``
- **Ruta módulo**: `src/components/layout/preview-component.ts`

- 🔵 📐 **json-schema** — No se encontró JSON de preview para <iswc-preview-component>.
  - 💡 Creá un archivo de definición siguiendo el esquema iswc-preview/v1.

### ✅ `iswc-preview-controls` — Preview Controls `(preview)`

- **Ruta JSON**: ``
- **Ruta módulo**: `src/components/layout/preview-controls.ts`

- 🔵 📐 **json-schema** — No se encontró JSON de preview para <iswc-preview-controls>.
  - 💡 Creá un archivo de definición siguiendo el esquema iswc-preview/v1.

### ✅ `phase7` — phase7 `()`

- **Ruta JSON**: `C:/ContaPyme/Personal/apps/iswc-root/src/pages/phase7.json`
- **Métricas**:
  - `secciones`: 6
  - `bloques`: 6
  - `demos`: 5
  - `controles`: 0

- 🔵 📝 **json-contenido** — Demo con 9 tags distintos: iswc-button, iswc-icon, iswc-dialog, iswc-input, iswc-select, iswc-option, iswc-textarea, iswc-switch…. Considerá partirlo en varios bloques.
  - 📄 `C:/ContaPyme/Personal/apps/iswc-root/src/pages/phase7.json`
- 🔵 📝 **json-contenido** — Demo con 11 tags distintos: iswc-card, iswc-badge, iswc-dropdown, iswc-button, iswc-icon, iswc-dropdown-item, iswc-tag, iswc-tab-group…. Considerá partirlo en varios bloques.
  - 📄 `C:/ContaPyme/Personal/apps/iswc-root/src/pages/phase7.json`
- 🔵 📝 **json-contenido** — Demo con 11 tags distintos: iswc-button, iswc-icon, iswc-split-panel, iswc-tree, iswc-tree-item, iswc-drawer, iswc-tab-group, iswc-tab…. Considerá partirlo en varios bloques.
  - 📄 `C:/ContaPyme/Personal/apps/iswc-root/src/pages/phase7.json`

## Cobertura por categoría

| Categoría | Componentes |
|-----------|-------------|
| forms | 36 |
| diagrams | 18 |
| data-viz | 17 |
| helpers | 16 |
| isp | 15 |
| feedback | 15 |
| navigation | 13 |
| media | 12 |
| layout | 12 |
| actions | 11 |
| data | 10 |
| — | 4 |
| overlays | 3 |
| preview | 2 |
| code | 1 |
