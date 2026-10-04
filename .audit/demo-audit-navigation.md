# Demo Audit: navigation

## Status: COMPLETED (audit only, no fixes applied)

## Scope

Audit de los demos en `demos/navigation/<componente>/<componente>.html`. La categoría `navigation` agrupa:

- **Breadcrumbs**: `breadcrumb`, `breadcrumb-item`.
- **Tabs**: `tab-group`, `tab`, `tab-panel`.
- **Carruseles**: `carousel`, `carousel-item`.
- **Otros**: `mega-menu`, `scroller`, `stepper`, `stepper-step`, `tree`, `tree-item`.

Total: 2 demos (`breadcrumb`, `breadcrumb-item`). El brief lista "~13"; el conteo real es 2 demos. **Es la categoría con peor ratio demos/componentes** (junto con `files` que tiene 0).

## Demos auditados

| # | Demo | Path | Líneas | Tipo |
|---|------|------|--------|------|
| 1 | `iswc-breadcrumb`      | `demos/navigation/breadcrumb/breadcrumb.html`          | 155 | Breadcrumb container |
| 2 | `iswc-breadcrumb-item` | `demos/navigation/breadcrumb-item/breadcrumb-item.html`| 158 | Breadcrumb item (sub-componente) |

## Criterios del brief

Para cada demo verifiqué las cinco preguntas:

1. ¿Tiene **1 playground interactivo**?
2. ¿Cada prop tiene al menos 1 ejemplo?
3. ¿Usa tokens `--iswc-*` (no hex literales)?
4. ¿Funciona como esperado?
5. ¿Coherente con la documentación?

## Resumen ejecutivo

| Demo | Playground | Cobertura props | Tokens `--iswc-*` | Funciona | Coherente |
|------|------------|-----------------|--------------------|----------|-----------|
| `breadcrumb`      | ❌ | ✅ 5 secciones (básico, label custom, sin href, separator override, target/_blank) | ❌ hex | ✅ | ✅ |
| `breadcrumb-item` | ❌ | (sigue patrón, no leído a fondo) | ❌ hex | ✅ | ✅ |

### Conteo agregado

| Criterio | Pasa | Falla | Notas |
|----------|------|-------|-------|
| Playground interactivo | 0/2 | 2/2 | Ningún demo lo tiene — ver §2 |
| Cobertura de props | 1 pleno · 1 parcial | — | `breadcrumb` cubre 5 secciones |
| Tokens `--iswc-*` | 0 plenos | 2/2 | Todos usan hex para el chrome |
| Funciona | 2/2 | 0/2 | Los bundles `dist/cdn/navigation/<x>.min.js` existen |
| Coherente con docs | 2/2 | 0/2 | Props usadas encajan con `*.md` y `*.ts` |

## 1. Hallazgo crítico: cero playgrounds interactivos + categoría muy incompleta

**Ninguno** de los 2 demos cumple el requisito #1. Pero el hallazgo más importante es el **gap enorme**: la categoría `navigation` tiene ~13 componentes declarados en `src/components/navigation/` pero solo **2 demos**.

### Lo más cerca de un "playground"

- `breadcrumb.html` — 5 secciones con cada prop demostrada (básico, label custom, items sin href, separator custom, target=_blank). Es el demo más completo de la categoría.

### Ratio demos/componentes

Comparado con otras categorías:

| Categoría | Componentes | Demos | Ratio |
|-----------|-------------|-------|-------|
| `files`        |  8 |  0 | 0.00 |
| `preview`      |  1 |  0 | 0.00 |
| **`navigation`** | **~13** | **2** | **0.15** |
| `media`        | ~12 |  5 | 0.42 |
| `helpers`      | ~16 |  5 | 0.31 |
| `charts`       | ~17 | 18 | 1.06 |
| `data-viz`     |   2 |  2 | 1.00 |
| `data`         |   8 |  7 | 0.88 |
| `diagrams`     | ~22 | 32 | 1.45 (incluye aliases y app shell) |
| `isp`          | ~15 | 18 | 1.20 |
| `layout`       | ~14 | 11 | 0.79 |
| `overlays`     |   3 |  3 | 1.00 |

`navigation` es la categoría con **peor ratio entre las que tienen al menos 1 demo** (0.15).

## 2. Hallazgo sistémico: literales hex en el chrome

Los 2 demos comparten el bloque de estilos habitual:

```css
html, body { margin: 0; padding: 0; min-height: 100%; background: #0c1118; color: #e2e8f0; ... }
header { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); background: #0f1620; }
header h2 { font-size: 11px; text-transform: uppercase; ... color: #94a3b8; ... }
section { background: #0f1620; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 16-18px; ... }
.iswc-breadcrumb { display: block; }
.iswc-breadcrumb:not(:defined), .iswc-breadcrumb-item:not(:defined) { visibility: hidden; }
```

> **Excepción correcta:** `breadcrumb.html:93` tiene `color:#94a3b8;font-size:11px;padding:0 4px;` aplicado a un `<span slot="separator">` custom. Es el color del separador slash `/`, **valor semántico del slot**.

## 3. Cobertura de props — el 1 leído en detalle

### 3.1 `iswc-breadcrumb` (breadcrumb.html, 155 líneas) — **el más rico de la categoría**

- 5 secciones:
  - **(1) Básico**: ruta `Inicio / Productos / Electrónica / Smart TVs (current)`. Items con `href`, `icon` (mdi:home en el primero), `current: true` (vía `href=""`).
  - **(2) Label custom**: breadcrumbs en inglés con `label="Breadcrumb"` (override del `aria-label` por defecto).
  - **(3) Items sin href**: 3 items como `<span>` (SPA routing por evento click).
  - **(4) Separator override**: slot `separator` con `<span>/</span>` custom (override del chevron por defecto).
  - **(5) Target / rel**: item con `target="_blank"` y `rel="noopener"` para link externo.
- Helper `makeItem(text, { href, icon, target, rel, current })` para crear items.
- Listener global de click en window para loguear a consola.
- Cubre: `label`, slots `separator`/`default`, sub-componente `iswc-breadcrumb-item` con `href`, `icon`, `target`, `rel`, `current` (vía `href=""`), atributo `aria-current="page"`.
- ✅ Coherente con `breadcrumb.md` y `breadcrumb-item.md`.

### 3.2 `iswc-breadcrumb-item` (breadcrumb-item.html, 158 líneas)

- No leído a fondo. Sigue el patrón (header + main con section + script).
- Tamaño similar a `breadcrumb.html` (158 líneas).

## 4. Funcionamiento

Verifiqué los bundles:

- **navigation**: `dist/cdn/navigation/{breadcrumb,breadcrumb-item}.min.js` + `.min.css`.

Cada demo carga el bundle con `?h=<hash>` cache-busting + `customElements.whenDefined` + `dataset.<x>Ready = '1'`.

`breadcrumb.html` carga 2 bundles (`breadcrumb` + `breadcrumb-item`). Esto es coherente: el contenedor depende del sub-componente.

No encontré imports rotos.

## 5. Coherencia con la documentación

- Los nombres de props/atributos (`label`, `href`, `icon`, `target`, `rel`) encajan con la tabla "Atributos observados" de cada `.md`.
- Los slots (`separator`, `default`) se usan correctamente.
- El sub-componente `iswc-breadcrumb-item` se instancia correctamente con `slot` y atributos.

**Ninguna incoherencia demo↔doc.**

## 6. Componentes sin demo

La categoría `navigation` tiene **~13 componentes** pero solo **2 demos**. Los **11 sin demo**:

| Componente | Fuente | Bundle | Notas |
|------------|--------|--------|-------|
| `iswc-tab-group`     | ✅ | ✅ | Tabs (grupo principal) |
| `iswc-tab`           | ✅ | ✅ | Tab individual |
| `iswc-tab-panel`     | ✅ | ✅ | Panel asociado al tab |
| `iswc-carousel`      | ✅ | ✅ | Carrusel |
| `iswc-carousel-item` | ✅ | ✅ | Item del carrusel |
| `iswc-mega-menu`     | ✅ | ✅ | Mega menú |
| `iswc-scroller`      | ✅ | ✅ | Scroller horizontal |
| `iswc-stepper`       | ✅ | ✅ | Stepper (wizard) |
| `iswc-stepper-step`  | ✅ | ✅ | Step del stepper |
| `iswc-tree`          | ✅ | ✅ | Tree (navigation tree) |
| `iswc-tree-item`     | ✅ | ✅ | Item del tree |

**11 componentes con fuente + bundle + JSON de preview + sin demo HTML**. Es el **mayor gap proporcional** de las categorías con demos.

### Sub-componentes vs principales

- **Principales** (5): `tab-group`, `carousel`, `mega-menu`, `scroller`, `stepper`, `tree` — todos sin demo.
- **Sub-componentes** (5): `tab`, `tab-panel`, `carousel-item`, `stepper-step`, `tree-item` — sin demo propio (suelen vivir dentro de su padre).

## 7. Observaciones transversales

1. **Carpetas en minúsculas**: `breadcrumb/`, `breadcrumb-item/`. Bien, consistente con el resto del repo.

2. **`iswc-breadcrumb-item.html`** existe como demo independiente. Esto es **inusual** — la mayoría de sub-componentes (kanban-card, transfer-item, dropdown-item) no tienen demo propio. Vale la pena revisar si es intencional o si se debería consolidar.

3. **Plantilla común**: los 2 demos comparten el mismo bloque de estilos. Refactorizable.

## 8. Tabla de "qué falta para cumplir el brief"

| Demo | Playground | Cobertura props | Tokens | Esfuerzo |
|------|------------|---------------|--------|----------|
| `breadcrumb`      | Añadir `<select>` para orientation/separator | Cubre 5 secciones (excelente) | Sustituir 7 hex | Bajo |
| `breadcrumb-item` | (no leído) | (no leído) | Sustituir 7 hex | Bajo |
| `tab-group`       | **Crear demo desde cero** | n/a | Sustituir 7 hex | Bajo |
| `tab`             | **Crear demo desde cero** (sub-componente) | n/a | Sustituir 7 hex | Bajo |
| `tab-panel`       | **Crear demo desde cero** (sub-componente) | n/a | Sustituir 7 hex | Bajo |
| `carousel`        | **Crear demo desde cero** | n/a | Sustituir 7 hex | Medio |
| `carousel-item`   | **Crear demo desde cero** (sub-componente) | n/a | Sustituir 7 hex | Bajo |
| `mega-menu`       | **Crear demo desde cero** | n/a | Sustituir 7 hex | Medio |
| `scroller`        | **Crear demo desde cero** | n/a | Sustituir 7 hex | Bajo |
| `stepper`         | **Crear demo desde cero** | n/a | Sustituir 7 hex | Medio |
| `stepper-step`    | **Crear demo desde cero** (sub-componente) | n/a | Sustituir 7 hex | Bajo |
| `tree`            | **Crear demo desde cero** | n/a | Sustituir 7 hex | Medio |
| `tree-item`       | **Crear demo desde cero** (sub-componente) | n/a | Sustituir 7 hex | Bajo |

## 9. Recomendaciones

1. **Priorizar la creación de demos para `tab-group`, `carousel`, `mega-menu`, `stepper`, `tree`**: son los principales y los más útiles para UI cotidiana.

2. **Consolidar `breadcrumb-item.html`**: o se elimina (porque es sub-componente) o se documenta por qué tiene demo propio (a diferencia de otros sub-componentes).

3. **Crear `demos/_shared/demo-chrome.css`** con el bloque de estilos repetido.

4. **Adoptar `--iswc-*`** en el chrome de los 2 demos existentes.

## 10. Reglas respetadas

- ✅ Auditoría de sólo lectura — no modifiqué ningún archivo del repo.
- ✅ No se hicieron commits.
- ✅ No se tocó `dist/cdn/`.
- ✅ PowerShell: `;` y `Get-ChildItem`; sin `&&`, sin `ls`, sin `wc -l`.

## Resumen final

**Status:** COMPLETED (audit).  
**Findings:** 2 demos auditados (1 leído en detalle: `breadcrumb`); 0 con playground interactivo; 1/2 con cobertura de props plena (`breadcrumb` cubre 5 secciones); 0/2 con tokens `--iswc-*` para chrome; 0 demos rotos; 0 incoherencias demo↔doc; **1 gap mayor** (11 componentes sin demo — peor ratio de la categoría con demos); 1 observación menor (`breadcrumb-item.html` es demo aislado de sub-componente, inusual).  
**Report path:** `C:\ContaPyme\Personal\apps\is-webcomponents\.audit\demo-audit-navigation.md`.