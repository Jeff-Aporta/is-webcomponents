/**
 * Behavior migrado desde HTML inline de is-main.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../../previews/_kit/types.d.ts').PreviewMountContext} ctx
 */

interface MainEl extends HTMLElement {
  scrollToTop(opts?: ScrollToOptions): void;
  saveScroll(): void;
  clearRememberedScroll(): void;
}

export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext): Promise<void> {
  void ctx.main;
  const main = document.querySelector<MainEl>('is-main');
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