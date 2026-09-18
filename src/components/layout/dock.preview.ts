/**
 * Behavior migrado desde HTML inline de is-dock.
 * Se ejecuta en mount() tras pintar la definition JSON.
 */
export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext) {
  const root = ctx.main;
  void root;
  const log = document.getElementById('log') as HTMLElement | null;
  if (!log) return;
  function append(line: string): void {
    log!.textContent = line + '\n' + log!.textContent;
    log!.scrollTop = 0;
  }
  document.querySelectorAll<HTMLElement>('is-dock').forEach((d: HTMLElement) => {
    d.addEventListener('is-select', (e: Event) => {
      const detail = (e as CustomEvent<{ item: HTMLElement }>).detail;
      append(`select: ${detail.item.getAttribute('label')}`);
    });
  });
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}
