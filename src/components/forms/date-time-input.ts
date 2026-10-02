import { definePickerInput } from '../_shared/picker-element.js';
import './date-time-field.js';
import './date-picker.js';
import './digital-clock.js';

/**
 * <iswc-date-time-input> — Fecha y hora en un solo campo con calendario y reloj
 * lado a lado (MUI DateTimePicker). El valor es `yyyy-mm-ddTHH:mm[:ss]`.
 *
 * Atributos: los de iswc-date-input más ampm, hour24, seconds, step
 * Events: iswc-change, iswc-show, iswc-hide
 * Methods: show(), hide()
 */

definePickerInput({
  tag: 'iswc-date-time-input',
  kind: 'datetime',
  cssUrl: import.meta.url,
  fieldTag: 'iswc-date-time-field',
  panels: () => {
    const calendar = document.createElement('iswc-date-picker');
    calendar.dataset.role = 'date';
    calendar.setAttribute('frameless', '');
    const clock = document.createElement('iswc-digital-clock');
    clock.dataset.role = 'time';
    clock.setAttribute('layout', 'list');
    clock.className = 'flush';
    return [calendar, clock];
  },
});
