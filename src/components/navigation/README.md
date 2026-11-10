# Componentes · navigation

Navegacion: menus, migas, pestañas, paginacion y arboles.

## Componentes

<!-- generado:componentes -->
| Tag | Título | Documento |
|---|---|---|
| `iswc-breadcrumb` | Breadcrumb | [breadcrumb.md](breadcrumb.md) |
| `iswc-pager` | Pager | [pager.md](pager.md) |
| `iswc-doc-index` | Doc Index | [doc-index.md](doc-index.md) |
| `iswc-breadcrumb-item` | Breadcrumb Item | [breadcrumb-item.md](breadcrumb-item.md) |
| `iswc-app-nav` | App Nav | [app-nav.md](app-nav.md) |
| `iswc-tab-group` | Tab Group | [tab-group.md](tab-group.md) |
| `iswc-tab` | Tab | [tab.md](tab.md) |
| `iswc-tab-panel` | Tab Panel | [tab-panel.md](tab-panel.md) |
| `iswc-scroller` | Scroller | [scroller.md](scroller.md) |
| `iswc-carousel` | Carousel | [carousel.md](carousel.md) |
| `iswc-carousel-item` | Carousel Item | [carousel-item.md](carousel-item.md) |
| `iswc-tree` | Tree | [tree.md](tree.md) |
| `iswc-tree-item` | Tree Item | [tree-item.md](tree-item.md) |
| `iswc-stepper` | Stepper | [stepper.md](stepper.md) |
| `iswc-stepper-step` | Stepper Step | [stepper-step.md](stepper-step.md) |
| `iswc-pagination` | Pagination | [pagination.md](pagination.md) |
| `iswc-mega-menu` | Mega Menu | [mega-menu.md](mega-menu.md) |
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
