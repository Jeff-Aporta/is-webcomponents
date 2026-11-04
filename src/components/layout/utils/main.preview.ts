/**
 * Behavior migrado desde HTML inline de iswc-main.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('@jeff-aporta/iswc-base/previews/_kit/schemas/preview.schemas.ts').PreviewMountContext} ctx
 */

import type { MainEl } from "@jeff-aporta/iswc-base/components/layout/schemas/main.preview.schemas.js";
export async function mount(ctx: import('@jeff-aporta/iswc-base/previews/_kit/schemas/preview.schemas.ts').PreviewMountContext): Promise<void> {
  void ctx.main;
  const main = document.querySelector<MainEl>('iswc-main');
  const log = document.getElementById('scrollLog');
  if (!main || !log) return;
  const tick = (): void => { log.textContent = `scrollTop = ${Math.round(main.scrollTop)}`; };
  main.addEventListener('scroll', tick, { passive: true });
  tick();
  document.getElementById('btnTop')?.addEventListener('click', () => main.scrollToTop({ behavior: 'smooth' }));
  document.getElementById('btnClear')?.addEventListener('click', () => {
    main.clearRememberedScroll();
    main.scrollToTop();
  });
  document.getElementById('btnSave')?.addEventListener('click', () => main.saveScroll());
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}