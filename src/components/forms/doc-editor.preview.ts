/**
 * Behavior de is-doc-editor: refleja el JSON vivo del editor en el `<pre>`.
 * @param {import('../../previews/_kit/types.d.ts').PreviewMountContext} ctx
 */
let sync: (() => void) | null = null;
let editor: HTMLElement | null = null;

export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext): Promise<void> {
  const doc = ctx.main.querySelector<HTMLElement>('#doc');
  const out = ctx.main.querySelector<HTMLElement>('#out');
  if (!doc || !out) return;

  editor = doc;
  sync = (): void => {
    const blocks = (doc as HTMLElement & { blocks?: unknown[] }).blocks;
    out.textContent = JSON.stringify(blocks, null, 2);
  };
  doc.addEventListener('is-change', sync);
  sync();
}

export function unmount(): void {
  if (editor && sync) editor.removeEventListener('is-change', sync);
  editor = null;
  sync = null;
}
