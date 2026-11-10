# Componentes · layout

Diseno: dialogos, drawers, tarjetas, app-shell y.Documentacion.

## Componentes

<!-- generado:componentes -->
| Tag | Título | Documento |
|---|---|---|
| `iswc-split-panel` | Panel dividido | [split-panel.md](split-panel.md) |
| `iswc-main` | Main | [main.md](main.md) |
| `iswc-card` | Card | [card.md](card.md) |
| `iswc-callout` | Callout | [callout.md](callout.md) |
| `iswc-details` | Details | [details.md](details.md) |
| `iswc-dialog` | Dialog | [dialog.md](dialog.md) |
| `iswc-drawer` | Drawer | [drawer.md](drawer.md) |
| `iswc-login` | Login | [login.md](login.md) |
| `iswc-login-gate` | Login Gate | [login-gate.md](login-gate.md) |
| `iswc-login-dropdown` | Login Dropdown | [login-dropdown.md](login-dropdown.md) |
| `iswc-session-menu` | Session Menu | [session-menu.md](session-menu.md) |
| `iswc-app-shell` | App Shell | [app-shell.md](app-shell.md) |
| `iswc-divider` | Divider | [divider.md](divider.md) |
| `iswc-scrollspy` | Scrollspy | [scrollspy.md](scrollspy.md) |
| `iswc-demo` | Demo | [demo.md](demo.md) |
| `iswc-page-header` | Page Header | [page-header.md](page-header.md) |
| `iswc-dock` | Dock | [dock.md](dock.md) |
| `iswc-dock-item` | Dock Item | [dock-item.md](dock-item.md) |
| `iswc-doc-layout` | Doc Layout | [doc-layout.md](doc-layout.md) |
| `iswc-md-docs-vault` | MD Docs Vault | [md-docs-vault.md](md-docs-vault.md) |
| `iswc-server-api-docs` | Server API Docs | [server-api-docs.md](server-api-docs.md) |
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
