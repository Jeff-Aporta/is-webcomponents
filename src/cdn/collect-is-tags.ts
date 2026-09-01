/** Tags `is-*` en markup o JSON de preview. Sin DOM. */

export const GALLERY_CHROME_TAGS = [
  'is-dropdown',
  'is-copy-button',
  'is-code',
  'is-icon',
  'is-button',
  'is-cdn-snippet',
  'is-md-editor',
  'is-format-bytes',
  'is-tooltip',
  'is-dialog',
  'is-switch',
  'is-tab-group',
];

export function collectIsTags(...chunks) {
  const set = new Set();
  for (const chunk of chunks) {
    if (chunk == null) continue;
    const text = typeof chunk === 'string' ? chunk : JSON.stringify(chunk);
    for (const m of text.matchAll(/<(is-[a-z0-9-]+)/gi)) {
      set.add(m[1].toLowerCase());
    }
  }
  return [...set].sort();
}
