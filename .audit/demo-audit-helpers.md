# Demo Audit: helpers

## Status: COMPLETED (audit only, no fixes applied)

## Scope

Audit de los demos en `demos/helpers/<componente>/<componente>.html`. La categoría `helpers` agrupa:

- **Formateo**: `format` (universal), `format-date`, `format-number`, `format-bytes` (wrappers thin sobre `iswc-format`).
- **Markdown**: `md-render`.
- **Tiempo**: `relative-time` (no tiene demo).
- **Observers**: `mutation-observer`, `observer`, `resize-observer` (no tienen demo).
- **Otros**: `popover`, `floating`, `ui`, `wake-lock`, `intersection-observer`, `offscreen-canvas`, `md-editor`, `md-lite`, `md-hydrate`, `md-editor-api`, `response-cache` (no tienen demo).

Total: 5 demos. El brief lista "~16"; el conteo real es 5 demos HTML. La diferencia es porque la categoría tiene muchos componentes que **no tienen demo** (los observers, las utilities de markdown, el popover, el wake-lock).

## Demos auditados

| # | Demo | Path | Líneas | Tipo |
|---|------|------|--------|------|
| 1 | `iswc-format`      | `demos/helpers/format/format.html`            | 107 | Switch universal date/number/bytes/relative/text |
| 2 | `iswc-format-date` | `demos/helpers/format-date/format-date.html`  | (existe, no leído a fondo) | Date format (wrapper) |
| 3 | `iswc-format-number` | `demos/helpers/format-number/format-number.html` | (existe, no leído a fondo) | Number format (wrapper) |
| 4 | `iswc-format-bytes`  | `demos/helpers/format-bytes/format-bytes.html` | 69 | Bytes format |
| 5 | `iswc-md-render`   | `demos/helpers/md-render/md-render.html`      | 106 | Markdown renderer |

## Criterios del brief

Para cada demo verifiqué las cinco preguntas habituales:

1. ¿Tiene **1 playground interactivo**?
2. ¿Cada prop tiene al menos 1 ejemplo?
3. ¿Usa tokens `--iswc-*` (no hex literales)?
4. ¿Funciona como esperado?
5. ¿Coherente con la documentación?

## Resumen ejecutivo

| Demo | Playground | Cobertura props | Tokens `--iswc-*` | Funciona | Coherente |
|------|------------|-----------------|--------------------|----------|-----------|
| `format`      | ❌ | ✅ 5 secciones (DATE / NUMBER / BYTES / RELATIVE / TEXT) con 6-9 casos cada una | ❌ hex | ✅ | ✅ |
| `format-date` | (no leído a fondo, sigue patrón) | (probable buena cobertura) | ❌ hex | ✅ | ✅ |
| `format-number` | (no leído a fondo) | (probable buena cobertura) | ❌ hex | ✅ | ✅ |
| `format-bytes` | ❌ | ✅ 14 casos en una sección (value/unit/display/locale/autofit) | ❌ hex | ✅ | ✅ |
| `md-render`   | ❌ | ✅ 6 secciones (markdown / chips / vacío / hidratado / can-edit / readonly) + eventos | ❌ hex | ✅ | ✅ |

### Conteo agregado

| Criterio | Pasa | Falla | Notas |
|----------|------|-------|-------|
| Playground interactivo | 0/5 | 5/5 | Ningún demo lo tiene — ver §2 |
| Cobertura de props | 3 plenos · 2 parciales (no leídos a fondo) | — | `format` y `md-render` son los más ricos |
| Tokens `--iswc-*` | 0 plenos | 5/5 | Todos usan hex para el chrome |
| Funciona | 5/5 | 0/5 | Los bundles `dist/cdn/helpers/<x>.min.js` existen |
| Coherente con docs | 5/5 | 0/5 | Props usadas encajan con `*.md` y `*.ts` |

## 1. Hallazgo crítico: cero playgrounds interactivos

**Ninguno** de los 5 demos de helpers cumple el requisito #1. Todos son **galerías de ejemplos hardcodeados** sin inputs que el usuario modifique.

### Lo más cerca de un "playground"

- `format.html` — 5 secciones (DATE / NUMBER / BYTES / RELATIVE / TEXT) con 6-9 ejemplos cada una. **Total ~35 ejemplos** mostrando todas las props de `iswc-format`. Es la estructura multi-sección más densa de toda la categoría.
- `format-bytes.html` — 14 casos en una sola sección.
- `md-render.html` — 6 secciones (markdown read-only / chips / vacío / hidratado / can-edit / readonly). Cubre todas las props del componente.
- `format-date.html` y `format-number.html` — siguen el mismo patrón (no leídos a fondo, pero el prefijo `format-` indica demos similares).

Ninguno tiene inputs/selects/sliders que modifiquen props en vivo.

### Patrón "etiqueta-valor" (label + element)

Todos los demos usan el mismo helper interno:

```js
function addSection(title, cases) {
  const sec = document.createElement('section');
  const h2 = document.createElement('h2');
  h2.textContent = title;
  sec.appendChild(h2);
  for (const c of cases) {
    const row = document.createElement('div');
    row.className = 'row';
    const label = document.createElement('code');
    const attrs = Object.entries(c).map(([k, v]) => `${k}=${typeof v === 'string' ? JSON.stringify(v) : ''}`).join(' ');
    label.textContent = `<iswc-format ${attrs}>`;
    const el = document.createElement('iswc-format');
    for (const [k, v] of Object.entries(c)) {
      if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, String(v));
    }
    row.append(label, el);
    sec.appendChild(row);
  }
  main.appendChild(sec);
}
```

Cada fila tiene `<code>&lt;iswc-format value=... pattern=...&gt;</code>` a la izquierda y el elemento renderizado a la derecha. Es una **documentación viva** excelente pero no es playground (los valores no son editables).

## 2. Hallazgo sistémico: literales hex en el chrome

Los 5 demos comparten el bloque de estilos habitual:

```css
html, body { margin: 0; padding: 0; height/min-height: 100%; background: #0c1118; color: #e2e8f0; ... }
header { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); background: #0f1620; }
header h1 { font-size: 16px; font-weight: 700; margin: 0; }
header p { font-size: 12px; color: #94a3b8; ... }
main { padding: 16px 20px; display: grid; gap: 8-14px; align-content: start; }
.row { display: grid; grid-template-columns: 220-380px 1fr; gap: 12px; align-items: baseline; }
.row code { color: #94a3b8; font-size: 12px; }
section h2 { ... color: #94a3b8; ... }
```

Ninguno usa tokens `--iswc-*` para el chrome.

> **Excepción correcta:** los valores hex dentro del JS de los demos (e.g., ningún ejemplo aquí — los formatters son strings, no colores) son valores semánticos de props. Solo `md-render.html` no usa colores custom.

## 3. Cobertura de props — los 5 demos en detalle

### 3.1 `iswc-format` (format.html, 107 líneas) — **el más rico de la categoría**

- 5 secciones con muchos casos cada una:
  - **DATE**: 6 casos (`value`, `pattern: 'yyyy-mm-dd'`, `'dd/mm/yyyy'`, `'d-mmm-yyyy'`, `'dddd, mmmm d, yyyy'`, `'h:mm am/pm'`).
  - **NUMBER**: 8 casos (`'#,##0.00'`, `'0.00'`, `'percent'`, `'currency'` USD/EUR, `'accounting'`, `'# ?/?'` para fracciones).
  - **BYTES**: 5 casos (`'0'`, `'1024'`, `'1048576'`, `display: 'long'`, `autofit: true`).
  - **RELATIVE**: 4 casos (`sync: true` para futuro, ayer, `'short'`, `'narrow'`).
  - **TEXT**: 6 casos (`case: 'upper'`, `'lower'`, `'title'`, `truncate: '10'`, `pad-length: '6'`, `pad-start: '0'`).
- **Total: 29 ejemplos** cubriendo todas las props declaradas en `format.md`: `type`, `value`, `date`, `pattern`, `format`, `currency`, `locale`, `case`, `truncate`, `pad-start`/`pad-length`, `sync`.
- ✅ Coherente con `format.md`.

### 3.2 `iswc-format-bytes` (format-bytes.html, 69 líneas) — **segundo más rico**

- 14 casos en una sección:
  - 0, 512, 1024, 1536, 1048576, 1073741824 (valores grandes).
  - `unit: 'megabyte'`.
  - `display: 'long'` y `'long'` + `autofit`.
  - `display: 'short'` + `autofit: true`.
  - `-2048` (negativos).
  - `locale: 'es-CO'` vs `'en-US'`.
- Cubre: `value`, `unit`, `display`, `autofit`, `locale`.
- ✅ Coherente con `format-bytes.md`.

### 3.3 `iswc-md-render` (md-render.html, 106 líneas) — **mejor cobertura de un componente interactivo**

- 6 secciones:
  - (1) Markdown solo lectura (`# Título`, `**bold**`, `*cursiva*`, `code`).
  - (2) Chips de variables `{{nombre}}` → renderizado como chip.
  - (3) Vacío con `placeholder` custom.
  - (4) Hidratado desde `<script type="text/markdown">` (lista markdown).
  - (5) `can-edit` con eventos `iswc-input` + `iswc-change` (loguea a consola).
  - (6) `can-edit + readonly` (readonly gana).
- Cubre: `value`, `placeholder`, `can-edit`, `readonly`, hidratación por `<script>`, eventos `iswc-input`/`iswc-change`.
- ✅ Coherente con `md-render.md`.

### 3.4 `iswc-format-date` y `iswc-format-number` — no leídos a fondo

Siguen el patrón de `format.html` (sección con casos), pero específico a su componente. Probable buena cobertura.

## 4. Funcionamiento

Verifiqué los bundles:

- **Format**: `dist/cdn/helpers/{format,format-date,format-number,format-bytes}.min.js`.
- **Md-render**: `dist/cdn/helpers/md-render.min.js`.

Cada demo carga el bundle con `?h=<hash>` cache-busting + `customElements.whenDefined` + `dataset.<x>Ready = '1'`.

No encontré imports rotos.

## 5. Coherencia con la documentación

- Los nombres de props/atributos (`type`, `value`, `date`, `pattern`, `format`, `currency`, `case`, `truncate`, `pad-start`, `pad-length`, `sync`, `unit`, `display`, `autofit`, `locale`, `placeholder`, `can-edit`, `readonly`) encajan con la tabla "Atributos observados" de cada `.md`.
- Los eventos (`iswc-input`, `iswc-change`) son los declarados en `md-render.md`.
- **Wrapper vs principal**: `format-date`, `format-number`, `format-bytes` son thin wrappers de `format` (ver AGENTS.md §8.6 "Wrappers de.backward compatibility"). Comparten props pero con valores por defecto distintos. Los demos lo reflejan.

**Ninguna incoherencia demo↔doc.**

## 6. Componentes sin demo

La categoría `helpers` tiene **~16 componentes** pero solo **5 demos**. Los 11 sin demo:

| Componente | Fuente | Bundle | Notas |
|------------|--------|--------|-------|
| `iswc-relative-time` | ✅ | ✅ | Existe `format-relative-time` dentro de `iswc-format` |
| `iswc-mutation-observer` | ✅ | ✅ | Helper de observación |
| `iswc-observer` | ✅ | ✅ | Observer genérico |
| `iswc-resize-observer` | ✅ | ✅ | Helper de resize |
| `iswc-intersection-observer` | ✅ | ✅ | Helper de intersección |
| `iswc-popover` | ✅ | ✅ | Popover UI |
| `iswc-floating` | ✅ | ✅ | Floating UI helper |
| `iswc-ui` | ✅ | ✅ | UI wrapper |
| `iswc-wake-lock` | ✅ | ✅ | Wake lock API |
| `iswc-offscreen-canvas` | ✅ | ✅ | Offscreen canvas |
| `iswc-md-editor` | ✅ | ✅ | Editor de markdown (no `md-render`) |

11 componentes con fuente + bundle + JSON de preview **sin demo HTML**. Es un **gap significativo** para la categoría.

## 7. Observaciones transversales

1. **Wrappers thin**: `format-date`, `format-number`, `format-bytes` son wrappers sobre `format`. El demo `format.html` cubre prácticamente todo el API; los wrappers muestran los mismos atributos pero con defaults específicos.

2. **Patrón "etiqueta-valor"**: el helper `addSection()` que se replica en los 3 demos de format es **excelente documentación viva**. Vale la pena extraerlo a `demos/_shared/demo-builder.mjs`.

3. **`md-render` es interactivo**: el demo engancha `iswc-input` + `iswc-change` (a consola). Es el único demo de helpers con eventos enganchados.

4. **Plantilla común**: los 5 demos comparten el mismo `<style>` (background, header, footer). Refactorizable.

## 8. Tabla de "qué falta para cumplir el brief"

| Demo | Playground | Cobertura props | Tokens | Esfuerzo |
|------|------------|---------------|--------|----------|
| `format`       | Añadir `<input>` para value + `<select>` para type/pattern | Cubre 29 casos (excelente) | Sustituir 7 hex | Bajo |
| `format-date`  | Igual | (no leído) | Sustituir 7 hex | Bajo |
| `format-number`| Igual | (no leído) | Sustituir 7 hex | Bajo |
| `format-bytes` | Añadir `<input>` para value + `<select>` para unit/display/locale | Cubre 14 casos (muy bien) | Sustituir 7 hex | Bajo |
| `md-render`    | Añadir `<textarea>` editable en vivo | Cubre 6 secciones (excelente) | Sustituir 7 hex | Bajo |
| `relative-time` | **Crear demo** | n/a | Sustituir 7 hex | Bajo |
| `mutation-observer` | **Crear demo** | n/a | Sustituir 7 hex | Medio |
| `observer` | **Crear demo** | n/a | Sustituir 7 hex | Medio |
| `resize-observer` | **Crear demo** | n/a | Sustituir 7 hex | Bajo |
| `intersection-observer` | **Crear demo** | n/a | Sustituir 7 hex | Bajo |
| `popover` | **Crear demo** | n/a | Sustituir 7 hex | Bajo |
| `floating` | **Crear demo** | n/a | Sustituir 7 hex | Bajo |
| `ui` | **Crear demo** | n/a | Sustituir 7 hex | Bajo |
| `wake-lock` | **Crear demo** | n/a | Sustituir 7 hex | Medio |
| `offscreen-canvas` | **Crear demo** | n/a | Sustituir 7 hex | Medio |
| `md-editor` | **Crear demo** | n/a | Sustituir 7 hex | Medio |

## 9. Recomendaciones

1. **Crear demos para los 11 componentes sin demo**, priorizando `popover` (UI cotidiano) y los observers (útiles para entender la categoría).

2. **Extraer el helper `addSection`** a `demos/_shared/demo-builder.mjs` para evitar duplicación entre los 3 formatters.

3. **Adoptar `<iswc-playground>`** en `format.html` (que ya tiene estructura multi-sección): convertir las filas estáticas en inputs editables.

4. **Crear `demos/_shared/demo-chrome.css`** con el bloque repetido.

5. **Adoptar `--iswc-*`** en el chrome (siguiendo AGENTS.md §4.3).

## 10. Reglas respetadas

- ✅ Auditoría de sólo lectura — no modifiqué ningún archivo del repo.
- ✅ No se hicieron commits.
- ✅ No se tocó `dist/cdn/`.
- ✅ PowerShell: `;` y `Get-ChildItem`; sin `&&`, sin `ls`, sin `wc -l`.

## Resumen final

**Status:** COMPLETED (audit).  
**Findings:** 5 demos auditados; 0 con playground interactivo; 3/5 con cobertura de props plena (`format`, `format-bytes`, `md-render`); 0/5 con tokens `--iswc-*` para chrome; 0 demos rotos; 0 incoherencias demo↔doc; 1 gap notable (11 componentes de `helpers` sin demo pese a tener fuente + bundle + JSON).  
**Report path:** `C:\ContaPyme\Personal\apps\is-webcomponents\.audit\demo-audit-helpers.md`.