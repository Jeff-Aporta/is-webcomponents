---
tag: iswc-doc-demo
tags:
  - iswc-doc-demo
category: preview
status: public
source: ./doc-demo.ts
style: ./doc-demo.css
preview: ./doc-demo.json
---
# `<iswc-doc-demo>`

Shell homogéneo de documentación/demo (barra, nav, preview, drawer). Misma
layout en todas las apps del kit; solo cambian attrs y la SPA consumidora.

## Bootstrap (cualquier app)

Un solo script module: el **host** configura el loader, carga boot + CE.

```html
<script type="module" src="…/dist/cdn/preview/doc-demo-host.min.js"></script>
<script type="module" src="./app.min.js"></script>
<body>
  <iswc-doc-demo brand="MiApp" sheets-cache="mi-app-sheets"></iswc-doc-demo>
</body>
```

| Artefacto | Rol |
| --- | --- |
| `doc-demo-host.min.js` | `configure` + `L.loadPageModules(['iswc-doc-demo-boot'])` + `L.load('iswc-doc-demo')` |
| `iswc-doc-demo-boot` | alias module: theme/palette + CSS crítico |
| `iswc-doc-demo` | CE del catálogo: shell light-DOM + page styles/modules |

### Local (self-test del kit)

```html
<script type="module" src="./dist/cdn/preview/doc-demo-host.min.js"></script>
<body>
  <iswc-doc-demo brand="ISWC" local dev sheets-cache="iswc-gallery-sheets"></iswc-doc-demo>
</body>
```

- `local` → `L.configure({ local: true })` (sin CDN/mirrors).
- `dev` → añade page module `dev-reload` (opt-in; no va en defaults CDN).

### Esperar el shell (SPA hermana)

El host y la app son entry points module independientes: un TLA del host **no**
bloquea siblings. Esperar antes de tocar IDs:

```js
await customElements.whenDefined('iswc-doc-demo');
await document.querySelector('iswc-doc-demo').whenReady();
// o: window.addEventListener('iswc-doc-demo-ready', …, { once: true })
```

IDs estables: `shellBar`, `shellBrand`, `shellNav`, `previewHost`, `previewFrame`,
`mainSplit`, `navDrawer`, `themeToggle`, `brandPalette`, `fullscreenBtn`, …

## Atributos

| Atributo | Default | Notas |
| --- | --- | --- |
| `brand` | `ISWC` | Texto del logo |
| `brand-icon` | `mdi:apps-box` | Iconify |
| `brand-href` | `./` | Link del brand |
| `local` | — | Host: `L.configure({ local: true })` |
| `prefer-self` | — | Host: `preferSelf` sin apagar mirrors |
| `dev` | — | Opt-in `dev-reload` |
| `sheets-cache` | — | `L.sheets.install({ cacheName })` |
| `storage-key-nav` | `iswc-doc-nav` | Split nav |
| `palette-storage-key` | `iswc-palette` | Selector + boot |
| `theme-storage-key` | `iswc-theme` | Boot lee del CE |
| `page-styles` | palettes+shell+presentation | JSON array o CSV de aliases |
| `page-modules` | chrome docs (sin dev-reload) | JSON array o CSV |

## Eventos / API

| Señal | Notas |
| --- | --- |
| `iswc-doc-demo-ready` | Canónico (bubbles, composed) |
| `iswc-gallery-shell-ready` | Alias window (compat galería) |
| `.ready` / `.whenReady()` | Propiedad y Promise del CE |

## Loader aliases

`iswc-doc-demo-boot`, `iswc-doc-demo-host`, `iswc-palettes-default`,
`iswc-doc-shell`, `iswc-doc-presentation`. Tag CE: `L.load('iswc-doc-demo')`.
