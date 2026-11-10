# Componentes · preview

Galeria: los componentes que la propia galeria usa para mostrar los demas.

## Componentes

<!-- generado:componentes -->
| Tag | Título | Documento |
|---|---|---|
| `iswc-preview-component` | Preview Component | [preview-component.md](preview-component.md) |
| `iswc-doc-demo` | Doc Demo | [doc-demo.md](doc-demo.md) |
| `iswc-preview-controls` | Preview Controls | [preview-controls.md](preview-controls.md) |
| `iswc-playground` | Playground | [playground.md](playground.md) |
| `iswc-slots-pg` | Slots Playground | [slots-pg.md](slots-pg.md) |
| `iswc-examples-carousel` | Examples Carousel | [examples-carousel.md](examples-carousel.md) |
| `iswc-demo-section` | Demo Section | [demo-section.md](demo-section.md) |
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
