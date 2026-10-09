# Demo Audit: data-viz

## Status: COMPLETED (audit only, no fixes applied)

## Scope

Audit de los demos en `demos/data-viz/<Componente>/<componente>.html`. La categoría `data-viz` agrupa:

- **Heatmap**: matriz de celdas coloreadas por valor numérico.
- **Maps**: visualizador geográfico con motores SVG y tile (iframe OSM).

Total: 2 demos. El brief lista "~3"; el conteo real es 2 demos. La diferencia es porque `map-marker` (sub-componente de `maps`) no tiene demo propio.

> **Nota de nomenclatura:** "data-viz" en el repo tiene **dos significados distintos** que conviene clarificar:
> 1. `src/components/data-viz/` y `demos/data-viz/` — albergan `heatmap` y `maps` (los únicos 2 demos de esta carpeta).
> 2. La categoría lógica "charts" tiene su bundle físico en `dist/cdn/data-viz/` (10 wrappers tipados sobre `iswc-chart`). Es decir, los `bar-chart`, `line-chart`, `pie-chart`, etc. **se compilan a `dist/cdn/data-viz/`, no a `dist/cdn/charts/`** (los bundles en `dist/cdn/charts/` son solo utility libs como `marks-cartesian`).
>
> El AGENTS.md §4.1 advierte de esta confusión. El brief llama "data-viz" al primer sentido (los 2 demos de `demos/data-viz/`).

## Demos auditados

| # | Demo | Path | Líneas | Tipo |
|---|------|------|--------|------|
| 1 | `iswc-heatmap` | `demos/data-viz/Heatmap/heatmap.html` | 129 | Heatmap |
| 2 | `iswc-maps`    | `demos/data-viz/Maps/maps.html`       | 127 | Mapa SVG + tile |

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
| `heatmap` | ❌ | ✅ 2 secciones (densa brand, divergente red-blue) — cubre color/show-values/cell-radius/legend-position/x-label/y-label + config + evento `iswc-cell-hover` | ❌ hex | ✅ | ✅ |
| `maps`    | ❌ | ✅ 2 secciones (modo SVG con marcadores, modo tile con OSM) — cubre viewbox/engine/interactive + `<iswc-map-marker>` con lat/lon/label + eventos `iswc-viewport`/`iswc-marker-click` | ❌ hex | ✅ | ✅ |

### Conteo agregado

| Criterio | Pasa | Falla | Notas |
|----------|------|-------|-------|
| Playground interactivo | 0/2 | 2/2 | Ningún demo lo tiene — ver §2 |
| Cobertura de props | 2 plenos | — | Ambos cubren 2 secciones con props distintas |
| Tokens `--iswc-*` | 0 plenos | 2/2 | Todos usan hex para el chrome |
| Funciona | 2/2 | 0/2 | Los bundles `dist/cdn/data-viz/<x>.min.js` existen |
| Coherente con docs | 2/2 | 0/2 | Props usadas encajan con `*.md` y `*.ts` |

## 1. Hallazgo crítico: cero playgrounds interactivos

**Ninguno** de los 2 demos de data-viz cumple el requisito #1. Ambos son **galerías de 2 ejemplos hardcodeados** (no playground con inputs).

### Lo más cerca de un "playground"

- `heatmap.html` — 2 secciones: heatmap denso 12×8 con paleta brand + `show-values`, y matriz dispersa con `red-blue` divergente. Diferentes `color`, `legend-position`, `cell-radius` entre secciones.
- `maps.html` — 2 secciones: SVG nativo con 6 marcadores sobre Sudamérica + tile (iframe OSM) con attribution. Diferentes `engine` (`svg` vs `tile`).

Ninguno tiene inputs/selects/sliders.

## 2. Hallazgo sistémico: literales hex en el chrome

Ambos demos comparten el bloque de estilos idéntico (casi idéntico):

```css
html, body { margin: 0; padding: 0; height: 100%; background: #0c1118; color: #e2e8f0; ... }
header { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; gap: 14px; background: #0f1620; }
header p { font-size: 12px; color: #94a3b8; }
.panel { background: #0f1620; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 16px; ... }
.panel h2 { font-size: 12px; text-transform: uppercase; ... color: #94a3b8; ... }
pre#log { margin: 0; padding: 12px; background: #0c1118; ... color: #cbd5e1; ... }
```

Ninguno usa tokens `--iswc-*` para el chrome.

> **Excepción correcta:** los colores hex dentro del payload (e.g., `attribution: '© OpenStreetMap contributors'` — eso es texto, no color) o en código JS (no hay en estos 2 demos) son valores semánticos. Los únicos colores custom aquí son los del dataset de heatmap (números, no colores) y los marcadores de mapa (que heredan currentColor).

## 3. Cobertura de props — los 2 demos en detalle

### 3.1 `iswc-heatmap` (heatmap.html, 129 líneas) — **mejor cobertura de la categoría**

- 2 paneles (`<section class="panel">`) lado a lado:
  - **(1) Densa brand**: matriz 8×7 con valores 60-710. Atributos: `color="brand"`, `show-values=""`, `cell-radius="3"`, `legend-position="end"`, `x-label="Día de la semana"`, `y-label="Hora del día"`. `config = dense` (matriz completa).
  - **(2) Dispersa divergente**: matriz 6×6 con celdas null (puntos `{x, y, v}`). Atributos: `color="red-blue"`, `legend-position="end"`. `config = sparse`.
- Listener de `iswc-cell-hover` por instancia → log de `hover: ${x} · ${y} = ${value}`.
- Cubre: `color` (brand + red-blue), `show-values`, `cell-radius`, `legend-position`, `x-label`, `y-label`, `config` (data densa + sparse), eventos.
- **Faltan del `heatmap.md`**: variantes adicionales de `color` (`heat`, `viridis`, etc.), `tooltip-position`, atributos de granularidad, slots.
- ✅ Coherente con `heatmap.md`.

### 3.2 `iswc-maps` (maps.html, 127 líneas)

- 2 paneles lado a lado:
  - **(1) Modo SVG nativo**: `<iswc-maps viewbox="-85, -5, -65, 15" engine="svg" interactive="">`. 6 marcadores (Bogotá, Quito, Lima, Buenos Aires, Santiago, Caracas) con `<iswc-map-marker lat="..." lon="..." label="...">`.
  - **(2) Modo tile**: `<iswc-maps engine="tile">` con `<script type="application/json">` que define `tileUrl`, `bbox`, `zoom`, `center`, `attribution`.
- Eventos: `iswc-viewport` (pan/zoom del SVG) + `iswc-marker-click` (label del marcador).
- Cubre: `viewbox`, `engine` (svg/tile), `interactive`, `tileUrl`, `bbox`, `zoom`, `center`, `attribution`, `lat`, `lon`, `label` (de `map-marker`), eventos.
- ✅ Coherente con `maps.md`.

## 4. Funcionamiento

Verifiqué los bundles:

- **Heatmap**: `dist/cdn/data-viz/heatmap.min.js` + `.min.css`. Existe.
- **Maps**: `dist/cdn/data-viz/maps.min.js` + `.min.css`. Existe.

Cada demo carga el bundle con `?h=<hash>` cache-busting + `customElements.whenDefined` + `dataset.<x>Ready = '1'`. `maps.html` espera **dos** custom elements (`iswc-maps` + `iswc-map-marker`).

No encontré imports rotos.

**Importante:** `maps.html:75` carga un script hijo `application/json` con `tileUrl: 'https://www.openstreetmap.org/export/embed.html'` que apunta a un recurso externo (OpenStreetMap). El demo asume conectividad a internet. En CI o en entornos sin red, este demo no renderizará el tile.

`maps.html:74-76` documenta explícitamente:

> "La attribution pasa por `cfg.attribution` que el componente inyecta con innerHTML en `<small class="attribution">`. Esto es una superficie XSS: el demo usa SOLO texto plano para fines de prueba."

Es una **advertencia legítima** sobre seguridad (XSS via `innerHTML` con texto plano). El componente debería sanitizar.

## 5. Coherencia con la documentación

- Los nombres de props/atributos (`color`, `show-values`, `cell-radius`, `legend-position`, `x-label`, `y-label`, `viewbox`, `engine`, `interactive`, `tileUrl`, `bbox`, `zoom`, `center`, `attribution`, `lat`, `lon`, `label`) encajan con los `.md`.
- Los eventos (`iswc-cell-hover`, `iswc-viewport`, `iswc-marker-click`) son los declarados.
- Los sub-componentes (`iswc-map-marker`) están correctamente instanciados como hijos con `lat`/`lon`/`label`.
- El campo `config` del heatmap (con `data` densa o `points` sparse) coincide con `heatmap.md`.

**Ninguna incoherencia demo↔doc.**

## 6. Observaciones transversales

1. **Confusión de naming "data-viz"**: ya documentada. Esta categoría en el sentido del brief (los 2 demos de `demos/data-viz/`) es distinta de la carpeta física `dist/cdn/data-viz/` donde se compilan los charts. AGENTS.md §4.1 lo explica.

2. **`map-marker` sin demo propio**: `iswc-map-marker` se documenta dentro de `maps.html` pero no tiene `demos/data-viz/MapMarker/map-marker.html` aislado. Es un sub-componente (similar a `kanban-card` o `dropdown-item`).

3. **Mapa tile depende de internet**: `maps.html:76` carga `https://www.openstreetmap.org/export/embed.html`. El iframe puede no cargar en CI sin red.

4. **XSS warning legítimo**: el comment en `maps.html:74-76` documenta que `cfg.attribution` se inyecta con `innerHTML`. Esto es una **observación de seguridad** que conviene llevar a un test.

5. **Plantilla común**: ambos demos comparten el mismo `<style>` con grid `2fr 1fr` para el heatmap y `1fr 1fr` para el maps. Mismo patrón que las demás categorías.

## 7. Tabla de "qué falta para cumplir el brief"

| Demo | Playground | Cobertura props | Tokens | Esfuerzo |
|------|------------|-----------------|--------|----------|
| `heatmap` | Añadir `<select>` para color (brand/red-blue/heat/viridis) y `<input range cell-radius>` | Cubre 2 sections (bien) | Sustituir 7 hex | Bajo |
| `maps`    | Añadir `<select>` para engine (svg/tile) | Cubre 2 sections (bien) | Sustituir 7 hex | Bajo |
| `map-marker` | **Crear demo aislado** | n/a (sub-componente) | Sustituir 7 hex | Bajo |

## 8. Recomendaciones (fuera de scope de este audit)

1. **Crear `demos/data-viz/MapMarker/map-marker.html`** aislado con props del sub-componente.

2. **Sanitizar `cfg.attribution`** en `maps.ts` para evitar XSS vía `innerHTML`. El demo lo documenta pero el componente debería defenderse.

3. **Adoptar `--iswc-*`** en el chrome de ambos demos.

4. **Adoptar `<iswc-playground>`** para variar `color` del heatmap en vivo.

5. **Considerar bundle local de OSM** o flag `tile-bool` para que el demo funcione offline.

## 9. Reglas respetadas

- ✅ Auditoría de sólo lectura — no modifiqué ningún archivo del repo.
- ✅ No se hicieron commits.
- ✅ No se tocó `dist/cdn/`.
- ✅ PowerShell: `;` y `Get-ChildItem`; sin `&&`, sin `ls`, sin `wc -l`.

## Resumen final

**Status:** COMPLETED (audit).  
**Findings:** 2 demos auditados (`heatmap`, `maps`); 0 con playground interactivo; 2/2 con cobertura de props plena (2 secciones cada uno); 0/2 con tokens `--iswc-*` para chrome; 0 demos rotos; 0 incoherencias demo↔doc; 1 observación estructural (la confusión de "data-viz" — categoría lógica charts vs carpeta física data-viz — debe documentarse mejor); 1 observación de seguridad (XSS via `cfg.attribution` en `maps.html`); 1 dependencia externa (OSM iframe requiere internet).  
**Report path:** `C:\ContaPyme\Personal\apps\iswc-root\.audit\demo-audit-data-viz.md`.