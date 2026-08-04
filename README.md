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
| `components/` | Fuentes por categoría (`actions`, `feedback`, `helpers`, …) |
| `previews/` | Docs + demos por componente |
| `styles/` | Tokens (`is-base.css`) y shell |
| `manifest.js` | Índice de la galería |
| `skills/is-webcomponents/` | Skill para agentes IDE (Cursor, Claude Code, …) |
| `dist/cdn/skills/` | Espejo CDN de la skill (mismo pin que el kit) |

## Skill para agentes IDE

Obliga a reusar los tags `is-*` del kit al fundar o extender apps consumidoras.

```bash
npx skills add Jeff-Aporta/is-webcomponents -s is-webcomponents
# o desde el CDN (mismo commit que el kit):
npx skills add https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/cdn/skills/is-webcomponents
```

También aparece en cada panel `<is-cdn-snippet>` de los previews.

## Licencia

Uso interno InSoft / Jeff-Aporta salvo indicación contraria.
