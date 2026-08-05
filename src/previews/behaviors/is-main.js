/**
 * Behavior migrado desde HTML inline de is-main.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
  const main = document.querySelector('is-main');
      const log = document.getElementById('scrollLog');
      const tick = () => { log.textContent = `scrollTop = ${Math.round(main.scrollTop)}`; };
      main.addEventListener('scroll', tick, { passive: true });
      tick();
      document.getElementById('btnTop')?.addEventListener('click', () => main.scrollToTop({ behavior: 'smooth' }));
      document.getElementById('btnClear')?.addEventListener('click', () => { main.clearRememberedScroll(); main.scrollToTop(); });
      document.getElementById('btnSave')?.addEventListener('click', () => main.saveScroll());
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
