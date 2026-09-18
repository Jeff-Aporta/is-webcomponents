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

L.configure({
  mirrors: ['jsdelivr', 'pages'],
  // host: 'https://raw.githack.com/Jeff-Aporta/is-webcomponents/main/dist/cdn',
  // v: 2, // → ?v=2 en cada asset (rompe caché de CDN/navegador)
});
// L.pin('abcdef…');  // opcional; sin pin → tip SHA de main
await L.loadCSSBase();
await L.loadCSSPalettesDefault();
await L.load('is-button', 'is-button-group');
// o: L.load('actions') | L.load('all')
```

### Host y cache-bust (consumidor)

El consumidor fija de dónde salen los `is-*` y cómo invalidar caché, sin tocar el kit:

```js
const KIT = 'https://raw.githack.com/Jeff-Aporta/is-webcomponents/main/dist/cdn';
import { ISWebComponentsLoader as L } from `${KIT}/core/loader.min.js`;

L.configure({
  host: KIT,          // raíz dist/cdn/ (manda sobre preferSelf)
  v: 2,               // atajo → ?v=2 en cada .js/.css del kit
  // query: 'v=2&t=…' // o { v: '2', t: '…' }
  preferSelf: false,
  mirrors: ['githack', 'pages'], // githack = tip GitHub con MIME JS
});

await L.load('is-dropdown');
```

| Opción | Efecto |
| --- | --- |
| `host` | URL absoluta a `dist/cdn/`. Primera base de carga |
| `v` | Escribe `query.v` (p. ej. `2` → `?v=2`) |
| `query` | Mapa o string de search params en cada asset |
| `mirrors: ['githack']` | Tip `raw.githack.com` (útil si jsDelivr `@main` está frío) |

## Sheet cache (apps)

Evita flicker de CSS en ShadowRoot: Cache Storage + `adoptedStyleSheets`.

```js
L.sheets.install({ cacheName: 'mi-app-sheets-v1' });
await L.sheets.warmFromCache();
await L.sheets.warmFromManifest('./dist/cdn/hojas-manifest.json', {
  base: './dist/cdn/',
});
await L.load('is-button');
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

await L.load('is-button', 'paty-shell');
await L.ensure('is-code'); // lazy: load + whenDefined
```

## Ensure (lazy)

```js
await L.ensure('is-code');           // catálogo del kit
await L.ensure('mi-widget');         // registerApp
await L.ensure('is-code', { href }); // href explícito
L.isReady('is-code');                // sync
```

## Anti-redundancia

Registro **persistente** en la página:

1. `load('actions')` marca la categoría y todos sus tags.
2. Un `load('is-button')` posterior **no** vuelve a pedir red: ya está cubierto.
3. `load('all')` cubre todo; cargas siguientes se omiten.
4. En el mismo `load('actions', 'is-button')`, el tag se salta si la categoría va en el mismo lote.

API:

- `has('is-button' | 'actions' | 'all')` → boolean
- `getLoaded()` → `{ all, categories, tags }`
- `load(...)` → `{ loaded: string[], skipped: string[] }`

## Pin y mirrors

| Método | Efecto |
| --- | --- |
| `pin(ref)` | Fija branch o SHA (jsDelivr `@ref`) |
| `unpin()` | Tip de `main` vía API GitHub |
| `configure({ mirrors, preferSelf, ref, host, v, query })` | Espejos / self / host / bust |
| `listBases()` / `fallbackBases()` | Bases que se probarán |

Orden por defecto: `host` (si hay) → `self` (si `preferSelf` y no hay host) → mirrors. Un fallo en un espejo prueba el siguiente.

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
4. `is-preview-component` **no** está en el catálogo del loader → import dist, nunca `src/` (Pages 404 lucide).

Detalle + anti-patrones: `LLM.md` raíz error **#43** · guardián `tests/gallery-boot.test.ts`.
