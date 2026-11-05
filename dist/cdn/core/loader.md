# `iswcLoader` (`loader.min.mjs`)

Entry CDN liviano del kit. Carga solo lo pedido, con pin, mirrors y anti-redundancia.

## Rutas

| Artefacto | Path |
| --- | --- |
| Fuente (núcleo, capa 1) | `src/cdn/loader.ts` |
| Capa 2 (al primer uso) | `src/cdn/loader-{sheets,store,mirrors,pages,ref,hashes}.ts` |
| Planificador | `src/cdn/load-plan.ts` |
| Este doc | `src/cdn/loader.md` |
| Publicado | `dist/cdn/core/loader.min.mjs` (núcleo) · `dist/cdn/core/loader-<x>.min.mjs` (capa 2) · `dist/cdn/core/loader.md` |
| Raw | `https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/cdn/loader.md` |
| CDN | `https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/cdn/core/loader.min.mjs` |

Skill de instalación: [`skills/is-cdn-install/SKILL.md`](../../skills/is-cdn-install/SKILL.md).

Nombre: el kit es **`iswc-base`**; en las URLs va el nombre real del repo en GitHub (`REPO_GITHUB` de `src/core/cdn-ref.ts`). El loader reconoce un pin con cualquiera de los nombres del repo.

## Dos capas (F4, plan D7)

| Capa | Módulo | Qué hace | Cuándo se pide |
| --- | --- | --- | --- |
| 1 | `core/loader.min.mjs` (≤ 8 KB br) | catálogo, host/pin, `load`/`ensure`/`has`/`getLoaded`, anti-redundancia, `registerApp`, inferencia por extensión, precarga del cierre (`deps.json` → `modulepreload`), `is-base.min.css` por `<link>` | siempre |
| 2 | `core/loader-sheets.min.mjs` | `sheets.*` (Cache Storage + adoptedStyleSheets), `loadPageStyles` | `sheets.install/warm*`, `registerApp` (instala la caché), `loadPageStyles` |
| 2 | `core/loader-store.min.mjs` | `asset-store` (IndexedDB), `syncHashMemory` | en reposo y solo con mapa embebido (vendor); nunca en el arranque |
| 2 | `core/loader-mirrors.min.mjs` | cadena jsDelivr → githack → Pages, sticky, reintentos | solo si la raíz primaria falla, o sin raíz (`preferSelf: false` sin host); `listBases`/`fallbackBases` |
| 2 | `core/loader-pages.min.mjs` | `loadPageModules` | `loadPageModules` |
| 2 | `core/loader-ref.min.mjs` | `resolveRef` (API de GitHub) | solo sin pin y con espejos que lo necesiten; con pin, `BOOT_HOST` o `self` nunca |
| 2 | `core/loader-hashes.min.mjs` | `asset-hashes.json` en diferido (`?v=`) | solo en orígenes mutables (Pages/local), en `loadPageModules`/`loadPageStyles`/`assetUrl` |

La API pública (`iswcLoaderShape`) no cambia de forma: cada método de capa 2 es un envoltorio `async` que hace
`import()` del módulo y le pasa el contexto del núcleo. Cambios de comportamiento:

- `load(...)` resuelve cuando los módulos del lote están **importados** (promesas de `import()`); no espera
  `whenDefined` de todo. `ensure(tag)` sí lo espera. `LoadResult` sigue siendo `{ loaded, skipped }`. Una app revela
  la página cuando su shell crítico está definido (`ensure`) y lo demás se «upgradea» al llegar.
- `sheets.install()` devuelve una **promesa** de la API de la caché (antes la API); `sheets.get()` sigue síncrono.
- Los hrefs sueltos de `load`, `ensure(tag, { href })`, `registerApp` y `loadPageModules` se cargan por extensión.

## Bootstrap recomendado (apps)

El arranque más rápido no espera a que el loader descubra nada: el HTML de la app ya trae el import map, la precarga
del cierre del shell crítico (sacada del grafo vendorizado `src/vendor/iswc-base/deps.json` en el build de la app), la
marca `iswc-precargado` y las hojas base sin bloquear.

```html
<script type="importmap">
{ "imports": { "@jeff-aporta/iswc-base/": "https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@SHA/dist/cdn/" } }
</script>
<!-- Pin del que salió la precarga: el loader no pide deps/<cat>.json para lo que ya está precargado (F7). -->
<meta name="iswc-precargado" content="SHA">
<!-- Cierre del shell crítico: tags[tag] de cada tag del shell (chunks tal cual, sin ?v=; lib/zod incluido). -->
<link rel="modulepreload" href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@SHA/dist/cdn/core/loader.min.mjs">
<link rel="modulepreload" href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@SHA/dist/cdn/layout/app-shell.min.mjs">
<link rel="modulepreload" href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@SHA/dist/cdn/_chunks/chunk-XXXXXXXX.mjs">
<!-- Hojas base no bloqueantes (F7): no frenan la ejecución de los módulos que siguen. -->
<link rel="preload" as="style" href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@SHA/dist/cdn/is-base.min.css" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@SHA/dist/cdn/is-base.min.css"></noscript>
<link rel="preload" as="style" href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@SHA/dist/cdn/palettes.min.css" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@SHA/dist/cdn/palettes.min.css"></noscript>
<script type="module">
  import { iswcLoader as L } from '@jeff-aporta/iswc-base/core/loader.min.mjs';
  await Promise.all(['iswc-app-shell', 'iswc-button'].map((t) => L.ensure(t)));   // shell crítico definido
  document.documentElement.setAttribute('data-app-ready', '');
  void L.load('iswc-dialog', 'iswc-ag-grid');                                       // el resto, progresivo
</script>
```

- Sobre un pin SHA (jsDelivr/githack) las URLs no llevan `?v=` (son inmutables). En un origen mutable (Pages, carpeta
  local) el build de la app sella las entradas con el `?v=` del grafo (`v`) y deja tal cual los chunks y los módulos
  que otro importa (`lib/zod`, capas del loader, tags pedidos por `import()`): esos no llevan `?v=` en ninguna parte.
- Si el HTML ya enlaza `is-base.min.css` (con o sin `?v=`, como `stylesheet` o como `preload as=style`), el loader no
  lo duplica; los `modulepreload` del HTML tampoco se repiten.
- Grafo partido (F7): `dist/cdn/deps.json` es solo un índice (`sha` + tag → categoría, ~6 KB) y el cierre de cada tag
  va en `dist/cdn/deps/<cat>.json` (1–20 KB; el del core en `deps/core.json`). `sha` es el SHA **base** del build (el
  commit sobre el que se construyó, anterior al que lo publica): informativo, no se compara con el pin.
- Si una entrada pedida ya está en un `<link rel="modulepreload">` del HTML (no puesto por el loader), el loader la
  importa con ese mismo href y no pide `deps/<cat>.json`: el build de la app ya emitió su cierre. Con
  `<meta name="iswc-precargado" content="SHA">`, esa precarga solo cuenta si el SHA coincide con el pin de la raíz
  (un HTML de otro pin pide `deps` igual).
- Sin precarga en el HTML, `load()` pide `deps/<cat>.json` de cada categoría del lote (una vez) e inyecta
  `<link rel="modulepreload">` para todo el cierre: el navegador lo baja en una ráfaga en vez de un nivel por
  `import()`. Sobre pin SHA va con `cache: 'force-cache'` y en paralelo con el primer `import()`; en un origen mutable el
  loader lo espera (trae el `?v=` de las entradas: sin él, una entrada cacheada pediría chunks que ya no existen).
- Nada de top-level await en los módulos que cargan las apps (regla del WebView Android): el núcleo y la capa 2 no
  lo usan.

## Bootstrap mínimo

```js
import { iswcLoader as L } from
  'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@REF/dist/cdn/core/loader.min.mjs';

// Sin configure: el loader ya trae quemado el SHA de ESTE build (o el de @REF
// si la URL venía pinneada). load() pide componentes a jsDelivr@eseSha.
// is-base.min.css se auto-carga al import (W52).
await L.loadPageStyles(['iswc-palettes-default']);
await L.load('iswc-button', 'iswc-button-group');
// o: L.load('actions') | L.load('all')
```

Con import map (alias `@jeff-aporta/iswc-base/`, la entrada que publica `dist/cdn/importmap.json`; ver `specs/cdn.md` §Alias):

```html
<script type="importmap">
{ "imports": { "@jeff-aporta/iswc-base/": "https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@REF/dist/cdn/" } }
</script>
<script type="module">
  import { iswcLoader as L } from '@jeff-aporta/iswc-base/core/loader.min.mjs';
  await L.load('iswc-button');
</script>
```

### Pin quemado (default)

Cada `loader.min.mjs` lleva `__IS_BUILD_SHA__` (HEAD al publicar). Si el
`script src` / `import` usa `@<sha>/…/loader.min.mjs`, ese SHA de la URL gana.

| | |
| --- | --- |
| `L.shaDefault` | Pin efectivo de este loader |
| `L.shaFromUrl` | SHA leído de la URL, o `null` |
| `L.host` | `https://cdn.jsdelivr.net/gh/…@<sha>/dist/cdn/` si el loader vino de jsDelivr o githack; `null` en cualquier otro origen |

**Regla del host de arranque.** El loader solo arranca contra jsDelivr@`shaDefault` cuando él
mismo fue cargado desde `cdn.jsdelivr.net` o `raw.githack.com` (`esOrigenCdn(import.meta.url)` en
`src/core/cdn-ref.ts`). Desde cualquier otro origen (GitHub Pages, `localhost`, `file:`, un vendor
copiado dentro de otra app) `L.host` es `null` y `preferSelf` manda: los componentes salen de la
carpeta del propio loader (`dist/cdn/`), y la cadena jsDelivr → githack → Pages queda como
fallback (con el mismo pin, para no consultar la API de GitHub). Motivo: la galería en Pages
moría cuando el SHA quemado ya no existía en GitHub (historia reescrita). `shaDefault`,
`shaFromUrl`, `configure({ sha | host })` y `pin()` funcionan igual en todos los orígenes.

No hace falta `L.configure({ host: '…@sha…/dist/cdn' })` en apps externas que importan el loader
desde jsDelivr.

### Host y cache-bust (opcional)

Para **otro** commit, otro espejo o bust de caché:

```js
// Otro pin (pisar el quemado)
L.configure({ sha: 'abcdef0123456789…' });

// Host absoluto (githack, vendor, etc.) — manda sobre sha
const KIT = 'https://raw.githack.com/Jeff-Aporta/is-webcomponents/main/dist/cdn';
L.configure({
  host: KIT,
  preferSelf: false,
  v: 2,               // → ?v=2 en cada asset
  mirrors: ['githack', 'pages'],
});

await L.load('iswc-dropdown');
```

| Opción | Efecto |
| --- | --- |
| `host` | URL absoluta a `dist/cdn/`. Primera base de carga. Gana sobre `sha` |
| `sha` | Arma `host` con `hostDefault`, sustituyendo `{{sha}}`. Vacío usa `shaDefault` (quemado). **Opcional** — sin esto ya hay pin de arranque |
| `cdnUrl` | Sustituye `{{cdnUrl}}` de la plantilla. Vacío usa `cdnUrlDefault` |
| `v` | Escribe `query.v` (p. ej. `2` → `?v=2`) |
| `query` | Mapa o string de search params en cada asset |
| `mirrors: ['githack']` | Prioriza `raw.githack.com` (la cadena canónica sigue detrás) |

## Fallback de espejos

Cadena fija al cargar JS/CSS del kit (si un espejo cae, el siguiente responde):

1. **jsDelivr** (`cdn.jsdelivr.net/gh/…@<sha>/dist/cdn`) — primario, pin por commit
2. **raw.githack** (`raw.githack.com/…/<sha>/dist/cdn`) — mismo pin, MIME JS fiable
3. **GitHub Pages** (`jeff-aporta.github.io/…/dist/cdn`) — último recurso (tip desplegado)

`host` o `preferSelf` van **antes** de esa cadena. El primer espejo que responde bien queda *sticky* en la página: los siguientes `load` no reintentan primero un espejo que ya falló.

## Hash de contenido (`?v=`)

Cada build deja un mapa de 6 caracteres en `dist/cdn/asset-hashes.json`. El loader **no** lo lleva embebido
(`__IS_ASSET_HASHES__` queda en `{}`); desde F4 sella solo en orígenes mutables (Pages, `localhost`, carpeta local) y
nunca sobre un pin SHA de jsDelivr/githack (`esUrlInmutable`: la URL ya es inmutable):

- **Entradas del kit** (`<cat>/<tag>.min.mjs`): su `?v=` viaja en `deps/<cat>.json` (`v`), que el loader ya pide para
  la precarga. No hace falta bajar `asset-hashes.json` para `load`/`ensure`.
- **Ningún `.mjs` lleva `?v=` dentro** (F7): ni chunks ni entradas sellan sus imports. Un módulo que otro importa por
  ruta relativa (`lib/zod.min.mjs`, las capas `core/loader-<x>`, un tag pedido por `import()` desde otro) tiene UNA
  URL sin `?v=` para todos: queda fuera de `asset-hashes.json` y de `v`, así nadie lo pide con dos URLs (dos
  instancias). En Pages/local se revalida por la caché HTTP (`max-age` corto); sobre pin SHA es inmutable.
- **Hojas, módulos de página y `assetUrl()`**: `loader-hashes` lee `asset-hashes.json` en diferido (en
  `loadPageModules`/`loadPageStyles`; `assetUrl` lo dispara y sella cuando llega).
- **Chunks** (`_chunks/chunk-<hash>.mjs`): nunca llevan `?v=` (el nombre ya es el hash de su contenido). Su URL es una
  sola para todos sus importadores y para el `modulepreload` del loader.

Si el archivo cambia, el hash cambia y el navegador pide esa URL: no hace falta un refresco forzado.

**Extensiones y grafo.** Los módulos ES del kit son `.min.mjs` (`<cat>/<tag>.min.mjs`, `core/<x>.min.mjs`, `_chunks/chunk-<hash>.mjs`); `.js` queda para lo clásico (`*.classic.js`, `<script src>`) y para la copia compat `core/loader.min.js` (se retira en F5). `dist/cdn/deps.json` es el índice (tag → categoría) y `dist/cdn/deps/<cat>.json` da, por tag, el cierre completo de módulos que trae (`tags`; `deps/core.json`: `core`) y el `?v=` de cada entrada (`v`): el loader pide solo la parte de la categoría que carga para precargar el lote con `modulepreload`. Los consumidores vendorizan el grafo unido (`pin-update`, `vendor:iswc`).

**La extensión declara el tipo (D2).** En `load(href)`, `ensure(tag, { href })`, `registerApp` y `loadPageModules`:
`.mjs`, `.ts` o sin extensión → `import()`; `.js` → `<script src>` clásico (promesa en `load`/`error`); `.css` →
`<link>`. Overrides: prefijo `classic:` / `module:` (page modules), `type: 'module' | 'classic'` (`registerApp`,
`registerPageModule`). Un componente de app que es módulo ES con extensión `.js` necesita `type: 'module'`.

Los `import` relativos entre entradas `.min.mjs` llevan el `?v=` de su destino, sellado en el build en orden de dependencias. Los módulos se cargan solo con `import()` (dedupe por URL); no pasan por Cache Storage: la caché HTTP (`immutable` en jsDelivr, `?v=` en orígenes mutables) cubre la revisita sin pedir cada módulo dos veces. El arranque no usa IndexedDB ni Cache Storage: `is-base.min.css` va por `<link rel=stylesheet>` (sin fetch previo). El `asset-store` (cuerpos por ruta+hash en IndexedDB) queda en la capa 2 para quien lo use a mano.

Generadores para otros proyectos (CDN o vendor): `src/cdn/build/` (`bundleMinJs`, `bundleLoader`, `stampHashTexts`, `hashBase`/`hashJs`/`hashCss`/`hashHtml`). El build los publica en `dist/cdn/build/`.

Render headless de diagramas (SVG/PNG): `src/vendor-distributions/client/tools/` (`renderDiagram`, `renderDiagramBatch`, `writeDiagramOutputs`). El build los publica en `dist/cdn/vendor-distributions/client/tools/`. Playwright **no** va en el vendor: el consumidor lo inyecta (`createRequire(…​)('playwright').chromium`). Sirve para labs ISWC y para generadores Deno de otros repos (ISS, etc.) con el mismo contrato.

### Lote con caché por hash (`render-lote.ts`)

Lo que ISS e ISW corren en `deno task docs:diagramas`: una carpeta de editables `<slug>.json` `{ slug?, module, tag, script, attrs?, payload }` → `<svg>/<slug>.svg` + `<png>/<slug>.png`, renderizando solo lo que cambió.

```
deno run -A --no-check --sloppy-imports ISU/render-lote.ts --carpeta=<dir> --svg=<dir> --png=<dir> [--cache=<archivo>] [--kit=<dir>] [--forzar] [--solo=a,b]
```

- **Huella** (`planificarLote`, puro): sha256 del JSON canónico de `{ version, pinKit, module, tag, script, attrs, payload }` con el payload YA RESUELTO (`RefObj.resolver` sobre las referencias `{ path, query, actions }` relativas al editable). Así un value de `../fuentes/codigo.json` que entra al diagrama cambia su huella; uno que no entra, no. `pinKit` = `<kit>/PIN` (o `dist/cdn/build-stamp.json`) salvo que el consumidor lo pase; `version` es la constante del módulo (sube cuando cambie el formato). Una referencia que no resuelve deja el diagrama en `error` con el motivo.
- **Decisión por diagrama**: `render` si la huella difiere, no está en caché, falta el SVG/PNG o `--forzar`; `skip` si todo coincide. `_*.json` (fuentes de solo soporte) y el caché no son diagramas.
- **Caché** `diagramas-iswc.cache.json` (junto a los editables, o `--cache`): `{ version, diagramas: { [slug]: { huella, svg, png, fecha, ancho, alto } } }`, rutas relativas al caché. Se escribe atómico tras cada diagrama OK, así un lote interrumpido conserva lo logrado.
- **Render** (`renderizarLote`): un proceso hijo por diagrama (`--one <slug>`, mismas opciones por env) con hasta 5 intentos (Chromium a veces no arranca en Windows, os error 6). Líneas `OK <slug>.svg (WxH)` / `SKIP <slug> (sin cambios)` / `reintento…` / `FAIL …` y resumen `lote · N renderizados · M sin cambios · K fallidos`; exit 1 si hay fallidos.

## Sheet cache (apps)

Evita flicker de CSS en ShadowRoot: Cache Storage + `adoptedStyleSheets`.

```js
await L.sheets.install({ cacheName: 'mi-app-sheets-v1' });   // capa 2: promesa de la API
await L.sheets.warmFromCache();
await L.sheets.warmFromManifest('./dist/cdn/hojas-manifest.json', {
  base: './dist/cdn/',
});
await L.load('iswc-button');
```

API: `install`, `get`, `warm(hrefs)`, `warmFromCache`, `warmFromManifest(url, { base, key })`.

## App components (`registerApp`)

Registra tags propios (fuera del catálogo del kit). `load` / `ensure` los tratan igual que los `is-*` y calientan el CSS hermano si sheet-cache está activo (en paralelo con el `import()`). El tipo sale de la extensión: `.mjs` → `import()`, `.js` → script clásico, salvo `type`. Con `deps` (`tag` → hrefs, en `registerApp` o en `configure`) el loader precarga ese cierre con `modulepreload` al pedir el tag; sin `deps`, solo la entrada.

```js
L.registerApp(
  {
    // ⚠️ NO uses `./dist/cdn/all.min.js`: es una *lista de imports* (~250 B),
    // no un bundle importable. Para apps, registra cada tag o cada
    // `<category>/<tag>.min.mjs` por separado. Ver `specs/cdn.md` §CDN y
    // §Anti-patrones.
    'paty-shell': './dist/cdn/<category>/paty-shell.min.mjs',
    'mi-widget': { href: './widgets/mi-widget.js', type: 'module', css: './widgets/mi-widget.css' },
  },
  { cacheName: 'mi-app-sheets-v1', deps: { 'paty-shell': ['./dist/cdn/_chunks/paty-base.mjs'] } },
);

await L.load('iswc-button', 'paty-shell');
await L.ensure('iswc-code'); // lazy: load + whenDefined
```

## Ensure (lazy)

```js
await L.ensure('iswc-code');           // catálogo del kit
await L.ensure('mi-widget');         // registerApp
await L.ensure('iswc-code', { href }); // href explícito (por extensión: .mjs → import(), .js → clásico)
L.isReady('iswc-code');                // sync
```

`load()` resuelve al **importar**; `ensure()` resuelve al **definirse** (`whenDefined`).

## Componentes documentales

Los tres viven en `layout/` y se piden por su tag: el bundle trae sus dependencias (índice, markdown,
código, paginador, diálogo), sin listas de tags ni un segundo CDN.

| Tag | Para | Ejemplo |
| --- | --- | --- |
| `iswc-doc-layout` | Layout documental común (navegación \| contenido \| índice) | `await L.ensure('iswc-doc-layout')` |
| `iswc-md-docs-vault` | `docs/index.html` de un proyecto (hojas markdown como un libro) | `await L.ensure('iswc-md-docs-vault')` |
| `iswc-server-api-docs` | `GET /api/docs` de un server (documento InSoft u OpenAPI 3, «Probar») | `await L.ensure('iswc-server-api-docs')` |

## Anti-redundancia

Registro **persistente** en la página:

1. `load('actions')` marca la categoría y todos sus tags.
2. Un `load('iswc-button')` posterior **no** vuelve a pedir red: ya está cubierto.
3. `load('all')` cubre todo; cargas siguientes se omiten.
4. En el mismo `load('actions', 'iswc-button')`, el tag se salta si la categoría va en el mismo lote.

API:

- `has('iswc-button' | 'actions' | 'all')` → boolean
- `getLoaded()` → `{ all, categories, tags }`
- `load(...)` → `{ loaded: string[], skipped: string[] }`

## Pin y mirrors

| Método | Efecto |
| --- | --- |
| `pin(ref)` | Fija branch o SHA (jsDelivr `@ref`) |
| `unpin()` | Tip de `main` vía API GitHub |
| `configure({ mirrors, preferSelf, ref, host, sha, cdnUrl, v, query })` | Espejos / self / host / bust |
| `listBases()` / `fallbackBases()` | Bases que se probarán |

Orden por defecto: `host` (si hay) → `self` (si `preferSelf` y no hay host) → **jsDelivr → githack → Pages**. Un fallo en un espejo prueba el siguiente; el que funciona queda sticky. El núcleo solo prueba la primera base (host o self); la cadena y el sticky viven en `loader-mirrors` (capa 2), que se pide únicamente si esa base falla. Sin pin la cadena consulta la API de GitHub (`loader-ref`); con pin, `BOOT_HOST`, `self` o `mirrors: []` (modo local) nunca.

Una hoja cuenta como caída solo si cae ella: un `@import` que no responde (las fuentes web de `doc-presentation` sin red) también dispara `error` en el `<link>`, pero si la hoja propia llegó (estado 2xx/3xx en Resource Timing o, sin estado, reglas legibles) el `<link>` se queda y no se baja a los espejos. Guardián: `tests/navegador/scrollspy-restore.test.ts` (galería sin red externa).

## CSS

### Apps consumidoras (CDN)

- Documento: `loadPageStyles(['iswc-palettes-default'])` (o `<link>` a `palettes.min.css`). `is-base` se auto-inyecta al importar el loader.
- Componente: lo trae cada `.min.js` con `adoptCss` en shadow.
- Relativos al documento: `loadPageStyles([...])` / `loadPageModules([...])` (sin mirrors). Alias CDN del kit: prefijo `cdn:` o alias registrado (`iswc-palettes-default`).

### Shell doc-demo (`iswc-doc-demo`) — reutilizable

Misma pieza para la galería ISWC y para **cualquier app** de docs/demos.

```html
<!-- CDN / otra app -->
<script type="module" src="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents/dist/cdn/preview/doc-demo-host.min.mjs"></script>
<script type="module" src="./app.min.js"></script>
<body>
  <iswc-doc-demo brand="MiApp" sheets-cache="mi-app-sheets"></iswc-doc-demo>
</body>
```

```html
<!-- Galería local (self-test) — solo loader; sin ?v= ni script src de bundles -->
<script type="module">
  import { iswcLoader as L } from './dist/cdn/core/loader.min.mjs';
  await L.loadPageModules(['iswc-doc-demo-host']);
  await L.loadPageModules(['iswc-gallery-app']);
</script>
<body>
  <iswc-doc-demo brand="ISWC" local dev sheets-cache="iswc-gallery-sheets"></iswc-doc-demo>
</body>
```

| Artefacto | Tipo | Rol |
| --- | --- | --- |
| `loader.min.mjs` | module | entry; enruta `?v=` y espejos |
| `iswc-doc-demo-host` | alias module | `configure` + boot + `L.load('iswc-doc-demo')` |
| `iswc-gallery-app` | alias module | SPA `dist/gallery-app.min.js` |
| `iswc-doc-demo-boot` | alias module | theme/palette + CSS crítico |
| `iswc-doc-demo` | CE (catálogo) | shell light-DOM + page styles/modules |

Aliases CSS: `iswc-palettes-default`, `iswc-doc-shell`, `iswc-doc-presentation`.  
Page modules: `type: 'module' | 'classic'` (`dev-reload` classic, **opt-in** con attr `dev`).
Tema ER InSoft (sin CE nuevo): alias JS `iswc-diagram-theme` → `cdn:diagrams/theme.min.mjs`
(`json2css`, `resolveErTheme`, `INSOFT_THEME`); JSON editable en `dist/cdn/diagrams/themes/insoft.json`.
Uso: `<iswc-er-diagram theme="insoft">` / `<iswc-er-editor theme="insoft">`.  
Evento canónico: `iswc-doc-demo-ready` / `.whenReady()`.

| Opción | Efecto |
| --- | --- |
| `local: true` | `preferSelf`, `host` = raíz del kit (`import.meta.url` → `dist/cdn/`), `mirrors: []`, sin pin |
| `host: 'self' \| './'` | Misma raíz relativa al loader (sin quemar localhost) |
| `host: 'dist/cdn/'` | Relativo a la página montada |
| `mirrors: []` | Sin fallback jsDelivr/githack/Pages |

Detalle: `src/components/layout/doc-demo.md` · guardián `tests/gallery-boot.test.ts`.