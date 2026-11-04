<!-- @vendor 2026-10-14T16:13:19.844Z Jeff-Aporta/is-webcomponents@main skills/iswc-base/tools/runtime.md -->
# `/iswc-base:runtime` — APIs sin custom element

Herramientas del kit que **no** son tags `iswc-*`. Los agentes deben conocerlas
igual que el catálogo de componentes: no reinventar loader, hydrate MD, caché ni `IswcUi`.

Índice compacto (siempre en la skill): sección **Módulos API** de [`../SKILL.md`](../SKILL.md).  
Inventario: [`../catalog.md`](../catalog.md) § Módulos API.

---

## 1. `iswcLoader` — `core/loader.min.js`

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
Guías: `helpers/utils/md-lite.md`, `md-iswc-fences.md`, `md-hydrate.md`, `md-editor-api.md`.

---

## 4. `response-cache` — `helpers/response-cache.min.js`

SWR en IndexedDB (`createResponseCache`, `IswcResponseCache`, `canonico`).  
Guía: [`helpers/utils/response-cache.md`](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/utils/response-cache.md).

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

Cuando la app emite `dist/cdn` como el kit: `hashPorRuta`, `withAssetHash`, `stampDirectory`
en el vendor de build del kit (Paty ya lo importa). El loader pega `?h=` con `L.assetUrl`.

---

## 7. IA en el navegador — `lib/ai/`

Guía: [`src/ai/ai.md`](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/ai/ai.md). Tag con UI: `<iswc-ai-tool>`.

| Módulo CDN | Exports |
| --- | --- |
| `lib/ai/motores.min.js` | `ejecutar(herramienta, entrada, opciones, parcial)`, `motor` |
| `lib/ai/descarga.min.js` | `conDescarga`, `pospuesta`, `medidor`, `LIMITE_MB` |
| `lib/ai/vector-local.min.js` | `vectorLocal`, `cargarCorpus`, `ordenarPorSentido` |
| `lib/ai/orden.min.js` | `ordenarAplanado`, `ORDEN_DEFECTO`, `coseno`, `normalizar`, `lexicoTolerante` |
| `lib/ai/aplanado.min.js` · `aplanado-ajuste.min.js` | `aplanar`, `abrirCorpus`, `empacar`; `ajustar` (build) |
| `lib/ai/herramientas.min.js` | `HERRAMIENTAS`, `herramienta`, `mbDe`, `pesoDe`, `MODELO_LOCAL` |

Se importan con la URL sellada del loader, para compartir estado con `<iswc-ai-tool>`:

```js
const L = globalThis.iswcLoader;
const { ejecutar } = await import(L.assetUrl(new URL('../lib/ai/motores.min.js', L.selfBase).href));
```

Reglas: nada de `runonweb` directo en una app ni en un componente; toda descarga pasa por `conDescarga` (hasta 20 MB toast; más, modal); el modelo de embeddings es `MODELO_LOCAL`, multilingüe.

---

## Checklist agente

- [ ] Arranque solo con loader + `loadCSS*` + `load` (no reinventar espejos).
- [ ] Wrappers de dominio usan `IswcUi.adoptCss`, no CSS embebido gigante.
- [ ] MD embebido: `md-lite` → `hydrateMdEmbeds`, no un markdown npm paralelo.
- [ ] Lecturas remotas repetidas: `response-cache`, no un IndexedDB ad hoc.
- [ ] IA en el navegador: `lib/ai/`, no `runonweb` directo ni descargas propias.
- [ ] Tras commit del kit: `deno task sync:pins` en monorepo ContaPyme.
