/**
 * Behavior migrado desde HTML inline de is-full-calendar.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
  const log = document.getElementById('log');
      document.querySelector('is-full-calendar').addEventListener('is-event-click', (e) => log.textContent = `${e.detail.event.title} @ ${e.detail.event.date} ${e.detail.event.start}\n` + log.textContent);
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
