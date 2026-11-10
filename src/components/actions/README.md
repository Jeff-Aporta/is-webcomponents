# Componentes · actions

Botones y acciones: lo que el usuario pulsa para que pase algo.

## Componentes

<!-- generado:componentes -->
| Tag | Título | Documento |
|---|---|---|
| `iswc-button` | Button | [button.md](button.md) |
| `iswc-button-group` | Button Group | [button-group.md](button-group.md) |
| `iswc-copy-button` | Copy Button | [copy-button.md](copy-button.md) |
| `iswc-share-button` | Share Button | [share-button.md](share-button.md) |
| `iswc-check-icon-button` | Check Icon Button | [check-icon-button.md](check-icon-button.md) |
| `iswc-dropdown` | Dropdown | [dropdown.md](dropdown.md) |
| `iswc-dropdown-item` | Dropdown Item | [dropdown-item.md](dropdown-item.md) |
| `iswc-fab` | Floating Action Button | [fab.md](fab.md) |
| `iswc-context-menu` | Context Menu | [context-menu.md](context-menu.md) |
| `iswc-speed-dial` | Speed Dial | [speed-dial.md](speed-dial.md) |
| `iswc-speed-dial-action` | Speed Dial Action | [speed-dial-action.md](speed-dial-action.md) |
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
