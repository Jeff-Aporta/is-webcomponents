# Componentes · data

Datos: tablas, rejillas, tableros y hojas de calculo.

## Componentes

<!-- generado:componentes -->
| Tag | Título | Documento |
|---|---|---|
| `iswc-data-grid` | Data Grid | [data-grid.md](data-grid.md) |
| `iswc-stat` | Stat KPI | [stat.md](stat.md) |
| `iswc-trace-log` | Trace Log | [trace-log.md](trace-log.md) |
| `iswc-stat-group` | Stat Group | [stat-group.md](stat-group.md) |
| `iswc-meta-list` | Meta List | [meta-list.md](meta-list.md) |
| `iswc-transfer` | Transfer | [transfer.md](transfer.md) |
| `iswc-transfer-item` | Transfer Item | [transfer-item.md](transfer-item.md) |
| `iswc-kanban` | Kanban | [kanban.md](kanban.md) |
| `iswc-kanban-column` | Kanban Column | [kanban-column.md](kanban-column.md) |
| `iswc-kanban-card` | Kanban Card | [kanban-card.md](kanban-card.md) |
| `iswc-pivot-table` | Pivot Table | [pivot-table.md](pivot-table.md) |
| `iswc-spreadsheet` | Spreadsheet | [spreadsheet.md](spreadsheet.md) |
| `iswc-ag-grid` | AG Grid | [ag-grid.md](ag-grid.md) |
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
