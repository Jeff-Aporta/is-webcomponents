import { definePickerInput } from '../_shared/picker-element.js';
import './date-field.js';
import './date-picker.js';

/**
 * <iswc-date-input> — Campo de fecha con calendario en un panel (MUI DatePicker).
 *
 * Compone <iswc-date-field> (edición por secciones) e <iswc-date-picker> (el
 * calendario) dentro de un <dialog> del top layer.
 *
 * Atributos: label, hint, name, value (yyyy-mm-dd), min, max, required,
 *            disabled, readonly, clearable, locale, color (desktop|mobile),
 *            action-bar, placement, close-on-select, views, open-to,
 *            first-day-of-week, show-outside-days, fixed-weeks,
 *            show-week-numbers, disable-past, disable-future, disabled-dates,
 *            disabled-days
 * Events: iswc-change, iswc-show, iswc-hide
 * Methods: show(), hide()
 */

definePickerInput({
  tag: 'iswc-date-input',
  kind: 'date',
  cssUrl: import.meta.url,
  fieldTag: 'iswc-date-field',
  panels: () => {
    const calendar = document.createElement('iswc-date-picker');
    calendar.dataset.role = 'date';
    calendar.setAttribute('frameless', '');
    return [calendar];
  },
});
