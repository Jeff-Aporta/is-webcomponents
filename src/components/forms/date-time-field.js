import { defineDateField } from '../_shared/date-field-element.js';

/**
 * <is-date-time-field> — Campo de fecha y hora por secciones
 * (MUI DateTimeField). El valor es `yyyy-mm-ddTHH:mm[:ss]`.
 *
 * Atributos: label, hint, name, value, min, max, required, disabled, readonly,
 *            clearable, locale, ampm, hour24, seconds, invalid
 * Slots: start, end
 * Events: is-change, is-input
 */

const IsDateTimeField = defineDateField({
  tag: 'is-date-time-field',
  kind: 'datetime',
  cssUrl: import.meta.url,
});

if (typeof window !== 'undefined') window.IsDateTimeField = IsDateTimeField;
