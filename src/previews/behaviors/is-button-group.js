/**
 * Behavior adapter: reusa mount() de la clase legacy is-button-group.preview.js
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 * @param {import('../_kit/types.d.ts').ISComponentPreviewLike} preview
 */
import PreviewClass from '../actions/is-button-group.preview.js';

export async function mount(ctx, preview) {
  const inst = new PreviewClass();
  // La definition ya viene del JSON; solo reutilizar mount de la clase.
  await inst.mount(ctx);
  preview.__legacy = inst;
}

export function unmount(ctx, preview) {
  preview.__legacy?.unmount?.(ctx);
}
