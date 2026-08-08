# `/is-webcomponents:build`

Fundar una app nueva o extender una existente reusando el kit `is-*` por
CDN (o por copia local si la app ya corrió [`/is-webcomponents:local`](local.md)).

## Cuándo usarlo

- El usuario pide crear una app/página/panel nuevo con UI.
- El usuario pide añadir una sección/feature a una app que ya usa `is-*`.
- Hay que decidir qué tag del kit cubre una necesidad de UI.

## Pasos

1. **Leer antes de escribir código:**
   - [`../../is-cdn-install/SKILL.md`](../../is-cdn-install/SKILL.md) → bootstrap, espejos, pin.
   - [`../SKILL.md`](../SKILL.md) → arquitectura de capas (kit / dominio / shell).
   - `src/components/LLM.md` → índice de categorías.
2. **Scaffold del HTML** con bootstrap CDN mínimo:

   ```html
   <html lang="es" data-theme="dark" data-palette="contapyme">
   <head>
     <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/cdn/is-base.min.css">
     <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/cdn/palettes.min.css">
     <script type="module" src="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/cdn/all.min.js"></script>
   </head>
   <body>
     <is-toast placement="bottom-end"></is-toast>
   </body>
   </html>
   ```

   Si la app ya usa copia local (ver [`local.md`](local.md)), apunta los `<link>`/`<script>`
   a `vendor/is-webcomponents/...` en vez de jsDelivr.
3. **Reusar tags existentes.** Para cada control visual: clasificar intención →
   abrir [`../catalog.md`](../catalog.md) o [`../reference.md`](../reference.md) → confirmar API en el MD del módulo
   (`src/components/<cat>/<modulo>.md`) → usar el tag. No inventar props/eventos.
4. **Arquitectura de capas** (patrón jagudeloe / r2admin):

   | Capa | Prefijo | Responsabilidad |
   | --- | --- | --- |
   | Kit | `is-*` | UI genérica del CDN |
   | Dominio | `tk-*` / `app-*` | Traducir payload → `is-*` |
   | Shell | `*-app`, `*-nav`, `*-view` | Orquestación, routing, datos |

   Solo crear un componente de dominio si el catálogo no tiene el tag exacto
   y el componente encapsula lógica de negocio (mapear JSON → varios `is-*`).
5. **Feedback global:** un único `<is-toast placement="bottom-end">` en el shell.
6. **CSS de dominio** igual que el kit: archivo hermano (`app-files.css`) +
   `IsUi.adoptCss(shadow, import.meta.url)` en runtime. Nunca `const CSS = \`…\`` embebido en el JS.
7. **Tema:** `data-theme` / `data-palette` en `<html>`; tokens `--is-text`,
   `--is-bg`, `--is-border`, `--is-accent`, etc. en el CSS propio.

## Checklist antes de entregar

- [ ] Cada control visual mapea a un `is-*` existente (o justificación explícita).
- [ ] Docs del módulo leídas; props/eventos según el MD, no inventados.
- [ ] Iconos vía `<is-icon icon="mdi:…">`.
- [ ] `data-theme` + `data-palette` presentes.
- [ ] Wrappers de dominio (`tk-*`/`app-*`) solo traducen datos → kit.
- [ ] Sin `is-popup` (usar `is-popover`/`is-tooltip`).
- [ ] CDN: pin `@<sha>` o `@main` justificado (o local-first si aplica).
- [ ] CSS de dominio en archivo hermano + `adoptCss`, no string embebido.

## Ver también

- [`migrate.md`](migrate.md) — cuando la app de partida ya tiene un framework (React/MUI/Svelte/…).
- [`local.md`](local.md) — cuando conviene servir el kit sin depender de CDN.
