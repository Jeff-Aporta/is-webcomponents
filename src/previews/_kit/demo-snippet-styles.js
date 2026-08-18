/**
 * CSS embebible en snippets «Ver código»: clases de layout de la galería
 * (presentation.css) y estilos por preview (campo `styles` del JSON).
 * Sin esto, clases como `.cell-label` o `.panel-demo` no tienen reglas al pegar.
 */

/** Clases compartidas cuyas reglas viven en presentation.css, no en el CDN. */
export const GLOBAL_SNIPPET_CLASS_TRIGGERS = new Set([
  'demo-native-field',
  'demo-locale-grid',
  'demo-locale-card',
  'demo-locale-card__meta',
  'demo-locale-card__name',
  'demo-locale-card__code',
  'format-grid',
  'format-grid--cards',
  'format-grid__row',
  'format-grid__tag',
  'format-grid__value',
  'demo-row',
  'demo-stack',
  'demo-grid',
  'matrix',
  'cell-label',
  'row-label',
  'demo-cell',
  'log',
  'callout',
  'card-grid',
  'card-meta',
  'card-row-actions',
  'card-stage-h',
  'card-demo-img',
]);

/** Extraído de presentation.css — solo helpers replicables en HTML pegable. */
export const GLOBAL_SNIPPET_CSS = `
.demo-native-field {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  padding: 0.5em 0.65em;
  font: inherit;
  color: var(--is-control-text, var(--is-text, inherit));
  background: var(--is-control-bg, #f1f3f5);
  border: 1px solid var(--is-control-border, #adb5bd);
  border-radius: var(--is-radius-sm, 0.375em);
}
.demo-native-field:focus-visible {
  outline: 2px solid var(--is-focus, var(--is-accent, #339af0));
  outline-offset: 1px;
}
textarea.demo-native-field {
  resize: vertical;
  min-height: 4.5em;
}

.demo-locale-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
  gap: 0.65rem;
}
.demo-locale-card {
  display: flex;
  flex-direction: column;
  gap: 0.35em;
  padding: 0.7em 0.85em;
  border: 1px solid var(--is-border-soft);
  border-radius: var(--is-radius-sm);
  background: color-mix(in srgb, var(--is-bg) 55%, transparent);
  min-width: 0;
}
.demo-locale-card__meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5em;
}
.demo-locale-card__name {
  font-size: 0.78rem;
  font-weight: 650;
  color: var(--is-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.demo-locale-card__code {
  flex-shrink: 0;
  font-family: "JetBrains Mono", var(--is-mono);
  font-size: 0.68rem;
  color: var(--is-text-dim);
}
.demo-locale-card is-format-date,
.demo-locale-card is-relative-time {
  font-size: 0.92rem;
  color: var(--is-text-soft);
}

.format-grid {
  display: grid;
  grid-template-columns: minmax(8.5rem, max-content) 1fr;
  gap: 0.4rem 1.25rem;
  margin: 0;
  font-size: 0.92rem;
}
.format-grid__row { display: contents; }
.format-grid__tag {
  align-self: center;
  justify-self: start;
  font-family: var(--is-mono, ui-monospace, Consolas, monospace);
  font-size: 0.78rem;
  letter-spacing: 0.01em;
  color: var(--is-text-soft);
  background: color-mix(in srgb, var(--is-bg-soft) 70%, transparent);
  padding: 0.18em 0.55em;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--is-border) 60%, transparent);
  white-space: nowrap;
}
.format-grid__value {
  align-self: center;
  justify-self: start;
  font-weight: 600;
  font-size: 1rem;
  color: var(--is-text);
  min-width: 0;
}
@media (max-width: 38rem) {
  .format-grid { grid-template-columns: 1fr; gap: 0.25rem 0; }
  .format-grid__row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem 0.75rem;
    align-items: baseline;
  }
  .format-grid__value { flex: 1 1 auto; }
}
.format-grid--cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: 0.75rem;
}
.format-grid--cards .format-grid__row {
  display: grid;
  grid-template-rows: auto 1fr;
  align-content: space-between;
  gap: 0.4rem 0.6rem;
  padding: 0.85rem 1rem;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius, 0.5em);
  background: color-mix(in srgb, var(--is-bg-elev, #1c2128) 70%, transparent);
  min-height: 4.5rem;
}
.format-grid--cards .format-grid__tag {
  align-self: start;
  justify-self: start;
}
.format-grid--cards .format-grid__value {
  align-self: end;
  justify-self: end;
  text-align: right;
  font-size: 1.1rem;
  line-height: 1.25;
}

.demo-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}
.demo-stack > * + * { margin-top: 12px; }
.demo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  align-items: center;
}

.matrix {
  display: grid;
  grid-template-columns: max-content repeat(3, 1fr);
  gap: 10px 14px;
  align-items: center;
}
.matrix > .cell-label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--is-text-dim);
  text-align: center;
}
.matrix > .row-label {
  font-size: 0.82rem;
  color: var(--is-text-soft);
  font-weight: 600;
  grid-column: 1;
}
.matrix > .demo-cell {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-height: 2.75em;
  padding: 8px 10px;
  background: color-mix(in srgb, var(--is-bg) 55%, transparent);
  border: 1px solid var(--is-border-soft);
  border-radius: var(--is-radius-sm);
}

.log {
  background: var(--is-code-bg);
  color: var(--is-code-text);
  font-family: "JetBrains Mono", var(--is-mono);
  font-size: 0.78rem;
  border-radius: var(--is-radius-sm);
  padding: 10px 12px;
  max-height: 160px;
  overflow-y: auto;
  border: 1px solid var(--is-border-soft);
  margin-top: 8px;
  min-height: 2.5em;
}
.log:empty { display: none; }
.log .row { padding: 2px 0; }
.log .t { color: var(--is-text-dim); }
.log .e { color: #74c0fc; }
.log .hint { color: var(--is-text-dim); font-style: italic; }

.callout {
  background: color-mix(in srgb, var(--is-accent) 7%, var(--is-bg-soft));
  border: 1px solid color-mix(in srgb, var(--is-accent) 32%, var(--is-border-soft));
  padding: 12px 16px;
  margin: 14px 0 20px;
  border-radius: var(--is-radius-sm);
  font-size: 0.9rem;
  color: var(--is-text-soft);
  line-height: 1.5;
}
.callout strong { color: var(--is-text); font-weight: 700; }

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin: 14px 0 28px;
}
.card-grid > is-card { align-self: stretch; }
.card-meta {
  font-size: 0.85rem;
  color: var(--is-text-soft);
  margin: 6px 0 0;
  line-height: 1.45;
}
.card-row-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.card-stage-h {
  height: auto;
  min-height: 0;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  padding: 20px;
  margin: 12px 0 28px;
  background: var(--is-bg-soft);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 3%);
  display: flex;
  align-items: flex-start;
}
.card-demo-img {
  display: block;
  width: 100%;
  height: 132px;
  object-fit: cover;
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--is-color-brand) 85%, #fff),
      var(--is-color-brand-stronger));
}
`.trim();

/** @param {string} html */
export function extractClassTokens(html) {
  const set = new Set();
  const re = /class\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    for (const c of m[1].split(/\s+/)) {
      if (c) set.add(c);
    }
  }
  return set;
}

/** @param {Set<string>} classes */
export function needsGlobalSnippetCss(classes) {
  for (const c of classes) {
    if (GLOBAL_SNIPPET_CLASS_TRIGGERS.has(c)) return true;
  }
  return false;
}

/** @param {string} html @param {string} previewStyles */
export function needsPreviewSnippetCss(html, previewStyles) {
  const css = previewStyles?.trim();
  if (!css) return false;
  for (const c of extractClassTokens(html)) {
    if (css.includes(`.${c}`)) return true;
  }
  const idRe = /\bid\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = idRe.exec(html))) {
    if (css.includes(`#${m[1]}`)) return true;
  }
  return false;
}

/**
 * CSS a incluir en el snippet (sin `<style>`). Vacío si no hace falta.
 * @param {string} html Markup del ejemplo
 * @param {string} [previewStyles] Campo `styles` del JSON de preview activo
 */
export function buildDemoSnippetStyles(html, previewStyles = '') {
  const parts = [];
  const classes = extractClassTokens(html);

  if (needsPreviewSnippetCss(html, previewStyles)) {
    parts.push(previewStyles.trim());
  }
  if (needsGlobalSnippetCss(classes)) {
    parts.push(GLOBAL_SNIPPET_CSS);
  }
  return parts.join('\n\n');
}
