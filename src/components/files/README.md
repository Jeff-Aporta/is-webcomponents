# Componentes · files

Archivos: visores y editores de texto, CSV, DOCX, PPTX y PDF.

## Componentes

<!-- generado:componentes -->
| Tag | Título | Documento |
|---|---|---|
| `iswc-txt-view` | TXT View | [txt-view.md](txt-view.md) |
| `iswc-txt-edit` | TXT Edit | [txt-edit.md](txt-edit.md) |
| `iswc-csv-view` | CSV View | [csv-view.md](csv-view.md) |
| `iswc-csv-edit` | CSV Edit | [csv-edit.md](csv-edit.md) |
| `iswc-docx-view` | DOCX View | [docx-view.md](docx-view.md) |
| `iswc-pptx-view` | PPTX View | [pptx-view.md](pptx-view.md) |
| `iswc-file-view` | File View | [file-view.md](file-view.md) |
| `iswc-file-edit` | File Edit | [file-edit.md](file-edit.md) |
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
