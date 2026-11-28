# `iswcLoader` (`loader.min.mjs`)

Entry CDN liviano del kit. Carga solo lo pedido, con pin, mirrors y anti-redundancia.

## Rutas

| Artefacto | Path |
| --- | --- |
| Fuente (núcleo, capa 1) | `src/cdn/loader.ts` |
| Capa 2 (al primer uso) | `src/cdn/loader-{sheets,store,mirrors,pages,ref,hashes,autoload,plugin,plugin-externo}.ts` |
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
| 2 | `core/loader-autoload.min.mjs` | autoloader opcional: `observar()` (MutationObserver) y `listos(raiz)` (`allDefined`) | `observar`/`listos` |
| 2 | `core/loader-plugin.min.mjs` | enrutador de plugins: `loadPlugin()` (componentes de OTRA app por repo + SHA + prefijo) | `loadPlugin` |
| 2 | `core/loader-plugin-externo.min.mjs` | `cargarPlugin()`: app externa por usuario + repo + SHA (componentes, paletas, herramientas); rutas fijas, caché por SHA; su forma declarativa (`[data-iswc-plugin]`) | `cargarPlugin`, `cargarDeclarativos` |

La API pública (`iswcLoaderShape`) no cambia de forma: cada método de capa 2 es un envoltorio `async` que hace
`import()` del módulo y le pasa el contexto del núcleo. Cambios de comportamiento:

- `load(...)` resuelve cuando los módulos del lote están **importados** (promesas de `import()`); no espera
  `whenDefined` de todo. `ensure(tag)` sí lo espera. `LoadResult` sigue siendo `{ loaded, skipped }`. Una app revela
  la página cuando su shell crítico está definido (`ensure`) y lo demás se «upgradea» al llegar.
- `sheets.install()` devuelve una **promesa** de la API de la caché (antes la API); `sheets.get()` sigue síncrono.
- Los hrefs sueltos de `load`, `ensure(tag, { href })`, `registerApp` y `loadPageModules` se cargan por extensión.

## Plugins: `L.loadPlugin()` (el kit como enrutador)

`L.load('iswc-…')` carga los componentes del kit. Los de **otra app** (`crm-*`, `iswd-*`, `peon-*`…) no viven aquí: cada app
es dueña de los suyos y `loadPlugin` solo los **enruta**: dado su repo, su SHA y su prefijo, baja el manifiesto de esa
app, registra sus tags (como `registerApp`) y le enseña al autoloader su prefijo. iswc-base no conoce ningún componente
de los plugins. Capa 2 (`loader-plugin`, no pesa en el núcleo); fuente `src/cdn/loader-plugin.ts`, contratos en
`src/cdn/schemas/plugin.schemas.ts`.

```js
import { iswcLoader as L } from '@jeff-aporta/iswc-base/core/loader.min.mjs';

const diagramas = await L.loadPlugin({
  app: 'diagrams',                         // nombre estable; alias de import map `@diagrams/`
  repo: 'Jeff-Aporta/iswc-diagrams',       // GitHub dueño/repo  →  jsDelivr gh/<repo>@<sha>/dist/cdn/
  sha: '<commit de 40 hex>',               // pin obligatorio (nunca main, rama ni SHA corto)
  prefijo: 'iswd-',                        // prefijo de sus tags, con guion final; nunca `iswc-`
  tags: ['iswd-flowchart'],                // opcional: cargarlos ya; sin él solo se registran
});
// → { app, repo, sha, prefijo, raiz, tags: [...], alias: { '@diagrams/': raiz } }
await L.ensure('iswd-sequence-diagram');   // un tag del plugin se pide igual que uno propio
await L.observar();                        // y el autoloader ya pide también los `iswd-*` que aparezcan
L.getPlugins();                            // los plugins registrados en esta página
```

Qué hace, en orden: (1) valida la petición (`TypeError` con el campo que falla); (2) **importa el loader propio de la app**,
`<prefijo sin guion>Loader.min.mjs` (`iswd-` → `iswdLoader.min.mjs`), de `gh/<repo>@<sha>/dist/cdn/`: jsDelivr → githack con el
mismo SHA (con `host` alterno, solo ese origen: desarrollo y pruebas); (3) ese loader, generado por el build de la app con
las mismas optimizaciones del kit (chunks, `.min.mjs`, hashes, `?v=`, espejos), resuelve **sus propias rutas** respecto a su
`import.meta.url` y se registra con `iswcLoader.registerApp`; (4) `loadPlugin` lee de `getAppComponents()` los tags que quedaron
con el prefijo y se lo enseña al autoloader (`observar()` pide los `<prefijo>*` al verlos); (5) si hay `tags`, los carga ya.
**El kit solo enruta**: no conoce rutas, manifiestos ni archivos de la app, y la versión de la app no depende de la del kit.

Reglas: una página usa **una versión por app** (misma petición = misma promesa; otro SHA para la misma app, un prefijo ya
tomado o un tag ya registrado por otro módulo fallan con mensaje claro); un fallo deja la app libre para reintentar. Un
plugin importa el kit por el alias `@jeff-aporta/iswc-base/` del import map de la **página** (una sola instancia del kit).

### Contrato que cada app expone (`iswc-plugin/v1`)

Una app es plugin si publica, en `dist/cdn/` de su repo (los archivos viajan commiteados, como `dist/` del kit):

| Archivo | Quién lo escribe | Para qué |
| --- | --- | --- |
| `<prefijo>Loader.min.mjs` | `construirApp` | **el contrato**: registrador de la app (`registerApp` de sus tags con rutas propias); lo importa `loadPlugin` |
| `plugin.json` | `construirApp({ …, plugin: { app, repo, titulo? } })` | metadato para herramientas (catálogo, `deno task shas`, docs); el enrutador **no** lo lee |
| `deps.json`, `_chunks/`, `*.min.mjs` | `construirApp` | los módulos y el cierre |

```jsonc
{
  "schema": "iswc-plugin/v1",
  "app": "diagrams", "repo": "Jeff-Aporta/iswc-diagrams", "prefijo": "iswd-", "titulo": "Diagramas ISWC",
  "loader": "iswdLoader.min.mjs",
  "kit": { "repo": "Jeff-Aporta/is-webcomponents", "sha": "<pin del kit con el que se construyó>" },
  "tags": { "iswd-flowchart": "diagrams/iswd-flowchart.min.mjs", "iswd-x": { "href": "…min.mjs", "css": ["…css"] } },
  "deps": { "iswd-flowchart": ["_chunks/chunk-ABCD1234.mjs"] }
}
```

Rutas relativas al manifiesto (con `?v=` en origen mutable, igual que el registrador). Los tags de la app empiezan por
`<prefijo>-` y el prefijo es único en el ecosistema (`iswc-` kit, `iswd-` diagramas, `crm-`, `peon-`).

**Alias por app en el import map** (para diseñar con imports en la app que consume): `construirApp({ importMap: { '@diagrams/':
'https://cdn.jsdelivr.net/gh/<repo>@<sha>/dist/cdn/' } })` lo escribe en el bloque `iswc:precarga`; en tiempo de ejecución
la misma entrada llega en `info.alias`. Un import map no admite entradas nuevas tras el primer `import()`, así que el
alias se declara en el HTML y `loadPlugin` carga por tag.

Hermeticidad: el plugin se consume **solo por CDN con SHA** (la misma regla que el kit): nunca rutas locales entre repos. El
SHA del plugin vive en UN sitio del consumidor (constante o `deno.json`), y subirlo es una decisión del consumidor.

## Plugins externos por usuario + repo + SHA: `L.cargarPlugin()` (componentes, paletas, herramientas)

`loadPlugin` pide el prefijo y el repo completo; **`cargarPlugin`** es la forma homogénea para apps que **no existen en el kit**
y siguen la estructura de foundation: se las referencia por **usuario de GitHub + repo + SHA** y las rutas de carga son
**fijas**. El consumidor solo cambia el SHA para mover el pin. Capa 2 (`loader-plugin-externo`, no pesa en el núcleo); fuente
`src/cdn/loader-plugin-externo.ts`, contratos Zod en `src/cdn/schemas/plugin-externo.schemas.ts`.

```js
const crm = await L.cargarPlugin({
  usuario: 'Jeff-Aporta',        // usuario u organización de GitHub (sin barras)
  repo: 'crm',                   // solo el nombre del repo
  sha: '<commit de 40 hex>',     // obligatorio; nunca main, rama ni SHA corto (TypeError con el campo)
  tipo: 'todo',                  // 'componentes' | 'paletas' | 'herramientas' | 'todo' (por defecto)
  tags: ['crm-chat'],            // opcional: cargar ya esos tags (solo con componentes)
  paletaDefecto: 'peligro-1',    // opcional: paleta inicial de la app (solo si el usuario no eligió otra)
});
// → { usuario, repo, sha, nombre, version, prefijo, raiz, cargado: { componentes, paletas, herramientas },
//     tags: [...], paletas: ['peligro-1', …], herramientas: { exportar: <módulo> }, manifiesto }
```

**Rutas fijas** (todas bajo `dist/cdn/` del repo; jsDelivr y, de respaldo, githack con el mismo SHA; con `host` alterno solo ese
origen, para desarrollo y pruebas):

| Qué | URL |
| --- | --- |
| manifiesto | `https://cdn.jsdelivr.net/gh/<usuario>/<repo>@<sha40>/dist/cdn/plugin.json` |
| componentes | `<raíz>/<prefijo sin guion>Loader.min.mjs` (lo importa `loadPlugin`; registra sus tags) |
| paletas | `<raíz>/palettes/<nombre>.json` (una paleta por archivo) |
| herramientas | `<raíz>/<ruta declarada en plugin.json>` (módulos ESM) |

Orden: valida la petición (Zod) → baja `plugin.json` y lo valida (`iswc-plugin/v1`; si no cumple, el error lista cada campo:
`cargarPlugin(Jeff-Aporta/crm@abcdef01): plugin.json no cumple iswc-plugin/v1: loader: debe ser crmLoader.min.mjs; …`) → carga solo
lo que pide `tipo`. **Caché por SHA**: el manifiesto, los componentes, las paletas y las herramientas se piden una sola vez por
`usuario/repo@sha` y página (repetir la petición, o pedir otro `tipo` ya cargado, no toca la red); otro SHA baja otro
manifiesto y reemplaza las paletas del mismo plugin. Los componentes siguen la regla de `loadPlugin`: una versión por app y página.

### Forma declarativa (el HTML declara el plugin)

La misma carga, sin una línea de JS: la página **declara** el plugin en el HTML y el loader lo carga al arrancar.

```html
<!-- Una app externa: el bloque trae la misma petición que cargarPlugin -->
<script type="application/json" data-iswc-plugin>
{ "usuario": "Jeff-Aporta", "repo": "crm", "sha": "<commit de 40 hex>", "tipo": "todo", "tags": ["crm-chat"], "paletaDefecto": "peligro-1" }
</script>
```

- El bloque puede ser **un objeto o una lista** de objetos (varias apps declaradas en la misma página).
- `<script type="application/json" data-iswc-plugin>` trae el JSON en su texto; cualquier otro elemento con el atributo
  (`<div data-iswc-plugin='{…}'>`) lo trae en el valor del atributo.
- El núcleo los carga solo al arrancar (sin bloques en el HTML no se importa ni la capa). `L.cargarDeclarativos()`
  devuelve lo mismo para que la app pueda esperarlo: `{ cargados: [...], errores: [...] }`.
- Una entrada que falla (SHA malo, JSON roto, repo caído) **no tumba la página**: queda en `errores` con su mensaje y las
  demás siguen.

### Manifiesto homogéneo (`dist/cdn/plugin.json`)

```jsonc
{
  "schema": "iswc-plugin/v1",
  "app": "crm", "repo": "Jeff-Aporta/crm", "prefijo": "crm-", "titulo": "CRM", "version": "1.2.0",
  "loader": "crmLoader.min.mjs",                       // siempre <prefijo sin guion>Loader.min.mjs
  "kit": { "repo": "Jeff-Aporta/is-webcomponents", "sha": "<pin con el que se construyó>" },
  "tags": { "crm-chat": "js/components/crm/crm-chat.min.mjs" },
  "deps": { "crm-chat": ["_chunks/chunk-AAAA.mjs"] },
  "paletas": [ { "nombre": "peligro-1", "ruta": "palettes/peligro-1.json" }, { "nombre": "suspendida", "ruta": "palettes/suspendida.json" } ],
  "herramientas": [ { "nombre": "exportar", "ruta": "js/tools/exportar.min.mjs" } ]
}
```

`construirApp({ …, plugin: { app, repo, titulo?, version?, paletas?, herramientas? } })` lo escribe: copia cada
`src/palettes/<nombre>.json` (carpeta configurable con `plugin.paletas`) a `dist/cdn/palettes/` y la declara en `paletas`; las
`herramientas` son módulos ya construidos (`ruta` relativa a `dist/cdn/`) y el build comprueba que existan. Un repo que
publique `dist/cdn/` en una subcarpeta (monorepo) no cumple la ruta fija: usa `loadPlugin({ ruta })` o publica su `dist/cdn/`
en la raíz.

### Paletas de plugin (`palettes/<nombre>.json`)

Una paleta son las **semillas** de `palettes.json` del kit (la rampa, el contraste y las superficies los deriva
`palettes.min.css` desde `[data-palette]`). `value` es opcional y, si está, debe coincidir con `nombre`; el nombre va en
minúsculas, dígitos y guiones (`peligro-1`) y no puede repetir una del kit ni de otro plugin:

```json
{ "label": "Peligro 1", "family": "Estados", "mood": "Naranja de aviso.", "h": 35, "s": "95%", "b": "52%", "tint": 0.6 }
```

Campos: `h` (0–360), `s` y `b` (`56%`), opcionales `contrastH/S/L`, `tint` y `fontTint` (0–1; **`tint: 0` = superficies en
grises neutros**, p. ej. `suspendida`: `{ "h": 0, "s": "0%", "b": "50%", "tint": 0 }`), `label`, `family` (grupo del selector;
por defecto el `titulo` de la app), `origin`, `mood`. Cada consumidor define las suyas: el kit no trae paletas de estado. Una
escala de peligro, de naranja a rojo, son cinco archivos `peligro-1..5` con `h` de 35 a 0.

**Registro y selector**: `registrarPaletas` (`src/styles/palette-registry.ts`) escribe una `<style data-iswc-palettes-plugin>` con
el bloque de semillas de cada paleta y avisa con el evento `iswc-palettes-change`. El `<iswc-palette-selector>` **lista también
las del plugin** (agrupadas por `family`) y se redibuja solo al llegar nuevas; con una lista `palettes` propia las suma si lleva
`con-plugins`. Con varias apps cargadas, el usuario elige entre las paletas de todas.

```js
import { fijarPaletaDefecto, cambiarPaleta, paletasExternas } from '@jeff-aporta/iswc-base/styles/palette-registry.js';
fijarPaletaDefecto('peligro-1');            // paleta inicial de la app; solo manda si el usuario no guardó otra (también antes de cargar el plugin)
cambiarPaleta('suspendida');                // cambio en caliente: data-palette del <html>; el selector lo sigue
cambiarPaleta('peligro-3', { guardar: true }); // además queda como elección del usuario (app-cfg)
paletasExternas();                          // las registradas por plugins
```

Si el usuario había elegido una paleta de plugin en otra visita, `registrarPaletas` la restaura al llegar el plugin (`initApp` solo
conoce las 25 del kit).

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

**Extensiones y grafo.** Los módulos ES del kit son `.min.mjs` (`<cat>/<tag>.min.mjs`, `core/<x>.min.mjs`, `_chunks/chunk-<hash>.mjs`); `.js` queda para lo clásico (`*.classic.js`, `<script src>`) y para la copia compat `core/loader.min.js` (se retira en F5). `dist/cdn/deps.json` es el índice (tag → categoría) y `dist/cdn/deps/<cat>.json` da, por tag, el cierre completo de módulos que trae (`tags`; `deps/core.json`: `core`) y el `?v=` de cada entrada (`v`): el loader pide solo la parte de la categoría que carga para precargar el lote con `modulepreload`. Los consumidores vendorizan el grafo unido (`pin-update`, `vendor:ISWC`).

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

Una app Deno no escribe este registrador a mano: lo genera el conversor del kit (`<prefijo>Loader.min.mjs`, con
`{ href, type: 'module' }` y `deps` desde el metafile) junto con el bloque de precarga de sus HTML. Ver
[`specs/cdn.md` §Conversor `construirApp`](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/specs/cdn.md) y
[`02-deno-y-build.md`](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-foundation/references/02-deno-y-build.md).

## Ensure (lazy)

```js
await L.ensure('iswc-code');           // catálogo del kit
await L.ensure('mi-widget');         // registerApp
await L.ensure('iswc-code', { href }); // href explícito (por extensión: .mjs → import(), .js → clásico)
L.isReady('iswc-code');                // sync
```

`load()` resuelve al **importar**; `ensure()` resuelve al **definirse** (`whenDefined`).

## Autoloader (opcional)

- `L.observar(raiz?)` — pide `ensure` de cada tag `iswc-*` sin definir que aparezca bajo `raiz` (o en el documento); la capa 2 se importa con `import()` la primera vez que se llama y devuelve el tirador `parar()`.
- `L.listos(raiz?)` — `true` si todos los tags `iswc-*` que cuelgan de `raiz` (o del documento) ya están definidos; el equivalente de `allDefined()`.

## Componentes documentales

Los tres viven en `layout/` y se piden por su tag: el bundle trae sus dependencias (índice, markdown,
código, paginador, diálogo), sin listas de tags ni un segundo CDN.

| Tag | Para | Ejemplo |
| --- | --- | --- |
| `iswc-doc-layout` | Layout documental común (navegación \| contenido \| índice) | `await L.ensure('iswc-doc-layout')` |
| `iswc-md-docs-vault` | `docs/index.html` de un proyecto (hojas markdown como un libro) | `await L.ensure('iswc-md-docs-vault')` |
| `iswc-server-api-docs` | `GET /api/docs` de un server (documento ISWC u OpenAPI 3, «Probar») | `await L.ensure('iswc-server-api-docs')` |

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
Tema ER ISWC (sin CE nuevo): alias JS `iswc-diagram-theme` → `cdn:diagrams/theme.min.mjs`
(`json2css`, `resolveErTheme`, `ISWC_THEME`); JSON editable en `dist/cdn/diagrams/themes/iswc.json`.
Uso: `<iswc-er-diagram theme="iswc">` / `<iswc-er-editor theme="iswc">`.  
Evento canónico: `iswc-doc-demo-ready` / `.whenReady()`.

| Opción | Efecto |
| --- | --- |
| `local: true` | `preferSelf`, `host` = raíz del kit (`import.meta.url` → `dist/cdn/`), `mirrors: []`, sin pin |
| `host: 'self' \| './'` | Misma raíz relativa al loader (sin quemar localhost) |
| `host: 'dist/cdn/'` | Relativo a la página montada |
| `mirrors: []` | Sin fallback jsDelivr/githack/Pages |

Detalle: `src/components/layout/doc-demo.md` · guardián `tests/gallery-boot.test.ts`.
### Pines al día: `deno task shas`

`scripts/shas.ts` (tarea `deno task shas`) consulta con `gh api` el SHA de HEAD del kit y de cada app plugin registrada y lo
compara con el pin que usan los consumidores, para que subirlos sea un comando. La lista vive en `scripts/plugins.json`:
`kit` (repo y rama), `plugins` (`app`, `repo`, `rama`, `prefijo`; `privado: true` si `gh` necesita acceso) y `consumidores`
(`repo`, `archivo` donde está el pin, `pinea` = `kit` o el nombre de la app, y el `comando` que lo sube). Un plugin nuevo
(`crm`, `peon`…) se registra añadiendo su fila; si el repo aún no existe, avisa y sigue.

```bash
deno task shas              # tabla: HEAD vs. pin vigente, con el comando para actualizar los desfasados
deno task shas --json       # lo mismo para otros scripts
deno task shas --escribir   # además guarda scripts/shas.lock.json (HEAD de cada repo y pines, con fecha)
```
