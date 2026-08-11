# `ISWebComponentsLoader` (`loader.min.js`)

Entry CDN liviano del kit. Carga solo lo pedido, con pin, mirrors y anti-redundancia.

## Rutas

| Artefacto | Path |
| --- | --- |
| Fuente | `src/cdn/loader.js` |
| Planificador | `src/cdn/load-plan.js` |
| Este doc | `src/cdn/loader.md` |
| Publicado | `dist/cdn/loader.min.js` · `dist/cdn/loader.md` |
| Raw | `https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/cdn/loader.md` |
| CDN | `https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/cdn/loader.min.js` |

Skill de instalación: [`src/skills/is-cdn-install/SKILL.md`](../skills/is-cdn-install/SKILL.md).

## Bootstrap

```js
import { ISWebComponentsLoader as L } from
  'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@REF/dist/cdn/loader.min.js';

L.configure({ mirrors: ['jsdelivr', 'pages'] });
// L.pin('abcdef…');  // opcional; sin pin → tip SHA de main
await L.loadCSSBase();
await L.loadCSSPalettesDefault();
await L.load('is-button', 'is-button-group');
// o: L.load('actions') | L.load('all')
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
| `configure({ mirrors, preferSelf, ref })` | Orden de espejos / self local |
| `listBases()` / `fallbackBases()` | Bases que se probarán |

Orden por defecto: `self` (si `preferSelf`) → jsDelivr → Pages. Un fallo en un espejo prueba el siguiente.

## CSS

- Documento: `loadCSSBase()` + `loadCSSPalettesDefault()` (explícitos).
- Componente: lo trae cada `.min.js` con `adoptCss` en shadow.
- Galería/app host: `loadPageStyles([...])` / `loadPageModules([...])` (relativos al documento, sin mirrors).
