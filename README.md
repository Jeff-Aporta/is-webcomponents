# ISWC

Galería de [Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) vanilla de InSoft (`iswc-*`).

Nombre del kit: **`iswc-base`**. El repo de GitHub conserva por ahora su nombre en las URLs (se renombrará coordinado con las apps); fuera de una URL el kit siempre es `iswc-base`.

## Demo (GitHub Pages)

**https://jeff-aporta.github.io/is-webcomponents/**

## Uso local

```bash
deno install
deno task dev
```

Abre `http://127.0.0.1:8391/`.

## CDN (build)

```bash
deno install
deno task build
```

Artefactos en `dist/cdn/` (`{categoria}/{tag}.min.mjs` + `.min.css`, `core/loader.min.mjs`, `is-base.min.css`).

Medir la carga de una página (Edge headless: tiempos, ráfagas, duplicados, web vitals y SEO):
`deno task medir -- --url=<url> [--warm] [--throttle] [--seo] [--corridas=5] [--json=<ruta>]`; detalle en `specs/cdn.md` §Medir la carga.

**npm: preparado, no publicado.** El build escribe el `package.json` de la raíz (`@jeff-aporta/iswc-base`, versión
provisional `0.0.0-<yyyymmdd>.<sha7>`, `exports` hacia `dist/cdn/`) y `deno task npm:pack` arma el tarball en
`.tmp/npm/` sin publicar nada. Hoy el kit se consume por CDN (import map a jsDelivr@sha); cuando se publique, el mismo
especificador `@jeff-aporta/iswc-base/<ruta>` resolverá por `node_modules`. Detalle en `specs/cdn.md` §npm.

## Estructura

| Ruta | Contenido |
|------|-----------|
| `src/components/` | Fuentes por categoría (`actions`, `feedback`, `helpers`, …) |
| `src/styles/` | Tokens (`is-base.css`) y shell |
| `assets/iconify/` | Íconos Iconify que el kit usa (`deno task icons`); el resto, API de Iconify |
| `dist/assets/` | Favicon, playlist y material de demos |
| `skills/iswc-base/` | Guía para agentes IDE (CDN-first) — fuente en raíz, se copia a `dist/cdn/skills/` en el build |
| `src/components/**/*.md` | Docs LLM por módulo / categoría — raw bajo `…/main/src/components/` |
| `src/manifest.ts` | Índice de la galería |
| `AGENTS.md` | Carta de leyes + guía para agentes (único diario en raíz) |
| `robots.txt` | Crawl de GitHub Pages (`Allow: /`) |
| `scripts/` · `dist/cdn/` · `tests/` | Build, CDN, invariantes (`*.test.mjs` commiteados) |

## Agentes / LLM (CDN)

No hay publicación npm aún: el kit se consume por **CDN jsDelivr**. En cada preview, `<iswc-cdn-snippet>` muestra los enlaces y un prompt CDN-first.

```
Usa el kit ISWC solo por CDN (jsDelivr), sin npm ni npx.
Bootstrap: `loader.min.mjs` + `L.load(tags de la vista)`. Sin `all.min.js` ni bundles de categoría.
Reutiliza tags iswc-* existentes; no reinventes botones, dialogs, tablas, charts, toasts ni iconos.
Antes de inventar API: lee [`specs/componentes.md`](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/specs/componentes.md) (índice global) y el `.md` del módulo.
```

Docs raw: [índice componentes](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/specs/componentes.md) · [catálogo de errores](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/specs/lessons.md) · skill en `skills/iswc-base/SKILL.md`.

## Licencia

Uso interno InSoft / Jeff-Aporta salvo indicación contraria.
