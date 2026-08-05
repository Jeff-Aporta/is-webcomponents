/**
 * Behavior de is-doc-editor: refleja el JSON vivo del editor en el `<pre>`.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
let sync = null;
let editor = null;

export async function mount(ctx) {
  const doc = ctx.main.querySelector('#doc');
  const out = ctx.main.querySelector('#out');
  if (!doc || !out) return;

  editor = doc;
  sync = () => { out.textContent = JSON.stringify(doc.blocks, null, 2); };
  doc.addEventListener('is-change', sync);
  sync();
}

export function unmount() {
  if (editor && sync) editor.removeEventListener('is-change', sync);
  editor = null;
  sync = null;
}
