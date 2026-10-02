import { definePickerInput } from '../_shared/picker-element.js';
import './time-field.js';
import './time-clock.js';
import './digital-clock.js';

/**
 * <iswc-time-input> — Campo de hora con panel (MUI TimePicker).
 *
 * `panel` elige la superficie: columnas digitales (por defecto, como el picker
 * de escritorio de MUI), lista simple o reloj analógico.
 *
 * Atributos: label, hint, name, value (HH:mm[:ss]), min, max, required,
 *            disabled, readonly, clearable, locale, ampm, hour24, seconds,
 *            panel (sections|list|clock), minutes-step, step, color,
 *            action-bar, placement, close-on-select
 * Events: iswc-change, iswc-show, iswc-hide
 * Methods: show(), hide()
 */

definePickerInput({
  tag: 'iswc-time-input',
  kind: 'time',
  cssUrl: import.meta.url,
  fieldTag: 'iswc-time-field',
  panels: ({ host }: { host: HTMLElement }): HTMLElement[] => {
    const mode = host.getAttribute('panel') || 'sections';
    if (mode === 'clock') {
      const clock = document.createElement('iswc-time-clock');
      clock.dataset.role = 'time';
      return [clock];
    }
    const clock = document.createElement('iswc-digital-clock');
    clock.dataset.role = 'time';
    clock.setAttribute('layout', mode === 'list' ? 'list' : 'sections');
    return [clock];
  },
});
