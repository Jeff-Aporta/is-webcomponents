---
name: is-webcomponents
description: >-
  Obliga a reusar el kit iswc-* (Jeff-Aporta/is-webcomponents) al fundar o extender
  apps de web components sin framework. Usar cuando hay CDN loader.min.js / is-base /
  palettes, tags iswc-button iswc-dialog iswc-data-grid iswc-chart iswc-icon, APIs
  IswcUi / md-hydrate / response-cache, apps tipo frontend-webcomponents / tk-*,
  migraciones desde React/MUI/Svelte, o cuando se pueda reinventar UI del catálogo.
---

# IS Web Components — stack obligatorio

## Regla absoluta (léela primero)

Usa el kit **solo por CDN** (jsDelivr o GitHub Pages). Prohibido `npm
install`, `npx`, `yarn`, `pnpm`, `bun`, y bundlers (`vite`, `webpack`, …)
para consumir el kit — no hay paquete publicado y no hace falta build step.
Prompt completo, listo para copiar: [`PROMPT.md`](PROMPT.md).

**Antes de escribir HTML/CSS/JS**, lee en orden:

1. [`is-cdn-install/SKILL.md`](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/skills/is-cdn-install/SKILL.md) — bootstrap, espejos, pin SHA, fallback.
2. Este archivo — arquitectura, reglas de reuso y el índice de cada componente.
3. La guía del módulo, enlazada en el catálogo de abajo.

## Herramientas (`/is-webcomponents:*`)

Comandos tipo slash, uno por archivo en [`tools/`](tools/):

| Comando | Uso |
| --- | --- |
| [`/is-webcomponents:build`](tools/build.md) | Fundar o extender una app con `iswc-*` por CDN (o local). |
| [`/is-webcomponents:migrate`](tools/migrate.md) | Convertir un frontend con framework (React/MUI/Svelte/…) a vanilla + `iswc-*`. |
| [`/is-webcomponents:local`](tools/local.md) | Vendorizar el kit y bootear local-first, con CDN como fallback. |
| [`/is-webcomponents:runtime`](tools/runtime.md) | APIs **sin** tag: loader, IswcUi, md-lite/hydrate/fences, response-cache, sync-pins. |

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
| Prompt LLM | [PROMPT.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/skills/is-webcomponents/PROMPT.md) | [raw](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/skills/is-webcomponents/PROMPT.md) |
| Esta skill | [SKILL.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/skills/is-webcomponents/SKILL.md) | [raw](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/skills/is-webcomponents/SKILL.md) |
| Skill instalación CDN | [SKILL.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/skills/is-cdn-install/SKILL.md) | [raw](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/skills/is-cdn-install/SKILL.md) |
| Herramientas | [tools/](https://github.com/Jeff-Aporta/is-webcomponents/tree/main/src/skills/is-webcomponents/tools) | — |
| Catálogo de producto | [componentes.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/specs/componentes.md) | [raw](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/specs/componentes.md) |

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

Si no hay tag exacto, usar el más cercano. Solo entonces un primitivo nativo o un wrapper mínimo.

## Diagramas por enlace

Cada diagrama tiene visor y editor como app, con el mismo parámetro.

| Modo | Página |
| --- | --- |
| Solo vista | `demos/diagramas/app/view.html?kind=<kind>&json=<base64url>` |
| Edición | `demos/diagramas/app/edit.html?kind=<kind>&json=<base64url>` |

`kind` es uno de: `flowchart`, `sequence`, `class`, `state`, `er`, `block`, `component`, `mindmap`, `gantt`, `timeline`, `org-chart`, `sankey`, `quadrant`, `venn`, `usecase`, `swimlane`, `journey`.

`json` es el documento completo del diagrama en base64url. Se lee al abrir. Editar no reescribe la dirección: **Compartir** copia un enlace nuevo con el JSON resultante, y **Recuperar JSON** devuelve el documento actual. El editor visual dedicado hoy es `<iswc-er-editor>`; el resto se edita con el JSON en vivo sobre el visor del mismo `kind`.

Guía: [`diagram-studio.md`](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/diagram-studio.md).

## Bootstrap CDN (apps consumidoras)

Por defecto pin por **commit SHA** (sustituir `{{SHA}}` por la punta actual de
`main`; ver [`tools/local.md`](tools/local.md) para resolverlo y refrescarlo).
Excepción: apps que declaran seguimiento continuo (por ejemplo `jagudeloe/frontend-webcomponents`) pueden usar `@main`.

```html
<html lang="es" data-theme="dark" data-palette="contapyme">
<head>
  <script type="module"
    src="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@{{SHA}}/dist/cdn/core/loader.min.js"></script>
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
- Si la app prefiere no depender de red: usar [`/is-webcomponents:local`](tools/local.md) (vendoriza JS y CSS, arranque local con fallback a CDN).

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

Docs: [helpers/ui.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/helpers/ui.md).

## Prohibido / eliminado

- **`iswc-popup`**: eliminado. No existe alias ni registro. Para paneles anclados usa **`<iswc-popover>`**. Tooltips: **`<iswc-tooltip>`**.
- **`iswc-floating`**: building block **interno** (no es API de producto). No usarlo en apps. El posicionamiento público es `<iswc-popover>` y `<iswc-tooltip>`.
- No hay componentes deprecados en el catálogo público: si la guía dice `status: internal`, no es API.
- `npm` / `npx` / `yarn` / `pnpm` / `bun` / `vite` / `webpack` **para consumir el kit**.

## Lectura de docs (ruta obligatoria)

1. Esta skill (índice y resumen de cada tag).
2. Guía del módulo: `src/components/<carpeta>/<modulo>.md`.
3. Si la API no está en la guía, no inventarla. La fuente solo confirma el contrato escrito.

Base raw: `https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/`

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
- Traer MUI, React, Iconify o Chart.js directo cuando el kit cubre el caso (si vienes de uno de estos, ver [`/is-webcomponents:migrate`](tools/migrate.md)).
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

Antes de cambiar el repo del kit, leer [`specs/lessons.md`](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/specs/lessons.md). Guardianes: `node tests/llm-contract.test.ts` y el resto de `tests/*.test.mjs`.

## Checklist pre-entrega

- [ ] Cada control visual mapea a un `is-*` existente (o hay una justificación explícita de que no existe).
- [ ] Guía del módulo leída; props y eventos según ese MD.
- [ ] Iconos vía `iswc-icon`.
- [ ] Tema y paleta con tokens `--iswc-*`.
- [ ] Los wrappers de dominio solo traducen datos al kit.
- [ ] CDN: SHA fijado (`{{SHA}}` resuelto), o `@main` si el proyecto sigue la punta, o copia local vía `/is-webcomponents:local`.
- [ ] CSS de dominio en archivo hermano + `adoptCss` (no un `const CSS` gigante en el JS).
- [ ] El build de la app emite `.css` minificado junto al `.js` en `dist/cdn`.
- [ ] Sin `npm install`, `npx` ni bundler para el kit.

## Fundar o migrar una app

- **App nueva o extender una existente:** seguir [`/is-webcomponents:build`](tools/build.md).
- **Migrar desde React, MUI, Svelte u otro framework:** seguir [`/is-webcomponents:migrate`](tools/migrate.md).
- **Servir el kit sin depender de CDN en runtime:** seguir [`/is-webcomponents:local`](tools/local.md).

Resumen de fundación: HTML con bootstrap CDN, `data-theme` y `data-palette`, shell mínimo (`iswc-main`, `iswc-split-panel` o `iswc-drawer`), `<iswc-toast>` global, y capas de dominio que solo mapean datos a tags del kit. Un componente de dominio por concepto de negocio, y cero UI genérica duplicada.

## Módulos API (sin custom element)

<!-- apis:inicio -->

APIs y módulos **sin** tag `iswc-*`. Misma obligación de reuso que el catálogo de componentes.
Detalle operativo: [`tools/runtime.md`](tools/runtime.md).

| API / módulo | CDN o ruta | Resumen | Guía |
| --- | --- | --- | --- |
| `ISWebComponentsLoader` | `core/loader.min.js` | Entry CDN: loadCSS*, load/ensure/has, pin, configure, espejos jsDelivr -> githack -> Pages, sheets, registerApp, SHA quemado. | [docs](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/cdn/loader.md) |
| `IswcUi / Ui` | `helpers/ui.min.js` | html, adoptCss, define, css, el: primitivas de apps dominio. No es CE. | [docs](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/ui.md) |
| `mdToHtml` | `helpers/md-lite.min.js` | Markdown -> HTML sin npm; fences codigo e iswc-* (diagramas). | [docs](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/md-lite.md) |
| `resolveIswcFenceTag` | `helpers/md-iswc-fences.min.js` | Lang fence iswc-* -> tag de diagrama (flowchart, er, sequence, ...). | [docs](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/md-iswc-fences.md) |
| `hydrateMdEmbeds` | `helpers/md-hydrate.min.js` | L.ensure de tags presentes + upgrade .md-iswc-code -> iswc-code. | [docs](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/md-hydrate.md) |
| `md-editor-api` | `helpers/md-editor-api.min.js` | CRUD/normalizacion para iswc-md-editor (endpoints, fieldMap, token). | [docs](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/md-editor-api.md) |
| `IsResponseCache` | `helpers/response-cache.min.js` | SWR IndexedDB: vivo/leer/guardar/invalidar; no bloquea el pintado. | [docs](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/response-cache.md) |
| `sync-pins` | `scripts/sync-pins.mjs (repo)` | Tras commit del kit: propaga SHA a kit-pin / ISS / PIN (deno task sync:pins). | [docs](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/scripts/sync-pins.mjs) |

<!-- apis:fin -->

## Cómo construir un componente

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
| `<iswc-accordion-group>` | Cuando varios disclosures deben comportarse como un acordeón: uno abierto a la | [isp/accordion-group.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/isp/accordion-group.md) |
| `<iswc-block-layout>` | Cuando un bloque debe adaptarse a su propio ancho (paneles redimensionables, | [isp/block-layout.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/isp/block-layout.md) |
| `<iswc-btn-ref>` | FKs de catálogo (cliente, aplicación, tercero…) donde el usuario escribe la | [isp/btn-ref.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/isp/btn-ref.md) |
| `<iswc-catalogo-gen>` | Listados maestros ContaPyme con controller que implementa Lista + acciones | [isp/catalogo-gen.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/isp/catalogo-gen.md) |
| `<iswc-confirm-delete>` | Borrados irreversibles donde un clic de más cuesta caro. | [isp/confirm-delete.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/isp/confirm-delete.md) |
| `<iswc-flex-layout>` | Para filas y columnas de UI donde se quiere el layout en el markup, sin | [isp/flex-layout.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/isp/flex-layout.md) |
| `<iswc-flex-options>` | Fila de acciones (toolbar de árbol, tools de hover, menú compacto) cuyo | [isp/flex-options.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/isp/flex-options.md) |
| `<iswc-float-card>` | Tools de hover sobre una fila, chip o ancla que deben aparecer al lado sin | [isp/float-card.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/isp/float-card.md) |
| `<iswc-form>` | Formulario de ficha: cabecera, cuerpo scrolleable y pie Aceptar / Cancelar. | [isp/form.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/isp/form.md) |
| `<iswc-modal-verificacion>` | Verificaciones asíncronas de un registro antes de una acción (guardar, cerrar, | [isp/modal-verificacion.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/isp/modal-verificacion.md) |
| `<iswc-grid-layout>` | Para rejillas de tarjetas, formularios etiqueta/campo y cualquier estructura | [isp/grid-layout.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/isp/grid-layout.md) |
| `<iswc-heading>` | Para los encabezados de una vista cuando se quiere el color tintado de la | [isp/heading.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/isp/heading.md) |
| `<iswc-loading-overlay>` | Operaciones que el usuario NO debe poder interrumpir ni esquivar: guardar, | [isp/loading-overlay.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/isp/loading-overlay.md) |
| `<iswc-text>` | Para dar color semántico a un fragmento de texto, o para recortar contenido | [isp/text.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/isp/text.md) |
| `<iswc-tree-view>` | isp/tree-view-roles.md | [isp/tree-view-roles.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/isp/tree-view-roles.md) |

### actions

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<iswc-button>` | Acciones, selección de comandos y menús interactivos. | [actions/button.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/actions/button.md) |
| `<iswc-button-group>` | Acciones, selección de comandos y menús interactivos. | [actions/button-group.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/actions/button-group.md) |
| `<iswc-copy-button>` | Acciones, selección de comandos y menús interactivos. | [actions/copy-button.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/actions/copy-button.md) |
| `<iswc-share-button>` | Botón de compartir enlace, reporte o captura hacia WhatsApp, Mail, etc. | [actions/share-button.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/actions/share-button.md) |
| `<iswc-check-icon-button>` | Acciones, selección de comandos y menús interactivos. | [actions/check-icon-button.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/actions/check-icon-button.md) |
| `<iswc-dropdown>` | Acciones, selección de comandos y menús interactivos. | [actions/dropdown.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/actions/dropdown.md) |
| `<iswc-dropdown-item>` | Acciones, selección de comandos y menús interactivos. | [actions/dropdown-item.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/actions/dropdown-item.md) |
| `<iswc-fab>` | Acciones, selección de comandos y menús interactivos. | [actions/fab.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/actions/fab.md) |
| `<iswc-context-menu>` | Acciones, selección de comandos y menús interactivos. | [actions/context-menu.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/actions/context-menu.md) |
| `<iswc-speed-dial>` | Acciones, selección de comandos y menús interactivos. | [actions/speed-dial.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/actions/speed-dial.md) |
| `<iswc-speed-dial-action>` | Acción hija de <iswc-speed-dial>. | [actions/speed-dial-action.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/actions/speed-dial-action.md) |

### media

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<iswc-icon>` | Iconos, identidad visual y reproducción de video. | [media/icon.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/media/icon.md) |
| `<iswc-avatar>` | Iconos, identidad visual y reproducción de video. | [media/avatar.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/media/avatar.md) |
| `<iswc-theme-img>` | Una sola imagen que muestra la variante dark o light según el contenedor de tema del kit (misma cascada que <iswc-theme-toggle>). | [media/theme-img.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/media/theme-img.md) |
| `<iswc-video>` | Iconos, identidad visual y reproducción de video. | [media/video.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/media/video.md) |
| `<iswc-speech>` | Asistentes, dictado al campo, leer un resultado en voz alta. | [media/speech.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/media/speech.md) |
| `<iswc-media-recorder>` | Notas de voz, captura de pantalla, clip de webcam. | [media/media-recorder.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/media/media-recorder.md) |
| `<iswc-video-playlist>` | Iconos, identidad visual y reproducción de video. | [media/video-playlist.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/media/video-playlist.md) |
| `<iswc-barcode>` | Etiquetas de producto, tiquetes, remisiones: cualquier caso que necesite un | [media/barcode.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/media/barcode.md) |
| `<iswc-barcode-scanner>` | Inventario, escanear un QR de producto. | [media/barcode-scanner.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/media/barcode-scanner.md) |
| `<iswc-image-editor>` | Foto de perfil, logo de empresa, adjuntos que deban recortarse antes de | [media/image-editor.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/media/image-editor.md) |
| `<iswc-icon-explorer>` | Ver la guía del módulo antes de crear otro control. | — |
| `<iswc-qrcode>` | Enlaces cortos, datos de contacto, referencias de pago: cualquier carga que | [media/qrcode.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/media/qrcode.md) |

### feedback

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<iswc-spinner>` | Estado, progreso, confirmación, carga o resultado de operaciones. | [feedback/spinner.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/feedback/spinner.md) |
| `<iswc-badge>` | Estado, progreso, confirmación, carga o resultado de operaciones. | [feedback/badge.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/feedback/badge.md) |
| `<iswc-tag>` | Estado, progreso, confirmación, carga o resultado de operaciones. | [feedback/tag.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/feedback/tag.md) |
| `<iswc-skeleton>` | Estado, progreso, confirmación, carga o resultado de operaciones. | [feedback/skeleton.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/feedback/skeleton.md) |
| `<iswc-progress-bar>` | Estado, progreso, confirmación, carga o resultado de operaciones. | [feedback/progress-bar.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/feedback/progress-bar.md) |
| `<iswc-progress-ring>` | Estado, progreso, confirmación, carga o resultado de operaciones. | [feedback/progress-ring.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/feedback/progress-ring.md) |
| `<iswc-theme-toggle>` | Estado, progreso, confirmación, carga o resultado de operaciones. | [feedback/theme-toggle.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/feedback/theme-toggle.md) |
| `<iswc-prefs-clear>` | Auditoría UX/UI, demos, o un control de “restablecer paneles” en herramientas internas. | [feedback/prefs-clear.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/feedback/prefs-clear.md) |
| `<iswc-toast>` | Estado, progreso, confirmación, carga o resultado de operaciones. | [feedback/toast.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/feedback/toast.md) |
| `<iswc-toast-item>` | Estado, progreso, confirmación, carga o resultado de operaciones. | [feedback/toast-item.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/feedback/toast-item.md) |
| `<iswc-tooltip>` | Estado, progreso, confirmación, carga o resultado de operaciones. | [feedback/tooltip.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/feedback/tooltip.md) |
| `<iswc-cdn-snippet>` | Panel de consumo por CDN con una sola estrategia: loader.min.js. | [feedback/cdn-snippet.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/feedback/cdn-snippet.md) |
| `<iswc-popconfirm>` | Estado, progreso, confirmación, carga o resultado de operaciones. | [feedback/popconfirm.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/feedback/popconfirm.md) |
| `<iswc-confirm-modal>` | Cuando la acción es destructiva o irreversible y conviene detener al usuario: | [feedback/confirm-modal.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/feedback/confirm-modal.md) |
| `<iswc-palette-selector>` | Comunicar estado, contexto o cambios de apariencia al usuario. | [feedback/palette-selector.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/feedback/palette-selector.md) |

### layout

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<iswc-split-panel>` | Estructura, superficies, overlays y navegación por regiones de contenido. | [layout/split-panel.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/layout/split-panel.md) |
| `<iswc-main>` | Estructura, superficies, overlays y navegación por regiones de contenido. | [layout/main.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/layout/main.md) |
| `<iswc-card>` | Estructura, superficies, overlays y navegación por regiones de contenido. | [layout/card.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/layout/card.md) |
| `<iswc-callout>` | Estructura, superficies, overlays y navegación por regiones de contenido. | [layout/callout.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/layout/callout.md) |
| `<iswc-details>` | Estructura, superficies, overlays y navegación por regiones de contenido. | [layout/details.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/layout/details.md) |
| `<iswc-dialog>` | Estructura, superficies, overlays y navegación por regiones de contenido. | [layout/dialog.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/layout/dialog.md) |
| `<iswc-drawer>` | Estructura, superficies, overlays y navegación por regiones de contenido. | [layout/drawer.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/layout/drawer.md) |
| `<iswc-divider>` | Estructura, superficies, overlays y navegación por regiones de contenido. | [layout/divider.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/layout/divider.md) |
| `<iswc-scrollspy>` | Estructura, superficies, overlays y navegación por regiones de contenido. | [layout/scrollspy.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/layout/scrollspy.md) |
| `<iswc-demo>` | Caja de demostración de la galería. | [layout/demo.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/layout/demo.md) |
| `<iswc-dock>` | Barra compacta de accesos frecuentes (navegación secundaria, launcher de | [layout/dock.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/layout/dock.md) |
| `<iswc-dock-item>` | Ítem de <iswc-dock>. | [layout/dock-item.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/layout/dock-item.md) |

### helpers

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<iswc-popover>` | Formato, observación y posicionamiento reutilizable sobre APIs nativas. | [helpers/popover.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/popover.md) |
| `<iswc-ui>` | Primitivas de render para apps consumidoras del kit. | [helpers/ui.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/ui.md) |
| `<iswc-lightbox>` | Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos. | [diagrams/lightbox.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/lightbox.md) |
| `<iswc-relative-time>` | Formato, observación y posicionamiento reutilizable sobre APIs nativas. | [helpers/relative-time.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/relative-time.md) |
| `<iswc-format>` | Web Component genérico de formateo con Intl. | [helpers/format.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/format.md) |
| `<iswc-observer>` | Web Component genérico que envuelve IntersectionObserver, MutationObserver y ResizeObserver vía type. | [helpers/observer.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/observer.md) |
| `<iswc-wake-lock>` | Lectura, dashboard, receta paso a paso, vídeo. | [helpers/wake-lock.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/wake-lock.md) |
| `<iswc-offscreen-canvas>` | Pintar 2D/3D pesado sin congelar el hilo de UI. | [helpers/offscreen-canvas.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/offscreen-canvas.md) |
| `<iswc-format-date>` | Formato, observación y posicionamiento reutilizable sobre APIs nativas. | [helpers/format-date.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/format-date.md) |
| `<iswc-format-number>` | Formato, observación y posicionamiento reutilizable sobre APIs nativas. | [helpers/format-number.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/format-number.md) |
| `<iswc-format-bytes>` | Formato, observación y posicionamiento reutilizable sobre APIs nativas. | [helpers/format-bytes.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/format-bytes.md) |
| `<iswc-intersection-observer>` | Formato, observación y posicionamiento reutilizable sobre APIs nativas. | [helpers/intersection-observer.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/intersection-observer.md) |
| `<iswc-mutation-observer>` | Formato, observación y posicionamiento reutilizable sobre APIs nativas. | [helpers/mutation-observer.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/mutation-observer.md) |
| `<iswc-resize-observer>` | Formato, observación y posicionamiento reutilizable sobre APIs nativas. | [helpers/resize-observer.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/resize-observer.md) |
| `<iswc-md-render>` | - Mostrar un bloque MD embebido en una página o card. | [helpers/md-render.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/md-render.md) |
| `<iswc-md-editor>` | - Instrucciones/prompts con {{variables}} que hay que revisar o editar en un diálogo grande. | [helpers/md-editor.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/md-editor.md) |
| `<iswc-floating>` | Building block de posicionamiento anclado: coloca un panel respecto de un ancla resolviendo flip, shift, auto-size, flecha y hover bridge sobre _shared/position.js. | [helpers/floating.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/floating.md) |

### navigation

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<iswc-breadcrumb>` | Orientación, movimiento entre vistas y navegación jerárquica o secuencial. | [navigation/breadcrumb.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/navigation/breadcrumb.md) |
| `<iswc-breadcrumb-item>` | Orientación, movimiento entre vistas y navegación jerárquica o secuencial. | [navigation/breadcrumb-item.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/navigation/breadcrumb-item.md) |
| `<iswc-tab-group>` | Orientación, movimiento entre vistas y navegación jerárquica o secuencial. | [navigation/tab-group.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/navigation/tab-group.md) |
| `<iswc-tab>` | Orientación, movimiento entre vistas y navegación jerárquica o secuencial. | [navigation/tab-group.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/navigation/tab-group.md) |
| `<iswc-tab-panel>` | Orientación, movimiento entre vistas y navegación jerárquica o secuencial. | [navigation/tab-group.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/navigation/tab-group.md) |
| `<iswc-scroller>` | Orientación, movimiento entre vistas y navegación jerárquica o secuencial. | [navigation/scroller.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/navigation/scroller.md) |
| `<iswc-carousel>` | Orientación, movimiento entre vistas y navegación jerárquica o secuencial. | [navigation/carousel.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/navigation/carousel.md) |
| `<iswc-carousel-item>` | Lámina de <iswc-carousel>. | [navigation/carousel-item.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/navigation/carousel-item.md) |
| `<iswc-tree>` | Orientación, movimiento entre vistas y navegación jerárquica o secuencial. | [navigation/tree.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/navigation/tree.md) |
| `<iswc-tree-item>` | Nodo de <iswc-tree>. | [navigation/tree-item.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/navigation/tree-item.md) |
| `<iswc-stepper>` | Orientación, movimiento entre vistas y navegación jerárquica o secuencial. | [navigation/stepper.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/navigation/stepper.md) |
| `<iswc-stepper-step>` | Paso de <iswc-stepper>. | [navigation/stepper-step.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/navigation/stepper-step.md) |
| `<iswc-mega-menu>` | Cabeceras con muchas secciones que no caben en un dropdown de una columna. | [navigation/mega-menu.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/navigation/mega-menu.md) |

### forms

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<iswc-combobox>` | Captura, selección y validación de valores compatibles con formularios. | [forms/combobox.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/combobox.md) |
| `<iswc-option>` | Captura, selección y validación de valores compatibles con formularios. | [forms/option.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/option.md) |
| `<iswc-checkbox>` | Captura, selección y validación de valores compatibles con formularios. | [forms/checkbox.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/checkbox.md) |
| `<iswc-switch>` | Captura, selección y validación de valores compatibles con formularios. | [forms/switch.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/switch.md) |
| `<iswc-radio-group>` | Captura, selección y validación de valores compatibles con formularios. | [forms/radio-group.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/radio-group.md) |
| `<iswc-radio>` | Captura, selección y validación de valores compatibles con formularios. | [forms/radio.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/radio.md) |
| `<iswc-input>` | Captura, selección y validación de valores compatibles con formularios. | [forms/input.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/input.md) |
| `<iswc-textarea>` | Captura, selección y validación de valores compatibles con formularios. | [forms/textarea.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/textarea.md) |
| `<iswc-slider>` | Captura, selección y validación de valores compatibles con formularios. | [forms/slider.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/slider.md) |
| `<iswc-rating>` | Captura, selección y validación de valores compatibles con formularios. | [forms/rating.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/rating.md) |
| `<iswc-select>` | Captura, selección y validación de valores compatibles con formularios. | [forms/select.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/select.md) |
| `<iswc-color-picker>` | Captura, selección y validación de valores compatibles con formularios. | [forms/color-picker.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/color-picker.md) |
| `<iswc-file-input>` | Captura, selección y validación de valores compatibles con formularios. | [forms/file-input.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/file-input.md) |
| `<iswc-date-picker>` | Captura, selección y validación de valores compatibles con formularios. | [forms/date-picker.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/date-picker.md) |
| `<iswc-month-calendar>` | Captura, selección y validación de valores compatibles con formularios. | [forms/month-calendar.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/month-calendar.md) |
| `<iswc-year-calendar>` | Captura, selección y validación de valores compatibles con formularios. | [forms/year-calendar.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/year-calendar.md) |
| `<iswc-date-range-picker>` | Captura, selección y validación de valores compatibles con formularios. | [forms/date-range-picker.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/date-range-picker.md) |
| `<iswc-time-clock>` | Captura, selección y validación de valores compatibles con formularios. | [forms/time-clock.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/time-clock.md) |
| `<iswc-digital-clock>` | Captura, selección y validación de valores compatibles con formularios. | [forms/digital-clock.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/digital-clock.md) |
| `<iswc-date-field>` | Captura, selección y validación de valores compatibles con formularios. | [forms/date-field.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/date-field.md) |
| `<iswc-time-field>` | Captura, selección y validación de valores compatibles con formularios. | [forms/time-field.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/time-field.md) |
| `<iswc-date-time-field>` | Captura, selección y validación de valores compatibles con formularios. | [forms/date-time-field.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/date-time-field.md) |
| `<iswc-date-input>` | Captura, selección y validación de valores compatibles con formularios. | [forms/date-input.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/date-input.md) |
| `<iswc-time-input>` | Captura, selección y validación de valores compatibles con formularios. | [forms/time-input.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/time-input.md) |
| `<iswc-date-time-input>` | Captura, selección y validación de valores compatibles con formularios. | [forms/date-time-input.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/date-time-input.md) |
| `<iswc-date-range-input>` | Captura, selección y validación de valores compatibles con formularios. | [forms/date-range-input.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/date-range-input.md) |
| `<iswc-pin-input>` | Captura, selección y validación de valores compatibles con formularios. | [forms/pin-input.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/pin-input.md) |
| `<iswc-masked-input>` | Entrada de texto con formato fijo y verificable carácter a carácter. | [forms/masked-input.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/masked-input.md) |
| `<iswc-inline-edit>` | Editar un campo suelto dentro de una vista de lectura (título de documento, | [forms/inline-edit.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/inline-edit.md) |
| `<iswc-mention>` | Comentarios, notas y descripciones donde el usuario menciona personas o | [forms/mention.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/mention.md) |
| `<iswc-duration-picker>` | Capturar una duración (tiempo trabajado, tiempo estimado, temporizador), no | [forms/duration-picker.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/duration-picker.md) |
| `<iswc-dropzone>` | Para adjuntar varios archivos con retroalimentación visual: soportes de una | [forms/dropzone.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/dropzone.md) |
| `<iswc-full-calendar>` | Mostrar y navegar una agenda: reservas, vencimientos, programación de tareas. | [forms/full-calendar.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/full-calendar.md) |
| `<iswc-signature>` | Capturar una firma o un trazo libre para adjuntarlo a un documento | [forms/signature.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/signature.md) |
| `<iswc-rte>` | Capturar contenido con formato (notas, descripciones, plantillas de correo) | [forms/rte.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/rte.md) |
| `<iswc-doc-editor>` | Cuando el usuario necesita redactar contenido estructurado y libre — | [forms/doc-editor.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/doc-editor.md) |

### code

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<iswc-code>` | - Editar o revisar snippets HTML/CSS/JS/TS/JSX/Python en la UI. | [code/code.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/code/code.md) |

### data

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<iswc-data-grid>` | Presentación, comparación, movimiento u organización de datos estructurados. | [data/data-grid.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/data/data-grid.md) |
| `<iswc-stat>` | Presentación, comparación, movimiento u organización de datos estructurados. | [data/stat.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/data/stat.md) |
| `<iswc-transfer>` | Presentación, comparación, movimiento u organización de datos estructurados. | [data/transfer.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/data/transfer.md) |
| `<iswc-transfer-item>` | Ítem de <iswc-transfer>. | [data/transfer-item.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/data/transfer-item.md) |
| `<iswc-kanban>` | Presentación, comparación, movimiento u organización de datos estructurados. | [data/kanban.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/data/kanban.md) |
| `<iswc-kanban-column>` | Columna de <iswc-kanban>. | [data/kanban-column.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/data/kanban-column.md) |
| `<iswc-kanban-card>` | Tarjeta de <iswc-kanban>. | [data/kanban-card.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/data/kanban-card.md) |
| `<iswc-pivot-table>` | - Cruzar dos dimensiones de un mismo conjunto de datos (ventas por vendedor × | [data/pivot-table.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/data/pivot-table.md) |
| `<iswc-spreadsheet>` | - Capturas rápidas de datos tabulares donde el usuario espera comportarse como | [data/spreadsheet.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/data/spreadsheet.md) |
| `<iswc-ag-grid>` | Grillas densas con reorder/resize/pin/hide, filtros por columna, sidebar de columnas y estado | [data/ag-grid.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/data/ag-grid.md) |

### data-viz

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<iswc-chart>` | Series, distribuciones, relaciones o jerarquías de datos. | [charts/chart.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/charts/chart.md) |
| `<iswc-bar-chart>` | Series, distribuciones, relaciones o jerarquías de datos — cuando el tipo | [charts/bar-chart.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/charts/bar-chart.md) |
| `<iswc-line-chart>` | Series, distribuciones, relaciones o jerarquías de datos — cuando el tipo | [charts/line-chart.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/charts/line-chart.md) |
| `<iswc-pie-chart>` | Series, distribuciones, relaciones o jerarquías de datos — cuando el tipo | [charts/pie-chart.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/charts/pie-chart.md) |
| `<iswc-doughnut-chart>` | Series, distribuciones, relaciones o jerarquías de datos — cuando el tipo | [charts/doughnut-chart.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/charts/doughnut-chart.md) |
| `<iswc-radar-chart>` | Series, distribuciones, relaciones o jerarquías de datos — cuando el tipo | [charts/radar-chart.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/charts/radar-chart.md) |
| `<iswc-polar-area-chart>` | Series, distribuciones, relaciones o jerarquías de datos — cuando el tipo | [charts/polar-area-chart.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/charts/polar-area-chart.md) |
| `<iswc-scatter-chart>` | Series, distribuciones, relaciones o jerarquías de datos — cuando el tipo | [charts/scatter-chart.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/charts/scatter-chart.md) |
| `<iswc-bubble-chart>` | Series, distribuciones, relaciones o jerarquías de datos — cuando el tipo | [charts/bubble-chart.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/charts/bubble-chart.md) |
| `<iswc-sparkline>` | Series, distribuciones, relaciones o jerarquías de datos. | [charts/sparkline.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/charts/sparkline.md) |
| `<iswc-waterfall-chart>` | Series, distribuciones, relaciones o jerarquías de datos — cuando el tipo | [charts/waterfall-chart.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/charts/waterfall-chart.md) |
| `<iswc-funnel-chart>` | Series, distribuciones, relaciones o jerarquías de datos — cuando el tipo | [charts/funnel-chart.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/charts/funnel-chart.md) |
| `<iswc-treemap>` | Series, distribuciones, relaciones o jerarquías de datos. | [charts/treemap.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/charts/treemap.md) |
| `<iswc-gauge>` | Presentación, comparación, movimiento u organización de datos estructurados. | [data/gauge.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/data/gauge.md) |
| `<iswc-heatmap>` | Cuando hay que comparar una magnitud sobre dos dimensiones categóricas al | [data-viz/heatmap.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/data-viz/heatmap.md) |
| `<iswc-maps>` | - Ubicar puntos propios sobre un lienzo ligero: sucursales, bodegas, | [data-viz/maps.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/data-viz/maps.md) |
| `<iswc-map-marker>` | Marcador de <iswc-maps>. | [data-viz/map-marker.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/data-viz/map-marker.md) |

### diagrams

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<iswc-flowchart>` | Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos. | [diagrams/flowchart.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/flowchart.md) |
| `<iswc-sequence-diagram>` | Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos. | [diagrams/sequence-diagram.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/sequence-diagram.md) |
| `<iswc-diagram-lightbox>` | Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos. | [diagrams/diagram-lightbox.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/diagram-lightbox.md) |
| `<iswc-class-diagram>` | Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos. | [diagrams/class-diagram.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/class-diagram.md) |
| `<iswc-state-diagram>` | Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos. | [diagrams/state-diagram.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/state-diagram.md) |
| `<iswc-er-diagram>` | Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos. | [diagrams/er-diagram.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/er-diagram.md) |
| `<iswc-er-editor>` | Editor visual del diagrama entidad-relación. | [diagrams/er-editor.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/er-editor.md) |
| `<iswc-diagram-view-app>` | Abrir cualquier diagrama del kit por enlace, en solo vista o en edición, sin reimplementar el visor. | [diagrams/diagram-studio.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/diagram-studio.md) |
| `<iswc-diagram-edit-app>` | Abrir cualquier diagrama del kit por enlace, en solo vista o en edición, sin reimplementar el visor. | [diagrams/diagram-studio.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/diagram-studio.md) |
| `<iswc-block-diagram>` | Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos. | [diagrams/block-diagram.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/block-diagram.md) |
| `<iswc-component-diagram>` | Cuando necesitas describir la arquitectura de un sistema (servicios, | [diagrams/component-diagram.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/component-diagram.md) |
| `<iswc-mindmap>` | Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos. | [diagrams/mindmap.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/mindmap.md) |
| `<iswc-gantt>` | Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos. | [diagrams/gantt.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/gantt.md) |
| `<iswc-timeline>` | Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos. | [diagrams/timeline.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/timeline.md) |
| `<iswc-org-chart>` | Estructuras de mando o pertenencia: áreas de la empresa, jerarquía de cuentas, | [diagrams/org-chart.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/org-chart.md) |
| `<iswc-sankey-diagram>` | Cuando el mensaje es cuánto se reparte entre caminos: esfuerzo por | [diagrams/sankey-diagram.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/sankey-diagram.md) |
| `<iswc-quadrant-chart>` | Priorización y comparación de opciones: impacto contra esfuerzo, costo | [diagrams/quadrant-chart.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/quadrant-chart.md) |
| `<iswc-venn-diagram>` | Cuando el mensaje es solape: alcance pedido contra alcance entregado, | [diagrams/venn-diagram.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/venn-diagram.md) |
| `<iswc-use-case-diagram>` | Cuando la pregunta es de alcance: qué puede hacer cada rol dentro de un | [diagrams/use-case-diagram.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/use-case-diagram.md) |
| `<iswc-swimlane-diagram>` | Cuando el proceso cruza varias áreas y lo importante es quién hace cada | [diagrams/swimlane-diagram.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/swimlane-diagram.md) |
| `<iswc-journey-map>` | Cuando además del orden hay una medida por paso: dónde se cae la | [diagrams/journey-map.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/journey-map.md) |

### overlays

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<iswc-command-palette>` | Paleta de comandos, visor de documentos y ventanas flotantes. | [overlays/command-palette.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/overlays/command-palette.md) |
| `<iswc-pdf-viewer>` | Paleta de comandos, visor de documentos y ventanas flotantes. | [overlays/pdf-viewer.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/overlays/pdf-viewer.md) |
| `<iswc-window>` | Paleta de comandos, visor de documentos y ventanas flotantes. | [overlays/window.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/overlays/window.md) |

### preview

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<iswc-preview-component>` | Shell de la galería. | [layout/preview-component.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/layout/preview-component.md) |
| `<iswc-preview-controls>` | Panel de controles del playground. | [layout/preview-controls.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/layout/preview-controls.md) |

<!-- catalogo:fin -->
