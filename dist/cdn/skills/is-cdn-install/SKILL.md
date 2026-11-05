---
name: is-cdn-install
description: >-
  Instala y consume el kit ISWC solo por CDN (jsDelivr / GitHub Pages),
  sin npm ni npx. Cubre bootstrap (is-base + palettes + .min.js), espejos, pin por
  SHA, boot con fallback, y lectura de docs vía iswc-cdn-snippet. Usar cuando el
  usuario pida instalar is-*, enlaces CDN, loader.min.mjs, L.load,
  mirrors, o copiar el panel Consumo por CDN.
---
<!-- @vendor 2026-10-14T16:13:19.844Z Jeff-Aporta/is-webcomponents@main skills/is-cdn-install/SKILL.md -->

# ISWC — instalación por CDN

## Regla absoluta

- **No** `npm install` / `npx` / `yarn` / `pnpm` / `bun` / bundler (`vite`, `webpack`, —) del kit (no hay canal npm; no hace falta build step para consumirlo).
- **Un solo origen** por página: no mezclar jsDelivr + Pages en el mismo documento (rompe imports relativos).
- En el `<head>` solo van **tema + paletas + JS**. El CSS de cada `is-*` lo carga el propio componente.
- Si la app no puede depender de red en runtime: usar copia **local** en vez de CDN puro — ver [`/iswc-base:local`](../iswc-base/tools/local.md) en la skill del kit.

## Prompt LLM y herramientas

Prompt completo listo para copiar: [`../iswc-base/PROMPT.md`](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/skills/iswc-base/PROMPT.md).
Herramientas tipo slash del kit: [`../iswc-base/tools/`](https://github.com/Jeff-Aporta/is-webcomponents/tree/main/skills/iswc-base/tools) —
en particular [`/iswc-base:local`](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/skills/iswc-base/tools/local.md) para vendorizar el kit y bootear local-first.

## Skill publicada (léela primero)

Los agentes instalan/siguen mejor skills desde URLs de **repo de GitHub**. Usa raw solo para lectura como texto plano.

| Canal | URL |
| --- | --- |
| GitHub (preferido) | `https://github.com/Jeff-Aporta/is-webcomponents/blob/main/skills/is-cdn-install/SKILL.md` |
| Raw (texto plano) | `https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/is-cdn-install/SKILL.md` |
| CDN jsDelivr | `https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/cdn/skills/is-cdn-install/SKILL.md` |
| Pages | `https://jeff-aporta.github.io/is-webcomponents/dist/cdn/skills/is-cdn-install/SKILL.md` |

Skill general del kit (reuso de tags, arquitectura, prompt, herramientas): [`iswc-base/SKILL.md`](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/skills/iswc-base/SKILL.md) (misma carpeta en `dist/cdn/skills/`).

## Espejos

| id | Base | Pin SHA |
| --- | --- | --- |
| `jsdelivr` (primario) | `https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<ref>/dist/cdn` | Sí (`@sha` o `@main`) |
| `pages` (reserva) | `https://jeff-aporta.github.io/is-webcomponents/dist/cdn` | No (tip desplegado) |

`<ref>` preferido: **commit SHA** de `main`. `@main` solo si la app declara seguimiento continuo.

## Bootstrap mínimo (loader — preferido)

```html
<html lang="es" data-theme="dark" data-palette="delfin">
<head>
  <script type="module"
    src="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/cdn/core/loader.min.mjs"></script>
  <script type="module">
    const L = globalThis.iswcLoader;
    await L.loadCSSBase();
    await L.loadCSSPalettesDefault();
    await L.load('iswc-button'); // o 'actions' | 'all'
  </script>
</head>
<body>
  <iswc-button>Hola</iswc-button>
</body>
</html>
```

**Paletas (25) y Panda.** `data-palette` acepta una de las 25 paletas generales
del kit (`src/styles/palettes.json`): rojos `cardenal` `rubi` `granate`;
naranjas/amarillos `citrino` `marte` `jupiter` `cobre` `ambar`; verdes `iguana`
`esmeralda` `peridoto` `jade` `menta` `olivino`; azules/cianes `delfin`
(default) `zafiro` `turquesa` `neptuno` `aguamarina` `lapislazuli`;
violetas/rosas `orquidea` `amatista` `flamenco` `tanzanita`; neutro `luna`.
Cada una tiene main (`--iswc-color-brand`), contraste (`--iswc-color-contrast`,
`--iswc-contrast-text`, `--iswc-contrast-soft`), bright (`--iswc-color-bright`),
superficies y textos tintados por su tono. `data-panda` en el mismo nodo que
`data-theme` invierte solo el fondo de la página (`--iswc-bg-page`); papeles,
componentes y textos siguen el tema. El usuario elige ambas con `<iswc-palette-selector>`
(persisten en `iswc:app-cfg` → `palette`, `panda`); `initApp({ palette, panda })`
fija los valores iniciales.

Alcance de `load(…)`:

| Necesidad | Argumento |
| --- | --- |
| Un tag | `'iswc-button'` |
| Una categoría | `'actions'` |
| Kit completo | `'all'` |

La galería lo pinta en `<iswc-cdn-snippet>` (copy-paste del loader + `L.load(tag)`).

`load('all')` / `load('actions')` expanden a cada `<cat>/<file>.min.js`. No se publican `all.min.js` ni `category.*.min.js`.

### Con import map (alias `@jeff-aporta/iswc-base/`)

La app declara UNA vez dónde vive el kit y sus módulos importan sin repetir el SHA. La entrada exacta la publica cada
build en `dist/cdn/importmap.json`; `pin-update.mjs` la mantiene al día (también en `deno.json`).

```html
<script type="importmap">
{ "imports": { "@jeff-aporta/iswc-base/": "https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha40>/dist/cdn/" } }
</script>
<script type="module">
  import { iswcLoader as L } from '@jeff-aporta/iswc-base/core/loader.min.mjs';
  await L.loadCSSBase();
  await L.load('iswc-button');
</script>
```

El import map va antes de cualquier `<script type="module">`. En Deno, la misma entrada en `imports` de `deno.json`.

### Bootstrap recomendado para apps (loader en dos capas, F4)

El arranque más rápido: import map con el alias al pin, `<meta name="iswc-precargado">` con el pin, `modulepreload`
del cierre del shell crítico (sacado del grafo del pin en el build de la app: `tags[tag]` de cada tag del shell; los
`_chunks/` y `lib/zod` van tal cual, sin `?v=`; desde F7 el grafo publicado es `deps.json` (índice) + `deps/<cat>.json`
y `pin-update`/`vendor:iswc` lo dejan unido en `src/vendor/iswc-base/deps.json`), las hojas base no bloqueantes y un
módulo que importa el núcleo y pide el shell con `ensure` y el resto con `load`.

```html
<script type="importmap">
{ "imports": { "@jeff-aporta/iswc-base/": "https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha40>/dist/cdn/" } }
</script>
<meta name="iswc-precargado" content="<sha40>">
<link rel="modulepreload" href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha40>/dist/cdn/core/loader.min.mjs">
<link rel="modulepreload" href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha40>/dist/cdn/layout/app-shell.min.mjs">
<!-- … un modulepreload por cada ruta de tags[tag] del shell crítico … -->
<link rel="preload" as="style" href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha40>/dist/cdn/is-base.min.css" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha40>/dist/cdn/is-base.min.css"></noscript>
<link rel="preload" as="style" href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha40>/dist/cdn/palettes.min.css" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha40>/dist/cdn/palettes.min.css"></noscript>
<script type="module">
  import { iswcLoader as L } from '@jeff-aporta/iswc-base/core/loader.min.mjs';
  await Promise.all(['iswc-app-shell', 'iswc-button'].map((t) => L.ensure(t)));   // shell definido → revelar
  document.documentElement.setAttribute('data-app-ready', '');
  void L.load('iswc-dialog', 'iswc-ag-grid');                                       // el resto, progresivo
</script>
```

- `load()` resuelve al importar; `ensure()` al definirse. Lo que el HTML ya precargó no pide ningún `deps`; sin
  precarga, `load()` pide `deps/<cat>.json` de cada categoría del lote (una vez) y precarga el cierre con
  `modulepreload` (una ráfaga).
- `is-base.min.css` lo pone el loader por `<link>` si el HTML no lo trae (nunca lo duplica); el arranque no usa
  IndexedDB ni Cache Storage ni la API de GitHub.
- La extensión declara el tipo: `.mjs` → `import()`, `.js` → `<script src>` clásico. Componentes de app que son
  módulos ES con extensión `.js`: `L.registerApp({ tag: { href, type: 'module' } })`.

## Boot con fallback (si un espejo cae)

Probar bases **en orden**, siempre el mismo `base` para CSS y JS:

1. jsDelivr `@<sha>` (o `@main`)
2. GitHub Pages

Plantilla (misma idea que el tab **Mirrors** de `<iswc-cdn-snippet>`):

```html
<script type="module">
const MIRRORS = [
  "https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/cdn",
  "https://jeff-aporta.github.io/is-webcomponents/dist/cdn",
];
async function boot(files) {
  for (const base of MIRRORS) {
    try {
      for (const href of files.css) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = `${base}/${href}`;
        document.head.append(link);
      }
      await Promise.all(files.js.map((f) => import(`${base}/${f}`)));
      return base;
    } catch (e) {
      console.warn("[iswc-wc] mirror falló", base, e);
    }
  }
  throw new Error("[iswc-wc] ningún espejo respondió");
}
await boot({
  css: ["is-base.min.css", "palettes.min.css"],
  js: ["loader.min.mjs"],
});
</script>
```

## Panel `<iswc-cdn-snippet>` (galería)

En la demo del kit, cada preview monta el panel **Consumo por CDN**:

- Copy-paste: `loader.min.mjs` + `L.loadCSS*` + `L.load(tag)`.
- Bloque **Para agentes / LLM**: prompt + enlaces MD.

Al instalar en otra app, **copia los mismos URLs** que muestra el panel (no inventes rutas).

## Docs API (después del bootstrap)

1. índice: `specs/componentes.md`
2. Categoría: `specs/componentes.md`
3. Módulo: `src/components/<carpeta>/<modulo>.md`

Base raw: `https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/`

No inventar props/eventos que no están en el MD.

## Checklist de instalación

- [ ] Solo CDN (sin npm del kit)
- [ ] Un solo espejo / un solo `base` en la página
- [ ] `loader.min.mjs` + `L.loadCSSBase` + `L.loadCSSPalettesDefault` + `L.load(tags…)`
- [ ] JS: solo los tags de la vista (no `all.min.js`)
- [ ] `data-theme` + `data-palette` en `<html>`
- [ ] Pin `@<sha>` (o `@main` justificado, o copia local vía `/iswc-base:local`)
- [ ] Skill + MD del módulo leídos antes de componer UI

## Prohibido

- Mezclar orígenes CDN en la misma página
- Meter CSS de componentes del kit en el `<head>`
- Usar Iconify CDN / Chart.js / MUI cuando el kit cubre el caso
- Asumir que Pages pinnea el mismo SHA que jsDelivr
- `npm`/`npx`/`yarn`/`pnpm`/`bun`/`vite`/`webpack` para instalar o servir el kit

## Más detalle

- Prompt LLM completo: [`../iswc-base/PROMPT.md`](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/skills/iswc-base/PROMPT.md)
- Herramientas `/iswc-base:build|migrate|local|runtime`: [`../iswc-base/tools/`](https://github.com/Jeff-Aporta/is-webcomponents/tree/main/skills/iswc-base/tools) (runtime = loader, IswcUi, MD, cache)
- Espejos y resolución de ref: [reference.md](reference.md)
- Skill de reuso de tags: `../iswc-base/SKILL.md`

## Scripts online (Deno, siempre `@main` con `--reload`)

Regla (Jeff, 2026-10-13): los scripts de `tools/` de una skill y los CLI de `vendor-distributions/` (`vendor.ts`,
`pin-update.mjs`, `download-iconify.ts`, `render-lote.ts`) NO se descargan nunca al consumidor: se ejecutan online con
Deno desde `@main` del kit, y lo que se ejecuta es un BUNDLE autocontenido en `dist/cdn/…` (`scripts/build-online.mjs`:
schemas y pin-update inlineados, `zod` como `npm:`; sin imports relativos). `--reload=https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/`
es obligatorio (Deno cachea los módulos remotos para siempre). Nunca una ruta local del checkout ni un SHA en estos
comandos: el pin del proyecto gobierna lo vendorizado, no los scripts.

Para una app que consume el kit por CDN los scripts que toca correr son `vendor.ts` y `pin-update.mjs` (ver
`skills/iswc-server/SKILL.md` y [06-pines-y-vendor.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-foundation/references/06-pines-y-vendor.md))
y `download-iconify.ts` desde `assets/dl.js` (ver [10-iconos.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-foundation/references/10-iconos.md)):

```bash
deno run -A --reload=https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/ https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/dist/cdn/vendor-distributions/shared/tools/vendor.mjs scripts/vendor/vendor.json
deno run -A --reload=https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/ https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/dist/cdn/vendor-distributions/shared/tools/pin-update.mjs --raices=index.html,src,view
deno run -A --reload=https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/ assets/dl.js   # importa https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/dist/cdn/vendor-distributions/client/tools/download-iconify.mjs
```
