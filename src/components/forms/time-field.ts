import { defineDateField } from '../_shared/date-field-element.js';

/**
 * <iswc-time-field> — Campo de hora editable por secciones (MUI TimeField).
 *
 * Atributos: label, hint, name, value (HH:mm[:ss]), min, max, required,
 *            disabled, readonly, clearable, locale, ampm, hour24, seconds,
 *            invalid
 * Slots: start, end
 * Events: iswc-change, iswc-input
 */

defineDateField({
  tag: 'iswc-time-field',
  kind: 'time',
  cssUrl: import.meta.url,
});
