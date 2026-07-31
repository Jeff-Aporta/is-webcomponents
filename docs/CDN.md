# Distribución CDN — App Web Components

Componentes minificados en `dist/cdn/` (plano). La app host enlaza **brands** + carga el **JS** del componente; el CSS del componente viaja junto al JS (el shadow lo pide solo).

## Árbol fuente (aplanado por categoría)

```
components/
  _shared/adopt-css.js
  actions/     button, button-group, copy-button
  media/       icon, avatar
  feedback/    spinner, badge, tag, skeleton, progress-*, theme-toggle
  layout/      card, split-panel, divider
  helpers/     relative-time, format-*, *-observer
styles/
  is-base.css          ← themes + paletas (swapeable por app)
  shell.css / presentation.css   ← solo galería
```

Cada componente = `{name}.js` + `{name}.css` hermanos en la carpeta de categoría (sin subcarpetas por slug).
Los custom elements siguen con tag `is-*` (p. ej. `button.js` define `<is-button>`).

## Build

```bash
npm run build   # node build.mjs → esbuild minify
```

Salida (`dist/cdn/`): `is-base.min.css` + `{name}.min.js` / `{name}.min.css`.

## Uso

```html
<link rel="stylesheet" href="…/is-base.min.css">
<script type="module" src="…/button.min.js"></script>
```

## Dev local

```html
<link rel="stylesheet" href="styles/is-base.css">
<script type="module" src="components/actions/button.js"></script>
```
