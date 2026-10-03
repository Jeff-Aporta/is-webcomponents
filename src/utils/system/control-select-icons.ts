/**
 * Iconos sugeridos para opciones de <iswc-preview-controls> select.
 * Enrichment en runtime: el JSON puede omitir `icon` y se completa aquí.
 */

import { BUTTON_SHAPE_ICON } from '../../components/_shared/button-shape.js';
import { MEDIA_SHAPE_ICON } from '../../components/_shared/media-shape.js';

/** Por valor de opción (compartido entre attrs). */
const BY_VALUE: Record<string, string> = {
  // intent / color
  brand: 'mdi:palette',
  neutral: 'mdi:circle-outline',
  success: 'mdi:check-circle-outline',
  warning: 'mdi:alert-outline',
  danger: 'mdi:alert-circle-outline',
  info: 'mdi:information-outline',
  error: 'mdi:close-circle-outline',
  // tone / variant (button + feedback)
  filled: 'mdi:square',
  outlined: 'mdi:square-outline',
  plain: 'mdi:format-text',
  ghost: 'mdi:ghost-outline',
  soft: 'mdi:blur',
  text: 'mdi:format-letter-case',
  accent: 'mdi:flare',
  'filled-outlined': 'mdi:checkbox-blank-badge-outline',
  // placement / position
  top: 'mdi:arrow-collapse-up',
  bottom: 'mdi:arrow-collapse-down',
  start: 'mdi:arrow-collapse-left',
  end: 'mdi:arrow-collapse-right',
  left: 'mdi:arrow-left',
  right: 'mdi:arrow-right',
  'top-start': 'mdi:arrow-top-left',
  'top-end': 'mdi:arrow-top-right',
  'bottom-start': 'mdi:arrow-bottom-left',
  'bottom-end': 'mdi:arrow-bottom-right',
  center: 'mdi:image-filter-center-focus',
  // orientation
  horizontal: 'mdi:arrow-left-right',
  vertical: 'mdi:arrow-up-down',
  // button type
  button: 'mdi:button-cursor',
  submit: 'mdi:send',
  reset: 'mdi:backup-restore',
  // common misc
  auto: 'mdi:auto-fix',
  manual: 'mdi:hand-back-right-outline',
  none: 'mdi:cancel',
  single: 'mdi:numeric-1-circle-outline',
  multiple: 'mdi:checkbox-multiple-marked-outline',
  lazy: 'mdi:timer-sand',
  eager: 'mdi:lightning-bolt',
  contain: 'mdi:fit-to-page-outline',
  cover: 'mdi:overscan',
  dark: 'mdi:weather-night',
  light: 'mdi:white-balance-sunny',
  // select appearance
  underlined: 'mdi:format-underline',
  // selection display
  tags: 'mdi:tag-multiple-outline',
  count: 'mdi:counter',
  // chart-ish
  line: 'mdi:chart-line',
  bar: 'mdi:chart-bar',
  pie: 'mdi:chart-pie',
  doughnut: 'mdi:chart-donut',
  area: 'mdi:chart-areaspline',
  scatter: 'mdi:chart-scatter-plot',
  radar: 'mdi:radar',
  // size-ish
  small: 'mdi:size-s',
  medium: 'mdi:size-m',
  large: 'mdi:size-l',
  // loading / skeleton
  pulse: 'mdi:pulse',
  wave: 'mdi:wave',
};

/** Overrides por atributo (cuando el mismo value significa otra cosa). */
const BY_ATTR: Record<string, Record<string, string>> = {
  shape: {
    ...BUTTON_SHAPE_ICON,
    ...MEDIA_SHAPE_ICON,
  },
  color: {
    brand: 'mdi:palette',
    neutral: 'mdi:circle-outline',
    success: 'mdi:check-circle-outline',
    warning: 'mdi:alert-outline',
    danger: 'mdi:alert-circle-outline',
    info: 'mdi:information-outline',
    error: 'mdi:close-circle-outline',
  },
  variant: {
    filled: 'mdi:square',
    outlined: 'mdi:square-outline',
    plain: 'mdi:format-text',
    ghost: 'mdi:ghost-outline',
    soft: 'mdi:blur',
    text: 'mdi:format-letter-case',
    accent: 'mdi:flare',
    'filled-outlined': 'mdi:checkbox-blank-badge-outline',
  },
  type: {
    button: 'mdi:button-cursor',
    submit: 'mdi:send',
    reset: 'mdi:backup-restore',
    text: 'mdi:format-text',
    number: 'mdi:numeric',
    date: 'mdi:calendar',
    time: 'mdi:clock-outline',
    datetime: 'mdi:calendar-clock',
    email: 'mdi:email-outline',
    password: 'mdi:lock-outline',
    search: 'mdi:magnify',
    tel: 'mdi:phone-outline',
    url: 'mdi:link-variant',
    file: 'mdi:file-outline',
    checkbox: 'mdi:checkbox-marked-outline',
    radio: 'mdi:radiobox-marked',
  },
  placement: {
    top: 'mdi:arrow-collapse-up',
    bottom: 'mdi:arrow-collapse-down',
    start: 'mdi:arrow-collapse-left',
    end: 'mdi:arrow-collapse-right',
    left: 'mdi:arrow-left',
    right: 'mdi:arrow-right',
    'top-start': 'mdi:arrow-top-left',
    'top-end': 'mdi:arrow-top-right',
    'bottom-start': 'mdi:arrow-bottom-left',
    'bottom-end': 'mdi:arrow-bottom-right',
  },
  position: {
    top: 'mdi:arrow-collapse-up',
    bottom: 'mdi:arrow-collapse-down',
    start: 'mdi:arrow-collapse-left',
    end: 'mdi:arrow-collapse-right',
    left: 'mdi:arrow-left',
    right: 'mdi:arrow-right',
    center: 'mdi:image-filter-center-focus',
    'top-left': 'mdi:arrow-top-left',
    'top-right': 'mdi:arrow-top-right',
    'bottom-left': 'mdi:arrow-bottom-left',
    'bottom-right': 'mdi:arrow-bottom-right',
    inline: 'mdi:format-horizontal-align-center',
    fixed: 'mdi:pin',
  },
  orientation: {
    horizontal: 'mdi:arrow-left-right',
    vertical: 'mdi:arrow-up-down',
  },
};

/** Icono para una opción de select del panel (o undefined si no hay mapa). */
export function iconForSelectOption(attr: string | null | undefined, value: unknown): string | undefined {
  const v = String(value ?? '');
  if (!v) return undefined;
  if (attr && BY_ATTR[attr]?.[v]) return BY_ATTR[attr][v];
  return BY_VALUE[v];
}
