# `ISWebComponentsLoader` (`loader.min.js`)

Entry CDN liviano del kit. Carga solo lo pedido, con pin, mirrors y anti-redundancia.

## Rutas

| Artefacto | Path |
| --- | --- |
| Fuente | `src/cdn/loader.ts` |
| Planificador | `src/cdn/load-plan.ts` |
| Este doc | `src/cdn/loader.md` |
| Publicado | `dist/cdn/core/loader.min.js` · `dist/cdn/core/loader.md` |
| Raw | `https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/cdn/loader.md` |
| CDN | `https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/cdn/core/loader.min.js` |

Skill de instalación: [`src/skills/is-cdn-install/SKILL.md`](../skills/is-cdn-install/SKILL.md).

## Bootstrap

```js
import { ISWebComponentsLoader as L } from
  'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@REF/dist/cdn/core/loader.min.js';

// Sin configure: el loader ya trae quemado el SHA de ESTE build (o el de @REF
// si la URL venía pinneada). load() pide componentes a jsDelivr@eseSha.
await L.loadCSSBase();
await L.loadCSSPalettesDefault();
await L.load('iswc-button', 'iswc-button-group');
// o: L.load('actions') | L.load('all')
```

### Pin quemado (default)

Cada `loader.min.js` lleva `__IS_BUILD_SHA__` (HEAD al publicar). Si el
`script src` / `import` usa `@<sha>/…/loader.min.js`, ese SHA de la URL gana.

| | |
| --- | --- |
| `L.shaDefault` | Pin efectivo de este loader |
| `L.shaFromUrl` | SHA leído de la URL, o `null` |
| `L.host` | `https://cdn.jsdelivr.net/gh/…@<sha>/dist/cdn/` (salvo gallery local) |

No hace falta `L.configure({ host: '…@sha…/dist/cdn' })` en apps externas.

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

## Hash de contenido (`?h=`)

Cada build deja un mapa de 6 caracteres en el loader (`__IS_ASSET_HASHES__`) y en `dist/cdn/asset-hashes.json`. `load`, `loadCSS*` y `assetUrl` agregan `?h=` al enrutar. Si el archivo cambia, el hash cambia y el navegador pide esa URL: no hace falta un refresco forzado.

Los `import` relativos entre `.min.js` llevan el mismo `?h=`, sellado en el build en orden de dependencias. El CSS de documento que no usa `url()` relativo se guarda en IndexedDB con la clave ruta+hash; localStorage recuerda el mapa para tirar los cuerpos viejos.

Generadores para otros proyectos (CDN o vendor): `src/cdn/build/` (`bundleMinJs`, `bundleLoader`, `stampHashTexts`, `contentHash`). El build los publica en `dist/cdn/build/`.

## Sheet cache (apps)

Evita flicker de CSS en ShadowRoot: Cache Storage + `adoptedStyleSheets`.

```js
L.sheets.install({ cacheName: 'mi-app-sheets-v1' });
await L.sheets.warmFromCache();
await L.sheets.warmFromManifest('./dist/cdn/hojas-manifest.json', {
  base: './dist/cdn/',
});
await L.load('iswc-button');
```

API: `install`, `get`, `warm(hrefs)`, `warmFromCache`, `warmFromManifest(url, { base, key })`.

## App components (`registerApp`)

Registra tags propios (fuera del catálogo del kit). `load` / `ensure` los tratan igual que los `is-*` y calientan el CSS hermano si sheet-cache está activo.

```js
L.registerApp(
  {
    'paty-shell': './dist/cdn/all.min.js',
    'mi-widget': { href: './widgets/mi-widget.js', css: './widgets/mi-widget.css' },
  },
  { cacheName: 'mi-app-sheets-v1' },
);

await L.load('iswc-button', 'paty-shell');
await L.ensure('iswc-code'); // lazy: load + whenDefined
```

## Ensure (lazy)

```js
await L.ensure('iswc-code');           // catálogo del kit
await L.ensure('mi-widget');         // registerApp
await L.ensure('iswc-code', { href }); // href explícito
L.isReady('iswc-code');                // sync
```

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

Orden por defecto: `host` (si hay) → `self` (si `preferSelf` y no hay host) → **jsDelivr → githack → Pages**. Un fallo en un espejo prueba el siguiente; el que funciona queda sticky.

## CSS

### Apps consumidoras (CDN)

- Documento: `loadCSSBase()` + `loadCSSPalettesDefault()` explícitos (o `<link>` a los `.min.css`).
- Componente: lo trae cada `.min.js` con `adoptCss` en shadow.
- Relativos al documento: `loadPageStyles([...])` / `loadPageModules([...])` (sin mirrors).

### Galería local (`index.html`) — distinto

La galería **no** debe esperar CSS del loader para el primer paint (FOUC). Contrato:

1. `<link>` estáticos a `src/styles/is-base.css`, `palettes.css`, `shell.css`, `presentation.css` + `preview-component.css`.
2. `await` solo shell tags + `import('./dist/cdn/preview/preview-component.min.js')`.
3. `load('all')` y `loadPageModules` en **background** (no bloquean `dataset.kitShell`).
4. `iswc-preview-component` **no** está en el catálogo del loader → import dist, nunca `src/` (Pages 404 lucide).

Detalle + anti-patrones: `LLM.md` raíz error **#43** · guardián `tests/gallery-boot.test.ts`.
