# `cdn/` para LLM — loader y publicación

## Propósito

Entry liviano de consumo CDN (`loader.min.js`) + planificador anti-redundante.
No es un componente `is-*`: es el bootstrap. No se publica `all.min.js`.

## Leer primero

| Doc | Rol |
| --- | --- |
| [loader.md](./loader.md) | API pública, anti-redundancia, pin/mirrors, CSS |
| [Skill is-cdn-install](../skills/is-cdn-install/SKILL.md) | Bootstrap apps consumidoras |
| [LLM.md raíz](../../LLM.md) | Carta de leyes + errores 39–43 |

Publicado: `dist/cdn/loader.min.js` · `dist/cdn/loader.md`.

## Qué hacer

- Apps CDN: `loadCSSBase()` + `loadCSSPalettesDefault()` explícitos (CSS no “mágico”).
- `load('actions')` o tags puntuales; revisar `{ loaded, skipped }`.
- Usar `has('is-button')` / `getLoaded()` antes de forzar otra carga.
- Pin SHA en jsDelivr cuando la app necesite reproducible.
- Tras `node scripts/build.mjs`, verificar banner `/*! … docs (LLM) */` en `.min.js`
  y que exista `dist/cdn/loader.md`.
- **Galería:** CSS en `<link>`; shell tags + preview desde `dist/cdn`; resto background.
  Respetar error **#43** — no rehacer el boot “bonito” con `await all`.

## Qué no hacer

- **No** re-cargar un tag ya cubierto por su categoría (`actions` → `is-button`).
- **No** default a `load('all')` “por comodidad” (expande a cada tag.min.js).
- **No** volver a emitir `all.min.js` ni `category.*.min.js` (`tests/cdn-folders.test.mjs`).
- **No** marcar `coveredTag` por categoría **antes** de empujar los jobs del lote (`planLoads(['actions'])` quedaría en 0 jobs).
- **No** inventar un segundo entry aparte de `src/cdn/loader.js` + `load-plan.js`.
- **No** quitar el banner MD ni dejar de copiar `loader.md` al dist.
- **No** mezclar espejos (jsDelivr + Pages) en la misma página.
- **No** usar OpenAI en el kit de vídeo hermano; este repo CDN no necesita esa clave.
- **No** bloquear el primer paint de la galería con `await loadCSS*` / `await load('all')`
  / `await loadPageModules(cdn-panel)`.
- **No** importar `preview-component` ni `cdn-snippet` desde `src/` en el boot de Pages/galería.

## Errores / prevención

| Trampa | Síntoma | Guardián |
| --- | --- | --- |
| Carga categoría sin jobs | `planLoads(['actions'])` = [] | `tests/load-plan.test.mjs` |
| Emitir `all.min.js` / category bundles | Artefacto prohibido en dist | `tests/cdn-folders.test.mjs` |
| Galería con `all.min` suelto en head | Bundle enorme | `tests/cdn-loader.test.mjs` |
| Sin `loader.md` en dist | LLM sin contexto del entry | `tests/cdn-loader.test.mjs` |
| FOUC + demos vacíos (boot serial / own `.preview`) | Blanco, tags crudos, main vacío | `tests/gallery-boot.test.mjs` · LLM #43 |
| `cdn-panel` → `src/cdn-snippet` en path crítico | Shell nunca marca `kitShell` | `tests/gallery-boot.test.mjs` |

## Código

- `loader.js` — API `ISWebComponentsLoader`
- `load-plan.js` — `planLoads(ids, registry, catalog)` → `{ jobs, skipped }`
