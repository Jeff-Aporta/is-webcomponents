/**
 * Behavior migrado desde HTML inline de is-org-chart.
 * Se ejecuta en mount() tras pintar la definition JSON.
 */
interface OrgSelectDetail { node: { title?: string; name?: string; } }
interface OrgToggleDetail { id: string; collapsed: boolean; }

export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext): Promise<void> {
  void ctx.main;
  const log = document.getElementById('log');
  for (const org of document.querySelectorAll<HTMLElement>('is-org-chart')) {
    org.addEventListener('is-select', (e: Event) => {
      if (!log) return;
      const detail = (e as CustomEvent<OrgSelectDetail>).detail;
      log.textContent = `[${org.id}] ${detail.node.title || ''}: ${detail.node.name}\n` + log.textContent;
    });
    org.addEventListener('is-toggle', (e: Event) => {
      if (!log) return;
      const detail = (e as CustomEvent<OrgToggleDetail>).detail;
      log.textContent = `[${org.id}] toggle ${detail.id} → collapsed=${detail.collapsed}\n` + log.textContent;
    });
    org.addEventListener('is-open-viewer', () => {
      if (!log) return;
      log.textContent = `[${org.id}] abrir visor\n` + log.textContent;
    });
  }
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}
