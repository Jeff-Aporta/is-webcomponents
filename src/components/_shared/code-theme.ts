/**
 * code-theme.js — temas JSON → tokens CSS del editor.
 *
 * El consumidor pasa un objeto de colores (como un theme de VS Code / CM).
 * Se escriben como custom properties en el host; el CSS del componente las
 * consume directo (tokens `.tok-*` nativos, sin sheets de terceros).
 */

/** Mapa de roles del tema del editor a color CSS. Claves libres: cada preset
 *  declara las suyas y `applyThemeConfig` funde la del consumidor sobre la base. */

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
 * @property {string} [tagPunct]
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

import type { CodeThemeConfig } from "./code-theme.schemas.js";
export const THEME_PROP_MAP = Object.freeze({
  background: '--iswc-code-bg',
  foreground: '--iswc-code-fg',
  caret: '--iswc-code-caret',
  selection: '--iswc-code-selection',
  selectionMatch: '--iswc-code-selection-match',
  gutterBackground: '--iswc-code-gutter-bg',
  gutterForeground: '--iswc-code-gutter-fg',
  gutterBorder: '--iswc-code-gutter-border',
  activeLine: '--iswc-code-active-line',
  activeGutter: '--iswc-code-active-gutter',
  matchingBracket: '--iswc-code-matching-bracket',
  comment: '--iswc-code-comment',
  keyword: '--iswc-code-keyword',
  string: '--iswc-code-string',
  number: '--iswc-code-number',
  operator: '--iswc-code-operator',
  punctuation: '--iswc-code-punctuation',
  function: '--iswc-code-function',
  variable: '--iswc-code-variable',
  property: '--iswc-code-property',
  tag: '--iswc-code-tag',
  tagPunct: '--iswc-code-tag-punct',
  attribute: '--iswc-code-attribute',
  atom: '--iswc-code-atom',
  definition: '--iswc-code-definition',
  meta: '--iswc-code-meta',
  qualifier: '--iswc-code-qualifier',
  builtin: '--iswc-code-builtin',
  type: '--iswc-code-type',
  errorHighlight: '--iswc-code-mark-error',
  warningHighlight: '--iswc-code-mark-warning',
  infoHighlight: '--iswc-code-mark-info',
  // Diff / resumen de commit. Van en pares texto + banda: el texto tiene que
  // contrastar contra la banda, no contra el fondo del editor.
  diffAdded: '--iswc-code-diff-added',
  diffAddedBand: '--iswc-code-diff-added-band',
  diffRemoved: '--iswc-code-diff-removed',
  diffRemovedBand: '--iswc-code-diff-removed-band',
  diffHunk: '--iswc-code-diff-hunk',
  diffHunkBand: '--iswc-code-diff-hunk-band',
  diffFile: '--iswc-code-diff-file',
  diffCommit: '--iswc-code-diff-commit',
  diffPath: '--iswc-code-diff-path',
  diffNote: '--iswc-code-diff-note',
});

/** Presets alineados a material-darker / mdn-like del kit. */
export const BUILTIN_THEMES = Object.freeze({
  dark: {
    background: '#1e1e1e',
    foreground: '#eeffff',
    caret: '#FFCC00',
    selection: 'rgba(128, 203, 196, 0.28)',
    gutterBackground: '#1e1e1e',
    gutterForeground: '#546e7a',
    gutterBorder: 'transparent',
    activeLine: 'rgba(0, 0, 0, 0.22)',
    activeGutter: 'rgba(0, 0, 0, 0.22)',
    matchingBracket: '#ffeb3b',
    comment: '#697098',
    keyword: '#c792ea',
    string: '#c3e88d',
    number: '#f78c6c',
    operator: '#89ddff',
    punctuation: '#89ddff',
    function: '#82aaff',
    variable: '#eeffff',
    property: '#80cbc4',
    tag: '#f07178',
    tagPunct: '#ffc1c6',
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
    diffAdded: '#a5e075',
    diffAddedBand: 'rgba(80, 200, 120, 0.16)',
    diffRemoved: '#ff8a8a',
    diffRemovedBand: 'rgba(255, 82, 82, 0.16)',
    diffHunk: '#89ddff',
    diffHunkBand: 'rgba(137, 221, 255, 0.10)',
    diffFile: '#ffcb6b',
    diffCommit: '#c792ea',
    diffPath: '#80cbc4',
    diffNote: '#7f8c99',
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
    tagPunct: '#00004d',
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
    diffAdded: '#15803d',
    diffAddedBand: 'rgba(34, 197, 94, 0.14)',
    diffRemoved: '#b91c1c',
    diffRemovedBand: 'rgba(239, 68, 68, 0.12)',
    diffHunk: '#0369a1',
    diffHunkBand: 'rgba(3, 105, 161, 0.08)',
    diffFile: '#92400e',
    diffCommit: '#6d28d9',
    diffPath: '#0f766e',
    diffNote: '#6b7280',
  },
});

/**
 * Tema monochrome para inline en MD: sin fondo, un solo tono de marca.
 * Los fences (bloque) usan el preset dark/light completo — no este.
 */
export function brandMonoTheme(): CodeThemeConfig {
  const brand = 'var(--iswc-color-brand, var(--iswc-brand, #339af0))';
  const fg = `color-mix(in srgb, ${brand} 58%, var(--iswc-text, #e6e8eb))`;
  return {
    background: 'transparent',
    foreground: fg,
    caret: brand,
    selection: `color-mix(in srgb, ${brand} 22%, transparent)`,
    selectionMatch: `color-mix(in srgb, ${brand} 14%, transparent)`,
    gutterBackground: 'transparent',
    gutterForeground: fg,
    gutterBorder: 'transparent',
    activeLine: 'transparent',
    activeGutter: 'transparent',
    matchingBracket: brand,
    comment: fg,
    keyword: fg,
    string: fg,
    number: fg,
    operator: fg,
    punctuation: fg,
    function: fg,
    variable: fg,
    property: fg,
    tag: fg,
    tagPunct: fg,
    attribute: fg,
    atom: fg,
    definition: fg,
    meta: fg,
    qualifier: fg,
    builtin: fg,
    type: fg,
  };
}

/**
 * @param {HTMLElement} el
 * @param {CodeThemeConfig | null | undefined} theme
 * @param {'dark'|'light'|string} [fallbackPreset]
 */
export function applyThemeConfig(el: HTMLElement, theme: CodeThemeConfig | null | undefined, fallbackPreset: string = 'dark'): Record<string, string> {
  const presets = BUILTIN_THEMES as Record<string, Record<string, string>>;
  const preset = presets[fallbackPreset] ?? presets.dark!;
  const merged: Record<string, string> = { ...preset, ...(theme && typeof theme === 'object' ? theme : {}) };
  for (const [key, prop] of Object.entries(THEME_PROP_MAP)) {
    const value = merged[key];
    if (value == null || value === '') el.style.removeProperty(prop);
    else el.style.setProperty(prop, String(value));
  }
  return merged;
}

/** @param {unknown} raw */
export function parseThemeConfig(raw: unknown) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
}
