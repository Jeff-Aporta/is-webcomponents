# Spec — CDN y build

Empaquetado esbuild, layout `dist/cdn/` y loader de consumo.

Diario completo (errores, entorno): [`lessons.md`](lessons.md).
Publicación y loader: §Detalle operativo, abajo.

## Contexto

El kit se consume desde jsDelivr/GitHub Pages como módulos por tag. La galería local sirve `dist/cdn/` vía `scripts/serve.mjs`.

## S-C1 Layout de salida

- Solo `dist/cdn/<categoria>/<tag>.min.js` (+ `.min.css` si el componente tiene estilos).
- `dist/cdn/core/loader.min.mjs` + `core/loader.md` (banner con rutas MD).
- **No** `dist/cdn/all.min.js`, **no** `category.*.min.js`, **no** `.js` sueltos en `dist/` raíz.
- Build: `deno task build` → `deno run -A --no-check scripts/build.mjs`.

## S-C2 Loader

- API: `L.load(tag | tags[] | { categories })` con deduplicación (anti-redundancia).
- Plan de carga documentado en código; categoría no implica todos los tags si ya se pidió el tag.
- Consumidor externo: preferir ruta directa `dist/cdn/<cat>/<tag>.min.js` además del agregado cacheado.

## S-C3 Metadatos

- UI de pesos en galería: `<iswc-format-bytes autofit>` cuando haya bytes conocidos (p. ej. fuente TS en `_shared`).

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
| `core/loader.min.mjs` | `iswcLoader` (carga selectiva + pin/mirrors) |
| `core/loader.min.js` | Copia byte a byte de `core/loader.min.mjs` para pines viejos (compat): se retira cuando los consumidores re-pineen (F5) |
| `core/loader.md` | Docs del loader (API) |
| `core/<x>.min.mjs` · `lib/<x>.min.mjs` | Módulos del core y de lib (zod, obj, ref-obj) para ejecutar; `core/<x>.ts` para extender |
| `<categoria>/<name>.min.mjs` | Componente individual (módulo ES; su CSS va dentro, por `iswc:css`) |
| `<categoria>/<name>.min.css` | Estilos del componente (para `sheet-cache` y para enlazarlos a mano) |
| `_chunks/chunk-<hash>.mjs` | Código compartido entre módulos (el core del molde vive en UNO) |
| `deps.json` | Tag → cierre completo de módulos (`<cat>/<tag>.min.mjs` + `_chunks/…`); lo usará el loader (F4) para precargar |
| `exports.json` | Mapa `exports` para el `package.json` de npm (F6) |
| `<categoria>/<name>.classic.js` | Solo si se pide: artefacto clásico IIFE (`deno task build:classic`) |
| `skills/<name>/SKILL.md` | Skills para agentes (copiado en build) |

Iconos: `dist/assets/icons/` (fuera de `dist/cdn/`; única copia versionada). **No** recrear `README.txt` en `dist/cdn/`: el consolidador del loader es el índice.

### Build único con splitting

Desde F3 (plan `specs/plan-carga-modular.md` D2/D5) `scripts/build.mjs` corre **un** `esbuild.build` (`bundleKit` en `src/cdn/build/bundle-kit.ts`) con `splitting: true`, `format: 'esm'`, `chunkNames: '_chunks/[name]-[hash]'` y `outExtension: { '.js': '.mjs' }`.

- **Entradas:** cada módulo de `src/components` en su ruta pública de siempre (`<categoria>/<nombre>.min.mjs`; también los utils que se consumen por URL, como `diagrams/theme` o `helpers/md-lite`), `src/core/*.ts` (`core/<x>.min.mjs`), `src/cdn/loader.ts` (`core/loader.min.mjs`) y `lib/{obj,ref-obj,zod}.min.mjs`. Todas las salidas viven a un nivel de `dist/cdn/`, así una ruta relativa (`../lib/zod.min.mjs`, `../diagrams/themes/…`) vale igual desde una entrada que desde un chunk.
- **Chunks automáticos:** lo que usan dos entradas sale a `_chunks/`; no hay lista de «componentes externos». El molde `IswcElement` existe en un solo archivo (guardián `gobernanza/cdn-folders`). Siguen **externos** `zod` (`lib/zod.min.mjs`) y `src/ai` (`lib/ai/*.min.mjs`, build aparte).
- **Grafo:** del metafile salen `deps.json` (cierre por tag y por módulo del core, ordenado) y `exports.json` (`src/cdn/build/graph.ts`; guardián `gobernanza/deps-json`). El metafile entero queda en `.tmp/metafile-kit.json` para los guardianes.
- **Extensiones (D2):** `.mjs` = módulo ES, `.js` = clásico. Los únicos `.js` de `dist/cdn` son la copia compat `core/loader.min.js` y los `*.classic.js` que se pidan (guardián `gobernanza/extension-modulos`). La galería (`dist/scripts`, `dist/pages`, `dist/previews`, `dist/gallery-app.min.js`) no es parte del CDN y conserva `.min.js`.
- **Clásico opcional:** `deno task build:classic -- <tag> [<tag>…]` → `<categoria>/<tag>.classic.js`, IIFE autosuficiente (core, zod y estilos dentro) para `<script src>` sin módulos. No entra en `deno task build` ni en el catálogo.
- **`?v=`:** el build sella los imports relativos dentro de `dist/cdn` y los HTML de `index.html`/`demos/**` (orígenes mutables: Pages y carpeta local) y escribe el mapa en `asset-hashes.json`. El loader ya no lo lleva embebido (`__IS_ASSET_HASHES__` = `{}`; F4 lo leerá en diferido) y, sobre un pin SHA de jsDelivr/githack, nunca añade `?v=` (`esUrlInmutable`, `src/cdn/build/asset-url.ts`): la URL ya es inmutable.
- **Compat `loader.min.js`:** se publica mientras haya consumidores con la URL vieja pineada; se retira cuando re-pineen (F5). La raíz `dist/cdn/loader.min.mjs` re-exporta `./core/loader.min.mjs` (no puede ser copia: el loader importa `../_chunks/…`).
- **Tamaño publicado (D8):** `gobernanza/tamano-publicado` mide `git archive HEAD` (≤ 48 MB; jsDelivr rechaza > 50 MB) y `dist/cdn`.

### Bootstrap recomendado

```html
<script type="module">
  import { iswcLoader } from '…/dist/cdn/core/loader.min.mjs';
  // Pin opcional (SHA o branch). Sin pin → tip de main (API GitHub).
  // iswcLoader.pin('abcdef0123…');
  // Fallback canónico (si no configuras mirrors): jsDelivr → githack → Pages.
  // iswcLoader.configure({ mirrors: ['jsdelivr', 'githack', 'pages'] });
  await iswcLoader.loadCSSBase();
  await iswcLoader.loadCSSPalettesDefault();
  await iswcLoader.load('iswc-button', 'iswc-button-group');
  // o: load('actions') expande a cada tag.min.mjs (sin bundle de categoría)
</script>
```

Skills: `npx skills add Jeff-Aporta/is-webcomponents -s is-cdn-install` · `-s iswc-base`.

### Nombre del kit y del repo

- El kit se llama **`iswc-base`** (alias de imports, prosa, rutas, `skills/iswc-base/`).
- Las URLs del repo usan el nombre REAL en GitHub, `REPO_GITHUB = 'Jeff-Aporta/is-webcomponents'` (`src/core/cdn-ref.ts`; el build, `sync-pins` y `pin-update` usan el mismo valor). Cambiará a `iswc-base` cuando se renombre, coordinado con las apps.
- `repoDeUrl` (cdn-ref) toma el repo de la URL desde la que corre el módulo; `shaFromImportUrl` (loader) y `pin-update` (`ALIAS`) reconocen los tres nombres (`iswc-base`, el real y el histórico) y los pines se reescriben al real.

### Alias `@jeff-aporta/iswc-base`

Un solo especificador para importar del kit, `@jeff-aporta/iswc-base/<ruta>`, que cada entorno resuelve a su sitio
(plan: `specs/plan-carga-modular.md` §D3; regla de fuentes: `specs/typescript/spec.md` S-TS2b).

| Dónde | Cómo se resuelve |
|---|---|
| Fuentes del kit (`src/**`) | `deno.json` → `"@jeff-aporta/iswc-base/": "./src/"`; tsc por `paths` en `tsconfig.json`; esbuild por el plugin `aliasKit()` (`src/cdn/build/alias.ts`, va solo en `bundleMinJs`); `scripts/serve.mjs` lo reescribe a `/src/<ruta>` al servir. |
| Deno de una app | `deno.json` del consumidor con la entrada a `dist/cdn/` por SHA (ejemplo abajo). |
| Navegador de una app | `<script type="importmap">` con la **misma** entrada (ejemplo abajo), antes del primer módulo. |
| `dist/cdn/` publicado | **Rutas relativas**, nunca el alias: el build lo reescribe (`aliasEnDist` en `scripts/build.mjs`) y el dist funciona por jsDelivr, Pages, carpeta local o WebView sin import map. Guardián: `tests/gobernanza/alias-imports.test.ts` (L4). |
| npm (futuro) | `package.json` con `name: "@jeff-aporta/iswc-base"` y `exports` hacia `dist/cdn/`: los mismos especificadores resuelven por `node_modules`. |

El build publica `dist/cdn/importmap.json` con la entrada lista para pegar (SHA del build):

```json
{ "imports": { "@jeff-aporta/iswc-base/": "https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha40>/dist/cdn/" } }
```

`deno.json` del consumidor:

```json
{
  "imports": {
    "@jeff-aporta/iswc-base/": "https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha40>/dist/cdn/"
  }
}
```

HTML del consumidor (el import map va antes de cualquier `<script type="module">`):

```html
<script type="importmap">
{ "imports": { "@jeff-aporta/iswc-base/": "https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha40>/dist/cdn/" } }
</script>
<script type="module">
  import { iswcLoader } from '@jeff-aporta/iswc-base/core/loader.min.mjs';
  await iswcLoader.load('iswc-button');
</script>
```

El SHA lo mueve `pin-update.mjs` (`src/vendor-distributions/shared/tools/`): además de las URL literales, fija la entrada
del alias en `deno.json` y en el import map de cada HTML a la forma canónica `…@<sha40>/dist/cdn/` (una ruta local se
respeta). Casos: `tests/gobernanza/pin-update.test.ts` (P10).

### Qué hacer

- Apps CDN: `loadCSSBase()` + `loadCSSPalettesDefault()` explícitos (CSS no "mágico").
- `load('actions')` o tags puntuales; revisar `{ loaded, skipped }`. Usar `has('iswc-button')`/`getLoaded()` antes de forzar otra carga.
- Pin SHA en jsDelivr cuando la app necesite reproducible.
- Tras `deno run -A --no-check scripts/build.mjs`, verificar banner `/*! … docs (LLM) */` en `.min.js` y que exista `dist/cdn/core/loader.md`.
- **Galería:** CSS en `<link>`; shell tags + preview desde `dist/cdn`; resto background. Respetar error #43 — no rehacer el boot "bonito" con `await all`.

### Qué no hacer

- **No** re-cargar un tag ya cubierto por su categoría (`actions` → `iswc-button`).
- **No** default a `load('all')` "por comodidad" (expande a cada tag.min.mjs).
- **No** volver a emitir `all.min.js` ni `category.*.min.js`.
- **No** marcar `coveredTag` por categoría **antes** de empujar los jobs del lote (`planLoads(['actions'])` quedaría en 0 jobs).
- **No** inventar un segundo entry aparte de `src/cdn/loader.ts` + `load-plan.js`.
- **No** quitar el banner MD ni dejar de copiar `loader.md` al dist.
- **No** forzar un solo espejo sin fallback: el loader ya encadena jsDelivr → githack → Pages; un espejo caído no debe tumbar la app.
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
- Con `@main` cacheado 24 h, `all.min.js` servido puede ser **anterior** a que existiera un componente: el componente nuevo no queda definido aunque su archivo sí se sirva fresco. Síntoma: `customElements.get('iswc-button')` true y `customElements.get('iswc-code')` false, sin error. **Solución:** pedir el componente por su ruta propia (`dist/cdn/<cat>/<comp>.min.js`) además de `all.min.js`.
- `all.min.js` y `category.*.min.js` son **solo listas de `import`** (~250 B): sumar su tamaño literal da el ranking invertido; hay que expandirlos a los `.min.js` reales (UI con `autofit`).

### Contrato de boot de la galería (`index.html`)

- CSS en `<link>` (is-base/palettes/shell/presentation/preview-component.css) + CSS crítico inline; **no** `await loadCSS*` como primer paint.
- `await` solo: tags shell (`split-panel`, `main`, `drawer`, `demo`, `scrollspy`, `button`, `icon`, `theme-toggle`, `code`) + `import('./dist/cdn/layout/preview-component.min.mjs')`; luego `dataset.kitShell='1'`; `loadPageModules`/`load('all')` **sin** await en el path crítico.
- `setHostPreview`: `delete` own property + `whenDefined` antes de asignar; `ensurePreviewDeps(tag)` on-demand.
- `cdn-panel.js` importa `dist/cdn/feedback/cdn-snippet.min.mjs`, no `src/`.
- **No** asignar `.preview` antes de que el tag esté defined (own property tapa el setter → main vacío, sin error de consola). Ver error #43.

## Contratos

| Pieza | Contrato |
|---|---|
| Build | `deno task build` |
| Dev CDN local | `deno run -A --no-check scripts/serve.mjs` |
| Carga | `core/loader.min.mjs` + `L.load(...)` |
| Iconos en dist | `dist/assets/icons/` (fuente versionada, fuera de `dist/cdn/`) |

## Aceptación

| Caso | Resultado | Verificación |
|---|---|---|
| Solo `dist/cdn/` + `dist/assets/` (+ salidas de `deno task bundle`: `dist/{previews,pages,scripts,skills}/`) | sin huérfanos sueltos en `dist/` | `tests/gobernanza/dist-cdn-layout.test.ts` |
| Carpetas CDN | una carpeta por categoría manifest | `tests/gobernanza/cdn-folders.test.ts` |
| Loader y plan | sin doble fetch categoría+tag | `tests/gobernanza/cdn-loader.test.ts`, `tests/componentes/load-plan.test.ts` |
| Snippet match preview | paths coherentes con manifest | `tests/gobernanza/cdn-snippet-match.test.ts` |
| Iconos vía CDN local | fetch OK con server :8391 | `tests/gobernanza/cdn-icons.test.ts` (requiere `PORT=8391`) |
