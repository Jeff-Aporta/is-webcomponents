/**
 * Behavior migrado desde HTML inline de iswc-heatmap.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../../previews/_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext): Promise<void> {
  const root = ctx.main;
  void root;
  const log = document.getElementById('log');
  if (!log) return;
  const append = (line: string): void => { log.textContent = line + '\n' + log.textContent; log.scrollTop = 0; };
  document.querySelectorAll<HTMLElement>('iswc-heatmap').forEach((h: HTMLElement) => {
    h.addEventListener('iswc-cell-hover', (e: Event) => {
      const detail = (e as CustomEvent<{ x: unknown; y: unknown; value: number }>).detail;
      append(`${detail.x} · ${detail.y} = ${detail.value}`);
    });
  });
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}