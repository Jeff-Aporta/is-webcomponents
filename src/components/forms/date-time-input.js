import { definePickerInput } from '../_shared/picker-element.js';
import './date-time-field.js';
import './date-picker.js';
import './digital-clock.js';

/**
 * <is-date-time-input> — Fecha y hora en un solo campo con calendario y reloj
 * lado a lado (MUI DateTimePicker). El valor es `yyyy-mm-ddTHH:mm[:ss]`.
 *
 * Atributos: los de is-date-input más ampm, hour24, seconds, step
 * Events: is-change, is-show, is-hide
 * Methods: show(), hide()
 */

definePickerInput({
  tag: 'is-date-time-input',
  kind: 'datetime',
  cssUrl: import.meta.url,
  fieldTag: 'is-date-time-field',
  panels: () => {
    const calendar = document.createElement('is-date-picker');
    calendar.dataset.role = 'date';
    calendar.setAttribute('frameless', '');
    const clock = document.createElement('is-digital-clock');
    clock.dataset.role = 'time';
    clock.setAttribute('layout', 'list');
    clock.className = 'flush';
    return [calendar, clock];
  },
});
