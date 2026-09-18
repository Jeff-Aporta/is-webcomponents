/**
 * Behavior migrado desde HTML inline de is-mega-menu.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../../previews/_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext): Promise<void> {
  const root = ctx.main;
  void root;
  const log = document.getElementById('log');
  if (!log) return;
  document.querySelectorAll<HTMLElement>('is-mega-menu').forEach((m: HTMLElement) => {
    m.addEventListener('is-select', (e: Event) => {
      const detail = (e as CustomEvent<{ href: string; text: string }>).detail;
      log.textContent = `${detail.href} (${detail.text})\n${log.textContent || ''}`;
    });
  });
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}
