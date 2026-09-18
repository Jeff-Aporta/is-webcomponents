/**
 * Behavior migrado desde HTML inline de is-full-calendar.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../../previews/_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext): Promise<void> {
  const root = ctx.main;
  void root;
  const log = document.getElementById('log') as HTMLElement | null;
  const cal = document.querySelector<HTMLElement>('is-full-calendar');
  if (log && cal) {
    cal.addEventListener('is-event-click', (e: Event) => {
      const detail = (e as CustomEvent<{ event: { title: string; date: string; start: string } }>).detail;
      log.textContent = `${detail.event.title} @ ${detail.event.date} ${detail.event.start}\n` + log.textContent;
    });
  }
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}
