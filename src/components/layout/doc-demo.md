---
tag: iswc-doc-demo
tags:
  - iswc-doc-demo
category: preview
status: public
source: ./doc-demo.ts
style: ./doc-demo.scss
preview: ./doc-demo.json
---
# `<iswc-doc-demo>`

Shell homogéneo de documentación/demo (barra, nav, preview, drawer). Misma
layout en todas las apps del kit; solo cambian attrs y la SPA consumidora.

## Propósito

Shell homogéneo de documentación y demos: barra, navegación, vista previa y drawer. El layout es igual en todas las apps del kit; solo cambian los atributos y la SPA que lo consume.

## Cuándo usarlo

Al montar la galería de componentes o el explorador de demos de una app.

## Cuándo no usarlo

No es el shell de una app de producto: para eso está `<iswc-app-shell>`.

## Importación

```html
<script type="module" src="…/dist/cdn/preview/doc-demo-host.min.js"></script>
```

Ese host configura el loader y carga el componente. El detalle está en **Bootstrap**.

## Ejemplo mínimo

```html
<iswc-doc-demo brand="MiApp" sheets-cache="mi-app-sheets"></iswc-doc-demo>
```

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

## Explorador de demos de una app

Con `doc-demo-galeria.min.js` cualquier app usa este mismo shell sin escribir su SPA: basta un manifest
`[{ tag, file }]` que apunte a los `.json` `iswc-preview/v1` de sus componentes. La app carga antes sus propios tags.

```js
await L.load(...tagsDeLaApp);
const { montarGaleria } = await import(`${cdn}preview/doc-demo-galeria.min.js`);
await montarGaleria({ manifest: new URL('manifest.json', location.href), categorias: { panel: 'Panel' } });
```

El nav se agrupa por `category`, la selección viaja en `?s=` (JSON en b64url, como la galería del kit) y un `props` en un bloque `demo` se asigna a
`target.props`. Los `controls` admiten `attr:x`, `prop:x` y `props:x`.

## Anatomía

Todo demo, del kit o de una app, termina en la sección **Anatomía**: la estructura que construye el componente vivo, los
componentes que consume y su SCSS, con el mismo `<iswc-code>` del snippet. Es parte de `iswc-preview/v1`: `anatomy.scss`
indica la fuente y, si falta, se toma el `.scss` junto al `.json`.

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

## Comportamiento

Monta su estructura una vez, emite `iswc-doc-demo-ready` y avisa en `window` con `iswc-gallery-shell-ready`. En pantallas estrechas la navegación pasa al drawer.

## Accesibilidad

La barra es `role="toolbar"` y la navegación es un `<nav>` rotulado con `nav-label`. El botón del catálogo refleja `aria-expanded`.

## Reglas para LLM

- Es de demos, nunca de producto.
- Espera `iswc-doc-demo-ready` antes de tocar sus nodos internos.
- Los textos cambian por atributos: no edites su DOM.
