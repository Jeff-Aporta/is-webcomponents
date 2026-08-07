import { definePickerInput } from '../_shared/picker-element.js';
import './date-field.js';
import './date-picker.js';

/**
 * <is-date-input> — Campo de fecha con calendario en un panel (MUI DatePicker).
 *
 * Compone <is-date-field> (edición por secciones) e <is-date-picker> (el
 * calendario) dentro de un <dialog> del top layer.
 *
 * Atributos: label, hint, name, value (yyyy-mm-dd), min, max, required,
 *            disabled, readonly, clearable, locale, color (desktop|mobile),
 *            action-bar, placement, close-on-select, views, open-to,
 *            first-day-of-week, show-outside-days, fixed-weeks,
 *            show-week-numbers, disable-past, disable-future, disabled-dates,
 *            disabled-days
 * Events: is-change, is-show, is-hide
 * Methods: show(), hide()
 */

definePickerInput({
  tag: 'is-date-input',
  kind: 'date',
  cssUrl: import.meta.url,
  fieldTag: 'is-date-field',
  panels: () => {
    const calendar = document.createElement('is-date-picker');
    calendar.dataset.role = 'date';
    calendar.setAttribute('frameless', '');
    return [calendar];
  },
});
