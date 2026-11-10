# Componentes · forms

Formularios: campos, selectores, fechas, mascaras y subida de archivos.

## Componentes

<!-- generado:componentes -->
| Tag | Título | Documento |
|---|---|---|
| `iswc-combobox` | Combobox | [combobox.md](combobox.md) |
| `iswc-option` | Option | [option.md](option.md) |
| `iswc-checkbox` | Checkbox | [checkbox.md](checkbox.md) |
| `iswc-switch` | Switch | [switch.md](switch.md) |
| `iswc-radio-group` | Radio Group | [radio-group.md](radio-group.md) |
| `iswc-radio` | Radio | [radio.md](radio.md) |
| `iswc-input` | Input | [input.md](input.md) |
| `iswc-textarea` | Textarea | [textarea.md](textarea.md) |
| `iswc-slider` | Slider | [slider.md](slider.md) |
| `iswc-rating` | Rating | [rating.md](rating.md) |
| `iswc-select` | Select | [select.md](select.md) |
| `iswc-color-picker` | Color Picker | [color-picker.md](color-picker.md) |
| `iswc-file-input` | File Input | [file-input.md](file-input.md) |
| `iswc-date-picker` | Date Picker | [date-picker.md](date-picker.md) |
| `iswc-month-calendar` | Month Calendar | [month-calendar.md](month-calendar.md) |
| `iswc-year-calendar` | Year Calendar | [year-calendar.md](year-calendar.md) |
| `iswc-date-range-picker` | Date Range Picker | [date-range-picker.md](date-range-picker.md) |
| `iswc-time-clock` | Time Clock | [time-clock.md](time-clock.md) |
| `iswc-digital-clock` | Digital Clock | [digital-clock.md](digital-clock.md) |
| `iswc-date-field` | Date Field | [date-field.md](date-field.md) |
| `iswc-time-field` | Time Field | [time-field.md](time-field.md) |
| `iswc-date-time-field` | Date Time Field | [date-time-field.md](date-time-field.md) |
| `iswc-date-input` | Date Input | [date-input.md](date-input.md) |
| `iswc-time-input` | Time Input | [time-input.md](time-input.md) |
| `iswc-date-time-input` | Date Time Input | [date-time-input.md](date-time-input.md) |
| `iswc-date-range-input` | Date Range Input | [date-range-input.md](date-range-input.md) |
| `iswc-pin-input` | Pin Input | [pin-input.md](pin-input.md) |
| `iswc-tenant-selector` | Tenant Selector | [tenant-selector.md](tenant-selector.md) |
| `iswc-masked-input` | Masked Input | [masked-input.md](masked-input.md) |
| `iswc-inline-edit` | Inline Edit | [inline-edit.md](inline-edit.md) |
| `iswc-mention` | Mention | [mention.md](mention.md) |
| `iswc-duration-picker` | Duration Picker | [duration-picker.md](duration-picker.md) |
| `iswc-dropzone` | Dropzone | [dropzone.md](dropzone.md) |
| `iswc-full-calendar` | Full Calendar | [full-calendar.md](full-calendar.md) |
| `iswc-signature` | Signature | [signature.md](signature.md) |
| `iswc-rte` | Rich Text Editor | [rte.md](rte.md) |
| `iswc-doc-editor` | Document Editor | [doc-editor.md](doc-editor.md) |
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
