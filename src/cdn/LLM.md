# `cdn/` para LLM — loader y publicación

## Propósito

Entry liviano de consumo CDN (`core/loader.min.js`) + planificador anti-redundante.
No es un componente `is-*`: es el bootstrap. No se publica `all.min.js`.

## Leer primero

| Doc | Rol |
| --- | --- |
| [loader.md](./core/loader.md) | API pública, anti-redundancia, pin/mirrors, CSS |
| [Skill is-cdn-install](../skills/is-cdn-install/SKILL.md) | Bootstrap apps consumidoras |
| [LLM.md raíz](../../LLM.md) | Carta de leyes + errores 39–43 |

Publicado: `dist/cdn/core/loader.min.js` · `dist/cdn/core/loader.md` · este `LLM.md` (mapa del árbol CDN).

## Layout publicado (`dist/cdn/`)

Artefactos folderizados por categoría. **No** hay `README.txt`: este archivo es el único índice.

| Ruta | Qué es |
| --- | --- |
| `core/is-base.min.css` | Themes + paletas de marca (link en la app host) |
| `core/palettes.min.css` | Paletas de marca |
| `core/loader.min.js` | `ISWebComponentsLoader` (carga selectiva + pin/mirrors) |
| `core/loader.md` | Docs del loader (API) |
| `<categoria>/<name>.min.js` | Componente individual (carga su `.min.css` hermano en el shadow) |
| `<categoria>/<name>.min.css` | Estilos del componente (junto al `.min.js`) |
| `LLM.md` | Este mapa (fuente: `src/cdn/LLM.md`) |
| `skills/<name>/SKILL.md` | Skills para agentes (copiado en build) |

Los iconos viven en `dist/assets/icons/` (fuera de `dist/cdn/`). Los tags conservan el prefijo `is-*` (p. ej. `actions/button.min.js` → `<is-button>`).

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

## Qué hacer

- Apps CDN: `loadCSSBase()` + `loadCSSPalettesDefault()` explícitos (CSS no “mágico”).
- `load('actions')` o tags puntuales; revisar `{ loaded, skipped }`.
- Usar `has('is-button')` / `getLoaded()` antes de forzar otra carga.
- Pin SHA en jsDelivr cuando la app necesite reproducible.
- Tras `node scripts/build.mjs`, verificar banner `/*! … docs (LLM) */` en `.min.js`
  y que exista `dist/cdn/core/loader.md`.
- **Galería:** CSS en `<link>`; shell tags + preview desde `dist/cdn`; resto background.
  Respetar error **#43** — no rehacer el boot “bonito” con `await all`.

## Qué no hacer

- **No** re-cargar un tag ya cubierto por su categoría (`actions` → `is-button`).
- **No** default a `load('all')` “por comodidad” (expande a cada tag.min.js).
- **No** volver a emitir `all.min.js` ni `category.*.min.js` (`tests/cdn-folders.test.ts`).
- **No** marcar `coveredTag` por categoría **antes** de empujar los jobs del lote (`planLoads(['actions'])` quedaría en 0 jobs).
- **No** inventar un segundo entry aparte de `src/cdn/loader.ts` + `load-plan.js`.
- **No** quitar el banner MD ni dejar de copiar `loader.md` al dist.
- **No** recrear `README.txt` en `dist/cdn/` (consolidado aquí).
- **No** mezclar espejos (jsDelivr + Pages) en la misma página.
- **No** usar OpenAI en el kit de vídeo hermano; este repo CDN no necesita esa clave.
- **No** bloquear el primer paint de la galería con `await loadCSS*` / `await load('all')`
  / `await loadPageModules(cdn-panel)`.
- **No** importar `preview-component` ni `cdn-snippet` desde `src/` en el boot de Pages/galería.

## Errores / prevención

| Trampa | Síntoma | Guardián |
| --- | --- | --- |
| Carga categoría sin jobs | `planLoads(['actions'])` = [] | `tests/load-plan.test.ts` |
| Emitir `all.min.js` / category bundles | Artefacto prohibido en dist | `tests/cdn-folders.test.ts` |
| Galería con `all.min` suelto en head | Bundle enorme | `tests/cdn-loader.test.ts` |
| Sin `loader.md` en dist | LLM sin contexto del entry | `tests/cdn-loader.test.ts` |
| FOUC + demos vacíos (boot serial / own `.preview`) | Blanco, tags crudos, main vacío | `tests/gallery-boot.test.ts` · LLM #43 |
| `cdn-panel` → `src/cdn-snippet` en path crítico | Shell nunca marca `kitShell` | `tests/gallery-boot.test.ts` |

## Código

- `loader.ts` — API `ISWebComponentsLoader`
- `load-plan.ts` — `planLoads(ids, registry, catalog)` → `{ jobs, skipped }`
