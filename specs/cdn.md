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
| `core/loader.min.mjs` | `iswcLoader`, núcleo (capa 1, ≤ 8 KB br): catálogo, host/pin, `load`/`ensure`, precarga del cierre |
| `core/loader-<x>.min.mjs` | Capa 2 del loader (`sheets`, `store`, `mirrors`, `pages`, `ref`, `hashes`): `import()` al primer uso |
| `core/loader.min.js` | Copia byte a byte de `core/loader.min.mjs` para pines viejos (compat): se retira cuando los consumidores re-pineen (F5) |
| `core/loader.md` | Docs del loader (API) |
| `core/<x>.min.mjs` · `lib/<x>.min.mjs` | Módulos del core y de lib (zod, obj, ref-obj) para ejecutar; `core/<x>.ts` para extender |
| `<categoria>/<name>.min.mjs` | Componente individual (módulo ES; su CSS va dentro, por `iswc:css`) |
| `<categoria>/<name>.min.css` | Estilos del componente (para `sheet-cache` y para enlazarlos a mano) |
| `_chunks/chunk-<hash>.mjs` | Código compartido entre módulos (el core del molde vive en UNO) |
| `deps.json` | Índice (F7): `sha` (SHA **base** del build, informativo) y `categorias` (tag → categoría), ~6 KB |
| `deps/<cat>.json` | Grafo partido (F7): por tag de la categoría, cierre completo de módulos (`<cat>/<tag>.min.mjs` + `_chunks/…` + `lib/zod.min.mjs` si lo importa) y `v` (`?v=` de cada entrada sellable); `deps/core.json` lleva los cierres del core. El loader pide solo la parte de lo que carga, y ninguna si el HTML ya precargó el cierre |
| `exports.json` | Mapa `exports` para el `package.json` de npm (F6) |
| `<categoria>/<name>.classic.js` | Solo si se pide: artefacto clásico IIFE (`deno task build:classic`) |
| `skills/<name>/SKILL.md` | Skills para agentes (copiado en build) |

Íconos (4-nov-2026): **ninguna colección completa se versiona**. Solo viajan los que el kit, labs y apps usan de verdad, en `assets/iconify/<set>/<nombre>.svg` (fuera de `dist/`; los genera `deno task icons` = `assets/dl.js`, que barre el código, suma `extra` y poda lo que nadie usa). Las apps los sirven desde jsDelivr con `<html data-icons>`; lo que no esté ahí, y todo el catálogo del explorador de la galería (familias `/collections`, nombres `/collection?prefix=`, búsqueda `/search` y SVG por lotes `/<set>.json?icons=a,b`), lo sirve la API de Iconify vía `core/icon-loader`, cacheado en localStorage (TTL 15 días). `dist/assets/icons/` ya no existe (guardián `tests/gobernanza/assets-copia-unica.test.ts`). **No** recrear `README.txt` en `dist/cdn/`: el consolidador del loader es el índice.

### Build único con splitting

Desde F3 (plan `specs/plan-carga-modular.md` D2/D5) `scripts/build.mjs` corre **un** `esbuild.build` (`bundleKit` en `src/cdn/build/bundle-kit.ts`) con `splitting: true`, `format: 'esm'`, `chunkNames: '_chunks/[name]-[hash]'` y `outExtension: { '.js': '.mjs' }`.

- **Entradas:** cada módulo de `src/components` en su ruta pública de siempre (`<categoria>/<nombre>.min.mjs`; también los utils que se consumen por URL, como `diagrams/theme` o `helpers/md-lite`), `src/core/*.ts` (`core/<x>.min.mjs`), `src/cdn/loader.ts` (`core/loader.min.mjs`) y `lib/{obj,ref-obj,zod}.min.mjs`. Todas las salidas viven a un nivel de `dist/cdn/`, así una ruta relativa (`../lib/zod.min.mjs`, `../diagrams/themes/…`) vale igual desde una entrada que desde un chunk.
- **Chunks automáticos:** lo que usan dos entradas sale a `_chunks/`; no hay lista de «componentes externos». El molde `IswcElement` existe en un solo archivo (guardián `gobernanza/cdn-folders`). Siguen **externos** `zod` (`lib/zod.min.mjs`) y `src/ai` (`lib/ai/*.min.mjs`, build aparte).
- **Grafo:** del metafile salen el grafo (cierre por tag y por módulo del core, ordenado; un externo que es otra salida del build, `lib/zod.min.mjs`, entra al cierre) y `exports.json` (`src/cdn/build/graph.ts`; guardián `gobernanza/deps-json`). Desde F7 se publica partido: índice `deps.json` + `deps/<cat>.json` (`partirDeps`); los consumidores vendorizan el grafo unido (`pin-update`, `vendor:iswc`; `unirDeps`). El metafile entero queda en `.tmp/metafile-kit.json` para los guardianes.
- **Entradas públicas (decisión F7, 0.3):** se midió quitar como entradas los utils de `src/components/<cat>/utils/` que no son tags (salvo `diagrams/theme`, `helpers/md-*`, `isp/customs-base`, `charts/marks-*`): 504 → 274 entradas y 344 → 160 chunks, pero el cierre del shell de Avatar (38 tags de `SHELL_KIT_TAGS`) solo baja 104 → 103 módulos (488 989 → 488 755 B); quitar además las entradas de `src/core`, 100 módulos. No llega al −15 % pedido: las entradas se quedan como están.
- **Extensiones (D2):** `.mjs` = módulo ES, `.js` = clásico. Los únicos `.js` de `dist/cdn` son la copia compat `core/loader.min.js` y los `*.classic.js` que se pidan (guardián `gobernanza/extension-modulos`). La galería (`dist/scripts`, `dist/pages`, `dist/previews`, `dist/gallery-app.min.js`) no es parte del CDN y conserva `.min.js`.
- **Clásico opcional:** `deno task build:classic -- <tag> [<tag>…]` → `<categoria>/<tag>.classic.js`, IIFE autosuficiente (core, zod y estilos dentro) para `<script src>` sin módulos. No entra en `deno task build` ni en el catálogo.
- **`?v=`:** desde F7 **ningún `.mjs` de `dist/cdn` lleva `?v=` dentro** (ni chunks ni entradas: `stampDirectory(dist, …, { sellarMjs: false })`); el build sí sella CSS/`.js` y los HTML de `index.html`/`demos/**` (orígenes mutables: Pages y carpeta local) y escribe el mapa en `asset-hashes.json`. Un `.mjs` que otro módulo importa por ruta relativa (`lib/zod.min.mjs`, capas `core/loader-<x>`, tags pedidos con `import()` desde otro) sale del mapa y de `v` (`mjsReferenciados`): su URL es una sola, sin `?v=`, para el loader, la galería y los HTML. `deps/<cat>.json` lleva en `v` el `?v=` del resto de entradas. El loader no lo lleva embebido (`__IS_ASSET_HASHES__` = `{}`): en orígenes mutables sella sus `import()` con `v` y hojas/módulos de página con `asset-hashes.json` en diferido (`loader-hashes`); sobre un pin SHA de jsDelivr/githack nunca añade `?v=` (`esUrlInmutable`, `src/cdn/build/asset-url.ts`): la URL ya es inmutable. Los bundles de la galería (`dist/pages`, `dist/scripts`) importan las entradas del kit con el `?v=` del mismo mapa (una sola instancia por módulo). Precio: en Pages un módulo compartido se revalida por la caché HTTP (`max-age=600`), no por `?v=`; los chunks son por contenido y sobre pin SHA todo es inmutable.
- **Lote ESM opcional (F7, 0.3):** `deno task build:lote -- tag1,tag2,… [--out=<archivo>] [--zod=<especificador>]` (`scripts/build-lote.mjs`) arma UN `.min.mjs` autosuficiente con los tags y todo lo que importan (core incluido), `zod` externo (por defecto el especificador `zod` del import map de la app), y exporta `tags`. Lo publica el **consumidor** en su propio dist (no va en `dist/cdn` ni en el catálogo) y lo registra con `iswcLoader.registerApp({ <tag>: <href del lote> })`, así `load`/`ensure` y las `static deps` usan el lote. Debe incluir los hijos de sus padres: un hijo que falte se pide al kit y trae otra copia del core. Medido (Edge headless, HTTP/2 local, 5 corridas en frío, mediana) con los 38 tags de `SHELL_KIT_TAGS` de Avatar: 520 ms frente a 1 290 ms con chunks + `modulepreload` (10 peticiones frente a 110; detalle en `specs/plan-carga-modular.md` §F7a).
- **Catálogo del loader:** va dentro de `core/loader.min.mjs` (compacto: `aliases` + `categories`; el núcleo reconstruye `tags`), sustituido como texto solo en `src/cdn/loader.ts` (`catalogoEnLoader`). Con `define` de objeto esbuild lo inyectaba en el chunk de runtime que importa todo el kit (F3: 25 KB de catálogo en el cierre de cada componente).
- **Compat `loader.min.js`:** se publica mientras haya consumidores con la URL vieja pineada; se retira cuando re-pineen (F5). La raíz `dist/cdn/loader.min.mjs` re-exporta `./core/loader.min.mjs` (no puede ser copia: el loader importa `../_chunks/…`).
- **Tamaño publicado (D8):** `gobernanza/tamano-publicado` mide `git archive HEAD` (tope = lo medido tras sacar las colecciones de íconos + 10 %; jsDelivr rechaza > 50 MB) y `dist/cdn`.

### Bootstrap recomendado

Desde F4 (loader en dos capas, plan D7). El HTML de la app trae el import map con el alias al pin, la marca
`iswc-precargado` con ese pin (F7), la precarga del cierre del shell crítico (sacada del grafo vendorizado
`src/vendor/iswc-base/deps.json` en el build de la app: `tags[tag]` de cada tag del shell, chunks tal cual) y las
hojas base **no bloqueantes** (F7); el módulo de arranque importa el núcleo y pide el shell con `ensure` (revela al
definirse) y el resto con `load` (progresivo).

```html
<script type="importmap">
{ "imports": { "@jeff-aporta/iswc-base/": "https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@SHA/dist/cdn/" } }
</script>
<meta name="iswc-precargado" content="SHA">
<link rel="modulepreload" href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@SHA/dist/cdn/core/loader.min.mjs">
<link rel="modulepreload" href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@SHA/dist/cdn/layout/app-shell.min.mjs">
<!-- … un modulepreload por cada ruta de tags[tag] del shell crítico (chunks y lib/zod sin ?v=) … -->
<link rel="preload" as="style" href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@SHA/dist/cdn/is-base.min.css" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@SHA/dist/cdn/is-base.min.css"></noscript>
<link rel="preload" as="style" href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@SHA/dist/cdn/palettes.min.css" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@SHA/dist/cdn/palettes.min.css"></noscript>
<script type="module">
  import { iswcLoader as L } from '@jeff-aporta/iswc-base/core/loader.min.mjs';
  await Promise.all(['iswc-app-shell', 'iswc-button'].map((t) => L.ensure(t)));
  document.documentElement.setAttribute('data-app-ready', '');
  void L.load('iswc-dialog', 'iswc-ag-grid');
</script>
```

- `load()` resuelve al **importar** el lote (no espera `whenDefined`); `ensure(tag)` resuelve al **definirse**.
- Una entrada que el HTML ya precargó (`<link rel="modulepreload">` puesto por la app) se importa con ese mismo href
  y no se pide ningún `deps` (F7). Con `<meta name="iswc-precargado" content="SHA">` la precarga solo cuenta si ese SHA
  es el pin de la raíz del loader.
- Sin precarga en el HTML, `load()` pide `deps/<cat>.json` de cada categoría del lote (una vez) e inyecta
  `<link rel="modulepreload">` para todo el cierre (una ráfaga). Sobre pin SHA va en paralelo con el primer `import()`
  (`cache: 'force-cache'`); en un origen mutable el loader lo espera (trae el `?v=` de las entradas). El índice
  `deps.json` no lo pide nunca (el catálogo ya va en el núcleo).
- Hojas base no bloqueantes (F7, 0.4): un `<link rel="stylesheet">` en `<head>` frena la ejecución de los
  `<script type="module">` que lo siguen hasta que llega; `preload as=style` + `onload` no. El loader no las duplica
  (`yaEnlazada` cuenta también `rel="preload" as="style"`). Alternativa equivalente: los `<link rel="stylesheet">`
  después del `<script type="module">` del loader.
- `is-base.min.css` lo inyecta el loader por `<link>` (sin fetch ni IndexedDB) salvo que el HTML ya lo enlace.
- Sin pin ni host el loader usa `self`; nunca consulta `api.github.com` en el arranque (solo `loader-ref`, si una app
  quita el pin y hay espejos). Nada de top-level await en los módulos que cargan las apps (WebView Android).
- Componentes de app (`registerApp`): `.mjs` → `import()`, `.js` → script clásico; un módulo ES con extensión `.js`
  pasa `type: 'module'`. `deps` (`tag` → hrefs) precarga su cierre.
- Implementación de referencia para apps: las plantillas de `skills/iswc-foundation/templates/` (`index.html`,
  `view/**/index.html` y `src/utils/build.ts`, que escribe el bloque `<!-- iswc:precarga:inicio -->`…`fin` desde
  `src/vendor/iswc-base/deps.json`). Ojo al orden: el `<script type="module">` del loader va **antes** del registrador
  de la app (los módulos se ejecutan en orden de documento y el registrador necesita `globalThis.iswcLoader`).

### Aplanado de core (F9a, 2026-11-05) — cambio breaking de rutas

`src/core` pasó de 43 a 24 módulos y los utils de `diagrams`, `isp`, `data`, `forms` y `files` a un nivel con prefijo de
familia (ADR «aplanado de core, 2026-11-05»). Un pin por SHA anterior sigue igual; **al re-pinear**, quien importe un
módulo suelto cambia la ruta (no hay alias de compatibilidad: sin reexports ni barriles). Se conservan `core/loader`,
`core/app-init`, `is-base`, `palettes`, `core/iswc-element`, `core/props-element`, `core/attrs`, `core/iswc-storage` y
`core/cdn-ref`.

| Antes (`dist/cdn/…min.mjs`) | Ahora |
|---|---|
| `core/element`, `core/base-sheets` | `core/iswc-element` |
| `core/reflect`, `core/intent`, `core/tone`, `core/button-shape`, `core/media-shape` | `core/attrs` |
| `core/dom-utils`, `core/misc-utils`, `core/theme-scope` | `core/dom` |
| `core/popup-dismiss` | `core/position` |
| `core/tk-hue`, `core/tk-color` | `core/color` |
| `core/tk-icon-inline`, `core/tk-rich-text` | `core/tk-text` (`core/tk-inline-md` sigue aparte) |
| `core/code-text`, `core/code-diff`, `core/code-langs`, `core/highlight-code` | `core/code` |
| `core/scroll-memory` | `core/prefs` |
| `core/app-cfg` | `core/app-init` |
| `core/json-html` | `isp/isp-json` |
| `core/spa-state` | `layout/spa-state` |
| `diagrams/diagram-{kinds,vocab,header}` | `diagrams/diagram-model` |
| `diagrams/diagram-{arrow,curve,edge-spread,edge-style}` | `diagrams/diagram-edges` |
| `diagrams/routing-costs`, `diagrams/diagram-astar` | `diagrams/diagram-routing` (el JSON `diagrams/routing-costs.json` sigue) |
| `diagrams/diagram-{graph,flow}`, `diagrams/node-link-layout` | `diagrams/diagram-layout` |
| `diagrams/diagram-text-wrap`, `diagrams/flowchart-labels` | `diagrams/diagram-labels` |
| `diagrams/oklch` | `diagrams/diagram-styles` |
| `diagrams/pan-zoom`, `diagrams/diagram-embed` | `diagrams/diagram-view` |
| `diagrams/lane-layout` | `diagrams/swimlane-spec` |
| `isp/adapter`, `isp/row-adapter`, `isp/tree-data`, … (`utils/tree-view/*`) | `isp/tree-view-adapter`, `isp/tree-view-row-adapter`, `isp/tree-view-flow`, … (`isp/customs-base` igual) |
| `isp/isp-record-utils`, `isp/isp-color` · `isp/form-json`, `isp/controller-from-config` | `isp/isp-utils` · `isp/isp-form` |
| `data/<x>` de `utils/ag-grid/<familia>/` y `utils/spreadsheet/<sub>/` | `data/<familia>-<x>` (`celdas-`, `edicion-`, `filas-`, `filtros-`, `nucleo-`, `fn-`, `macro-`, `ui-`) |
| `forms/masks-tokens`, `forms/web-otp` · `files/load-cdn` | `forms/input-tokens` · `files/file-source` |

Los mapas exactos (origen → destino, rutas desde `src/`) están versionados en
`scripts/codemods/aplanar-{core,diagrams,isp,data,menores}.json`.

### Consumidores: re-pinear tras F3/F4

Un consumidor con un pin anterior a F3 (módulos `.min.js`) o anterior a F4 (sin `deps.json` ni loader en capas) sube
así (F5b, por app):

1. **Nombre**: si la app aún cita el nombre histórico del kit (carpeta vendor, `candidato` de `reuso`, URLs), desde un
   checkout del kit `deno run -A scripts/codemods/nomenclatura-iswc-base.mjs --raiz=<app> --dry-run` y luego sin
   `--dry-run` (mueve `src/vendor/<histórico>/` → `src/vendor/iswc-base/` con `git mv`; lo vendorizado solo se mueve).
   `ReusoCandidatoSchema` no acepta el nombre histórico.
2. **Pin**: `pin-update.mjs --nuevo=<sha40|ultimo>` (online desde `@main` o el vendorizado). Fija todas las URL y el
   alias `@jeff-aporta/iswc-base/` (deno.json e import maps) al SHA, pasa `<ruta>.min.js` → `.min.mjs` en las URL de
   módulos del kit (`core/`, `lib/`, `<cat>/<tag>`; nunca terceros ni `*.classic.js`) y baja el grafo del SHA a
   `src/vendor/iswc-base/deps.json` (`--sin-deps` lo apaga; desde F7 une índice + `deps/<cat>.json` en la forma completa
   `{ sha, tags, core, v }`; `sha` es el SHA base del build y no se compara con el pin). Avisa (sin reescribir) de rutas
   `*.min.js` del kit armadas en runtime (`new URL('x.min.js', L.selfBase)` y similares). Un SHA anterior a F3 sale con
   exit 3 y lo dice.
3. **Vendor**: re-vendorizar las tools del kit al mismo SHA (`vendor:iswc` / `vendor.ts`).
4. **Bootstrap**: copiar el de las plantillas: import map con el alias, `<meta name="iswc-precargado">` con el pin,
   `modulepreload` del cierre del shell crítico (del grafo vendorizado, sin `?v=`), `is-base.min.css` y
   `palettes.min.css` no bloqueantes (`preload as=style` + `<noscript>`), loader `core/loader.min.mjs`,
   registrador con `{ href, type: 'module' }` (componentes `.js` ES) o componentes `.mjs`.
5. **Componentes**: al molde (`IswcElement`, `static tag/css/observed/deps`, `import css from 'iswc:css'` incrustado
   por el build, `define()`); nada de `adoptCss` ni `<link>` a la hoja hermana.
6. **Gate** de la app en verde (`test:all`); si queda rojo, se arregla o se vuelve al SHA anterior.

La copia compat `core/loader.min.js` se retira cuando todos los consumidores hayan re-pineado (F5b).

Skills: `npx skills add Jeff-Aporta/is-webcomponents -s is-cdn-install` · `-s iswc-base`.

### Conversor `construirApp` (F10)

Una app Deno convierte sus `.ts` en `.mjs` optimizado con la MISMA herramienta que todas las demás, ejecutada desde el
pin (ADR «conversor construirApp, 2026-11-05»). Fuente: `src/cdn/build/construir-app.ts` (+ `construir-app.schemas.ts`,
`lote-kit.ts`); publicada en `dist/cdn/build/construir-app.ts` con imports relativos `.ts` (Deno no aplica
`sloppy-imports` a módulos remotos). Paso a paso para una app: `skills/iswc-foundation/references/02-deno-y-build.md`.

```ts
// src/utils/build.ts de la app (≈ 15 líneas; `deno task pin` mueve el SHA de la URL con el resto)
import { stop } from 'esbuild';
import { construirApp } from 'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha40>/dist/cdn/build/construir-app.ts';
await construirApp({ raiz, prefijo: 'av', planos: ['src/js/boot.ts'], tags, html });
await stop();
```

También como CLI: `deno run -A <url>/construir-app.ts --config=build.json [--watch]` (las mismas opciones en JSON;
`raiz` relativa al `build.json`). Las dependencias son `node:*`, `esbuild` y `zod`, que resuelve el `deno.json` de la app.

| Opción | Por defecto | Qué hace |
|---|---|---|
| `raiz`, `prefijo` | — | carpeta de la app; el prefijo nombra el registrador `<prefijo>Loader.min.mjs` |
| `entradas` | `['src/js', 'view']` | carpetas cuyos `.ts` se publican como `.min.mjs` (`src/js/x.ts` → `js/x.min.mjs`) |
| `salida` | `dist/cdn` | carpeta de salida (se borra y se rehace) |
| `pin` · `cdn` · `repo` | SHA de `src/js/iswc.ts` · jsDelivr al pin | de dónde salen alias, loader, `deps.json` y lote |
| `planos` | — | entradas IIFE (`boot.ts` → `<salida>/boot.js`) |
| `define` · `externos` | — · `zod` siempre | constantes de esbuild; especificadores que resuelve el import map |
| `origenMutable` | `deno.json` → `iswc.host` no inmutable | sella `?v=` (Pages, local); sobre pin jsDelivr, no |
| `tags` | — | tag de la app → fuente: registrador y `deps.json` |
| `html` | `index.html` + `view/**` con marcas | `{ archivo, kit?, app? }`: bloque de precarga por página |
| `importMap` · `precargas` | — | entradas extra del import map y `modulepreload` extra (p. ej. `@avatar/vendor`) |
| `lote` | — | `{ tags, archivo? }`: lote ESM del armazón armado desde el pin (`lote-kit.ts`) |
| `depsKit` · `staging` | `src/vendor/iswc-base/deps.json` (o el del pin) · `.tmp-scss` | grafo del kit; staging SCSS espejo de la raíz |

Qué hace, en orden:
1. **Entradas.** Raíces = fuentes de `tags`, `app` de cada página y módulos `<salida>/…min.mjs` que los HTML citan fuera
   del bloque. Solo ellas van al build con splitting; las demás fuentes salen sueltas y autónomas (tests, barriles). Si
   todas fuesen entrada, cada módulo saldría en su propio chunk (uno por conjunto de entradas que lo alcanzan) y la
   portada de Avatar pedía 17 módulos más que con el build por archivo.
2. **Bundle.** esbuild `splitting`, `format: 'esm'`, `minify`, `.min.mjs`, chunks en `<salida>/_chunks/`. El alias
   `@jeff-aporta/iswc-base/<ruta>` (la app lo escribe con la ruta publicada, `core/iswc-element.min.mjs`) queda externo
   y se reescribe a `<cdn><ruta>`: la misma URL que usa el loader. `iswc:css` incrusta la hoja del staging
   (`css-virtual.ts`). `import.meta.url` de cada fuente vale su URL publicada aunque su código acabe en un chunk.
3. **Hojas.** Cada `.css` del staging → `<salida>/<ruta sin src/>.css`, minificada (`url()` de fuentes e imágenes quedan
   relativas).
4. **Lote** opcional (`lote-kit.ts`): los tags en un módulo; externos el cierre del loader, `lib/zod` y todo `import()`.
5. **`?v=`** solo en origen mutable (`stampDirectory(…, { sellarMjs: false })`): nunca dentro de un `.mjs`, nunca en un
   chunk ni en un módulo que otro importa por ruta relativa (una URL para todos).
6. **`deps.json`** de la app (`graph.ts`, cierre por tag) y **registrador** `<prefijo>Loader.min.mjs`:
   `registerApp({ tag: { href, type: 'module' } }, { installSheets: false })`, `<html data-icons>` desde `iswc.host` y,
   en reposo, `deps.json` → `configure({ deps })` (los chunks del cierre de cada tag: el registrador está en la ruta
   crítica de cada página y los cierres solo sirven para lo que se pida después; en Avatar, 19,6 KB → 11,5 KB);
   `asset-hashes.json` y `build-stamp.json`.
7. **HTML.** Entre `<!-- iswc:precarga:inicio -->` y `<!-- iswc:precarga:fin -->`: import map (alias y `zod` del pin, más
   `importMap`), `<meta name="iswc-precargado">`, `modulepreload` del cierre del loader, del de los `kit` de la página
   (sin los del lote) y de lo que la app importa del kit por alias, el lote, el cierre propio (`app`), `preload as=fetch`
   de las `.css` hermanas que los componentes piden por red (no las de `iswc:css`), `is-base`/`palettes` no
   bloqueantes, loader `.min.mjs` y registrador. Fuera del bloque solo pone o quita el `?v=` de las referencias a
   `<salida>`; `<base href>` se respeta (una base absoluta = la raíz de la app). Un import map fuera del bloque es error.
   Idempotente: sin cambios, ni el HTML ni `<salida>` cambian (salvo `build-stamp.json`).

**Sigue siendo de cada app:** sus entradas, vistas y páginas (qué tags precarga cada una), `boot.ts`, `define`, el SCSS
(`build:scss`), los íconos, el despliegue y los tests. Guardián: `tests/gobernanza/construir-app.test.ts` (app de fixture
contra el `dist` local servido como pin, en Edge headless).

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
| npm (preparado, no publicado) | `package.json` de la raíz (lo escribe el build) con `name: "@jeff-aporta/iswc-base"` y `exports` hacia `dist/cdn/`: los mismos especificadores resuelven por `node_modules` (§npm abajo). |

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

### npm (preparado, no publicado)

Plan D9 / F6. **Nada está publicado en npm** (no hay cuenta ni token; nunca se corre `npm publish`). El terreno queda
listo para que, al publicar, el alias resuelva igual desde `node_modules` que desde el CDN.

- `package.json` en la raíz: lo genera `scripts/build.mjs` al final con `packageJson()` de `src/cdn/build/npm.ts`
  (contrato en `npm.schemas.ts`). No se edita a mano: el siguiente build lo pisa.
- `exports` = `dist/cdn/exports.json` (`./loader`, `./core/<x>`, `./<cat>/<tag>` y `./<carpeta>/*` → `*.min.mjs`) más
  las formas con extensión que usa el import map (`./<carpeta>/*.min.mjs` y `*.min.css`; por la regla de Node la clave
  más larga con el mismo prefijo gana, así `core/loader.min.mjs` no se dobla en `.min.mjs.min.mjs`), `./loader.min.mjs`,
  `./is-base.css`/`./palettes.css` (y sus `.min.css`), `./deps.json`, `./importmap.json` y `./package.json`.
- `sideEffects`: cada `<cat>/<tag>.min.mjs` del catálogo, `core/loader.min.mjs` (y su alias de raíz) y `**/*.css`;
  lo demás (chunks, `core/*`, `lib/*`) es puro para los bundlers.
- `files: ["dist/cdn", "README.md"]`: el tarball no lleva `labs/`, `demos/`, `tests/`, `.tmp*` ni `dist/assets`. Sin
  `scripts` ni `dependencies`; `zod` va como `peerDependencies` opcional (el kit trae el suyo en `lib/zod.min.mjs`).
  `license: "UNLICENSED"` mientras el repo no tenga `LICENSE` (README: uso interno); con `LICENSE` el build pone
  `SEE LICENSE IN LICENSE`.
- **`version` es provisional**: `0.0.0-<yyyymmdd>.<sha7>` (fecha del commit de HEAD y su SHA corto; un sha7 todo
  dígitos con cero inicial lleva `g` delante para ser semver válido). Se reemplaza por semver real al publicar.
- `deno task npm:pack` (`scripts/npm-pack.mjs`) arma el tarball en `.tmp/npm/` y reporta peso y archivos (4-nov-2026:
  ~2,9 MB gzip, ~1 375 archivos). Guardián: `tests/gobernanza/npm-pack.test.ts` (exports cubre el catálogo, cada
  destino existe, y el tarball se instala en `.tmp/npm-test/` y Node resuelve los subpaths). Limitación: sin DOM, el
  módulo de un tag lanza en Node al evaluarse (`HTMLElement is not defined`); el loader sí evalúa. npm omite los
  `.gitignore` anidados del tarball (el de `skills/iswc-foundation/templates/` no viaja por npm; sí por el CDN).

Cómo resuelve el alias en cada entorno:

| Entorno | `@jeff-aporta/iswc-base/<ruta>` → |
|---|---|
| Deno (fuentes del kit) | `deno.json` → `./src/` (el import map manda sobre el `package.json` de la raíz) |
| Apps web / Deno de una app | import map → `https://cdn.jsdelivr.net/gh/<repo>@<sha40>/dist/cdn/` (`importmap.json`, `pin-update`) |
| npm (cuando se publique) | `exports` del `package.json` → `node_modules/@jeff-aporta/iswc-base/dist/cdn/…` |

Qué cambia al publicar: los consumidores dejan el import map y el re-pin por SHA y hacen `npm i @jeff-aporta/iswc-base`
(los especificadores no cambian; `core/loader.min.mjs` y `core/loader` resuelven igual); `version` pasa a semver y
`pin-update` deja de ser el mecanismo de actualización para ellos.

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

- **Límite de 50 MB:** jsDelivr empaqueta el árbol (`git archive`) al resolver un SHA aún no cacheado y responde 403 "Package size exceeded" por encima de 50 MB. Hasta el 4-nov-2026 `dist/assets/icons` (colecciones completas de mdi/tabler, 13 635 archivos) dejaba el tarball en ~43 MB; retirado, mide ~28,5 MB y `tests/gobernanza/tamano-publicado.test.ts` lo topa en lo medido + 10 % (31,4 MB): pinear por SHA es seguro.
- Con `@main` cacheado 24 h, `all.min.js` servido puede ser **anterior** a que existiera un componente: el componente nuevo no queda definido aunque su archivo sí se sirva fresco. Síntoma: `customElements.get('iswc-button')` true y `customElements.get('iswc-code')` false, sin error. **Solución:** pedir el componente por su ruta propia (`dist/cdn/<cat>/<comp>.min.js`) además de `all.min.js`.
- `all.min.js` y `category.*.min.js` son **solo listas de `import`** (~250 B): sumar su tamaño literal da el ranking invertido; hay que expandirlos a los `.min.js` reales (UI con `autofit`).

### Medir la carga

`deno task medir` (`scripts/medir-carga.mjs`, plan de carga F7) carga una página en **Edge headless** (nunca el Chrome
del usuario) y resume lo que pasó hasta el hito de «lista» y unos segundos después:

```bash
deno task medir -- --url=https://jeff-aporta.github.io/is-webcomponents/ --ready='iswc-doc-demo[data-ready="1"]' --warm --seo
deno task medir -- --servir=. --url=/ --ready='iswc-doc-demo[data-ready="1"]' --solo-local --corridas=5   # galería local
deno task medir -- --lote=iswc-button,iswc-dialog --latencia=120                                          # lote por el loader
deno task medir -- --url=https://localhost:4441/ --resolver=cdn.jsdelivr.net=127.0.0.1:4450 --throttle     # app con CDN local
```

- `--ready`: atributo (`data-app-ready`, en `<html>` o en cualquier elemento) o selector. `--cold` (por defecto) o
  `--warm` (además la segunda visita con caché). `--throttle`: 3G rápido (80 ms, 1,5 Mbit/s) y CPU ×4.
- `--servir=<carpeta>` la sirve estática en un puerto libre (`max-age=600` + ETag, como Pages); `--latencia=<ms>` retrasa
  cada respuesta (con más de 50 ms una cascada se ve como ráfagas). `--lote=<tags>` monta una página mínima contra `dist`
  que pide esos tags al loader (`load` + `ensure`) y cuenta además las ráfagas **tras `load()`**.
- `--solo-local`: ningún host salvo localhost resuelve (medición hermética). `--resolver=<host>=<ip:puerto>`: servidores
  locales en lugar del CDN o del API (TLS autofirmado aceptado).
- `--corridas=<n>`: navegador nuevo en cada una; el resumen es la mediana. `--json=<ruta>`: resumen y corridas.
- Mide: DCL, FCP, hito, peticiones (totales y hasta el hito), KB transferidos y decodificados, ráfagas (algoritmo de
  `tests/_shared/rafagas.ts`), URLs y rutas duplicadas, módulos del kit, errores de consola, respuestas ≥ 400,
  `indexedDB.open`, `caches.open`, peticiones a api.github.com; LCP, CLS, long tasks (TBT aproximado: lo que pasa de
  50 ms), INP si hubo interacción; `Performance.getMetrics` por CDP (ScriptDuration, LayoutDuration, JSHeapUsedSize).
- `--seo`: checklist 0–100 (title ≤ 70, description 50–160, canonical, `lang`, viewport, un solo `h1` contando shadow
  roots, `img` con `alt`, enlaces con texto, `og:` y `twitter:`, consola sin errores, HTML ≤ 100 KB, `.mjs` con
  `type=module`) con la lista de fallos. Lighthouse no está en las dependencias del kit y no se usa.
- Presupuestos permanentes (rojo bloquea): `tests/navegador/carga.test.ts` usa esta misma medición (loader ≤ 8 KB br,
  media por tag, lote shell en ≤ 2 ráfagas sin duplicados ni IndexedDB, galería local ≤ 1,5 s).

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
| Íconos | `assets/iconify/` (solo los usados, `deno task icons`); el resto y el catálogo del explorador, API de Iconify |

## Aceptación

| Caso | Resultado | Verificación |
|---|---|---|
| Solo `dist/cdn/` + `dist/assets/` (+ salidas de `deno task bundle`: `dist/{previews,pages,scripts,skills}/`) | sin huérfanos sueltos en `dist/` | `tests/gobernanza/dist-cdn-layout.test.ts` |
| Carpetas CDN | una carpeta por categoría manifest | `tests/gobernanza/cdn-folders.test.ts` |
| Loader y plan | sin doble fetch categoría+tag | `tests/gobernanza/cdn-loader.test.ts`, `tests/componentes/load-plan.test.ts` |
| Snippet match preview | paths coherentes con manifest | `tests/gobernanza/cdn-snippet-match.test.ts` |
| Íconos desde la carpeta publicada | los de los demos resuelven desde `assets/iconify` por `<html data-icons>`, sin API (fetch simulado, sin servidor) | `tests/gobernanza/cdn-icons.test.ts` |
