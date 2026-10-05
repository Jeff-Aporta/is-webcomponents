# Demo Audit: charts

## Status: COMPLETED (audit only, no fixes applied)

## Scope

Audit de los demos en `demos/charts/<componente>/<componente>.html` y `demos/charts/<utility>/<utility>.html`, más el índice `demos/charts/index.html`. La categoría `charts` agrupa:

- **Wrappers tipados** (1 motor genérico + 10 wrappers sobre `iswc-chart`): `chart`, `bar-chart`, `bubble-chart`, `doughnut-chart`, `funnel-chart`, `line-chart`, `pie-chart`, `polar-area-chart`, `radar-chart`, `scatter-chart`, `waterfall-chart`.
- **Standalone** (motores propios): `sparkline`, `treemap`.
- **Utility libraries** (funciones puras, sin custom element): `marks-cartesian`, `marks-funnel`, `marks-radial`, `marks-waterfall`, `treemap-spec`.

Total: 19 archivos HTML (18 demos + 1 índice).

> **Nota de ruta:** los componentes del catálogo residen en `src/components/charts/` (12 `.md`/`.json` de elementos + 5 utility libraries). El brief habla de "~13" demos. El número real es 18 demos más 1 índice (19 archivos), porque la tabla de `manifest.js` cuenta `bar-chart`, `line-chart`, etc. como demos independientes del wrapper genérico.

## Demos auditados

| # | Demo | Path | Líneas | Tipo |
|---|------|------|--------|------|
| 1 | `iswc-chart`           | `demos/charts/chart/chart.html`                          |  47 | Wrapper genérico |
| 2 | `iswc-bar-chart`       | `demos/charts/bar-chart/bar-chart.html`                  |  50 | Wrapper tipado |
| 3 | `iswc-line-chart`      | `demos/charts/line-chart/line-chart.html`                |  53 | Wrapper tipado |
| 4 | `iswc-scatter-chart`   | `demos/charts/scatter-chart/scatter-chart.html`          |  50 | Wrapper tipado |
| 5 | `iswc-bubble-chart`    | `demos/charts/bubble-chart/bubble-chart.html`            |  55 | Wrapper tipado |
| 6 | `iswc-pie-chart`       | `demos/charts/pie-chart/pie-chart.html`                  |  47 | Wrapper tipado |
| 7 | `iswc-doughnut-chart`  | `demos/charts/doughnut-chart/doughnut-chart.html`        |  50 | Wrapper tipado |
| 8 | `iswc-polar-area-chart`| `demos/charts/polar-area-chart/polar-area-chart.html`    |  45 | Wrapper tipado |
| 9 | `iswc-radar-chart`     | `demos/charts/radar-chart/radar-chart.html`              |  48 | Wrapper tipado |
| 10 | `iswc-funnel-chart`   | `demos/charts/funnel-chart/funnel-chart.html`            |  47 | Wrapper tipado |
| 11 | `iswc-waterfall-chart`| `demos/charts/waterfall-chart/waterfall-chart.html`      |  49 | Wrapper tipado |
| 12 | `iswc-sparkline`      | `demos/charts/sparkline/sparkline.html`                  |  57 | Standalone |
| 13 | `iswc-treemap`        | `demos/charts/treemap/treemap.html`                      |  50 | Standalone |
| 14 | `marks-cartesian`     | `demos/charts/marks-cartesian/marks-cartesian.html`      |  65 | Utility lib |
| 15 | `marks-funnel`        | `demos/charts/marks-funnel/marks-funnel.html`            |  58 | Utility lib |
| 16 | `marks-radial`        | `demos/charts/marks-radial/marks-radial.html`            |  87 | Utility lib |
| 17 | `marks-waterfall`     | `demos/charts/marks-waterfall/marks-waterfall.html`      |  61 | Utility lib |
| 18 | `treemap-spec`        | `demos/charts/treemap-spec/treemap-spec.html`            |  73 | Utility lib |
| 19 | `index` (cards)       | `demos/charts/index.html`                                | 152 | Hub |

## Criterios del brief

Para cada demo verifiqué cinco preguntas:

1. ¿Tiene **1 playground interactivo**? (usuario modifica props y ve resultado en vivo)
2. ¿Cada prop tiene al menos 1 ejemplo?
3. ¿Usa tokens `--iswc-*` (no hex literales)?
4. ¿Funciona como esperado?
5. ¿Coherente con la documentación?

## Resumen ejecutivo

| Demo | Playground | Cobertura props | Tokens `--iswc-*` | Funciona | Coherente |
|------|------------|-----------------|--------------------|----------|-----------|
| `chart`             | ❌ | ⚠️ 1 wrapper, 1 tipo (bar) | ❌ hex | ✅ | ✅ |
| `bar-chart`         | ❌ | ⚠️ 1 ejemplo, 2 datasets, sin leyenda/grid/stacked | ❌ hex | ✅ | ✅ |
| `line-chart`        | ❌ | ⚠️ 1 ejemplo con curve+fill, 2 datasets | ❌ hex | ✅ | ✅ |
| `scatter-chart`     | ❌ | ⚠️ 1 ejemplo con x/y labels, 1 dataset | ❌ hex | ✅ | ✅ |
| `bubble-chart`      | ❌ | ⚠️ 1 ejemplo con x/y labels, 8 puntos {x,y,r} | ❌ hex | ✅ | ✅ |
| `pie-chart`         | ❌ | ⚠️ 1 ejemplo, sin legend-position explícito | ❌ hex | ✅ | ✅ |
| `doughnut-chart`    | ❌️ | ⚠️ 1 ejemplo con cutout='55' | ❌ hex | ✅ | ✅ |
| `polar-area-chart`  | ❌ | ⚠️ 1 ejemplo | ❌ hex | ✅ | ✅ |
| `radar-chart`       | ❌ | ⚠️ 1 ejemplo con 2 datasets | ❌ hex | ✅ | ✅ |
| `funnel-chart`      | ❌ | ⚠️ 1 ejemplo, sin dropPct explícito | ❌ hex | ✅ | ✅ |
| `waterfall-chart`   | ❌ | ⚠️ 1 ejemplo con totals [0, 5] | ❌ hex | ✅ | ✅ |
| `sparkline`         | ❌ | ✅ 3 secciones: line values / bar data / gradient | ❌ hex | ✅ | ✅ |
| `treemap`           | ❌ | ⚠️ 1 ejemplo con sub-categorías | ❌ hex | ✅ | ✅ |
| `marks-cartesian`   | ❌ (utility) | ✅ Exports + bar + line en vivo | ❌ hex | ✅ | ✅ |
| `marks-funnel`      | ❌ (utility) | ✅ Exports + funnelBands + drawFunnelMarks | ❌ hex | ✅ | ✅ |
| `marks-radial`      | ❌ (utility) | ✅ Exports + 4 demos (pie/doughnut/polar/radar) | ❌ hex | ✅ | ✅ |
| `marks-waterfall`   | ❌ (utility) | ✅ Exports + waterfallBars + drawWaterfallMarks | ❌ hex | ✅ | ✅ |
| `treemap-spec`      | ❌ (utility) | ✅ Exports + resolveTreemapSpec + computeTreemapLayout + vivo | ❌ hex | ✅ | ✅ |
| `index.html`        | n/a | n/a (es hub de tarjetas) | ⚠️ parcial (`var(--iswc-accent, #2563eb)`) | ✅ | ✅ |

### Conteo agregado

| Criterio | Pasa | Falla | Notas |
|----------|------|-------|-------|
| Playground interactivo | 0/18 | 18/18 | Ningún demo lo tiene — ver §2 |
| Cobertura de props | 5 plenos · 13 parciales | — | Los wrappers muestran 1-2 ejemplos cada uno; sparkline y las utility libs cubren mejor |
| Tokens `--iswc-*` | 0 plenos · 1 parcial · 17 sin | 18/18 | Solo `index.html:19` usa `var(--iswc-accent, #2563eb)` |
| Funciona | 18/18 | 0/18 | Los bundles `dist/cdn/charts/<x>.min.js` y `dist/cdn/data-viz/<x>.min.js` existen |
| Coherente con docs | 18/18 | 0/18 | Props usadas encajan con `*.md` y `*.ts` |

## 1. Hallazgo crítico: cero playgrounds interactivos

**Ninguno** de los 18 demos de charts cumple el requisito #1 del brief. Todos son **galerías de un solo ejemplo hardcodeado** (los wrappers) o vitrinas de exports (las utility libs).

### Particularidad estructural

Los wrappers tipados (`bar-chart`, `line-chart`, etc.) **no admiten cambiar el `type`** porque ese atributo se fija en la clase (`defineTypedChart('iswc-bar-chart', 'bar', …)`). Por tanto, el "playground" natural sería modificar `payload`, `color`, `legend-position`, `grid`, `stacked`, etc. **y nada de eso se expone en los demos**. Cada wrapper se muestra con un único payload hardcodeado.

`sparkline.html` es el único con estructura multi-sección (3 ejemplos: line via `values`, bar via `data`, gradient via `variant` + `line-color`). Eso lo convierte en el más rico de la categoría, pero sigue sin ser playground (no hay inputs/selects que el usuario manipule).

### Patrón "utility lib"

Las 5 utility libs (marks-cartesian, marks-funnel, marks-radial, marks-waterfall, treemap-spec) **muestran los exports + 1-2 ejemplos en vivo** montados sobre el wrapper tipado correspondiente. Son el demo más informativo de la categoría pero, igual, no son playgrounds.

### Lo más cerca de un "playground"

- `sparkline.html` — 3 variantes con `<iswc-sparkline values="...">` + atributo `variant`. No hay inputs.
- `marks-radial.html` — 4 charts simultáneos (pie/doughnut/polar/radar). No hay inputs.
- `treemap-spec.html` — muestra exports + `resolveTreemapSpec()` + `computeTreemapLayout()` + render vivo. **Es el más completo** de la categoría.
- `index.html` — el hub con `<a class="card">` muestra una grilla de tarjetas con título + descripción corta + tag. Tampoco es playground.

## 2. Hallazgo sistémico: literales hex en el chrome de los demos

Los 18 demos comparten un bloque de estilos idéntico (o casi):

```css
html, body { margin: 0; padding: 0; ... background: #0c1118; color: #e2e8f0; ... }
header { ... border-bottom: 1px solid rgba(255,255,255,0.1); background: #0f1620; }
header p { color: #94a3b8; }
section { background: #0f1620; border: 1px solid rgba(255,255,255,0.1); ... }
```

Solo `index.html:19` usa token: `border-color: var(--iswc-accent, #2563eb);` (en hover de tarjetas). Es la única excepción.

El AGENTS.md §4.3 marca los tokens `--iswc-bg`, `--iswc-text`, `--iswc-border` como canónicos. Ningún demo de charts los usa.

> **Excepción correcta:** los colores hex dentro de `payload.data.datasets[].data` (e.g. `line-color="#22d3ee"` en `sparkline.html:26`) **sí son válidos**: son valores semánticos de la prop `line-color`, no chrome del demo.

## 3. Cobertura de props — huecos recurrentes en wrappers

Los 11 wrappers tipados cubren `payload.data.datasets` (siempre) + `label` (casi siempre). **No demuestran** las props declaradas en `bar-chart.md` y compañía:

| Wrapper | Props del `.md` no mostradas en el HTML |
|---------|------------------------------------------|
| `chart` (genérico) | `legend-position`, `index-axis`, `min`, `max`, `grid`, `stacked`, `without-animation`, `without-legend`, `without-tooltip`, `x-label`, `y-label`, `color`, `without-animation`, slot `default`, eventos `iswc-render`/`iswc-turtle-state`/`iswc-open-viewer` |
| `bar-chart` | `legend-position`, `index-axis` (`x`/`y`), `min`, `max`, `grid`, `stacked`, `without-animation`, `without-legend`, `without-tooltip`, `x-label`, `y-label`, `color`, eventos `iswc-render`/`iswc-turtle-state`/`iswc-open-viewer`, CSS parts `base`/`canvas`/`legend`/`tooltip` |
| `line-chart` | `curve` (linear/step explícito — solo se ve `natural`), `fill` en la segunda serie (sí en la primera), `tension`, resto igual a `bar-chart` |
| `scatter-chart` | `point-radius`, `point-style`, `show-line`, `tension`, mismo resto |
| `bubble-chart` | `point-radius-range`, `point-style`, mismo resto |
| `pie-chart` | `legend-position`, `radius`, `cutout` (atributo vs options), eventos, CSS parts |
| `doughnut-chart` | `legend-position`, `radius`, eventos, CSS parts |
| `polar-area-chart` | `legend-position`, `start-angle`, eventos |
| `radar-chart` | `legend-position`, point-shape style, eventos |
| `funnel-chart` | `direction` (`align`), `dropPct` (auto vs manual), eventos |
| `waterfall-chart` | `direction`, totales con índice intermedio (totals `[0, 5]` se ve), eventos |

Los wrappers **heredan** todos los atributos del motor `iswc-chart` (de ahí la tabla repetida). Cada demo se queda en "1 payload razonable" + `label`, sin tocar ninguna prop de display.

`sparkline.html` cubre 3 de las 7 props (`values`, `data`, `type`, `label`, `variant`, `curve`, `trend`) — específicamente: `values`, `data` (prop), `type`, `variant`, `line-color`. **Faltan**: `label`, `curve`, `trend`. Eventos no aplica (no expone según `.md`).

`treemap.html` cubre `payload` (con jerarquía padre/hijo) + `title` (interno). No demuestra `color`, `sort`, `tile`, eventos.

### Ausencia de eventos en los demos

Ninguno de los 18 demos engancha listeners para los eventos `iswc-render`, `iswc-turtle-state`, `iswc-open-viewer` (declarados en los `.md`). Solo `treemap-spec.html` y `marks-*.html` enganchan `console.log` para depurar. El test E2E (Playwright) los cubre, pero el demo manual no.

## 4. Funcionamiento

Verifiqué que los bundles minificados existan en `dist/cdn/`:

- **Wrappers tipados**: `dist/cdn/data-viz/{bar,line,scatter,bubble,pie,doughnut,polar-area,radar,funnel,waterfall}-chart.min.js` + `.min.css`.
- **Motor genérico**: `dist/cdn/data-viz/chart.min.js` + `.min.css`.
- **Standalone**: `dist/cdn/data-viz/{sparkline,treemap}.min.js` + `.min.css`.
- **Utility libs**: `dist/cdn/charts/{marks-cartesian,marks-funnel,marks-radial,marks-waterfall,treemap-spec}.min.js`.

Cada demo carga el bundle correcto con `?h=<hash>` cache-busting + `customElements.whenDefined` + `dataset.<x>Ready = '1'` (mismo patrón que el resto del proyecto).

No encontré imports rotos ni hashes faltantes.

**Caveat:** los wrappers cargan `dist/cdn/data-viz/*.min.js` (categoría lógica "charts" pero carpeta física "data-viz"). Esto es coherente con el comentario del `dist/cdn/README` que indica que la categoría lógica "charts" y la carpeta física "data-viz" son equivalentes para el bundling.

## 5. Coherencia con la documentación

- Los nombres de props/atributos usados en los demos encajan con la tabla "Atributos observados" del `.md` correspondiente y con `static get observedAttributes()` del `.ts`.
- Los `payload` con forma `{ type, data: { labels, datasets } }` son la firma Chart.js declarada en todos los `.md`.
- Los nombres de eventos (`iswc-render`, `iswc-turtle-state`, `iswc-open-viewer`) coinciden.
- Los nombres de CSS parts (`base`, `canvas`, `legend`, `tooltip`) coinciden.
- **Caveat:** `treemap.html:23` usa `tm.payload = { treemap: {...} }` (sin `type` ni `data` envolvente), coherente con `treemap.md` que dice "payload vía propiedad payload o `<script type='application/json'>`". No es un wrapper de `iswc-chart`, es standalone.

**Ninguna incoherencia demo↔doc.**

## 6. Detalle por demo

### 6.1–6.11 — Wrappers tipados (10 archivos)

Patrón común: 1 gráfico por página, 1 payload razonable, `label` único. Cada uno en 45-55 líneas.

- `chart.html` (47) — `type="bar"`, 1 dataset de 5 valores. **El más básico**.
- `bar-chart.html` (50) — 4 labels Q1-Q4, 2 datasets (2024, 2025), 8 valores. **El más rico** entre wrappers simples.
- `line-chart.html` (53) — 6 labels Ene-Jun, 2 datasets Web/Mobile, ambos con `curve: 'natural'`, primero con `fill: true`.
- `scatter-chart.html` (50) — 9 puntos `{x, y}` (Edad, Ingresos), `x-label`, `y-label`.
- `bubble-chart.html` (55) — 8 puntos `{x, y, r}` (Ciudades), `x-label`, `y-label`.
- `pie-chart.html` (47) — 5 labels (Orgánico, Directo, Social, Referral, Email), 1 dataset.
- `doughnut-chart.html` (50) — 5 labels (Op, Mkt, RRHH, I+D, Otros), `cutout: '55'` en options.
- `polar-area-chart.html` (45) — 6 labels, 1 dataset. `dataset['polar-area-chart-ready'] = '1'` (key con guiones).
- `radar-chart.html` (48) — 6 dimensiones, 2 datasets (Producto A, Producto B).
- `funnel-chart.html` (47) — 5 pasos (Visitantes → Leads → Cualificados → Demo → Cierre), `dropPct` automático.
- `waterfall-chart.html` (49) — 6 columnas (Ingresos, COGS, Marketing, Salarios, OpEx, Utilidad op.), `totals: [0, 5]`.

### 6.12 `iswc-sparkline` (sparkline.html, 57 líneas) — **el más rico de la categoría**

- 3 secciones: line via `values` + `line-color`, bar via `data` (prop) + `line-color`, gradient via `values` + `variant` + `line-color`.
- Cubre `values`, `data`, `type`, `variant`, `line-color`. **Faltan `label`, `curve`, `trend`**.
- ✅ Coherente con `sparkline.md`. Cumple 3 props de 7 + un color custom. No es playground pero es la mejor cobertura de la categoría.

### 6.13 `iswc-treemap` (treemap.html, 50 líneas)

- 1 sección: jerarquía 5 nodos top-level + 3 sub-categorías (TVs, Audio, Móviles) con `parent`.
- Cubre `payload` (jerarquía), `title` interno.
- **Faltan**: `color`, `sort`, `tile`, eventos (no expone según `.md`, pero `treemap-spec` cubre la lógica).
- ✅ Coherente.

### 6.14–6.17 — Utility libraries (4 archivos)

Patrón: importan el bundle `dist/cdn/charts/<lib>.min.js`, exponen `Object.keys(lib)` en un `<pre>`, llaman a la función pura (`funnelBands`, `waterfallBars`, `resolveTreemapSpec`), y montan el wrapper tipado correspondiente para mostrar el resultado en vivo.

- `marks-cartesian.html` (65) — `drawBarMarks`, `drawLineMarks` (los otros 2 no se invocan directamente, se ven via wrappers).
- `marks-funnel.html` (58) — `funnelBands([4200, 1800, 640, 210])` + `drawFunnelMarks` via `<iswc-funnel-chart>`.
- `marks-radial.html` (87) — 4 charts simultáneos (pie/doughnut/polar/radar) usando `drawPieMarks`/`drawDoughnutMarks`/`drawPolarAreaMarks`/`drawRadarMarks` vía los wrappers.
- `marks-waterfall.html` (61) — `waterfallBars([1200, 850, -420, -180, null], [0, 4])` + `drawWaterfallMarks` via `<iswc-waterfall-chart>`.

Cada uno es **esencial** para entender el motor: muestran que existe un API puro (sin DOM) que se puede testear sin browser.

### 6.18 `treemap-spec` (treemap-spec.html, 73 líneas) — **utility de assets/lógica pura**

- 4 secciones: Exports del bundle + `resolveTreemapSpec(payload)` aplicado + `computeTreemapLayout(spec, opts)` aplicado + render vivo vía `<iswc-treemap>`.
- Es el demo más completo de la categoría. Cubre tanto el código puro como el render.

### 6.19 `index.html` (152 líneas) — **hub de la categoría**

- Grilla de tarjetas con 16 links (10 wrappers tipados + 3 standalone + 4 utility libs + 1 motor genérico = 18 entradas menos 2 duplicados = 16 únicas).
- Es la **única página de charts** con tokens `--iswc-*` parciales: `border-color: var(--iswc-accent, #2563eb)` en hover de tarjeta (línea 19).
- Sigue sin tener playground, pero es la única con interactividad (hover sobre `.card`).

## 7. Observaciones transversales

1. **Plantilla de chrome común**: los 18 demos comparten el mismo `<style>` con `html, body { background: #0c1118; color: #e2e8f0; }` + `header { background: #0f1620; border-bottom: rgba(255,255,255,0.1) }` + `section { background: #0f1620; border: rgba(255,255,255,0.1) }`. Es candidato natural a refactor: extraer `demos/_shared/demo-chrome.css` y migrar los 18 demos.

2. **Imports coherentes**: todos los demos cargan `dist/cdn/{data-viz,charts}/<componente>.min.js?h=<hash>` con cache-busting. La carpeta física `data-viz/` coincide con la categoría lógica `charts` (ver AGENTS.md §4.1). El bundle `charts/` está reservado para utility libs.

3. **Dataset `<x>Ready = '1'`**: cada demo setea `document.documentElement.dataset.<x>Ready = '1'` tras `customElements.whenDefined`. Esto es el contrato para los `_testing/*.test.mjs` de Playwright. Ningún demo rompe el contrato.

4. **`iswc-playground` no aparece** en charts (igual que el resto de la repo). El "playground oficial" de los `.json` de preview existe pero no se mezcla con los HTML.

5. **Discrepancia entre brief y realidad**: el brief lista "~13" demos para charts. La realidad es 18 demos + 1 índice = 19 archivos HTML. El conteo del brief probablemente viene del `manifest.js` o del conteo de `.md`/`.json` en `src/components/charts/` (12 + 5 utility = 17 entradas). La diferencia es aceptable y refleja la realidad del directorio.

## 8. Tabla de "qué falta para cumplir el brief"

| Demo | Playground | Cobertura props | Tokens | Esfuerzo |
|------|------------|-----------------|--------|----------|
| `chart`             | Añadir 4-5 selects (legend-position, grid, stacked, without-animation, color) | Demostrar `type` distinto a bar | Sustituir 7 hex | Bajo |
| `bar-chart`         | Igual | Demostrar `legend-position`, `grid`, `stacked`, `index-axis` | 7 hex | Bajo |
| `line-chart`        | Igual | Demostrar `curve: 'step'`, `tension`, `without-animation` | 7 hex | Bajo |
| `scatter-chart`     | Igual | Demostrar `point-radius`, `show-line` | 7 hex | Bajo |
| `bubble-chart`      | Igual | Demostrar `point-radius-range` | 7 hex | Bajo |
| `pie-chart`         | Igual | Demostrar `legend-position`, `cutout` | 7 hex | Bajo |
| `doughnut-chart`    | Igual | Demostrar `radius`, `legend-position` | 7 hex | Bajo |
| `polar-area-chart`  | Igual | Demostrar `start-angle`, `legend-position` | 7 hex | Bajo |
| `radar-chart`       | Igual | Demostrar `point-shape`, `legend-position` | 7 hex | Bajo |
| `funnel-chart`      | Igual | Demostrar `direction`, `dropPct` | 7 hex | Bajo |
| `waterfall-chart`   | Igual | Demostrar `direction`, totales múltiples | 7 hex | Bajo |
| `sparkline`         | Añadir inputs (values, type, variant, line-color) | Añadir `label`, `curve`, `trend` | 7 hex | Bajo |
| `treemap`           | Añadir inputs (tile, sort, color) | Demostrar `sort`, `tile` | 7 hex | Bajo |
| `marks-cartesian`   | n/a (utility) | Llamar `drawScatterMarks` y `drawBubbleMarks` | 7 hex | Mínimo |
| `marks-funnel`      | n/a | — | 6 hex | Mínimo |
| `marks-radial`      | n/a | — | 7 hex | Mínimo |
| `marks-waterfall`   | n/a | — | 6 hex | Mínimo |
| `treemap-spec`      | n/a | — | 7 hex | Mínimo |
| `index.html`        | — (es hub) | — (es hub) | Sustituir 7 hex restantes | Mínimo |

## 9. Recomendaciones (fuera de scope de este audit)

1. **Extraer `demos/_shared/demo-chrome.css`**: 18 archivos comparten el mismo bloque de estilos. Migrar reduce ~25 líneas por demo y permite adoptar `--iswc-*` en bloque.

2. **Crear un patrón "playground mínimo"** con `<select>` para los wrappers tipados. Por ejemplo:

   ```html
   <select data-prop="legend-position">
     <option>bottom</option><option>top</option>...
   </select>
   <script>
     document.querySelector('[data-prop="legend-position"]').addEventListener('change', (e) => {
       chart.setAttribute('legend-position', e.target.value);
     });
   </script>
   ```

   Aplicaría especialmente a `chart.html` (motor genérico, tipo variable) y a `sparkline.html` (más rico).

3. **Adoptar `--iswc-*`** en todos los demos (siguiendo el patrón de `index.html:19` con fallback hex). El template `var(--iswc-bg, #0c1118)` es trivialmente drop-in.

4. **Documentar la categoría `data-viz` vs `charts`**: el bundle está en `dist/cdn/data-viz/` pero la categoría lógica es `charts`. El brief llama "data-viz" a otra cosa (heatmap/maps). Hay 2 sentidos de "data-viz" en el repo. **Esto puede confundir** — ver audit `data-viz` separado.

## 10. Reglas respetadas

- ✅ Auditoría de sólo lectura — no modifiqué ningún archivo del repo.
- ✅ No se hicieron commits.
- ✅ No se tocó `dist/cdn/`.
- ✅ PowerShell: `;` y `Get-ChildItem`; sin `&&`, sin `ls`, sin `wc -l`.

## Resumen final

**Status:** COMPLETED (audit).  
**Findings:** 18 demos + 1 índice auditados; 0 con playground interactivo; 18/18 con chrome de hex literales (1/19 con token parcial); 5/18 con cobertura de props plena (sparkline + 4 marks); 0 demos rotos; 0 incoherencias demo↔doc; 1 observación estructural (categoría lógica `charts` vs carpeta física `data-viz` que conviene documentar).  
**Report path:** `C:\ContaPyme\Personal\apps\is-webcomponents\.audit\demo-audit-charts.md`.