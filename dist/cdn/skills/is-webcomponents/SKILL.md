---
name: is-webcomponents
description: >-
  Obliga a reusar el kit is-* (Jeff-Aporta/is-webcomponents) al fundar o extender
  apps de web components sin framework. Usar cuando hay CDN loader.min.js / is-base /
  palettes, tags is-button is-dialog is-data-grid is-chart is-icon, apps tipo
  frontend-webcomponents / tk-*, migraciones desde React/MUI/Svelte, o cuando se
  pueda reinventar UI que ya existe en el catálogo de este archivo.
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
| [`/is-webcomponents:build`](tools/build.md) | Fundar o extender una app con `is-*` por CDN (o local). |
| [`/is-webcomponents:migrate`](tools/migrate.md) | Convertir un frontend con framework (React/MUI/Svelte/…) a vanilla + `is-*`. |
| [`/is-webcomponents:local`](tools/local.md) | Vendorizar el kit y bootear local-first, con CDN como fallback. |

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

Inventario de intención: [catalog.md](catalog.md) · Mapa intención a componente: [reference.md](reference.md).
App de referencia: apps consumidoras vanilla (`tk-*` sobre `is-*`), por ejemplo jagudeloe/frontend-webcomponents.

## Regla de reuso

**Nada se reimplementa si el kit ya lo resuelve.** Antes de escribir HTML, CSS o JS
propio para botones, formularios, tablas, charts, toasts, diálogos, iconos, layouts o diagramas:

1. Clasificar la intención (categoría).
2. Buscar el tag en el catálogo de esta skill.
3. Abrir la guía del módulo y confirmar la API. No inventar props ni eventos.
4. Usar el tag `is-*`. Solo crear componentes de dominio (`tk-*`, `app-*`) que **traduzcan datos** al kit.

Si no hay tag exacto, usar el más cercano. Solo entonces un primitivo nativo o un wrapper mínimo.

## Diagramas por enlace

Cada diagrama tiene visor y editor como app, con el mismo parámetro.

| Modo | Página |
| --- | --- |
| Solo vista | `demos/diagramas/app/view.html?kind=<kind>&json=<base64url>` |
| Edición | `demos/diagramas/app/edit.html?kind=<kind>&json=<base64url>` |

`kind` es uno de: `flowchart`, `sequence`, `class`, `state`, `er`, `block`, `component`, `mindmap`, `gantt`, `timeline`, `org-chart`, `sankey`, `quadrant`, `venn`, `usecase`, `swimlane`, `journey`.

`json` es el documento completo del diagrama en base64url. Se lee al abrir. Editar no reescribe la dirección: **Compartir** copia un enlace nuevo con el JSON resultante, y **Recuperar JSON** devuelve el documento actual. El editor visual dedicado hoy es `<is-er-editor>`; el resto se edita con el JSON en vivo sobre el visor del mismo `kind`.

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
    await L.load("is-toast");
  </script>
</head>
<body>
  <is-toast placement="bottom-end"></is-toast>
</body>
</html>
```

- CSS de documento: `loadCSSBase` + `loadCSSPalettesDefault`. El CSS de cada `is-*` lo carga el propio tag.
- Cargar solo los tags de la vista. `load('actions')` expande a cada `.min.js` de la categoría (no hay bundle). `load('all')` pide todos los tags, no un archivo único.
- Tema: `data-theme` / `data-palette` en `<html>`. Tokens: `--is-text`, `--is-bg`, `--is-border`, `--is-accent`, etc.
- Si la app prefiere no depender de red: usar [`/is-webcomponents:local`](tools/local.md) (vendoriza JS y CSS, arranque local con fallback a CDN).

## Arquitectura de apps (patrón jagudeloe / r2admin)

| Capa | Prefijo | Responsabilidad |
| --- | --- | --- |
| Kit | `is-*` | UI genérica del CDN |
| Dominio | `tk-*` / `app-*` | Traducir payload a `is-*` |
| Shell | `*-app`, `*-nav`, `*-view` | Orquestación, routing, datos |

### CSS de dominio (igual que el kit)

Cada `app-*` / `tk-*` lleva **JS y CSS hermanos**. No van embebidos en el TS.

1. Fuente: `app-files.ts` + `app-files.css`
2. Build: minifica a `dist/cdn/app-files.js` + `dist/cdn/app-files.css`
3. Runtime: `IsUi.adoptCss(shadow, import.meta.url)` (la misma idea que `_shared/adopt-css.js`)

Tras vaciar el shadow, vuelve a llamar `adoptCss` (los `<link>` se borran con el contenido).

`IsUi.css(shadow, cssText)` queda solo para prototipos sin archivo hermano.

Docs: [helpers/ui.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/helpers/ui.md).

## Prohibido / eliminado

- **`is-popup`**: eliminado. No existe alias ni registro. Para paneles anclados usa **`<is-popover>`**. Tooltips: **`<is-tooltip>`**.
- **`is-floating`**: building block **interno** (no es API de producto). No usarlo en apps. El posicionamiento público es `<is-popover>` y `<is-tooltip>`.
- No hay componentes deprecados en el catálogo público: si la guía dice `status: internal`, no es API.
- `npm` / `npx` / `yarn` / `pnpm` / `bun` / `vite` / `webpack` **para consumir el kit**.

## Lectura de docs (ruta obligatoria)

1. Esta skill (índice y resumen de cada tag).
2. Guía del módulo: `src/components/<carpeta>/<modulo>.md`.
3. Si la API no está en la guía, no inventarla. La fuente solo confirma el contrato escrito.

Base raw: `https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/`

## Convenciones al componer

- Escala: `style="font-size: …em"` / CSS del wrapper. El kit no usa un atributo `size` suelto.
- Iconos: `<is-icon icon="familia:icono">` (por ejemplo `mdi:check`).
- Formularios: form-associated del kit. No envolver `<input>` nativos si existe `is-input`.
- Overlays posicionados: `<is-popover>` / `<is-tooltip>`. No reinventar floating UI ni usar `is-popup`.
- Charts y diagramas: payloads declarativos de la guía del módulo. Para abrir uno ya armado, la app `?json=`.
- Listeners en `document` o `window`: solo en `connectedCallback`, y quitarlos en `disconnectedCallback`.
- Estados por atributo del host en CSS propio: `:host([attr])` en el nivel superior (nunca `&[attr]` dentro de `:host { }`).

## Qué no hacer

- Reimplementar botón, modal, tabla, toast, tag, skeleton, spinner, tree, tabs, stepper o chart.
- Traer MUI, React, Iconify o Chart.js directo cuando el kit cubre el caso (si vienes de uno de estos, ver [`/is-webcomponents:migrate`](tools/migrate.md)).
- Usar o documentar `is-popup` (eliminado).
- Meter CSS de un componente del kit en el `<head>` (solo tema y paletas).
- Meter el CSS del wrapper de dominio como string dentro del `.ts` (usar el `.css` hermano y `adoptCss`).
- Inventar props o `data-*` que la guía no documenta.
- Usar APIs ad hoc fuera del contrato de la guía.
- Crear un `tk-*` que pinte UI genérica en vez de delegar a `is-*`.
- Asumir submit nativo de `<is-button type="submit">` en forms de light DOM sin el cableado del kit (`requestSubmit`).
- Usar `is-split-panel` con un porcentaje alto como sidebar fijo de app (preferir grid CSS).
- Buscar fuentes del kit en la raíz del repo (`components/`, `styles/`): viven en **`src/`**.
- Lógica de preview como string o `eval`: en el kit, `ISComponentPreview.mount()` más el registry.
- Ignorar `tests/` en git: los `*.test.mjs` se commitean (solo los artefactos van en gitignore).
- Usar `npm`, `npx` o un bundler para instalar o servir el kit en la app consumidora.

## Kit: carta de leyes

Antes de cambiar el repo del kit, leer [`specs/lessons.md`](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/specs/lessons.md). Guardianes: `node tests/llm-contract.test.ts` y el resto de `tests/*.test.mjs`.

## Checklist pre-entrega

- [ ] Cada control visual mapea a un `is-*` existente (o hay una justificación explícita de que no existe).
- [ ] Guía del módulo leída; props y eventos según ese MD.
- [ ] Iconos vía `is-icon`.
- [ ] Tema y paleta con tokens `--is-*`.
- [ ] Los wrappers de dominio solo traducen datos al kit.
- [ ] CDN: SHA fijado (`{{SHA}}` resuelto), o `@main` si el proyecto sigue la punta, o copia local vía `/is-webcomponents:local`.
- [ ] CSS de dominio en archivo hermano + `adoptCss` (no un `const CSS` gigante en el JS).
- [ ] El build de la app emite `.css` minificado junto al `.js` en `dist/cdn`.
- [ ] Sin `npm install`, `npx` ni bundler para el kit.

## Fundar o migrar una app

- **App nueva o extender una existente:** seguir [`/is-webcomponents:build`](tools/build.md).
- **Migrar desde React, MUI, Svelte u otro framework:** seguir [`/is-webcomponents:migrate`](tools/migrate.md).
- **Servir el kit sin depender de CDN en runtime:** seguir [`/is-webcomponents:local`](tools/local.md).

Resumen de fundación: HTML con bootstrap CDN, `data-theme` y `data-palette`, shell mínimo (`is-main`, `is-split-panel` o `is-drawer`), `<is-toast>` global, y capas de dominio que solo mapean datos a tags del kit. Un componente de dominio por concepto de negocio, y cero UI genérica duplicada.

## Catálogo de componentes

índice para agentes. Cada fila es un tag que ya existe: abre la guía y reutilízalo. No reimplementes la fila.

<!-- catalogo:inicio -->

Cada `.min.js` enlaza la guía de su fila y esta skill.

### isp

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<is-accordion-group>` | Cuando varios disclosures deben comportarse como un acordeón: uno abierto a la | [isp/accordion-group.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/isp/accordion-group.md) |
| `<is-block-layout>` | Cuando un bloque debe adaptarse a su propio ancho (paneles redimensionables, | [isp/block-layout.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/isp/block-layout.md) |
| `<is-btn-ref>` | FKs de catálogo (cliente, aplicación, tercero…) donde el usuario escribe la | [isp/btn-ref.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/isp/btn-ref.md) |
| `<is-catalogo-gen>` | Listados maestros ContaPyme con controller que implementa Lista + acciones | [isp/catalogo-gen.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/isp/catalogo-gen.md) |
| `<is-confirm-delete>` | Borrados irreversibles donde un clic de más cuesta caro. | [isp/confirm-delete.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/isp/confirm-delete.md) |
| `<is-flex-layout>` | Para filas y columnas de UI donde se quiere el layout en el markup, sin | [isp/flex-layout.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/isp/flex-layout.md) |
| `<is-flex-options>` | Fila de acciones (toolbar de árbol, tools de hover, menú compacto) cuyo | [isp/flex-options.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/isp/flex-options.md) |
| `<is-float-card>` | Tools de hover sobre una fila, chip o ancla que deben aparecer al lado sin | [isp/float-card.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/isp/float-card.md) |
| `<is-form>` | Formulario de ficha: cabecera, cuerpo scrolleable y pie Aceptar / Cancelar. | [isp/form.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/isp/form.md) |
| `<is-modal-verificacion>` | Verificaciones asíncronas de un registro antes de una acción (guardar, cerrar, | [isp/modal-verificacion.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/isp/modal-verificacion.md) |
| `<is-grid-layout>` | Para rejillas de tarjetas, formularios etiqueta/campo y cualquier estructura | [isp/grid-layout.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/isp/grid-layout.md) |
| `<is-heading>` | Para los encabezados de una vista cuando se quiere el color tintado de la | [isp/heading.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/isp/heading.md) |
| `<is-loading-overlay>` | Operaciones que el usuario NO debe poder interrumpir ni esquivar: guardar, | [isp/loading-overlay.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/isp/loading-overlay.md) |
| `<is-text>` | Para dar color semántico a un fragmento de texto, o para recortar contenido | [isp/text.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/isp/text.md) |
| `<is-tree-view>` | isp/tree-view-roles.md | [isp/tree-view-roles.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/isp/tree-view-roles.md) |

### actions

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<is-button>` | Acciones, selección de comandos y menús interactivos. | [actions/button.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/actions/button.md) |
| `<is-button-group>` | Acciones, selección de comandos y menús interactivos. | [actions/button-group.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/actions/button-group.md) |
| `<is-copy-button>` | Acciones, selección de comandos y menús interactivos. | [actions/copy-button.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/actions/copy-button.md) |
| `<is-share-button>` | Botón de compartir enlace, reporte o captura hacia WhatsApp, Mail, etc. | [actions/share-button.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/actions/share-button.md) |
| `<is-check-icon-button>` | Acciones, selección de comandos y menús interactivos. | [actions/check-icon-button.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/actions/check-icon-button.md) |
| `<is-dropdown>` | Acciones, selección de comandos y menús interactivos. | [actions/dropdown.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/actions/dropdown.md) |
| `<is-dropdown-item>` | Acciones, selección de comandos y menús interactivos. | [actions/dropdown-item.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/actions/dropdown-item.md) |
| `<is-fab>` | Acciones, selección de comandos y menús interactivos. | [actions/fab.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/actions/fab.md) |
| `<is-context-menu>` | Acciones, selección de comandos y menús interactivos. | [actions/context-menu.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/actions/context-menu.md) |
| `<is-speed-dial>` | Acciones, selección de comandos y menús interactivos. | [actions/speed-dial.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/actions/speed-dial.md) |
| `<is-speed-dial-action>` | Acción hija de <is-speed-dial>. | [actions/speed-dial-action.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/actions/speed-dial-action.md) |

### media

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<is-icon>` | Iconos, identidad visual y reproducción de video. | [media/icon.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/media/icon.md) |
| `<is-avatar>` | Iconos, identidad visual y reproducción de video. | [media/avatar.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/media/avatar.md) |
| `<is-theme-img>` | Una sola imagen que muestra la variante dark o light según el contenedor de tema del kit (misma cascada que <is-theme-toggle>). | [media/theme-img.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/media/theme-img.md) |
| `<is-video>` | Iconos, identidad visual y reproducción de video. | [media/video.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/media/video.md) |
| `<is-speech>` | Asistentes, dictado al campo, leer un resultado en voz alta. | [media/speech.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/media/speech.md) |
| `<is-media-recorder>` | Notas de voz, captura de pantalla, clip de webcam. | [media/media-recorder.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/media/media-recorder.md) |
| `<is-video-playlist>` | Iconos, identidad visual y reproducción de video. | [media/video-playlist.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/media/video-playlist.md) |
| `<is-barcode>` | Etiquetas de producto, tiquetes, remisiones: cualquier caso que necesite un | [media/barcode.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/media/barcode.md) |
| `<is-barcode-scanner>` | Inventario, escanear un QR de producto. | [media/barcode-scanner.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/media/barcode-scanner.md) |
| `<is-image-editor>` | Foto de perfil, logo de empresa, adjuntos que deban recortarse antes de | [media/image-editor.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/media/image-editor.md) |
| `<is-icon-explorer>` | Ver la guía del módulo antes de crear otro control. | — |
| `<is-qrcode>` | Enlaces cortos, datos de contacto, referencias de pago: cualquier carga que | [media/qrcode.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/media/qrcode.md) |

### feedback

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<is-spinner>` | Estado, progreso, confirmación, carga o resultado de operaciones. | [feedback/spinner.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/feedback/spinner.md) |
| `<is-badge>` | Estado, progreso, confirmación, carga o resultado de operaciones. | [feedback/badge.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/feedback/badge.md) |
| `<is-tag>` | Estado, progreso, confirmación, carga o resultado de operaciones. | [feedback/tag.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/feedback/tag.md) |
| `<is-skeleton>` | Estado, progreso, confirmación, carga o resultado de operaciones. | [feedback/skeleton.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/feedback/skeleton.md) |
| `<is-progress-bar>` | Estado, progreso, confirmación, carga o resultado de operaciones. | [feedback/progress-bar.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/feedback/progress-bar.md) |
| `<is-progress-ring>` | Estado, progreso, confirmación, carga o resultado de operaciones. | [feedback/progress-ring.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/feedback/progress-ring.md) |
| `<is-theme-toggle>` | Estado, progreso, confirmación, carga o resultado de operaciones. | [feedback/theme-toggle.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/feedback/theme-toggle.md) |
| `<is-prefs-clear>` | Auditoría UX/UI, demos, o un control de “restablecer paneles” en herramientas internas. | [feedback/prefs-clear.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/feedback/prefs-clear.md) |
| `<is-toast>` | Estado, progreso, confirmación, carga o resultado de operaciones. | [feedback/toast.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/feedback/toast.md) |
| `<is-toast-item>` | Estado, progreso, confirmación, carga o resultado de operaciones. | [feedback/toast-item.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/feedback/toast-item.md) |
| `<is-tooltip>` | Estado, progreso, confirmación, carga o resultado de operaciones. | [feedback/tooltip.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/feedback/tooltip.md) |
| `<is-cdn-snippet>` | Panel de consumo por CDN con una sola estrategia: loader.min.js. | [feedback/cdn-snippet.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/feedback/cdn-snippet.md) |
| `<is-popconfirm>` | Estado, progreso, confirmación, carga o resultado de operaciones. | [feedback/popconfirm.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/feedback/popconfirm.md) |
| `<is-confirm-modal>` | Cuando la acción es destructiva o irreversible y conviene detener al usuario: | [feedback/confirm-modal.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/feedback/confirm-modal.md) |
| `<is-palette-selector>` | Comunicar estado, contexto o cambios de apariencia al usuario. | [feedback/palette-selector.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/feedback/palette-selector.md) |

### layout

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<is-split-panel>` | Estructura, superficies, overlays y navegación por regiones de contenido. | [layout/split-panel.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/layout/split-panel.md) |
| `<is-main>` | Estructura, superficies, overlays y navegación por regiones de contenido. | [layout/main.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/layout/main.md) |
| `<is-card>` | Estructura, superficies, overlays y navegación por regiones de contenido. | [layout/card.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/layout/card.md) |
| `<is-callout>` | Estructura, superficies, overlays y navegación por regiones de contenido. | [layout/callout.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/layout/callout.md) |
| `<is-details>` | Estructura, superficies, overlays y navegación por regiones de contenido. | [layout/details.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/layout/details.md) |
| `<is-dialog>` | Estructura, superficies, overlays y navegación por regiones de contenido. | [layout/dialog.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/layout/dialog.md) |
| `<is-drawer>` | Estructura, superficies, overlays y navegación por regiones de contenido. | [layout/drawer.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/layout/drawer.md) |
| `<is-divider>` | Estructura, superficies, overlays y navegación por regiones de contenido. | [layout/divider.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/layout/divider.md) |
| `<is-scrollspy>` | Estructura, superficies, overlays y navegación por regiones de contenido. | [layout/scrollspy.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/layout/scrollspy.md) |
| `<is-demo>` | Caja de demostración de la galería. | [layout/demo.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/layout/demo.md) |
| `<is-dock>` | Barra compacta de accesos frecuentes (navegación secundaria, launcher de | [layout/dock.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/layout/dock.md) |
| `<is-dock-item>` | Ítem de <is-dock>. | [layout/dock-item.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/layout/dock-item.md) |

### helpers

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<is-popover>` | Formato, observación y posicionamiento reutilizable sobre APIs nativas. | [helpers/popover.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/popover.md) |
| `<is-ui>` | Primitivas de render para apps consumidoras del kit. | [helpers/ui.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/ui.md) |
| `<is-lightbox>` | Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos. | [diagrams/lightbox.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/lightbox.md) |
| `<is-relative-time>` | Formato, observación y posicionamiento reutilizable sobre APIs nativas. | [helpers/relative-time.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/relative-time.md) |
| `<is-format>` | Web Component genérico de formateo con Intl. | [helpers/format.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/format.md) |
| `<is-observer>` | Web Component genérico que envuelve IntersectionObserver, MutationObserver y ResizeObserver vía type. | [helpers/observer.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/observer.md) |
| `<is-wake-lock>` | Lectura, dashboard, receta paso a paso, vídeo. | [helpers/wake-lock.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/wake-lock.md) |
| `<is-offscreen-canvas>` | Pintar 2D/3D pesado sin congelar el hilo de UI. | [helpers/offscreen-canvas.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/offscreen-canvas.md) |
| `<is-format-date>` | Formato, observación y posicionamiento reutilizable sobre APIs nativas. | [helpers/format-date.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/format-date.md) |
| `<is-format-number>` | Formato, observación y posicionamiento reutilizable sobre APIs nativas. | [helpers/format-number.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/format-number.md) |
| `<is-format-bytes>` | Formato, observación y posicionamiento reutilizable sobre APIs nativas. | [helpers/format-bytes.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/format-bytes.md) |
| `<is-intersection-observer>` | Formato, observación y posicionamiento reutilizable sobre APIs nativas. | [helpers/intersection-observer.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/intersection-observer.md) |
| `<is-mutation-observer>` | Formato, observación y posicionamiento reutilizable sobre APIs nativas. | [helpers/mutation-observer.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/mutation-observer.md) |
| `<is-resize-observer>` | Formato, observación y posicionamiento reutilizable sobre APIs nativas. | [helpers/resize-observer.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/resize-observer.md) |
| `<is-md-render>` | - Mostrar un bloque MD embebido en una página o card. | [helpers/md-render.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/md-render.md) |
| `<is-md-editor>` | - Instrucciones/prompts con {{variables}} que hay que revisar o editar en un diálogo grande. | [helpers/md-editor.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/md-editor.md) |
| `<is-floating>` | Building block de posicionamiento anclado: coloca un panel respecto de un ancla resolviendo flip, shift, auto-size, flecha y hover bridge sobre _shared/position.js. | [helpers/floating.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/floating.md) |

### navigation

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<is-breadcrumb>` | Orientación, movimiento entre vistas y navegación jerárquica o secuencial. | [navigation/breadcrumb.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/navigation/breadcrumb.md) |
| `<is-breadcrumb-item>` | Orientación, movimiento entre vistas y navegación jerárquica o secuencial. | [navigation/breadcrumb-item.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/navigation/breadcrumb-item.md) |
| `<is-tab-group>` | Orientación, movimiento entre vistas y navegación jerárquica o secuencial. | [navigation/tab-group.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/navigation/tab-group.md) |
| `<is-tab>` | Orientación, movimiento entre vistas y navegación jerárquica o secuencial. | [navigation/tab-group.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/navigation/tab-group.md) |
| `<is-tab-panel>` | Orientación, movimiento entre vistas y navegación jerárquica o secuencial. | [navigation/tab-group.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/navigation/tab-group.md) |
| `<is-scroller>` | Orientación, movimiento entre vistas y navegación jerárquica o secuencial. | [navigation/scroller.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/navigation/scroller.md) |
| `<is-carousel>` | Orientación, movimiento entre vistas y navegación jerárquica o secuencial. | [navigation/carousel.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/navigation/carousel.md) |
| `<is-carousel-item>` | Lámina de <is-carousel>. | [navigation/carousel-item.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/navigation/carousel-item.md) |
| `<is-tree>` | Orientación, movimiento entre vistas y navegación jerárquica o secuencial. | [navigation/tree.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/navigation/tree.md) |
| `<is-tree-item>` | Nodo de <is-tree>. | [navigation/tree-item.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/navigation/tree-item.md) |
| `<is-stepper>` | Orientación, movimiento entre vistas y navegación jerárquica o secuencial. | [navigation/stepper.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/navigation/stepper.md) |
| `<is-stepper-step>` | Paso de <is-stepper>. | [navigation/stepper-step.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/navigation/stepper-step.md) |
| `<is-mega-menu>` | Cabeceras con muchas secciones que no caben en un dropdown de una columna. | [navigation/mega-menu.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/navigation/mega-menu.md) |

### forms

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<is-combobox>` | Captura, selección y validación de valores compatibles con formularios. | [forms/combobox.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/combobox.md) |
| `<is-option>` | Captura, selección y validación de valores compatibles con formularios. | [forms/option.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/option.md) |
| `<is-checkbox>` | Captura, selección y validación de valores compatibles con formularios. | [forms/checkbox.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/checkbox.md) |
| `<is-switch>` | Captura, selección y validación de valores compatibles con formularios. | [forms/switch.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/switch.md) |
| `<is-radio-group>` | Captura, selección y validación de valores compatibles con formularios. | [forms/radio-group.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/radio-group.md) |
| `<is-radio>` | Captura, selección y validación de valores compatibles con formularios. | [forms/radio.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/radio.md) |
| `<is-input>` | Captura, selección y validación de valores compatibles con formularios. | [forms/input.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/input.md) |
| `<is-textarea>` | Captura, selección y validación de valores compatibles con formularios. | [forms/textarea.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/textarea.md) |
| `<is-slider>` | Captura, selección y validación de valores compatibles con formularios. | [forms/slider.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/slider.md) |
| `<is-rating>` | Captura, selección y validación de valores compatibles con formularios. | [forms/rating.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/rating.md) |
| `<is-select>` | Captura, selección y validación de valores compatibles con formularios. | [forms/select.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/select.md) |
| `<is-color-picker>` | Captura, selección y validación de valores compatibles con formularios. | [forms/color-picker.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/color-picker.md) |
| `<is-file-input>` | Captura, selección y validación de valores compatibles con formularios. | [forms/file-input.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/file-input.md) |
| `<is-date-picker>` | Captura, selección y validación de valores compatibles con formularios. | [forms/date-picker.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/date-picker.md) |
| `<is-month-calendar>` | Captura, selección y validación de valores compatibles con formularios. | [forms/month-calendar.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/month-calendar.md) |
| `<is-year-calendar>` | Captura, selección y validación de valores compatibles con formularios. | [forms/year-calendar.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/year-calendar.md) |
| `<is-date-range-picker>` | Captura, selección y validación de valores compatibles con formularios. | [forms/date-range-picker.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/date-range-picker.md) |
| `<is-time-clock>` | Captura, selección y validación de valores compatibles con formularios. | [forms/time-clock.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/time-clock.md) |
| `<is-digital-clock>` | Captura, selección y validación de valores compatibles con formularios. | [forms/digital-clock.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/digital-clock.md) |
| `<is-date-field>` | Captura, selección y validación de valores compatibles con formularios. | [forms/date-field.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/date-field.md) |
| `<is-time-field>` | Captura, selección y validación de valores compatibles con formularios. | [forms/time-field.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/time-field.md) |
| `<is-date-time-field>` | Captura, selección y validación de valores compatibles con formularios. | [forms/date-time-field.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/date-time-field.md) |
| `<is-date-input>` | Captura, selección y validación de valores compatibles con formularios. | [forms/date-input.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/date-input.md) |
| `<is-time-input>` | Captura, selección y validación de valores compatibles con formularios. | [forms/time-input.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/time-input.md) |
| `<is-date-time-input>` | Captura, selección y validación de valores compatibles con formularios. | [forms/date-time-input.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/date-time-input.md) |
| `<is-date-range-input>` | Captura, selección y validación de valores compatibles con formularios. | [forms/date-range-input.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/date-range-input.md) |
| `<is-pin-input>` | Captura, selección y validación de valores compatibles con formularios. | [forms/pin-input.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/pin-input.md) |
| `<is-masked-input>` | Entrada de texto con formato fijo y verificable carácter a carácter. | [forms/masked-input.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/masked-input.md) |
| `<is-inline-edit>` | Editar un campo suelto dentro de una vista de lectura (título de documento, | [forms/inline-edit.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/inline-edit.md) |
| `<is-mention>` | Comentarios, notas y descripciones donde el usuario menciona personas o | [forms/mention.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/mention.md) |
| `<is-duration-picker>` | Capturar una duración (tiempo trabajado, tiempo estimado, temporizador), no | [forms/duration-picker.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/duration-picker.md) |
| `<is-dropzone>` | Para adjuntar varios archivos con retroalimentación visual: soportes de una | [forms/dropzone.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/dropzone.md) |
| `<is-full-calendar>` | Mostrar y navegar una agenda: reservas, vencimientos, programación de tareas. | [forms/full-calendar.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/full-calendar.md) |
| `<is-signature>` | Capturar una firma o un trazo libre para adjuntarlo a un documento | [forms/signature.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/signature.md) |
| `<is-rte>` | Capturar contenido con formato (notas, descripciones, plantillas de correo) | [forms/rte.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/rte.md) |
| `<is-doc-editor>` | Cuando el usuario necesita redactar contenido estructurado y libre — | [forms/doc-editor.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/forms/doc-editor.md) |

### code

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<is-code>` | - Editar o revisar snippets HTML/CSS/JS/TS/JSX/Python en la UI. | [code/code.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/code/code.md) |

### data

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<is-data-grid>` | Presentación, comparación, movimiento u organización de datos estructurados. | [data/data-grid.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/data/data-grid.md) |
| `<is-stat>` | Presentación, comparación, movimiento u organización de datos estructurados. | [data/stat.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/data/stat.md) |
| `<is-transfer>` | Presentación, comparación, movimiento u organización de datos estructurados. | [data/transfer.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/data/transfer.md) |
| `<is-transfer-item>` | Ítem de <is-transfer>. | [data/transfer-item.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/data/transfer-item.md) |
| `<is-kanban>` | Presentación, comparación, movimiento u organización de datos estructurados. | [data/kanban.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/data/kanban.md) |
| `<is-kanban-column>` | Columna de <is-kanban>. | [data/kanban-column.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/data/kanban-column.md) |
| `<is-kanban-card>` | Tarjeta de <is-kanban>. | [data/kanban-card.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/data/kanban-card.md) |
| `<is-pivot-table>` | - Cruzar dos dimensiones de un mismo conjunto de datos (ventas por vendedor × | [data/pivot-table.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/data/pivot-table.md) |
| `<is-spreadsheet>` | - Capturas rápidas de datos tabulares donde el usuario espera comportarse como | [data/spreadsheet.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/data/spreadsheet.md) |
| `<is-ag-grid>` | Grillas densas con reorder/resize/pin/hide, filtros por columna, sidebar de columnas y estado | [data/ag-grid.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/data/ag-grid.md) |

### data-viz

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<is-chart>` | Series, distribuciones, relaciones o jerarquías de datos. | [charts/chart.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/charts/chart.md) |
| `<is-bar-chart>` | Series, distribuciones, relaciones o jerarquías de datos — cuando el tipo | [charts/bar-chart.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/charts/bar-chart.md) |
| `<is-line-chart>` | Series, distribuciones, relaciones o jerarquías de datos — cuando el tipo | [charts/line-chart.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/charts/line-chart.md) |
| `<is-pie-chart>` | Series, distribuciones, relaciones o jerarquías de datos — cuando el tipo | [charts/pie-chart.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/charts/pie-chart.md) |
| `<is-doughnut-chart>` | Series, distribuciones, relaciones o jerarquías de datos — cuando el tipo | [charts/doughnut-chart.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/charts/doughnut-chart.md) |
| `<is-radar-chart>` | Series, distribuciones, relaciones o jerarquías de datos — cuando el tipo | [charts/radar-chart.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/charts/radar-chart.md) |
| `<is-polar-area-chart>` | Series, distribuciones, relaciones o jerarquías de datos — cuando el tipo | [charts/polar-area-chart.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/charts/polar-area-chart.md) |
| `<is-scatter-chart>` | Series, distribuciones, relaciones o jerarquías de datos — cuando el tipo | [charts/scatter-chart.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/charts/scatter-chart.md) |
| `<is-bubble-chart>` | Series, distribuciones, relaciones o jerarquías de datos — cuando el tipo | [charts/bubble-chart.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/charts/bubble-chart.md) |
| `<is-sparkline>` | Series, distribuciones, relaciones o jerarquías de datos. | [charts/sparkline.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/charts/sparkline.md) |
| `<is-waterfall-chart>` | Series, distribuciones, relaciones o jerarquías de datos — cuando el tipo | [charts/waterfall-chart.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/charts/waterfall-chart.md) |
| `<is-funnel-chart>` | Series, distribuciones, relaciones o jerarquías de datos — cuando el tipo | [charts/funnel-chart.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/charts/funnel-chart.md) |
| `<is-treemap>` | Series, distribuciones, relaciones o jerarquías de datos. | [charts/treemap.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/charts/treemap.md) |
| `<is-gauge>` | Presentación, comparación, movimiento u organización de datos estructurados. | [data/gauge.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/data/gauge.md) |
| `<is-heatmap>` | Cuando hay que comparar una magnitud sobre dos dimensiones categóricas al | [data-viz/heatmap.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/data-viz/heatmap.md) |
| `<is-maps>` | - Ubicar puntos propios sobre un lienzo ligero: sucursales, bodegas, | [data-viz/maps.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/data-viz/maps.md) |
| `<is-map-marker>` | Marcador de <is-maps>. | [data-viz/map-marker.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/data-viz/map-marker.md) |

### diagrams

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<is-flowchart>` | Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos. | [diagrams/flowchart.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/flowchart.md) |
| `<is-sequence-diagram>` | Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos. | [diagrams/sequence-diagram.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/sequence-diagram.md) |
| `<is-diagram-lightbox>` | Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos. | [diagrams/diagram-lightbox.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/diagram-lightbox.md) |
| `<is-class-diagram>` | Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos. | [diagrams/class-diagram.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/class-diagram.md) |
| `<is-state-diagram>` | Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos. | [diagrams/state-diagram.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/state-diagram.md) |
| `<is-er-diagram>` | Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos. | [diagrams/er-diagram.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/er-diagram.md) |
| `<is-er-editor>` | Editor visual del diagrama entidad-relación. | [diagrams/er-editor.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/er-editor.md) |
| `<is-diagram-view-app>` | Abrir cualquier diagrama del kit por enlace, en solo vista o en edición, sin reimplementar el visor. | [diagrams/diagram-studio.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/diagram-studio.md) |
| `<is-diagram-edit-app>` | Abrir cualquier diagrama del kit por enlace, en solo vista o en edición, sin reimplementar el visor. | [diagrams/diagram-studio.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/diagram-studio.md) |
| `<is-block-diagram>` | Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos. | [diagrams/block-diagram.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/block-diagram.md) |
| `<is-component-diagram>` | Cuando necesitas describir la arquitectura de un sistema (servicios, | [diagrams/component-diagram.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/component-diagram.md) |
| `<is-mindmap>` | Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos. | [diagrams/mindmap.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/mindmap.md) |
| `<is-gantt>` | Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos. | [diagrams/gantt.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/gantt.md) |
| `<is-timeline>` | Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos. | [diagrams/timeline.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/timeline.md) |
| `<is-org-chart>` | Estructuras de mando o pertenencia: áreas de la empresa, jerarquía de cuentas, | [diagrams/org-chart.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/org-chart.md) |
| `<is-sankey-diagram>` | Cuando el mensaje es cuánto se reparte entre caminos: esfuerzo por | [diagrams/sankey-diagram.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/sankey-diagram.md) |
| `<is-quadrant-chart>` | Priorización y comparación de opciones: impacto contra esfuerzo, costo | [diagrams/quadrant-chart.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/quadrant-chart.md) |
| `<is-venn-diagram>` | Cuando el mensaje es solape: alcance pedido contra alcance entregado, | [diagrams/venn-diagram.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/venn-diagram.md) |
| `<is-use-case-diagram>` | Cuando la pregunta es de alcance: qué puede hacer cada rol dentro de un | [diagrams/use-case-diagram.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/use-case-diagram.md) |
| `<is-swimlane-diagram>` | Cuando el proceso cruza varias áreas y lo importante es quién hace cada | [diagrams/swimlane-diagram.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/swimlane-diagram.md) |
| `<is-journey-map>` | Cuando además del orden hay una medida por paso: dónde se cae la | [diagrams/journey-map.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/journey-map.md) |

### overlays

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<is-command-palette>` | Paleta de comandos, visor de documentos y ventanas flotantes. | [overlays/command-palette.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/overlays/command-palette.md) |
| `<is-pdf-viewer>` | Paleta de comandos, visor de documentos y ventanas flotantes. | [overlays/pdf-viewer.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/overlays/pdf-viewer.md) |
| `<is-window>` | Paleta de comandos, visor de documentos y ventanas flotantes. | [overlays/window.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/overlays/window.md) |

### preview

| Tag | Resumen | Guía |
| --- | --- | --- |
| `<is-preview-component>` | Shell de la galería. | [layout/preview-component.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/layout/preview-component.md) |
| `<is-preview-controls>` | Panel de controles del playground. | [layout/preview-controls.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/layout/preview-controls.md) |

<!-- catalogo:fin -->
