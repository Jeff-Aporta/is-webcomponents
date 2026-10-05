# `/is-webcomponents:runtime` — APIs sin custom element

Herramientas del kit que **no** son tags `iswc-*`. Los agentes deben conocerlas
igual que el catálogo de componentes: no reinventar loader, hydrate MD, caché ni `IswcUi`.

Índice compacto (siempre en la skill): sección **Módulos API** de [`../SKILL.md`](../SKILL.md).  
Inventario: [`../catalog.md`](../catalog.md) § Módulos API.

---

## 1. `ISWebComponentsLoader` — `core/loader.min.js`

Guía larga: [`cdn/loader.md`](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/cdn/loader.md).

| API | Efecto |
| --- | --- |
| `loadCSSBase()` / `loadCSSPalettesDefault()` | CSS de documento |
| `load(...ids)` | Tags, categorías o `'all'` → `{ loaded, skipped }` |
| `has(id)` / `getLoaded()` / `resetLoaded()` | Anti-redundancia |
| `ensure(tag)` | Lazy load de un tag |
| `pin(ref)` / `unpin()` / `resolvePin()` | Pin branch/SHA |
| `configure({ host, sha, mirrors, preferSelf, v, query })` | Host / espejos / bust |
| `listBases()` / `fallbackBases()` | Cadena de espejos |
| `shaDefault` / `shaFromUrl` / `host` / `selfBase` / `repo` | Pin y orígenes |
| `assetUrl(href)` / `hashes` | `?h=` del build |
| `sheets.install` / `warm*` | Cache de CSS (apps) |
| `registerApp(map)` | Tags de la app fuera del catálogo |
| `loadPageStyles` / `loadPageModules` | Galería / paths de página |

**Fallback fijo:** jsDelivr → raw.githack → GitHub Pages (sticky del que responde).  
**SHA:** quemado en el bundle; no hace falta `configure({ host })` si importas `@<sha>/…`.

Pines de apps consumidoras: `deno task sync:pins` (`scripts/sync-pins.mjs`).

---

## 2. `IswcUi` / `Ui` — `helpers/ui.min.js`

Guía: [`helpers/ui.md`](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/ui.md).

| Export | Uso |
| --- | --- |
| `html` | Template → `DocumentFragment` |
| `adoptCss(shadow, import.meta.url)` | CSS hermano (preferido) |
| `define(tag, class)` | `customElements.define` idempotente |
| `css` / `el` / `raw` / `esc` | Prototipos / DOM |
| `crearComponente` / `jsonScript` / `fecha` / `rec` | Fábrica y utils |

**No** sustituye tags del kit. Patrón dominio: `tk-*` + `.css` hermano + `adoptCss`.

---

## 3. Pipeline Markdown

| Módulo | CDN | Rol |
| --- | --- | --- |
| `md-lite` | `helpers/md-lite.min.js` | MD → HTML |
| `md-iswc-fences` | `helpers/md-iswc-fences.min.js` | ` ```iswc-* ` → diagrama |
| `md-hydrate` | `helpers/md-hydrate.min.js` | ensure tags + `<iswc-code>` |
| `md-editor-api` | `helpers/md-editor-api.min.js` | CRUD del editor |

Tags de producto: `<iswc-md-render>`, `<iswc-md-editor>`.  
Guías: `helpers/md-lite.md`, `md-iswc-fences.md`, `md-hydrate.md`, `md-editor-api.md`.

---

## 4. `response-cache` — `helpers/response-cache.min.js`

SWR en IndexedDB (`createResponseCache`, `IsResponseCache`, `canonico`).  
Guía: [`helpers/response-cache.md`](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/response-cache.md).

---

## 5. Core (base de elementos)

| Módulo CDN | Rol |
| --- | --- |
| `core/element-base.min.js` | Base CE del kit |
| `core/attrs.min.js` | Observación / coerce de atributos |
| `core/base-sheets.min.js` | Hojas base compartidas |

Apps consumidoras **no** reimplementan esta capa; extienden vía `IswcUi.define` + tags.

---

## 6. Build de apps (hashes)

Cuando la app emite `dist/cdn` como el kit: `contentHash`, `withAssetHash`, `stampDirectory`
en el vendor de build del kit (Paty ya lo importa). El loader pega `?h=` con `L.assetUrl`.

---

## Checklist agente

- [ ] Arranque solo con loader + `loadCSS*` + `load` (no reinventar espejos).
- [ ] Wrappers de dominio usan `IswcUi.adoptCss`, no CSS embebido gigante.
- [ ] MD embebido: `md-lite` → `hydrateMdEmbeds`, no un markdown npm paralelo.
- [ ] Lecturas remotas repetidas: `response-cache`, no un IndexedDB ad hoc.
- [ ] Tras commit del kit: `deno task sync:pins` en monorepo ContaPyme.
