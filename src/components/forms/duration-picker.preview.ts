/**
 * Behavior migrado desde HTML inline de is-duration-picker.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../../previews/_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext): Promise<void> {
  const root = ctx.main;
  void root;
  const log = document.getElementById('log');
  void log;
  document.querySelectorAll<HTMLElement>('is-duration-picker').forEach((d: HTMLElement) => {
    d.addEventListener('is-change', (e: Event) => {
      const detail = (e as CustomEvent<{ value: number; text: string }>).detail;
      console.log('duration', detail.value, detail.text);
    });
  });
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}
