import { definePickerInput } from '../_shared/picker-element.js';
import './date-field.js';
import './date-range-picker.js';

/**
 * <is-date-range-input> — Dos campos (inicio y fin) con el calendario de rango
 * en el panel (MUI DateRangePicker). El valor es `inicio/fin`.
 *
 * Atributos: start-label, end-label, hint, name, value, min, max, required,
 *            disabled, readonly, clearable, locale, calendars, shortcuts,
 *            variant, action-bar, placement, close-on-select
 * Events: is-change, is-show, is-hide
 * Methods: show(), hide()
 */

const IsDateRangeInput = definePickerInput({
  tag: 'is-date-range-input',
  kind: 'date',
  cssUrl: import.meta.url,
  fieldTag: 'is-date-field',
  range: true,
  panels: () => {
    const calendar = document.createElement('is-date-range-picker');
    calendar.dataset.role = 'range';
    calendar.className = 'flush';
    return [calendar];
  },
});

if (typeof window !== 'undefined') window.IsDateRangeInput = IsDateRangeInput;
