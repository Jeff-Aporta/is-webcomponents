/**
 * Behavior migrado desde HTML inline de iswc-chart.
 * Se ejecuta en mount() tras pintar la definition JSON.
 */
import type { PreviewMountContext } from '../../../previews/_kit/schemas/preview.schemas.ts';
import type { IswcChart } from '../chart.js';
import type { IswcChartElement } from "../schemas/chart.preview.schemas.js";

export async function mount(ctx: PreviewMountContext): Promise<void> {
  const root = ctx.main;
  void root;
  await customElements.whenDefined('iswc-chart');
  const el = document.querySelector<HTMLElement>('#jsChart') as IswcChartElement | null;
  if (!el) return;
  el.config = {
    data: {
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      datasets: [{ label: 'Ventas', data: [420, 580, 630, 710], tension: 0.4, fill: true }],
    },
  };
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}
