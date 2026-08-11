/**
 * code-theme.js — temas JSON → tokens CSS del editor.
 *
 * El consumidor pasa un objeto de colores (como un theme de VS Code / CM).
 * Se escriben como custom properties en el host; el CSS del componente las
 * mapea a `.cm-s-is-code` (theme propio, sin depender de sheets de CM).
 */

/** @typedef {object} CodeThemeConfig
 * @property {string} [background]
 * @property {string} [foreground]
 * @property {string} [caret]
 * @property {string} [selection]
 * @property {string} [selectionMatch]
 * @property {string} [gutterBackground]
 * @property {string} [gutterForeground]
 * @property {string} [gutterBorder]
 * @property {string} [activeLine]
 * @property {string} [activeGutter]
 * @property {string} [matchingBracket]
 * @property {string} [comment]
 * @property {string} [keyword]
 * @property {string} [string]
 * @property {string} [number]
 * @property {string} [operator]
 * @property {string} [punctuation]
 * @property {string} [function]
 * @property {string} [variable]
 * @property {string} [property]
 * @property {string} [tag]
 * @property {string} [attribute]
 * @property {string} [atom]
 * @property {string} [definition]
 * @property {string} [meta]
 * @property {string} [qualifier]
 * @property {string} [builtin]
 * @property {string} [type]
 * @property {string} [errorHighlight]
 * @property {string} [warningHighlight]
 * @property {string} [infoHighlight]
 */

export const THEME_PROP_MAP = Object.freeze({
  background: '--is-code-bg',
  foreground: '--is-code-fg',
  caret: '--is-code-caret',
  selection: '--is-code-selection',
  selectionMatch: '--is-code-selection-match',
  gutterBackground: '--is-code-gutter-bg',
  gutterForeground: '--is-code-gutter-fg',
  gutterBorder: '--is-code-gutter-border',
  activeLine: '--is-code-active-line',
  activeGutter: '--is-code-active-gutter',
  matchingBracket: '--is-code-matching-bracket',
  comment: '--is-code-comment',
  keyword: '--is-code-keyword',
  string: '--is-code-string',
  number: '--is-code-number',
  operator: '--is-code-operator',
  punctuation: '--is-code-punctuation',
  function: '--is-code-function',
  variable: '--is-code-variable',
  property: '--is-code-property',
  tag: '--is-code-tag',
  attribute: '--is-code-attribute',
  atom: '--is-code-atom',
  definition: '--is-code-definition',
  meta: '--is-code-meta',
  qualifier: '--is-code-qualifier',
  builtin: '--is-code-builtin',
  type: '--is-code-type',
  errorHighlight: '--is-code-mark-error',
  warningHighlight: '--is-code-mark-warning',
  infoHighlight: '--is-code-mark-info',
});

/** Presets alineados a material-darker / mdn-like del kit. */
export const BUILTIN_THEMES = Object.freeze({
  dark: {
    background: '#212121',
    foreground: '#eeffff',
    caret: '#FFCC00',
    selection: 'rgba(128, 203, 196, 0.28)',
    gutterBackground: '#212121',
    gutterForeground: '#546e7a',
    gutterBorder: 'transparent',
    activeLine: 'rgba(0, 0, 0, 0.22)',
    activeGutter: 'rgba(0, 0, 0, 0.22)',
    matchingBracket: '#ffeb3b',
    comment: '#545454',
    keyword: '#c792ea',
    string: '#c3e88d',
    number: '#f78c6c',
    operator: '#89ddff',
    punctuation: '#89ddff',
    function: '#82aaff',
    variable: '#eeffff',
    property: '#80cbc4',
    tag: '#f07178',
    attribute: '#ffcb6b',
    atom: '#f78c6c',
    definition: '#82aaff',
    meta: '#ffcb6b',
    qualifier: '#decb6b',
    builtin: '#ffcb6b',
    type: '#decb6b',
    errorHighlight: 'rgba(255, 82, 82, 0.28)',
    warningHighlight: 'rgba(255, 193, 7, 0.28)',
    infoHighlight: 'rgba(33, 150, 243, 0.28)',
  },
  light: {
    background: '#ffffff',
    foreground: '#333333',
    caret: '#000000',
    selection: 'rgba(0, 120, 215, 0.22)',
    gutterBackground: '#f5f5f5',
    gutterForeground: '#6b7280',
    gutterBorder: '#e5e7eb',
    activeLine: 'rgba(0, 0, 0, 0.04)',
    activeGutter: 'rgba(0, 0, 0, 0.04)',
    matchingBracket: '#0000ff',
    comment: '#999988',
    keyword: '#00009f',
    string: '#007700',
    number: '#116644',
    operator: '#333333',
    punctuation: '#333333',
    function: '#990055',
    variable: '#333333',
    property: '#00009f',
    tag: '#00009f',
    attribute: '#994500',
    atom: '#116644',
    definition: '#990055',
    meta: '#999988',
    qualifier: '#555555',
    builtin: '#330099',
    type: '#330099',
    errorHighlight: 'rgba(220, 38, 38, 0.18)',
    warningHighlight: 'rgba(202, 138, 4, 0.2)',
    infoHighlight: 'rgba(37, 99, 235, 0.16)',
  },
});

/**
 * @param {HTMLElement} el
 * @param {CodeThemeConfig | null | undefined} theme
 * @param {'dark'|'light'|string} [fallbackPreset]
 */
export function applyThemeConfig(el, theme, fallbackPreset = 'dark') {
  const preset = BUILTIN_THEMES[fallbackPreset] || BUILTIN_THEMES.dark;
  const merged = { ...preset, ...(theme && typeof theme === 'object' ? theme : {}) };
  for (const [key, prop] of Object.entries(THEME_PROP_MAP)) {
    const value = merged[key];
    if (value == null || value === '') el.style.removeProperty(prop);
    else el.style.setProperty(prop, String(value));
  }
  return merged;
}

/** @param {unknown} raw */
export function parseThemeConfig(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
}
