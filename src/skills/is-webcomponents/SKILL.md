---
name: is-webcomponents
description: >-
  Obliga a reusar el kit is-* (Jeff-Aporta/is-webcomponents) al fundar o extender
  apps de web components sin framework. Usar cuando hay CDN all.min.js / is-base /
  palettes, tags is-button is-dialog is-data-grid is-chart is-icon, apps tipo
  frontend-webcomponents / tk-*, o cuando se pueda reinventar UI que ya existe
  en el catálogo LLM.md del kit.
---

# IS Web Components — stack obligatorio

## Consumo (CDN only)

El kit **no se publica en npm** todavía. Consume siempre por jsDelivr (`dist/cdn/`). Los MD LLM viven en **fuente** (`src/components/**/*.md`), no en `dist/cdn`.

### Prompt para el LLM

```
Usa el kit IS Web Components solo por CDN (jsDelivr), sin npm ni npx.
Bootstrap: is-base.min.css + palettes.min.css + el .min.js del tag (o category.*.min.js / all.min.js).
Reutiliza tags is-* existentes; no reinventes botones, dialogs, tablas, charts, toasts ni iconos.
Antes de inventar API: lee src/components/LLM.md, el LLM.md de la categoría y el MD del módulo.
Tema/paleta: data-theme y data-palette en <html>. Iconos: <is-icon icon="mdi:…">.
```

Fuente de verdad: [src/components/LLM.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/LLM.md)  
Inventario: [catalog.md](catalog.md) · Mapa intención → tag: [reference.md](reference.md)  
App de referencia: apps consumidoras vanilla (`tk-*` sobre `is-*`), p. ej. jagudeloe/frontend-webcomponents

## Regla absoluta

**Nada se reimplementa si el kit ya lo resuelve.** Antes de escribir HTML/CSS/JS propio para botones, formularios, tablas, charts, toasts, dialogs, iconos, layouts, etc.:

1. Clasificar la intención (categoría).
2. Abrir el `LLM.md` de categoría o [catalog.md](catalog.md).
3. Abrir el MD del módulo (`https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/<doc>`).
4. Confirmar API en el MD (no inventar props/eventos).
5. Usar el tag `is-*`. Solo crear componentes de dominio (`tk-*`, `app-*`) que **traduzcan datos** al kit.

Si no hay tag exacto → buscar el más cercano en el kit. Solo entonces un primitivo nativo o un wrapper mínimo.

## Bootstrap CDN (apps consumidoras)

Por defecto pin por **commit SHA**. Excepción: apps que declaran seguimiento continuo
(p. ej. `jagudeloe/frontend-webcomponents`) pueden usar `@main`.

```html
<html lang="es" data-theme="dark" data-palette="contapyme">
<head>
  <link rel="stylesheet"
    href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/cdn/is-base.min.css">
  <link rel="stylesheet"
    href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/cdn/palettes.min.css">
  <script type="module"
    src="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/cdn/all.min.js"></script>
</head>
<body>
  <!-- shell de la app -->
  <is-toast placement="bottom-end"></is-toast>
</body>
</html>
```

- En snippets solo van `is-base.min.css` + `palettes.min.css` + JS. El CSS de cada componente lo carga el propio `is-*` vía shadow/`adoptCss`.
- Preferir `all.min.js` en previews/apps pequeñas. Bundles por categoría: `dist/cdn/<cat>/category.<cat>.min.js`.
- Tema: `data-theme` / `data-palette` en `<html>`. Tokens: `--is-text`, `--is-bg`, `--is-border`, `--is-accent`, etc.

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

## Lectura de docs (ruta obligatoria)

1. Índice: `src/components/LLM.md`
2. Categoría: `src/components/<cat>/LLM.md`
3. Módulo: `src/components/<cat>/<modulo>.md`
4. Si la API no está en el MD → **no inventar**; leer fuente solo para confirmar, no para inventar contrato.

Base raw: `https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/`

## Convenciones al componer

- Escala: `style="font-size: …em"` / CSS del wrapper; sin `size` en el kit.
- Iconos: `<is-icon name="familia:icono">` (p. ej. `mdi:check`).
- Forms: form-associated del kit; no wrappers `<input>` nativos si hay `is-input`.
- Overlays posicionados: `<is-popover>` / `<is-tooltip>` / position compartido; no reinventar floating UI ni usar `is-popup`.
- Charts/diagramas: payloads declarativos documentados en el MD del módulo.
- Listeners en `document`/`window`: solo en `connectedCallback`, quitar en `disconnectedCallback`.
- Estados por atributo del host en CSS propio: `:host([attr])` top-level (nunca `&[attr]` dentro de `:host { }`).

## Qué no hacer

- Reimplementar botón, modal, tabla, toast, tag, skeleton, spinner, tree, tabs, stepper, chart.
- Traer MUI / React / Iconify / Chart.js directo cuando el kit cubre el caso.
- Usar o documentar `is-popup` (eliminado).
- Meter CSS de componente del kit en el `<head>` (solo tema + paletas).
- Meter el CSS del wrapper de dominio como string dentro del `.ts` (usar `.css` hermano + `adoptCss`).
- Inventar props/`data-*` no documentados.
- Usar `size` colors o APIs ad-hoc fuera del contrato MD.
- Crear un `tk-*` que pinte UI genérica en vez de delegar a `is-*`.
- Asumir submit nativo de `<is-button type="submit">` en forms light-DOM sin el cableado del kit (`requestSubmit`).
- Usar `is-split-panel` con porcentaje alto como sidebar fijo de app (preferir grid CSS).
- Buscar fuentes del kit en la raíz del repo (`components/`, `styles/`): viven en **`src/`**.

## Checklist pre-entrega

- [ ] Cada control visual mapea a un `is-*` existente (o justificación explícita de que no existe).
- [ ] Docs del módulo leídas; props/eventos según MD.
- [ ] Iconos vía `is-icon`.
- [ ] Tema/paleta con tokens `--is-*`.
- [ ] Wrappers de dominio solo traducen datos → kit.
- [ ] CDN: SHA fijado **o** `@main` si el proyecto (como tks) sigue tip.
- [ ] CSS de dominio en archivo hermano + `adoptCss` (no `const CSS` gigante en el JS).
- [ ] Build de la app emite `.css` minificado junto al `.js` en `dist/cdn`.

## Fundar una app nueva

1. Scaffold HTML con bootstrap CDN + `data-theme` / `data-palette`.
2. Shell mínimo: layout con `is-main` / `is-split-panel` / `is-drawer` según caso.
3. Feedback global: `<is-toast>`.
4. Capas de dominio que solo mapean datos a tags del kit.
5. Copiar disciplina de `frontend-webcomponents`: un componente de dominio por concepto de negocio; cero UI genérica duplicada.
