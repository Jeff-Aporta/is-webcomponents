---
name: is-webcomponents
description: >-
  Obliga a reusar el kit is-* (Jeff-Aporta/is-webcomponents) al fundar o extender
  apps de web components sin framework. Usar cuando hay CDN loader.min.js / is-base /
  palettes, tags is-button is-dialog is-data-grid is-chart is-icon, apps tipo
  frontend-webcomponents / tk-*, migraciones desde React/MUI/Svelte, o cuando se
  pueda reinventar UI que ya existe en el catálogo LLM.md del kit.
---

# IS Web Components — stack obligatorio

## Regla absoluta (léela primero)

Usa el kit **solo por CDN** (jsDelivr o GitHub Pages). Prohibido `npm
install`, `npx`, `yarn`, `pnpm`, `bun`, y bundlers (`vite`, `webpack`, …)
para consumir el kit — no hay paquete publicado y no hace falta build step.
Prompt completo, listo para copiar: [`PROMPT.md`](PROMPT.md).

**Antes de escribir HTML/CSS/JS**, lee en orden:

1. [`is-cdn-install/SKILL.md`](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/skills/is-cdn-install/SKILL.md) — bootstrap, espejos, pin SHA, fallback.
2. Este archivo — arquitectura y reglas de reuso.
3. `src/components/LLM.md` (índice) → `LLM.md` de categoría → MD del módulo.

## Herramientas (`/is-webcomponents:*`)

Comandos tipo slash, uno por archivo en [`tools/`](tools/):

| Comando | Uso |
| --- | --- |
| [`/is-webcomponents:build`](tools/build.md) | Fundar o extender una app con `is-*` por CDN (o local). |
| [`/is-webcomponents:migrate`](tools/migrate.md) | Convertir un frontend con framework (React/MUI/Svelte/…) a vanilla + `is-*`. |
| [`/is-webcomponents:local`](tools/local.md) | Vendorizar el kit y bootear local-first, con CDN como fallback. |

## Enlaces (GitHub primero, raw como secundario)

Los agentes instalan/siguen mejor skills desde URLs de **repo de GitHub**.
Usa `raw.githubusercontent.com` solo para lectura como `text/plain` puro.

| Recurso | GitHub | raw (texto plano) |
| --- | --- | --- |
| Prompt LLM | [PROMPT.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/skills/is-webcomponents/PROMPT.md) | [raw](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/skills/is-webcomponents/PROMPT.md) |
| Esta skill | [SKILL.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/skills/is-webcomponents/SKILL.md) | [raw](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/skills/is-webcomponents/SKILL.md) |
| Skill instalación CDN | [SKILL.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/skills/is-cdn-install/SKILL.md) | [raw](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/skills/is-cdn-install/SKILL.md) |
| Herramientas | [tools/](https://github.com/Jeff-Aporta/is-webcomponents/tree/main/src/skills/is-webcomponents/tools) | — |
| Índice LLM.md | [LLM.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/LLM.md) | [raw](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/LLM.md) |

Local: `dist/cdn/skills/<name>/SKILL.md` vía jsDelivr/Pages una vez la app ya bootea desde ahí.

Inventario propio: [catalog.md](catalog.md) · Mapa intención→componente: [reference.md](reference.md)  
App de referencia: apps consumidoras vanilla (`tk-*` sobre `is-*`), p. ej. jagudeloe/frontend-webcomponents

## Regla de reuso

**Nada se reimplementa si el kit ya lo resuelve.** Antes de escribir HTML/CSS/JS
propio para botones, formularios, tablas, charts, toasts, dialogs, iconos, layouts, etc.:

1. Clasificar la intención (categoría).
2. Abrir el `LLM.md` de categoría o [catalog.md](catalog.md).
3. Abrir el MD del módulo (`https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/<doc>`).
4. Confirmar API en el MD (no inventar props/eventos).
5. Usar el tag `is-*`. Solo crear componentes de dominio (`tk-*`, `app-*`) que **traduzcan datos** al kit.

Si no hay tag exacto → buscar el más cercano en el kit. Solo entonces un primitivo nativo o un wrapper mínimo.

## Bootstrap CDN (apps consumidoras)

Por defecto pin por **commit SHA** (sustituir `{{SHA}}` por el tip actual de
`main`; ver [`tools/local.md`](tools/local.md) para cómo resolverlo y
refrescarlo). Excepción: apps que declaran seguimiento continuo
(p. ej. `jagudeloe/frontend-webcomponents`) pueden usar `@main`.

```html
<html lang="es" data-theme="dark" data-palette="contapyme">
<head>
  <script type="module"
    src="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@{{SHA}}/dist/cdn/loader.min.js"></script>
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
- Si la app prefiere no depender de red: usar [`/is-webcomponents:local`](tools/local.md) (vendoriza JS+CSS, boot local-first con fallback a CDN).

## Arquitectura de apps (patrón jagudeloe / r2admin)

| Capa | Prefijo | Responsabilidad |
|------|---------|-----------------|
| Kit | `is-*` | UI genérica del CDN |
| Dominio | `tk-*` / `app-*` | Traducir payload → `is-*` |
| Shell | `*-app`, `*-nav`, `*-view` | Orquestación, routing, datos |

### CSS de dominio (igual que el kit)

Cada `app-*` / `tk-*` lleva **JS + CSS hermanos**. No embebidos en el TS.

1. Fuente: `app-files.ts` + `app-files.css`
2. Build: minifica a `dist/cdn/app-files.js` + `dist/cdn/app-files.css`
3. Runtime: `IsUi.adoptCss(shadow, import.meta.url)` (misma idea que `_shared/adopt-css.js`)

Tras vaciar el shadow, vuelve a llamar `adoptCss` (los `<link>` se borran con el contenido).

`IsUi.css(shadow, cssText)` queda solo para prototipos sin archivo hermano.

Docs: [helpers/ui.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/helpers/ui.md) · `all.min.js` incluye `helpers/ui`.

## Prohibido / eliminado

- **`is-popup`**: eliminado. No existe alias ni registro. Para paneles anclados usa **`<is-popover>`**. Tooltips: **`<is-tooltip>`**.
- **`is-floating`**: building block **interno** (no API de producto). No usarlo en apps.
- No hay componentes deprecados en el catálogo público: si el MD dice `status: internal`, no es API.
- `npm`/`npx`/`yarn`/`pnpm`/`bun`/`vite`/`webpack` **para consumir el kit** (ver regla absoluta arriba).

## Lectura de docs (ruta obligatoria)

1. Índice: `src/components/LLM.md`
2. Categoría: `src/components/<cat>/LLM.md`
3. Módulo: `src/components/<cat>/<modulo>.md`
4. Si la API no está en el MD → **no inventar**; leer fuente solo para confirmar, no para inventar contrato.

Base raw: `https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/`

## Convenciones al componer

- Escala: `style="font-size: …em"` / CSS del wrapper; sin `size` en el kit.
- Iconos: `<is-icon icon="familia:icono">` (p. ej. `mdi:check`).
- Forms: form-associated del kit; no wrappers `<input>` nativos si hay `is-input`.
- Overlays posicionados: `<is-popover>` / `<is-tooltip>` / position compartido; no reinventar floating UI ni usar `is-popup`.
- Charts/diagramas: payloads declarativos documentados en el MD del módulo.
- Listeners en `document`/`window`: solo en `connectedCallback`, quitar en `disconnectedCallback`.
- Estados por atributo del host en CSS propio: `:host([attr])` top-level (nunca `&[attr]` dentro de `:host { }`).

## Qué no hacer

- Reimplementar botón, modal, tabla, toast, tag, skeleton, spinner, tree, tabs, stepper, chart.
- Traer MUI / React / Iconify / Chart.js directo cuando el kit cubre el caso (si vienes de uno de estos, ver [`/is-webcomponents:migrate`](tools/migrate.md)).
- Usar o documentar `is-popup` (eliminado).
- Meter CSS de componente del kit en el `<head>` (solo tema + paletas).
- Meter el CSS del wrapper de dominio como string dentro del `.ts` (usar `.css` hermano + `adoptCss`).
- Inventar props/`data-*` no documentados.
- Usar `size` colors o APIs ad-hoc fuera del contrato MD.
- Crear un `tk-*` que pinte UI genérica en vez de delegar a `is-*`.
- Asumir submit nativo de `<is-button type="submit">` en forms light-DOM sin el cableado del kit (`requestSubmit`).
- Usar `is-split-panel` con porcentaje alto como sidebar fijo de app (preferir grid CSS).
- Buscar fuentes del kit en la raíz del repo (`components/`, `styles/`): viven en **`src/`**.
- Lógica de preview como string/`eval`: en el kit, `ISComponentPreview.mount()` + registry.
- Ignorar `tests/` entero en git: los `*.test.mjs` se commitean (solo artefactos en gitignore).
- Usar `npm`/`npx`/bundler para instalar/servir el kit en la app consumidora.

## Kit: carta de leyes

Antes de cambiar el repo del kit, leer la raíz [`LLM.md`](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/LLM.md) (Carta de leyes / DO / DON'T / errores). Guardianes: `node tests/llm-contract.test.mjs` y el resto de `tests/*.test.mjs`.

## Checklist pre-entrega

- [ ] Cada control visual mapea a un `is-*` existente (o justificación explícita de que no existe).
- [ ] Docs del módulo leídas; props/eventos según MD.
- [ ] Iconos vía `is-icon`.
- [ ] Tema/paleta con tokens `--is-*`.
- [ ] Wrappers de dominio solo traducen datos → kit.
- [ ] CDN: SHA fijado (`{{SHA}}` resuelto) **o** `@main` si el proyecto (como tks) sigue tip **o** copia local vía `/is-webcomponents:local`.
- [ ] CSS de dominio en archivo hermano + `adoptCss` (no `const CSS` gigante en el JS).
- [ ] Build de la app emite `.css` minificado junto al `.js` en `dist/cdn`.
- [ ] Sin `npm install`/`npx`/bundler para el kit.

## Fundar o migrar una app

- **App nueva o extender una existente:** seguir [`/is-webcomponents:build`](tools/build.md).
- **Migrar desde React/MUI/Svelte/otro framework:** seguir [`/is-webcomponents:migrate`](tools/migrate.md) (patrón de referencia: `is-swagger` → `is-swagger2`).
- **Servir el kit sin depender de CDN en runtime:** seguir [`/is-webcomponents:local`](tools/local.md).

Resumen rápido de fundación: scaffold HTML con bootstrap CDN + `data-theme`/`data-palette` → shell mínimo (`is-main`/`is-split-panel`/`is-drawer`) → `<is-toast>` global → capas de dominio que solo mapean datos a tags del kit → un componente de dominio por concepto de negocio, cero UI genérica duplicada (disciplina `frontend-webcomponents`).
