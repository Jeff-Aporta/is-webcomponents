# Componentes · helpers

Ayudantes: formato, observadores y utilidades sin interfaz propia.

## Componentes

<!-- generado:componentes -->
| Tag | Título | Documento |
|---|---|---|
| `iswc-popover` | Popover | [popover.md](popover.md) |
| `iswc-ui` | IswcUi | [ui.md](ui.md) |
| `iswc-lightbox` | Lightbox | [lightbox.md](lightbox.md) |
| `iswc-relative-time` | Tiempo relativo | [relative-time.md](relative-time.md) |
| `iswc-format` | Formato | [format.md](format.md) |
| `iswc-observer` | Observer | [observer.md](observer.md) |
| `iswc-wake-lock` | Wake Lock | [wake-lock.md](wake-lock.md) |
| `iswc-offscreen-canvas` | Offscreen Canvas | [offscreen-canvas.md](offscreen-canvas.md) |
| `iswc-format-date` | Formato de fecha | [format-date.md](format-date.md) |
| `iswc-format-number` | Formato de número | [format-number.md](format-number.md) |
| `iswc-format-bytes` | Formato de bytes | [format-bytes.md](format-bytes.md) |
| `iswc-intersection-observer` | Observador de intersección | [intersection-observer.md](intersection-observer.md) |
| `iswc-mutation-observer` | Observador de mutación | [mutation-observer.md](mutation-observer.md) |
| `iswc-resize-observer` | Resize Observer | [resize-observer.md](resize-observer.md) |
| `iswc-md-render` | Render Markdown | [md-render.md](md-render.md) |
| `iswc-md-editor` | Editor Markdown | [md-editor.md](md-editor.md) |
| `iswc-floating` | Floating (interno) | [floating.md](floating.md) |
<!-- /generado:componentes -->

## Reglas del dominio

- Los cuatro archivos de cada componente: `<nombre>.ts`, `<nombre>.scss`, `<nombre>.md` y `<nombre>.json`.
- El `.md` del componente es su ficha: props, eventos, slots y ejemplos.
- El `.json` es el contrato que leen la galeria, el audit y el constructor de apps.
- El SCSS entra por `@use 'iswc:css'` (el alias) o por el modulo compartido `kit`.
- El `.ts` lleva la cabecera `// @contexto INDICE.md · <md del dominio>`.

## Guardianes

- `tests/gobernanza/contrato-cuatro-archivos.test.ts` — los cuatro archivos de cada componente.
- `tests/gobernanza/componentes-contrato.test.ts` — props, eventos y slots contra el `.json`.
- `tests/gobernanza/sin-codigo-muerto.test.ts` — nada sin importador ni export sin consumidor.
- `tests/gobernanza/indice-md.test.ts` — cada tag tiene su md y el indice esta al dia.

## Documentos relacionados

- [INDICE.md](../../../../INDICE.md) — el indice de todos los documentos del kit.
- [specs/constitution.md](../../../../specs/constitution.md) — lo que no se negocia.
