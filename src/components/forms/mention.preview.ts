/**
 * Behavior migrado desde HTML inline de is-mention.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../../previews/_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext): Promise<void> {
  const root = ctx.main;
  void root;
  const log = document.getElementById('log') as HTMLElement | null;
  if (!log) return;
  const append = (line: string): void => { log.textContent = line + '\n' + log.textContent; log.scrollTop = 0; };
  document.querySelectorAll<HTMLElement>('is-mention').forEach((m: HTMLElement) => {
    m.addEventListener('is-select', (e: Event) => {
      const detail = (e as CustomEvent<{ trigger: string; item: string }>).detail;
      append(`select ${detail.trigger}${detail.item}`);
    });
    m.addEventListener('is-change', (e: Event) => {
      const detail = (e as CustomEvent<{ value: string }>).detail;
      append(`change: ${detail.value}`);
    });
  });
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}
