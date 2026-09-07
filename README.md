# IS Web Components

Galería de [Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) vanilla de InSoft (`is-*`).

## Demo (GitHub Pages)

**https://jeff-aporta.github.io/is-webcomponents/**

## Uso local

```bash
# Servir la raíz del repo (ES modules necesitan HTTP)
npx --yes serve .
```

Abre la URL que imprima `serve` (p. ej. `http://localhost:3000`).

## CDN (build)

```bash
npm install
npm run build
```

Artefactos en `dist/cdn/` (`{name}.min.js` + `{name}.min.css` + `is-base.min.css`).

## Estructura

| Ruta | Contenido |
|------|-----------|
| `src/components/` | Fuentes por categoría (`actions`, `feedback`, `helpers`, …) |
| `src/styles/` | Tokens (`is-base.css`) y shell |
| `src/assets/` | Iconos Iconify y favicon |
| `src/skills/is-webcomponents/` | Guía para agentes IDE (CDN-first) — **solo fuente**, no en `dist/` |
| `src/components/**/*.md` | Docs LLM por módulo / categoría — raw bajo `…/main/src/components/` |
| `src/manifest.js` | Índice de la galería |
| `AGENTS.md` | Carta de leyes + guía para agentes (único diario en raíz) |
| `robots.txt` | Crawl de GitHub Pages (`Allow: /`) |
| `scripts/` · `dist/cdn/` · `tests/` | Build, CDN, invariantes (`*.test.mjs` commiteados) |

## Agentes / LLM (CDN)

No hay publicación npm aún: el kit se consume por **CDN jsDelivr**. En cada preview, `<is-cdn-snippet>` muestra los enlaces y un prompt CDN-first.

```
Usa el kit IS Web Components solo por CDN (jsDelivr), sin npm ni npx.
Bootstrap: `loader.min.js` + `L.load(tags de la vista)`. Sin `all.min.js` ni bundles de categoría.
Reutiliza tags is-* existentes; no reinventes botones, dialogs, tablas, charts, toasts ni iconos.
Antes de inventar API: lee [`specs/componentes.md`](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/specs/componentes.md) (índice global) y el `.md` del módulo.
```

Docs raw: [índice componentes](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/specs/componentes.md) · [catálogo de errores](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/specs/lessons.md) · skill en `src/skills/is-webcomponents/SKILL.md`.

## Licencia

Uso interno InSoft / Jeff-Aporta salvo indicación contraria.
