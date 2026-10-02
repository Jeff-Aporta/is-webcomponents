import { defineDateField } from '../_shared/date-field-element.js';

/**
 * <iswc-date-field> — Campo de fecha editable por secciones (MUI DateField).
 *
 * Cada sección (día, mes, año, en el orden del locale) es un spinbutton:
 * flechas para subir/bajar, dígitos para teclear, izquierda/derecha para
 * saltar, Retroceso para vaciar. No usa <input type=date>.
 *
 * Atributos: label, hint, name, value (yyyy-mm-dd), min, max, required,
 *            disabled, readonly, clearable, locale, invalid
 * Slots: start, end
 * Events: iswc-change, iswc-input
 */

defineDateField({
  tag: 'iswc-date-field',
  kind: 'date',
  cssUrl: import.meta.url,
});
