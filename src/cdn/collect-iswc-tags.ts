/** Tags `is-*` en markup o JSON de preview. Sin DOM. */

export const GALLERY_CHROME_TAGS = [
  'iswc-dropdown',
  'iswc-copy-button',
  'iswc-code',
  'iswc-icon',
  'iswc-button',
  'iswc-cdn-snippet',
  'iswc-md-editor',
  'iswc-format-bytes',
  'iswc-tooltip',
  'iswc-dialog',
  'iswc-switch',
  'iswc-tab-group',
];

export function collectIsTags(...chunks: unknown[]) {
  const set = new Set<string>();
  for (const chunk of chunks) {
    if (chunk == null) continue;
    const text = typeof chunk === 'string' ? chunk : JSON.stringify(chunk);
    for (const m of text.matchAll(/<(iswc-[a-z0-9-]+)/gi)) {
      set.add(m[1]!.toLowerCase());
    }
  }
  return [...set].sort();
}
