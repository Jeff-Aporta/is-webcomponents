# IS Web Components

Galería de [Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) vanilla de Insoft (`is-*`).

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

## Licencia

Uso interno Insoft / Jeff-Aporta salvo indicación contraria.
