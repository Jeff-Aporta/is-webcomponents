/**
 * Playground <is-loading-overlay>: show/hide desde los botones del demo.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 * @param {import('../_kit/types.d.ts').ISComponentPreviewLike} preview
 */
export async function mount(ctx, preview) {
  const root = ctx.main;
  const signal = preview?.signal;

  const wire = (btnId, overlayId, ms = 2000) => {
    const btn = root.querySelector(`#${btnId}`);
    const ov = root.querySelector(`#${overlayId}`);
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

export function unmount() {
  /* AbortSignal del preview limpia listeners */
}
