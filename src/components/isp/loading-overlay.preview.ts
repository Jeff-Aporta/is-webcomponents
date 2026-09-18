/**
 * Playground <is-loading-overlay>: show/hide desde los botones del demo.
 */
import type { PreviewMountContext, ISComponentPreviewLike } from '../../previews/_kit/types.d.ts';

interface LoadingOverlayLike extends HTMLElement {
  show(): void;
  hide(): void;
}

export async function mount(ctx: PreviewMountContext, preview: ISComponentPreviewLike): Promise<void> {
  const root = ctx.main;
  const signal = preview?.signal;

  const wire = (btnId: string, overlayId: string, ms: number = 2000): void => {
    const btn = root.querySelector<HTMLElement>(`#${btnId}`);
    const ov = root.querySelector<LoadingOverlayLike>(`#${overlayId}`);
    if (!btn || !ov) return;

    const opts = signal ? { signal } : undefined;
    btn.addEventListener('click', () => {
      ov.show();
      window.setTimeout(() => {
        if (signal?.aborted) return;
        ov.hide();
      }, ms);
    }, opts);
  };

  wire('loBtn', 'loDemo', 2000);
  wire('loBtn2', 'loDemo2', 2000);
}

export function unmount(): void {
  /* AbortSignal del preview limpia listeners */
}
