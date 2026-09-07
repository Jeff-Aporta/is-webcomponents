# Spec — CDN y build

Empaquetado esbuild, layout `dist/cdn/` y loader de consumo.

Diario completo (errores, entorno): [`lessons.md`](lessons.md).
Publicación y loader: §Detalle operativo, abajo.

## Contexto

El kit se consume desde jsDelivr/GitHub Pages como módulos por tag. La galería local sirve `dist/cdn/` vía `scripts/serve.mjs`.

## S-C1 Layout de salida

- Solo `dist/cdn/<categoria>/<tag>.min.js` (+ `.min.css` si el componente tiene estilos).
- `dist/cdn/core/loader.min.js` + `core/loader.md` (banner con rutas MD).
- **No** `dist/cdn/all.min.js`, **no** `category.*.min.js`, **no** `.js` sueltos en `dist/` raíz.
- Build: `npm run build` → `node scripts/build.mjs`.

## S-C2 Loader

- API: `L.load(tag | tags[] | { categories })` con deduplicación (anti-redundancia).
- Plan de carga documentado en código; categoría no implica todos los tags si ya se pidió el tag.
- Consumidor externo: preferir ruta directa `dist/cdn/<cat>/<tag>.min.js` además del agregado cacheado.

## S-C3 Metadatos

- UI de pesos en galería: `<is-format-bytes autofit>` cuando haya bytes conocidos (p. ej. fuente TS en `_shared`).

## S-C4 Publicación

- Pages: `jeff-aporta.github.io/is-webcomponents/`
- jsDelivr: `@main` (pin por SHA puede fallar >50 MB por iconos en dist).
- `robots.txt` en raíz. Sin `sitemap.xml` ni HTML SEO en `docs/`: la galería es
  una SPA de una sola URL y esas 178 páginas no se alcanzaban (31-ago-2026).

## Detalle operativo (loader y publicación)

### Layout publicado (`dist/cdn/`)

| Ruta | Qué es |
|---|---|
| `core/is-base.min.css` | Themes + paletas de marca (`<link>` en la app host) |
| `core/palettes.min.css` | Paletas de marca |
| `is-base.min.css` / `palettes.min.css` | Alias estables (= `core/…`) pre-folderizado |
| `core/loader.min.js` | `ISWebComponentsLoader` (carga selectiva + pin/mirrors) |
| `core/loader.md` | Docs del loader (API) |
| `<categoria>/<name>.min.js` | Componente individual (carga su `.min.css` hermano en el shadow) |
| `<categoria>/<name>.min.css` | Estilos del componente (junto al `.min.js`) |
| `skills/<name>/SKILL.md` | Skills para agentes (copiado en build) |

Iconos: `dist/assets/icons/` (fuera de `dist/cdn/`; única copia versionada). **No** recrear `README.txt` en `dist/cdn/`: el consolidador del loader es el índice.

### Bootstrap recomendado

```html
<script type="module">
  import { ISWebComponentsLoader } from '…/dist/cdn/core/loader.min.js';
  // Pin opcional (SHA o branch). Sin pin → tip de main (API GitHub).
  // ISWebComponentsLoader.pin('abcdef0123…');
  ISWebComponentsLoader.configure({ mirrors: ['jsdelivr', 'pages'] });
  await ISWebComponentsLoader.loadCSSBase();
  await ISWebComponentsLoader.loadCSSPalettesDefault();
  await ISWebComponentsLoader.load('is-button', 'is-button-group');
  // o: load('actions') expande a cada tag.min.js (sin bundle de categoría)
</script>
```

Skills: `npx skills add Jeff-Aporta/is-webcomponents -s is-cdn-install` · `-s is-webcomponents`.

### Qué hacer

- Apps CDN: `loadCSSBase()` + `loadCSSPalettesDefault()` explícitos (CSS no "mágico").
- `load('actions')` o tags puntuales; revisar `{ loaded, skipped }`. Usar `has('is-button')`/`getLoaded()` antes de forzar otra carga.
- Pin SHA en jsDelivr cuando la app necesite reproducible.
- Tras `node scripts/build.mjs`, verificar banner `/*! … docs (LLM) */` en `.min.js` y que exista `dist/cdn/core/loader.md`.
- **Galería:** CSS en `<link>`; shell tags + preview desde `dist/cdn`; resto background. Respetar error #43 — no rehacer el boot "bonito" con `await all`.

### Qué no hacer

- **No** re-cargar un tag ya cubierto por su categoría (`actions` → `is-button`).
- **No** default a `load('all')` "por comodidad" (expande a cada tag.min.js).
- **No** volver a emitir `all.min.js` ni `category.*.min.js`.
- **No** marcar `coveredTag` por categoría **antes** de empujar los jobs del lote (`planLoads(['actions'])` quedaría en 0 jobs).
- **No** inventar un segundo entry aparte de `src/cdn/loader.ts` + `load-plan.js`.
- **No** quitar el banner MD ni dejar de copiar `loader.md` al dist.
- **No** mezclar espejos (jsDelivr + Pages) en la misma página.
- **No** bloquear el primer paint de la galería con `await loadCSS*` / `await load('all')` / `await loadPageModules(cdn-panel)`.
- **No** importar `preview-component` ni `cdn-snippet` desde `src/` en el boot de Pages/galería.

### Errores / prevención (loader)

| Trampa | Síntoma | Guardián |
|---|---|---|
| Carga categoría sin jobs | `planLoads(['actions'])` = [] | `tests/load-plan.test.ts` |
| Emitir `all.min.js` / category bundles | Artefacto prohibido en dist | `tests/cdn-folders.test.ts` |
| Galería con `all.min` suelto en head | Bundle enorme | `tests/cdn-loader.test.ts` |
| Sin `loader.md` en dist | LLM sin contexto del entry | `tests/cdn-loader.test.ts` |
| FOUC + demos vacíos (boot serial / own `.preview`) | Blanco, tags crudos, main vacío | `tests/gallery-boot.test.ts` · LLM #43 |
| `cdn-panel` → `src/cdn-snippet` en path crítico | Shell nunca marca `kitShell` | `tests/gallery-boot.test.ts` |

### jsDelivr y peso

- **`@main`** es lo que se consume: el repo supera 50 MB por `dist/assets/icons` y jsDelivr aplica el límite (403 "Package size exceeded") al resolver un SHA aún no cacheado; `@main` responde 200 porque está caliente. **Conclusión:** un consumidor externo no puede pinear versión mientras los iconos vivan dentro de `dist/`.
- Con `@main` cacheado 24 h, `all.min.js` servido puede ser **anterior** a que existiera un componente: el componente nuevo no queda definido aunque su archivo sí se sirva fresco. Síntoma: `customElements.get('is-button')` true y `customElements.get('is-code')` false, sin error. **Solución:** pedir el componente por su ruta propia (`dist/cdn/<cat>/<comp>.min.js`) además de `all.min.js`.
- `all.min.js` y `category.*.min.js` son **solo listas de `import`** (~250 B): sumar su tamaño literal da el ranking invertido; hay que expandirlos a los `.min.js` reales (UI con `autofit`).

### Contrato de boot de la galería (`index.html`)

- CSS en `<link>` (is-base/palettes/shell/presentation/preview-component.css) + CSS crítico inline; **no** `await loadCSS*` como primer paint.
- `await` solo: tags shell (`split-panel`, `main`, `drawer`, `demo`, `scrollspy`, `button`, `icon`, `theme-toggle`, `code`) + `import('./dist/cdn/layout/preview-component.min.js')`; luego `dataset.kitShell='1'`; `loadPageModules`/`load('all')` **sin** await en el path crítico.
- `setHostPreview`: `delete` own property + `whenDefined` antes de asignar; `ensurePreviewDeps(tag)` on-demand.
- `cdn-panel.js` importa `dist/cdn/feedback/cdn-snippet.min.js`, no `src/`.
- **No** asignar `.preview` antes de que el tag esté defined (own property tapa el setter → main vacío, sin error de consola). Ver error #43.

## Contratos

| Pieza | Contrato |
|---|---|
| Build | `npm run build` |
| Dev CDN local | `node scripts/serve.mjs` |
| Carga | `core/loader.min.js` + `L.load(...)` |
| Iconos en dist | `dist/assets/icons/` (fuente versionada, fuera de `dist/cdn/`) |

## Aceptación

| Caso | Resultado | Verificación |
|---|---|---|
| Solo `dist/cdn/` + `dist/assets/` | sin huérfanos sueltos en `dist/` | `src/utils/health/meta/dist-cdn-layout.test.ts` |
| Carpetas CDN | una carpeta por categoría manifest | `src/utils/health/meta/cdn-folders.test.ts` |
| Loader y plan | sin doble fetch categoría+tag | `src/utils/health/meta/cdn-loader.test.ts`, `src/utils/health/domain/load-plan.test.ts` |
| Snippet match preview | paths coherentes con manifest | `src/utils/health/meta/cdn-snippet-match.test.ts` |
| Iconos vía CDN local | fetch OK con server :8391 | `src/utils/health/meta/cdn-icons.test.ts` (requiere `PORT=8391`) |
