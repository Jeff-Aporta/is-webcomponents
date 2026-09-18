/**
 * Behavior migrado desde HTML inline de is-pivot-table.
 * Se ejecuta en mount() tras pintar la definition JSON.
 */
import type { PreviewMountContext } from '../../previews/_kit/types.d.ts';

interface CellClickDetail {
  row: string;
  col: string;
  value: unknown;
}

export async function mount(ctx: PreviewMountContext): Promise<void> {
  const root = ctx.main;
  void root;
  const log = document.getElementById('log');
  document.querySelectorAll<HTMLElement>('is-pivot-table').forEach((p) => {
    p.addEventListener('is-cell-click', (e: Event) => {
      const detail = (e as CustomEvent<CellClickDetail>).detail;
      if (!log) return;
      log.textContent = `${detail.row} · ${detail.col} = ${detail.value}\n${log.textContent}`;
    });
  });
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}
