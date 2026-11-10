# Componentes · isp

ISP: los componentes de la aplicacion interna que los proyectos consumen.

## Componentes

<!-- generado:componentes -->
| Tag | Título | Documento |
|---|---|---|
| `iswc-accordion-group` | Accordion Group | [accordion-group.md](accordion-group.md) |
| `iswc-block-layout` | Block Layout | [block-layout.md](block-layout.md) |
| `iswc-btn-ref` | Btn Ref | [btn-ref.md](btn-ref.md) |
| `iswc-catalogo-gen` | Catálogo Gen | [catalogo-gen.md](catalogo-gen.md) |
| `iswc-confirm-delete` | Confirm Delete | [confirm-delete.md](confirm-delete.md) |
| `iswc-flex-layout` | Flex Layout | [flex-layout.md](flex-layout.md) |
| `iswc-flex-options` | Flex Options | [flex-options.md](flex-options.md) |
| `iswc-float-card` | Float Card | [float-card.md](float-card.md) |
| `iswc-form` | Form | [form.md](form.md) |
| `iswc-modal-verificacion` | Modal Verificación | [modal-verificacion.md](modal-verificacion.md) |
| `iswc-grid-layout` | Grid Layout | [grid-layout.md](grid-layout.md) |
| `iswc-heading` | Heading | [heading.md](heading.md) |
| `iswc-loading-overlay` | Loading Overlay | [loading-overlay.md](loading-overlay.md) |
| `iswc-text` | Text | [text.md](text.md) |
| `iswc-tree-view` | Tree View | [tree-view.md](tree-view.md) |
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
