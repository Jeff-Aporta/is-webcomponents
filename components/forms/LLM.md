# `forms` para LLM

## Propósito

Captura, selección y validación de valores compatibles con formularios.

## Qué componente elegir

Elegir módulo mínimo que cubra necesidad. Abrir referencia específica; no inferir API desde nombre.

## Componentes

| Tags | Documento | Uso principal |
| --- | --- | --- |
| `<is-combobox>` | [combobox.md](combobox.md) | Combobox |
| `<is-option>` | [option.md](option.md) | Option |
| `<is-checkbox>` | [checkbox.md](checkbox.md) | Checkbox |
| `<is-switch>` | [switch.md](switch.md) | Switch |
| `<is-radio-group>` | [radio-group.md](radio-group.md) | Radio Group |
| `<is-radio>` | [radio.md](radio.md) | Radio |
| `<is-input>` | [input.md](input.md) | Input |
| `<is-textarea>` | [textarea.md](textarea.md) | Textarea |
| `<is-slider>` | [slider.md](slider.md) | Slider |
| `<is-rating>` | [rating.md](rating.md) | Rating |
| `<is-select>` | [select.md](select.md) | Select |
| `<is-color-picker>` | [color-picker.md](color-picker.md) | Color Picker |
| `<is-file-input>` | [file-input.md](file-input.md) | File Input |
| `<is-date-picker>` | [date-picker.md](date-picker.md) | Date Picker |
| `<is-month-calendar>` | [month-calendar.md](month-calendar.md) | Month Calendar |
| `<is-year-calendar>` | [year-calendar.md](year-calendar.md) | Year Calendar |
| `<is-date-range-picker>` | [date-range-picker.md](date-range-picker.md) | Date Range Picker |
| `<is-time-clock>` | [time-clock.md](time-clock.md) | Time Clock |
| `<is-digital-clock>` | [digital-clock.md](digital-clock.md) | Digital Clock |
| `<is-date-field>` | [date-field.md](date-field.md) | Date Field |
| `<is-time-field>` | [time-field.md](time-field.md) | Time Field |
| `<is-date-time-field>` | [date-time-field.md](date-time-field.md) | Date Time Field |
| `<is-date-input>` | [date-input.md](date-input.md) | Date Input |
| `<is-time-input>` | [time-input.md](time-input.md) | Time Input |
| `<is-date-time-input>` | [date-time-input.md](date-time-input.md) | Date Time Input |
| `<is-date-range-input>` | [date-range-input.md](date-range-input.md) | Date Range Input |
| `<is-pin-input>` | [pin-input.md](pin-input.md) | Pin Input |

## Composición y relaciones

Módulos multi-tag se documentan juntos. Parent/child mantienen contrato del mismo JS/CSS.

## Reusar antes de crear

- `../_shared/form-associated.js`
- `../_shared/date-field-core.js`
- `../_shared/date-utils.js`
- `../_shared/picker-element.js`
- `../_shared/adopt-css.js`
- `../_shared/date-field-element.js`

## Dependencias compartidas

Revisar imports y `_shared/` antes de implementar. Reusar stdlib, plataforma y módulos existentes.

## Patrones comunes

- Importar módulo ES antes de usar tag.
- Usar propiedades para objetos/payloads y atributos declarados para escalares.
- Respetar contrato de eventos, parts, states y tokens.

## Qué hacer

- Leer MD, JS, CSS y preview exacto de manifest.
- Leer callers antes de tocar helper compartido.
- Preservar accesibilidad, validación y fallbacks.
- Ejecutar `node scripts/docs-consistency.selfcheck.mjs`.

## Qué no hacer

- No inventar API ni copiar contrato de componente parecido.
- No crear abstracción si shared/native resuelve caso.
- No crear size variants; usar font-size contextual y em.
- No duplicar MD por tag multi-tag.

## Errores conocidos y prevención

Romper form association manejando value solo visualmente; usar helpers/callbacks.

Fuente manda sobre preview. Ruta preview viene de `manifest.js.page`.

## Módulos internos

No expone módulos internos documentales en esta categoría.

## Navegación

- [Índice global](../LLM.md)
