/**
 * Behavior adapter: reusa mount() de la clase legacy is-button-group.preview.js
 */
import type { PreviewMountContext, ISComponentPreviewLike } from '../../previews/_kit/types.d.ts';
import PreviewClass from './button-group.preview.controller.js';

interface PreviewWithLegacy extends ISComponentPreviewLike {
  __legacy?: { mount?: (ctx: PreviewMountContext) => void | Promise<void>; unmount?: (ctx: PreviewMountContext) => void };
}

export async function mount(ctx: PreviewMountContext, preview: ISComponentPreviewLike): Promise<void> {
  const inst = new PreviewClass();
  // La definition ya viene del JSON; solo reutilizar mount de la clase.
  await inst.mount(ctx);
  (preview as PreviewWithLegacy).__legacy = inst;
}

export function unmount(ctx: PreviewMountContext, preview: ISComponentPreviewLike): void {
  (preview as PreviewWithLegacy).__legacy?.unmount?.(ctx);
}
