# Componentes · feedback

Respuesta: avisos, estados vacios, progreso y confirmaciones.

## Componentes

<!-- generado:componentes -->
| Tag | Título | Documento |
|---|---|---|
| `iswc-spinner` | Spinner | [spinner.md](spinner.md) |
| `iswc-badge` | Badge | [badge.md](badge.md) |
| `iswc-tag` | Tag | [tag.md](tag.md) |
| `iswc-skeleton` | Skeleton | [skeleton.md](skeleton.md) |
| `iswc-progress-bar` | Progress Bar | [progress-bar.md](progress-bar.md) |
| `iswc-progress-ring` | Progress Ring | [progress-ring.md](progress-ring.md) |
| `iswc-theme-toggle` | Theme Toggle | [theme-toggle.md](theme-toggle.md) |
| `iswc-prefs-clear` | Prefs Clear | [prefs-clear.md](prefs-clear.md) |
| `iswc-toast` | Toast | [toast.md](toast.md) |
| `iswc-toast-item` | Toast Item | [toast-item.md](toast-item.md) |
| `iswc-tooltip` | Tooltip | [tooltip.md](tooltip.md) |
| `iswc-cdn-snippet` | CDN Snippet | [cdn-snippet.md](cdn-snippet.md) |
| `iswc-popconfirm` | Popconfirm | [popconfirm.md](popconfirm.md) |
| `iswc-confirm-modal` | Confirm Modal | [confirm-modal.md](confirm-modal.md) |
| `iswc-stream-bubble` | Stream Bubble | [stream-bubble.md](stream-bubble.md) |
| `iswc-status-pill` | Status Pill | [status-pill.md](status-pill.md) |
| `iswc-loading` | Loading | [loading.md](loading.md) |
| `iswc-empty-state` | Empty State | [empty-state.md](empty-state.md) |
| `iswc-palette-selector` | Palette Selector | [palette-selector.md](palette-selector.md) |
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
