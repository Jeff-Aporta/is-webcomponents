/**
 * Behavior migrado desde HTML inline de is-radar-chart.
 * Se ejecuta en mount() tras pintar la definition JSON.
 */
import type { PreviewMountContext } from '../../previews/_kit/types.d.ts';

interface RadarChartLike extends HTMLElement {
  config: {
    data: {
      labels: string[];
      datasets: Array<{ label: string; data: number[]; fill: boolean }>;
    };
  };
}

export async function mount(ctx: PreviewMountContext): Promise<void> {
  const root = ctx.main;
  void root;
  await customElements.whenDefined('is-radar-chart');
  const single = document.querySelector<RadarChartLike>('#radarJs');
  if (single) {
    single.config = {
      data: {
        labels: ['Speed', 'Reliability', 'Ease of Use', 'Features', 'Support'],
        datasets: [{ label: 'Product A', data: [85, 90, 75, 80, 70], fill: true }],
      },
    };
  }
  const multi = document.querySelector<RadarChartLike>('#radarMulti');
  if (multi) {
    multi.config = {
      data: {
        labels: ['Speed', 'Reliability', 'Ease of Use', 'Features', 'Support', 'Value'],
        datasets: [
          { label: 'Nimbus', data: [85, 90, 75, 80, 70, 88], fill: true },
          { label: 'Atlas', data: [70, 80, 90, 85, 92, 75], fill: true },
        ],
      },
    };
  }
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}
