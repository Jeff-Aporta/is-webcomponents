# `cdn/` para LLM — loader y publicación

## Propósito

Entry liviano de consumo CDN (`loader.min.js`) + planificador anti-redundante.
No es un componente `is-*`: es el bootstrap recomendado frente a `all.min.js`.

## Leer primero

| Doc | Rol |
| --- | --- |
| [loader.md](./loader.md) | API pública, anti-redundancia, pin/mirrors, CSS |
| [Skill is-cdn-install](../skills/is-cdn-install/SKILL.md) | Bootstrap apps consumidoras |
| [LLM.md raíz](../../LLM.md) | Carta de leyes + errores 39–41 |

Publicado: `dist/cdn/loader.min.js` · `dist/cdn/loader.md`.

## Qué hacer

- `loadCSSBase()` + `loadCSSPalettesDefault()` explícitos (CSS no “mágico”).
- `load('actions')` o tags puntuales; revisar `{ loaded, skipped }`.
- Usar `has('is-button')` / `getLoaded()` antes de forzar otra carga.
- Pin SHA en jsDelivr cuando la app necesite reproducible.
- Tras `node scripts/build.mjs`, verificar banner `/*! … docs (LLM) */` en `.min.js`
  y que exista `dist/cdn/loader.md`.

## Qué no hacer

- **No** re-cargar un tag ya cubierto por su categoría (`actions` → `is-button`).
- **No** default a `all.min.js` “por comodidad” (~MB de JS resuelto).
- **No** inventar un segundo entry aparte de `src/cdn/loader.js` + `load-plan.js`.
- **No** quitar el banner MD ni dejar de copiar `loader.md` al dist.
- **No** mezclar espejos (jsDelivr + Pages) en la misma página.
- **No** usar OpenAI en el kit de vídeo hermano; este repo CDN no necesita esa clave.

## Errores / prevención

| Trampa | Síntoma | Guardián |
| --- | --- | --- |
| Carga redundante tag tras categoría | Doble red, Custom Elements ya definidos | `tests/load-plan.test.mjs` |
| Galería sin loader / con `all.min` suelto | Bundle enorme | `tests/cdn-loader.test.mjs` |
| Sin `loader.md` en dist | LLM sin contexto del entry | `tests/cdn-loader.test.mjs` |

## Código

- `loader.js` — API `ISWebComponentsLoader`
- `load-plan.js` — `planLoads(ids, registry, catalog)` → `{ jobs, skipped }`
