---
name: iswc-root
description: >-
  Obliga a reusar el kit iswc-* (Jeff-Aporta/iswc-root) al fundar o extender
  apps de web components sin framework. Usar cuando hay CDN loader.min.js / is-base /
  palettes, tags iswc-button iswc-dialog iswc-data-grid iswc-chart iswc-icon, APIs
  IswcUi / md-hydrate / response-cache, apps tipo frontend-webcomponents / tk-*,
  migraciones desde React/MUI/Svelte, o cuando se pueda reinventar UI del catálogo.
---
<!-- @vendor 2026-10-14T15:03:31.623Z Jeff-Aporta/is-webcomponents@main dist/cdn/skills/iswc-root/SKILL.md -->

# ISWC — stack obligatorio

## Regla absoluta (léela primero)

Usa el kit **solo por CDN** (jsDelivr o GitHub Pages). Prohibido `npm
install`, `npx`, `yarn`, `pnpm`, `bun`, y bundlers (`vite`, `webpack`, …)
para consumir el kit — no hay paquete publicado y no hace falta build step.
Prompt completo, listo para copiar: [`PROMPT.md`](PROMPT.md).

**Antes de escribir HTML/CSS/JS**, lee en orden:

1. [`is-cdn-install/SKILL.md`](https://github.com/Jeff-Aporta/iswc-root/blob/main/skills/is-cdn-install/SKILL.md) — bootstrap, espejos, pin SHA, fallback.
2. Este archivo — arquitectura, reglas de reuso y el índice de cada componente.
3. La guía del módulo, enlazada en el catálogo de abajo.

## Herramientas (`/iswc-root:*`)

Comandos tipo slash, uno por archivo en [`tools/`](tools/):

| Comando | Uso |
| --- | --- |
| [`/iswc-root:build`](tools/build.md) | Fundar o extender una app con `iswc-*` por CDN (o local). |
| [`/iswc-root:migrate`](tools/migrate.md) | Convertir un frontend con framework (React/MUI/Svelte/…) a vanilla + `iswc-*`. |
| [`/iswc-root:local`](tools/local.md) | Vendorizar el kit y bootear local-first, con CDN como fallback. |
| [`/iswc-root:runtime`](tools/runtime.md) | APIs **sin** tag: loader, IswcUi, md-lite/hydrate/fences, response-cache, sync-pins. |

## Apps sobre el kit: estándar `iswc-foundation` (obligatorio)

Toda **app** construida sobre iswc (no un componente del kit, una app: ISW, las nuevas)
sigue la skill [`../iswc-foundation/SKILL.md`](../iswc-foundation/SKILL.md): misma estructura, mismas
tareas Deno, registro único de tags, vistas, demos, SCSS, Zod, pines fijos, pruebas WHAT con
Stagehand, gate y sync. Una app nueva se crea con `create-iswc-app`, que se ejecuta directo desde la
URL (sin descargar nada):

```bash
deno run -A --reload=https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/ https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/dist/cdn/skills/iswc-foundation/tools/create-iswc-app.mjs mi-app --prefijo=mia
```

Deja el esqueleto completo con un hola mundo, el pin fijo, las specs y skills sembradas
(`specs/iswc/`) y los casos base de prueba.

## Cómo documentar un componente

Cada guía de módulo (`src/components/<carpeta>/<modulo>.md`) sigue la
misma plantilla para que el catálogo y los agentes la lean igual. La
skill [`../document-component/SKILL.md`](../document-component/SKILL.md)
detalla la estructura obligatoria (anatomía, atributos observados,
props, custom states, eventos, slots, CSS parts, ejemplos), las
convenciones de tono, el formato de tablas y los enlaces cruzados que
cada ficha debe llevar.

| Recurso | Ruta |
| --- | --- |
| Skill | [`../document-component/SKILL.md`](../document-component/SKILL.md) |
| Anatomía y frontmatter | [`../document-component/references/anatomy-section.md`](../document-component/references/anatomy-section.md) |
| Custom states | [`../document-component/references/custom-states.md`](../document-component/references/custom-states.md) |
| Bloques de código | [`../document-component/references/code-blocks.md`](../document-component/references/code-blocks.md) |
| Estilo visual | [`../document-component/references/visual-style.md`](../document-component/references/visual-style.md) |

## Enlaces (GitHub primero, raw como secundario)

Los agentes instalan y siguen mejor skills desde URLs de **repo de GitHub**.
Usa `raw.githubusercontent.com` solo para lectura como `text/plain` puro.

| Recurso | GitHub | raw (texto plano) |
| --- | --- | --- |
| Prompt LLM | [PROMPT.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/skills/iswc-root/PROMPT.md) | [raw](https://raw.githubusercontent.com/Jeff-Aporta/iswc-root/main/skills/iswc-root/PROMPT.md) |
| Esta skill | [SKILL.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/skills/iswc-root/SKILL.md) | [raw](https://raw.githubusercontent.com/Jeff-Aporta/iswc-root/main/skills/iswc-root/SKILL.md) |
| Skill instalación CDN | [SKILL.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/skills/is-cdn-install/SKILL.md) | [raw](https://raw.githubusercontent.com/Jeff-Aporta/iswc-root/main/skills/is-cdn-install/SKILL.md) |
| Herramientas | [tools/](https://github.com/Jeff-Aporta/iswc-root/tree/main/skills/iswc-root/tools) | — |
| Catálogo de producto | [componentes.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/specs/componentes.md) | [raw](https://raw.githubusercontent.com/Jeff-Aporta/iswc-root/main/specs/componentes.md) |

Local: `dist/cdn/skills/<name>/SKILL.md` vía jsDelivr o Pages una vez la app ya arranca desde ahí.

Cada `.min.js` del CDN abre con un comentario que enlaza **la guía de ese componente** y **esta skill**.

Inventario completo (tags + APIs): [catalog.md](catalog.md) · Mapa intención→componente: [reference.md](reference.md) · Runtime sin tag: [tools/runtime.md](tools/runtime.md).
App de referencia: apps consumidoras vanilla (`tk-*` sobre `iswc-*`), por ejemplo jagudeloe/frontend-webcomponents.

## Regla de reuso

**Nada se reimplementa si el kit ya lo resuelve.** Antes de escribir HTML, CSS o JS
propio para botones, formularios, tablas, charts, toasts, diálogos, iconos, layouts o diagramas:

1. Clasificar la intención (categoría).
2. Buscar el tag en el catálogo de esta skill.
3. Abrir la guía del módulo y confirmar la API. No inventar props ni eventos.
4. Usar el tag `iswc-*` (o el módulo API de [runtime](tools/runtime.md) si no hay tag). Solo crear dominio (`tk-*`, `app-*`) que **traduzca datos** al kit.

Si no hay tag exacto, usar el más cercano. Si no hay ninguno, se **crea un componente**: nunca HTML suelto.

**Todo es componente.** Toda estructura de UI, por pequeña que sea (figura con pie, fila de
metadatos, paginador, fila de acciones, caja vacía), es un web component. No se arma HTML suelto
en renders (`renderers` de `iswc-md-render`, plantillas, `innerHTML`), vistas, `index.html` ni
visores; solo el markup interno mínimo dentro del shadow de un componente. Cada componente, de
cualquier app, tiene su demo con playground en la galería de esa app (y en la del kit si es `iswc-*`).

**iswc-root es el sistema de reuso entre apps.** Las apps (`paty-*`, `tk-*`…) tienen componentes
propios, muchos de dominio; los **generales** se marcan en su `.json` `iswc-preview/v1` con
`"reuso": { "candidato": "iswc-root", "motivo": "…", "propuesta": "iswc-…" }` (schema
`ReusoCandidatoSchema` en `src/previews/_kit/schemas/component.schemas.ts`) para evaluarlos
periódicamente y subirlos al kit.

## Diagramas por enlace

Cada diagrama tiene visor y editor como app, con el mismo parámetro.

| Modo | Página |
| --- | --- |
| Solo vista | `demos/diagramas/app/view.html?kind=<kind>&json=<base64url>` |
| Edición | `demos/diagramas/app/edit.html?kind=<kind>&json=<base64url>` |

`kind` es uno de: `flowchart`, `sequence`, `class`, `state`, `er`, `block`, `component`, `mindmap`, `gantt`, `timeline`, `org-chart`, `sankey`, `quadrant`, `venn`, `usecase`, `swimlane`, `journey`.

`json` es el documento completo del diagrama en base64url. Se lee al abrir. Editar no reescribe la dirección: **Compartir** copia un enlace nuevo con el JSON resultante, y **Recuperar JSON** devuelve el documento actual. El editor visual dedicado hoy es `<iswc-er-editor>`; el resto se edita con el JSON en vivo sobre el visor del mismo `kind`.

Guía: [`diagram-studio.md`](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/diagrams/utils/diagram-studio.md).

## Bootstrap CDN (apps consumidoras)

Por defecto pin por **commit SHA** (sustituir `{{SHA}}` por la punta actual de
`main`; ver [`tools/local.md`](tools/local.md) para resolverlo y refrescarlo).
Excepción: apps que declaran seguimiento continuo (por ejemplo `jagudeloe/frontend-webcomponents`) pueden usar `@main`.

```html
<html lang="es" data-theme="dark" data-palette="contapyme">
<head>
  <script type="module"
    src="https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-root@{{SHA}}/dist/cdn/core/loader.min.js"></script>
  <script type="module">
    const L = globalThis.ISWebComponentsLoader;
    await L.loadCSSBase();
    await L.loadCSSPalettesDefault();
    await L.load("iswc-toast");
  </script>
</head>
<body>
  <iswc-toast placement="bottom-end"></iswc-toast>
</body>
</html>
```

- CSS de documento: `loadCSSBase` + `loadCSSPalettesDefault`. El CSS de cada `is-*` lo carga el propio tag.
- Cargar solo los tags de la vista. `load('actions')` expande a cada `.min.js` de la categoría (no hay bundle). `load('all')` pide todos los tags, no un archivo único.
- Tema: `data-theme` / `data-palette` en `<html>`. Tokens: `--iswc-text`, `--iswc-bg`, `--iswc-border`, `--iswc-accent`, etc.
- Si la app prefiere no depender de red: usar [`/iswc-root:local`](tools/local.md) (vendoriza JS y CSS, arranque local con fallback a CDN).

## Arquitectura de apps (patrón jagudeloe / r2admin)

| Capa | Prefijo | Responsabilidad |
| --- | --- | --- |
| Kit | `iswc-*` | UI genérica del CDN |
| Dominio | `tk-*` / `app-*` | Traducir payload a `iswc-*` |
| Shell | `*-app`, `*-nav`, `*-view` | Orquestación, routing, datos |

### CSS de dominio (igual que el kit)

Cada `app-*` / `tk-*` lleva **JS y CSS hermanos**. No van embebidos en el TS.

1. Fuente: `app-files.ts` + `app-files.css`
2. Build: minifica a `dist/cdn/app-files.js` + `dist/cdn/app-files.css`
3. Runtime: `IswcUi.adoptCss(shadow, import.meta.url)` (la misma idea que `_shared/adopt-css.js`)

Tras vaciar el shadow, vuelve a llamar `adoptCss` (los `<link>` se borran con el contenido).

`IswcUi.css(shadow, cssText)` queda solo para prototipos sin archivo hermano.

Docs: [helpers/ui.md](https://raw.githubusercontent.com/Jeff-Aporta/iswc-root/main/src/components/helpers/ui.md).

## Prohibido / eliminado

- **`iswc-popup`**: eliminado. No existe alias ni registro. Para paneles anclados usa **`<iswc-popover>`**. Tooltips: **`<iswc-tooltip>`**.
- **`iswc-floating`**: building block **interno** (no es API de producto). No usarlo en apps. El posicionamiento público es `<iswc-popover>` y `<iswc-tooltip>`.
- No hay componentes deprecados en el catálogo público: si la guía dice `status: internal`, no es API.
- `npm` / `npx` / `yarn` / `pnpm` / `bun` / `vite` / `webpack` **para consumir el kit**.

## Lectura de docs (ruta obligatoria)

1. Esta skill (índice y resumen de cada tag).
2. Guía del módulo: `src/components/<carpeta>/<modulo>.md`.
3. Si la API no está en la guía, no inventarla. La fuente solo confirma el contrato escrito.

Base raw: `https://raw.githubusercontent.com/Jeff-Aporta/iswc-root/main/src/components/`

## Convenciones al componer

- Escala: `style="font-size: …em"` / CSS del wrapper. El kit no usa un atributo `size` suelto.
- Iconos: `<iswc-icon icon="familia:icono">` (por ejemplo `mdi:check`).
- Formularios: form-associated del kit. No envolver `<input>` nativos si existe `iswc-input`.
- Overlays posicionados: `<iswc-popover>` / `<iswc-tooltip>`. No reinventar floating UI ni usar `iswc-popup`.
- Charts y diagramas: payloads declarativos de la guía del módulo. Para abrir uno ya armado, la app `?json=`.
- Listeners en `document` o `window`: solo en `connectedCallback`, y quitarlos en `disconnectedCallback`.
- Estados por atributo del host en CSS propio: `:host([attr])` en el nivel superior (nunca `&[attr]` dentro de `:host { }`).

## Qué no hacer

- Reimplementar botón, modal, tabla, toast, tag, skeleton, spinner, tree, tabs, stepper o chart.
- Traer MUI, React, Iconify o Chart.js directo cuando el kit cubre el caso (si vienes de uno de estos, ver [`/iswc-root:migrate`](tools/migrate.md)).
- Usar o documentar `iswc-popup` (eliminado).
- Meter CSS de un componente del kit en el `<head>` (solo tema y paletas).
- Meter el CSS del wrapper de dominio como string dentro del `.ts` (usar el `.css` hermano y `adoptCss`).
- Inventar props o `data-*` que la guía no documenta.
- Usar APIs ad hoc fuera del contrato de la guía.
- Crear un `tk-*` que pinte UI genérica en vez de delegar a `is-*`.
- Asumir submit nativo de `<iswc-button type="submit">` en forms de light DOM sin el cableado del kit (`requestSubmit`).
- Usar `iswc-split-panel` con un porcentaje alto como sidebar fijo de app (preferir grid CSS).
- Buscar fuentes del kit en la raíz del repo (`components/`, `styles/`): viven en **`src/`**.
- Lógica de preview como string o `eval`: en el kit, `ISComponentPreview.mount()` más el registry.
- Ignorar `tests/` en git: los `*.test.mjs` se commitean (solo los artefactos van en gitignore).
- Usar `npm`, `npx` o un bundler para instalar o servir el kit en la app consumidora.

## Kit: carta de leyes

Antes de cambiar el repo del kit, leer [`specs/lessons.md`](https://github.com/Jeff-Aporta/iswc-root/blob/main/specs/lessons.md). Guardianes: `node tests/llm-contract.test.ts` y el resto de `tests/*.test.mjs`.

## Checklist pre-entrega

- [ ] Cada control visual mapea a un `is-*` existente (o hay una justificación explícita de que no existe).
- [ ] Guía del módulo leída; props y eventos según ese MD.
- [ ] Iconos vía `iswc-icon`.
- [ ] Tema y paleta con tokens `--iswc-*`.
- [ ] Los wrappers de dominio solo traducen datos al kit.
- [ ] CDN: SHA fijado (`{{SHA}}` resuelto), o `@main` si el proyecto sigue la punta, o copia local vía `/iswc-root:local`.
- [ ] CSS de dominio en archivo hermano + `adoptCss` (no un `const CSS` gigante en el JS).
- [ ] El build de la app emite `.css` minificado junto al `.js` en `dist/cdn`.
- [ ] Sin `npm install`, `npx` ni bundler para el kit.

## Fundar o migrar una app

- **App nueva o extender una existente:** seguir [`/iswc-root:build`](tools/build.md).
- **Migrar desde React, MUI, Svelte u otro framework:** seguir [`/iswc-root:migrate`](tools/migrate.md).
- **Servir el kit sin depender de CDN en runtime:** seguir [`/iswc-root:local`](tools/local.md).

Resumen de fundación: HTML con bootstrap CDN, `data-theme` y `data-palette`, shell mínimo (`iswc-main`, `iswc-split-panel` o `iswc-drawer`), `<iswc-toast>` global, y capas de dominio que solo mapean datos a tags del kit. Un componente de dominio por concepto de negocio, y cero UI genérica duplicada.

## Módulos API (sin custom element)

<!-- apis:inicio -->

APIs y módulos **sin** tag `iswc-*`. Misma obligación de reuso que el catálogo de componentes.
Detalle operativo: [`tools/runtime.md`](tools/runtime.md).

| API / módulo | CDN o ruta | Resumen | Guía |
| --- | --- | --- | --- |
| `ISWebComponentsLoader` | `core/loader.min.js` | Entry CDN: loadCSS*, load/ensure/has, pin, configure, espejos jsDelivr -> githack -> Pages, sheets, registerApp, SHA quemado. | [docs](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/cdn/loader.md) |
| `IswcUi / Ui` | `helpers/ui.min.js` | html, adoptCss, define, css, el: primitivas de apps dominio. No es CE. | [docs](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/helpers/ui.md) |
| `mdToHtml` | `helpers/md-lite.min.js` | Markdown -> HTML sin npm; fences codigo e iswc-* (diagramas). | [docs](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/helpers/utils/md-lite.md) |
| `resolveIswcFenceTag` | `helpers/md-iswc-fences.min.js` | Lang fence iswc-* -> tag de diagrama (flowchart, er, sequence, ...). | [docs](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/helpers/utils/md-iswc-fences.md) |
| `hydrateMdEmbeds` | `helpers/md-hydrate.min.js` | Carga perezosa de los iswc-* que pusieron los renders por defecto del markdown. | [docs](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/helpers/utils/md-hydrate.md) |
| `md-editor-api` | `helpers/md-editor-api.min.js` | CRUD/normalizacion para iswc-md-editor (endpoints, fieldMap, token). | [docs](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/helpers/utils/md-editor-api.md) |
| `IsResponseCache` | `helpers/response-cache.min.js` | SWR IndexedDB: vivo/leer/guardar/invalidar; no bloquea el pintado. | [docs](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/helpers/utils/response-cache.md) |
| `sync-pins` | `scripts/sync-pins.mjs (repo)` | Tras commit del kit: propaga SHA a kit-pin / ISS / PIN (deno task sync:pins). | [docs](https://github.com/Jeff-Aporta/iswc-root/blob/main/scripts/sync-pins.mjs) |

<!-- apis:fin -->

## Cómo construir un componente

Regla previa: toda estructura de UI es un componente (ver **Regla de reuso**). Componente nuevo
= `.ts` + `.scss` + `.md` + `.json` (`iswc-preview/v1` con playground `controls`) + entrada en
`src/manifest.ts` (kit) o en `kit-tags.ts` + `view/demo/manifest.json` (app). Si nace en una app
y es general, lleva el marcador `reuso` para subirlo al kit.

Esta skill cubre cómo **consumir** el kit desde apps externas. Si lo que
necesitas es **crear o refactorizar un componente** del propio kit
(añadir un `<iswc-foo>` nuevo, o revisar uno existente para que cumpla
el contrato), sigue la skill paralela:

| Skill | Cuándo |
| --- | --- |
| [`build-component/SKILL.md`](../build-component/SKILL.md) | Anatomía obligatoria del `.md`, custom states (`StateMachine`), CSS parts y slots, atributos observados vs propiedades, tokens `--iswc-*`, accesibilidad, tests con `node:test` + `assert/strict`, demo en `demos/<cat>/<comp>/<comp>.html`. |

Sub-guías de la skill:

- [`references/lifecycle.md`](../build-component/references/lifecycle.md) — Hooks de `ElementBase`, shadow, upgrade de propiedades, form-associated, cleanup.
- [`references/states.md`](../build-component/references/states.md) — Custom states, `setCustomState`, fallback `data-state-*`.
- [`references/parts-slots.md`](../build-component/references/parts-slots.md) — `part="..."`, slots semánticos, `:slotted(...)`.
- [`references/props-events.md`](../build-component/references/props-events.md) — Atributos observados, propiedades, eventos `iswc-*` con `composed: true`.
- [`references/css-tokens.md`](../build-component/references/css-tokens.md) — Tokens `--iswc-*`, temas, paletas, `static styleAttrs`.
- [`references/accessibility.md`](../build-component/references/accessibility.md) — Semántica, foco, teclado, ARIA, focus management, modales.

## Catálogo de componentes

Índice para agentes. Cada fila es un tag que ya existe: abre la guía y reutilízalo. No reimplementes la fila. Los módulos sin tag están arriba en **Módulos API**.

<!-- catalogo:inicio -->

Cada `.min.js` enlaza la guía de su fila y esta skill.

### isp

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<iswc-accordion-group>` | isp/accordion-group.md | [isp/accordion-group.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/isp/accordion-group.md) |
| `<iswc-block-layout>` | isp/block-layout.md | [isp/block-layout.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/isp/block-layout.md) |
| `<iswc-btn-ref>` | isp/btn-ref.md | [isp/btn-ref.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/isp/btn-ref.md) |
| `<iswc-catalogo-gen>` | isp/catalogo-gen.md | [isp/catalogo-gen.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/isp/catalogo-gen.md) |
| `<iswc-confirm-delete>` | isp/confirm-delete.md | [isp/confirm-delete.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/isp/confirm-delete.md) |
| `<iswc-flex-layout>` | isp/flex-layout.md | [isp/flex-layout.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/isp/flex-layout.md) |
| `<iswc-flex-options>` | isp/flex-options.md | [isp/flex-options.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/isp/flex-options.md) |
| `<iswc-float-card>` | isp/float-card.md | [isp/float-card.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/isp/float-card.md) |
| `<iswc-form>` | isp/form.md | [isp/form.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/isp/form.md) |
| `<iswc-modal-verificacion>` | isp/modal-verificacion.md | [isp/modal-verificacion.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/isp/modal-verificacion.md) |
| `<iswc-grid-layout>` | isp/grid-layout.md | [isp/grid-layout.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/isp/grid-layout.md) |
| `<iswc-heading>` | isp/heading.md | [isp/heading.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/isp/heading.md) |
| `<iswc-loading-overlay>` | isp/loading-overlay.md | [isp/loading-overlay.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/isp/loading-overlay.md) |
| `<iswc-text>` | isp/text.md | [isp/text.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/isp/text.md) |
| `<iswc-tree-view>` | isp/tree-view.md | [isp/tree-view.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/isp/tree-view.md) |

### actions

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<iswc-button>` | actions/button.md | [actions/button.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/actions/button.md) |
| `<iswc-button-group>` | actions/button-group.md | [actions/button-group.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/actions/button-group.md) |
| `<iswc-copy-button>` | actions/copy-button.md | [actions/copy-button.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/actions/copy-button.md) |
| `<iswc-share-button>` | actions/share-button.md | [actions/share-button.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/actions/share-button.md) |
| `<iswc-check-icon-button>` | actions/check-icon-button.md | [actions/check-icon-button.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/actions/check-icon-button.md) |
| `<iswc-dropdown>` | actions/dropdown.md | [actions/dropdown.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/actions/dropdown.md) |
| `<iswc-dropdown-item>` | actions/dropdown-item.md | [actions/dropdown-item.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/actions/dropdown-item.md) |
| `<iswc-fab>` | actions/fab.md | [actions/fab.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/actions/fab.md) |
| `<iswc-context-menu>` | actions/context-menu.md | [actions/context-menu.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/actions/context-menu.md) |
| `<iswc-speed-dial>` | actions/speed-dial.md | [actions/speed-dial.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/actions/speed-dial.md) |
| `<iswc-speed-dial-action>` | Acción hija de <iswc-speed-dial>. | [actions/speed-dial-action.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/actions/speed-dial-action.md) |

### media

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<iswc-icon>` | Iconos, identidad visual y reproducción de video. | [media/icon.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/media/icon.md) |
| `<iswc-avatar>` | media/avatar.md | [media/avatar.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/media/avatar.md) |
| `<iswc-theme-img>` | media/theme-img.md | [media/theme-img.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/media/theme-img.md) |
| `<iswc-figure>` | Figura de contenido: una imagen (con variante dark/light opcional), su pie y, si se pide, un enlace «abrir en una pestaña nueva». | [media/figure.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/media/figure.md) |
| `<iswc-video>` | media/video.md | [media/video.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/media/video.md) |
| `<iswc-speech>` | media/speech.md | [media/speech.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/media/speech.md) |
| `<iswc-media-recorder>` | media/media-recorder.md | [media/media-recorder.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/media/media-recorder.md) |
| `<iswc-video-playlist>` | media/video-playlist.md | [media/video-playlist.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/media/video-playlist.md) |
| `<iswc-barcode>` | media/barcode.md | [media/barcode.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/media/barcode.md) |
| `<iswc-barcode-scanner>` | media/barcode-scanner.md | [media/barcode-scanner.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/media/barcode-scanner.md) |
| `<iswc-image-editor>` | media/image-editor.md | [media/image-editor.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/media/image-editor.md) |
| `<iswc-icon-explorer>` | Ver la guía del módulo antes de crear otro control. | — |
| `<iswc-qrcode>` | media/qrcode.md | [media/qrcode.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/media/qrcode.md) |

### feedback

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<iswc-spinner>` | feedback/spinner.md | [feedback/spinner.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/feedback/spinner.md) |
| `<iswc-badge>` | feedback/badge.md | [feedback/badge.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/feedback/badge.md) |
| `<iswc-tag>` | feedback/tag.md | [feedback/tag.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/feedback/tag.md) |
| `<iswc-skeleton>` | feedback/skeleton.md | [feedback/skeleton.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/feedback/skeleton.md) |
| `<iswc-progress-bar>` | feedback/progress-bar.md | [feedback/progress-bar.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/feedback/progress-bar.md) |
| `<iswc-progress-ring>` | feedback/progress-ring.md | [feedback/progress-ring.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/feedback/progress-ring.md) |
| `<iswc-theme-toggle>` | feedback/theme-toggle.md | [feedback/theme-toggle.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/feedback/theme-toggle.md) |
| `<iswc-prefs-clear>` | feedback/prefs-clear.md | [feedback/prefs-clear.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/feedback/prefs-clear.md) |
| `<iswc-toast>` | feedback/toast.md | [feedback/toast.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/feedback/toast.md) |
| `<iswc-toast-item>` | feedback/toast-item.md | [feedback/toast-item.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/feedback/toast-item.md) |
| `<iswc-tooltip>` | feedback/tooltip.md | [feedback/tooltip.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/feedback/tooltip.md) |
| `<iswc-cdn-snippet>` | feedback/cdn-snippet.md | [feedback/cdn-snippet.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/feedback/cdn-snippet.md) |
| `<iswc-popconfirm>` | feedback/popconfirm.md | [feedback/popconfirm.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/feedback/popconfirm.md) |
| `<iswc-confirm-modal>` | feedback/confirm-modal.md | [feedback/confirm-modal.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/feedback/confirm-modal.md) |
| `<iswc-palette-selector>` | feedback/palette-selector.md | [feedback/palette-selector.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/feedback/palette-selector.md) |

### layout

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<iswc-split-panel>` | layout/split-panel.md | [layout/split-panel.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/layout/split-panel.md) |
| `<iswc-main>` | layout/main.md | [layout/main.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/layout/main.md) |
| `<iswc-card>` | layout/card.md | [layout/card.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/layout/card.md) |
| `<iswc-callout>` | layout/callout.md | [layout/callout.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/layout/callout.md) |
| `<iswc-details>` | layout/details.md | [layout/details.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/layout/details.md) |
| `<iswc-dialog>` | layout/dialog.md | [layout/dialog.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/layout/dialog.md) |
| `<iswc-drawer>` | layout/drawer.md | [layout/drawer.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/layout/drawer.md) |
| `<iswc-divider>` | layout/divider.md | [layout/divider.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/layout/divider.md) |
| `<iswc-scrollspy>` | layout/scrollspy.md | [layout/scrollspy.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/layout/scrollspy.md) |
| `<iswc-demo>` | Caja de demostración de la galería. | [layout/demo.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/layout/demo.md) |
| `<iswc-dock>` | layout/dock.md | [layout/dock.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/layout/dock.md) |
| `<iswc-dock-item>` | Ítem de <iswc-dock>. | [layout/dock-item.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/layout/dock-item.md) |
| `<iswc-doc-layout>` | Layout documental común: navegación a la izquierda, contenido al centro e índice de la página a la derecha, con scroll-spy entre ambos. | [layout/doc-layout.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/layout/doc-layout.md) |
| `<iswc-md-docs-vault>` | Lector de una documentación modular (norma documentacion-modular) como un libro: cada .md es una hoja, el README es la portada y se navega con índice, búsqueda, paso anterior/siguiente y enlaces compartibles. | [layout/md-docs-vault.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/layout/md-docs-vault.md) |
| `<iswc-server-api-docs>` | Expone los endpoints de la API de un server al estilo Swagger (solo para servers: el ISS la sirve en GET /api/docs). | [layout/server-api-docs.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/layout/server-api-docs.md) |

### helpers

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<iswc-popover>` | Formato, observación y posicionamiento reutilizable sobre APIs nativas. | [helpers/popover.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/helpers/popover.md) |
| `<iswc-ui>` | helpers/ui.md | [helpers/ui.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/helpers/ui.md) |
| `<iswc-lightbox>` | diagrams/lightbox.md | [diagrams/lightbox.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/diagrams/lightbox.md) |
| `<iswc-relative-time>` | helpers/relative-time.md | [helpers/relative-time.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/helpers/relative-time.md) |
| `<iswc-format>` | helpers/format.md | [helpers/format.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/helpers/format.md) |
| `<iswc-observer>` | helpers/observer.md | [helpers/observer.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/helpers/observer.md) |
| `<iswc-wake-lock>` | helpers/wake-lock.md | [helpers/wake-lock.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/helpers/wake-lock.md) |
| `<iswc-offscreen-canvas>` | helpers/offscreen-canvas.md | [helpers/offscreen-canvas.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/helpers/offscreen-canvas.md) |
| `<iswc-format-date>` | helpers/format-date.md | [helpers/format-date.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/helpers/format-date.md) |
| `<iswc-format-number>` | helpers/format-number.md | [helpers/format-number.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/helpers/format-number.md) |
| `<iswc-format-bytes>` | helpers/format-bytes.md | [helpers/format-bytes.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/helpers/format-bytes.md) |
| `<iswc-intersection-observer>` | helpers/intersection-observer.md | [helpers/intersection-observer.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/helpers/intersection-observer.md) |
| `<iswc-mutation-observer>` | helpers/mutation-observer.md | [helpers/mutation-observer.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/helpers/mutation-observer.md) |
| `<iswc-resize-observer>` | helpers/resize-observer.md | [helpers/resize-observer.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/helpers/resize-observer.md) |
| `<iswc-md-render>` | helpers/md-render.md | [helpers/md-render.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/helpers/md-render.md) |
| `<iswc-md-editor>` | helpers/md-editor.md | [helpers/md-editor.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/helpers/md-editor.md) |
| `<iswc-floating>` | helpers/floating.md | [helpers/floating.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/helpers/floating.md) |

### navigation

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<iswc-breadcrumb>` | navigation/breadcrumb.md | [navigation/breadcrumb.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/navigation/breadcrumb.md) |
| `<iswc-pager>` | Paso a la página anterior y a la siguiente, cada lado con un rótulo pequeño («← Anterior», «Siguiente →») y el título de la otra página. | [navigation/pager.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/navigation/pager.md) |
| `<iswc-doc-index>` | Índice documental con búsqueda: lista páginas agrupadas (grupo → subgrupo → ítem) y, al escribir, busca en títulos, palabras clave y todo el texto, con los resultados por relevancia y el fragmento resaltado. | [navigation/doc-index.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/navigation/doc-index.md) |
| `<iswc-breadcrumb-item>` | navigation/breadcrumb-item.md | [navigation/breadcrumb-item.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/navigation/breadcrumb-item.md) |
| `<iswc-tab-group>` | navigation/tab-group.md | [navigation/tab-group.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/navigation/tab-group.md) |
| `<iswc-tab>` | navigation/tab-group.md | [navigation/tab-group.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/navigation/tab-group.md) |
| `<iswc-tab-panel>` | navigation/tab-group.md | [navigation/tab-group.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/navigation/tab-group.md) |
| `<iswc-scroller>` | navigation/scroller.md | [navigation/scroller.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/navigation/scroller.md) |
| `<iswc-carousel>` | navigation/carousel.md | [navigation/carousel.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/navigation/carousel.md) |
| `<iswc-carousel-item>` | Lámina de <iswc-carousel>. | [navigation/carousel-item.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/navigation/carousel-item.md) |
| `<iswc-tree>` | navigation/tree.md | [navigation/tree.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/navigation/tree.md) |
| `<iswc-tree-item>` | Nodo de <iswc-tree>. | [navigation/tree-item.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/navigation/tree-item.md) |
| `<iswc-stepper>` | navigation/stepper.md | [navigation/stepper.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/navigation/stepper.md) |
| `<iswc-stepper-step>` | Paso de <iswc-stepper>. | [navigation/stepper-step.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/navigation/stepper-step.md) |
| `<iswc-mega-menu>` | navigation/mega-menu.md | [navigation/mega-menu.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/navigation/mega-menu.md) |

### forms

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<iswc-combobox>` | forms/combobox.md | [forms/combobox.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/combobox.md) |
| `<iswc-option>` | forms/option.md | [forms/option.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/option.md) |
| `<iswc-checkbox>` | forms/checkbox.md | [forms/checkbox.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/checkbox.md) |
| `<iswc-switch>` | forms/switch.md | [forms/switch.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/switch.md) |
| `<iswc-radio-group>` | forms/radio-group.md | [forms/radio-group.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/radio-group.md) |
| `<iswc-radio>` | forms/radio.md | [forms/radio.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/radio.md) |
| `<iswc-input>` | forms/input.md | [forms/input.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/input.md) |
| `<iswc-textarea>` | forms/textarea.md | [forms/textarea.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/textarea.md) |
| `<iswc-slider>` | forms/slider.md | [forms/slider.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/slider.md) |
| `<iswc-rating>` | forms/rating.md | [forms/rating.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/rating.md) |
| `<iswc-select>` | forms/select.md | [forms/select.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/select.md) |
| `<iswc-color-picker>` | forms/color-picker.md | [forms/color-picker.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/color-picker.md) |
| `<iswc-file-input>` | forms/file-input.md | [forms/file-input.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/file-input.md) |
| `<iswc-date-picker>` | forms/date-picker.md | [forms/date-picker.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/date-picker.md) |
| `<iswc-month-calendar>` | forms/month-calendar.md | [forms/month-calendar.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/month-calendar.md) |
| `<iswc-year-calendar>` | forms/year-calendar.md | [forms/year-calendar.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/year-calendar.md) |
| `<iswc-date-range-picker>` | forms/date-range-picker.md | [forms/date-range-picker.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/date-range-picker.md) |
| `<iswc-time-clock>` | forms/time-clock.md | [forms/time-clock.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/time-clock.md) |
| `<iswc-digital-clock>` | forms/digital-clock.md | [forms/digital-clock.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/digital-clock.md) |
| `<iswc-date-field>` | Captura, selección y validación de valores compatibles con formularios. | [forms/date-field.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/date-field.md) |
| `<iswc-time-field>` | Captura, selección y validación de valores compatibles con formularios. | [forms/time-field.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/time-field.md) |
| `<iswc-date-time-field>` | Captura, selección y validación de valores compatibles con formularios. | [forms/date-time-field.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/date-time-field.md) |
| `<iswc-date-input>` | forms/date-input.md | [forms/date-input.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/date-input.md) |
| `<iswc-time-input>` | forms/time-input.md | [forms/time-input.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/time-input.md) |
| `<iswc-date-time-input>` | forms/date-time-input.md | [forms/date-time-input.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/date-time-input.md) |
| `<iswc-date-range-input>` | forms/date-range-input.md | [forms/date-range-input.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/date-range-input.md) |
| `<iswc-pin-input>` | forms/pin-input.md | [forms/pin-input.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/pin-input.md) |
| `<iswc-masked-input>` | forms/masked-input.md | [forms/masked-input.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/masked-input.md) |
| `<iswc-inline-edit>` | forms/inline-edit.md | [forms/inline-edit.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/inline-edit.md) |
| `<iswc-mention>` | forms/mention.md | [forms/mention.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/mention.md) |
| `<iswc-duration-picker>` | forms/duration-picker.md | [forms/duration-picker.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/duration-picker.md) |
| `<iswc-dropzone>` | forms/dropzone.md | [forms/dropzone.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/dropzone.md) |
| `<iswc-full-calendar>` | forms/full-calendar.md | [forms/full-calendar.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/full-calendar.md) |
| `<iswc-signature>` | forms/signature.md | [forms/signature.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/signature.md) |
| `<iswc-rte>` | forms/rte.md | [forms/rte.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/rte.md) |
| `<iswc-doc-editor>` | forms/doc-editor.md | [forms/doc-editor.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/forms/doc-editor.md) |

### code

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<iswc-code>` | code/code.md | [code/code.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/code/code.md) |

### data

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<iswc-data-grid>` | data/data-grid.md | [data/data-grid.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/data/data-grid.md) |
| `<iswc-stat>` | data/stat.md | [data/stat.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/data/stat.md) |
| `<iswc-meta-list>` | Lista de metadatos clave → valor, agrupada por secciones con título (ubicación, autor, estado, etiquetas, ruta…). | [data/meta-list.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/data/meta-list.md) |
| `<iswc-transfer>` | data/transfer.md | [data/transfer.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/data/transfer.md) |
| `<iswc-transfer-item>` | Ítem de <iswc-transfer>. | [data/transfer-item.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/data/transfer-item.md) |
| `<iswc-kanban>` | data/kanban.md | [data/kanban.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/data/kanban.md) |
| `<iswc-kanban-column>` | Columna de <iswc-kanban>. | [data/kanban-column.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/data/kanban-column.md) |
| `<iswc-kanban-card>` | Tarjeta de <iswc-kanban>. | [data/kanban-card.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/data/kanban-card.md) |
| `<iswc-pivot-table>` | data/pivot-table.md | [data/pivot-table.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/data/pivot-table.md) |
| `<iswc-spreadsheet>` | data/spreadsheet.md | [data/spreadsheet.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/data/spreadsheet.md) |
| `<iswc-ag-grid>` | data/ag-grid.md | [data/ag-grid.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/data/ag-grid.md) |

### data-viz

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<iswc-chart>` | charts/chart.md | [charts/chart.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/charts/chart.md) |
| `<iswc-bar-chart>` | charts/bar-chart.md | [charts/bar-chart.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/charts/bar-chart.md) |
| `<iswc-line-chart>` | charts/line-chart.md | [charts/line-chart.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/charts/line-chart.md) |
| `<iswc-pie-chart>` | charts/pie-chart.md | [charts/pie-chart.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/charts/pie-chart.md) |
| `<iswc-doughnut-chart>` | charts/doughnut-chart.md | [charts/doughnut-chart.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/charts/doughnut-chart.md) |
| `<iswc-radar-chart>` | charts/radar-chart.md | [charts/radar-chart.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/charts/radar-chart.md) |
| `<iswc-polar-area-chart>` | charts/polar-area-chart.md | [charts/polar-area-chart.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/charts/polar-area-chart.md) |
| `<iswc-scatter-chart>` | charts/scatter-chart.md | [charts/scatter-chart.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/charts/scatter-chart.md) |
| `<iswc-bubble-chart>` | charts/bubble-chart.md | [charts/bubble-chart.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/charts/bubble-chart.md) |
| `<iswc-sparkline>` | charts/sparkline.md | [charts/sparkline.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/charts/sparkline.md) |
| `<iswc-waterfall-chart>` | charts/waterfall-chart.md | [charts/waterfall-chart.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/charts/waterfall-chart.md) |
| `<iswc-funnel-chart>` | charts/funnel-chart.md | [charts/funnel-chart.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/charts/funnel-chart.md) |
| `<iswc-treemap>` | charts/treemap.md | [charts/treemap.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/charts/treemap.md) |
| `<iswc-gauge>` | data/gauge.md | [data/gauge.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/data/gauge.md) |
| `<iswc-heatmap>` | data-viz/heatmap.md | [data-viz/heatmap.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/data-viz/heatmap.md) |
| `<iswc-maps>` | data-viz/maps.md | [data-viz/maps.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/data-viz/maps.md) |
| `<iswc-map-marker>` | Marcador de <iswc-maps>. | [data-viz/map-marker.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/data-viz/map-marker.md) |

### diagrams

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<iswc-flowchart>` | Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos. | [diagrams/flowchart.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/diagrams/flowchart.md) |
| `<iswc-sequence-diagram>` | diagrams/sequence-diagram.md | [diagrams/sequence-diagram.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/diagrams/sequence-diagram.md) |
| `<iswc-diagram-lightbox>` | diagrams/diagram-lightbox.md | [diagrams/diagram-lightbox.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/diagrams/diagram-lightbox.md) |
| `<iswc-class-diagram>` | diagrams/class-diagram.md | [diagrams/class-diagram.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/diagrams/class-diagram.md) |
| `<iswc-state-diagram>` | diagrams/state-diagram.md | [diagrams/state-diagram.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/diagrams/state-diagram.md) |
| `<iswc-er-diagram>` | diagrams/er-diagram.md | [diagrams/er-diagram.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/diagrams/er-diagram.md) |
| `<iswc-er-editor>` | Editor visual del diagrama entidad-relación. | [diagrams/er-editor.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/diagrams/er-editor.md) |
| `<iswc-diagram-view-app>` | Abrir cualquier diagrama del kit por enlace, en solo vista o en edición, sin reimplementar el visor. | [diagrams/utils/diagram-studio.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/diagrams/utils/diagram-studio.md) |
| `<iswc-diagram-edit-app>` | Abrir cualquier diagrama del kit por enlace, en solo vista o en edición, sin reimplementar el visor. | [diagrams/utils/diagram-studio.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/diagrams/utils/diagram-studio.md) |
| `<iswc-block-diagram>` | diagrams/block-diagram.md | [diagrams/block-diagram.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/diagrams/block-diagram.md) |
| `<iswc-component-diagram>` | diagrams/component-diagram.md | [diagrams/component-diagram.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/diagrams/component-diagram.md) |
| `<iswc-mindmap>` | diagrams/mindmap.md | [diagrams/mindmap.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/diagrams/mindmap.md) |
| `<iswc-gantt>` | diagrams/gantt.md | [diagrams/gantt.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/diagrams/gantt.md) |
| `<iswc-timeline>` | diagrams/timeline.md | [diagrams/timeline.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/diagrams/timeline.md) |
| `<iswc-org-chart>` | diagrams/org-chart.md | [diagrams/org-chart.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/diagrams/org-chart.md) |
| `<iswc-sankey-diagram>` | diagrams/sankey-diagram.md | [diagrams/sankey-diagram.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/diagrams/sankey-diagram.md) |
| `<iswc-quadrant-chart>` | diagrams/quadrant-chart.md | [diagrams/quadrant-chart.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/diagrams/quadrant-chart.md) |
| `<iswc-venn-diagram>` | diagrams/venn-diagram.md | [diagrams/venn-diagram.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/diagrams/venn-diagram.md) |
| `<iswc-use-case-diagram>` | diagrams/use-case-diagram.md | [diagrams/use-case-diagram.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/diagrams/use-case-diagram.md) |
| `<iswc-swimlane-diagram>` | diagrams/swimlane-diagram.md | [diagrams/swimlane-diagram.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/diagrams/swimlane-diagram.md) |
| `<iswc-journey-map>` | diagrams/journey-map.md | [diagrams/journey-map.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/diagrams/journey-map.md) |

### overlays

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<iswc-command-palette>` | overlays/command-palette.md | [overlays/command-palette.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/overlays/command-palette.md) |
| `<iswc-pdf-viewer>` | overlays/pdf-viewer.md | [overlays/pdf-viewer.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/overlays/pdf-viewer.md) |
| `<iswc-window>` | overlays/window.md | [overlays/window.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/overlays/window.md) |

### files

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<iswc-txt-view>` | files/txt-view.md | [files/txt-view.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/files/txt-view.md) |
| `<iswc-txt-edit>` | files/txt-edit.md | [files/txt-edit.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/files/txt-edit.md) |
| `<iswc-csv-view>` | files/csv-view.md | [files/csv-view.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/files/csv-view.md) |
| `<iswc-csv-edit>` | files/csv-edit.md | [files/csv-edit.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/files/csv-edit.md) |
| `<iswc-docx-view>` | files/docx-view.md | [files/docx-view.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/files/docx-view.md) |
| `<iswc-pptx-view>` | files/pptx-view.md | [files/pptx-view.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/files/pptx-view.md) |
| `<iswc-file-view>` | files/file-view.md | [files/file-view.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/files/file-view.md) |
| `<iswc-file-edit>` | files/file-edit.md | [files/file-edit.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/files/file-edit.md) |

### preview

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<iswc-preview-component>` | Shell de la galería. | [layout/preview-component.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/layout/preview-component.md) |
| `<iswc-doc-demo>` | layout/doc-demo.md | [layout/doc-demo.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/layout/doc-demo.md) |
| `<iswc-preview-controls>` | Panel de knobs del playground de la galería. | [layout/preview-controls.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/layout/preview-controls.md) |
| `<iswc-playground>` | preview/playground.md | [preview/playground.md](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/components/preview/playground.md) |
| `<iswc-slots-pg>` | Ver la guía del módulo antes de crear otro control. | — |
| `<iswc-examples-carousel>` | Ver la guía del módulo antes de crear otro control. | — |
| `<iswc-demo-section>` | Ver la guía del módulo antes de crear otro control. | — |

<!-- catalogo:fin -->