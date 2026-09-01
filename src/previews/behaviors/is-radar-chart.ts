/**
 * Behavior migrado desde HTML inline de is-radar-chart.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../_kit/types.d.ts').PreviewMountContext) {
  const root = ctx.main;
  void root;
  await customElements.whenDefined('is-radar-chart');
      document.querySelector<HTMLElement>('#radarJs').config = {
        data: {
          labels: ['Speed', 'Reliability', 'Ease of Use', 'Features', 'Support'],
          datasets: [{ label: 'Product A', data: [85, 90, 75, 80, 70], fill: true }],
        },
      };
      document.querySelector<HTMLElement>('#radarMulti').config = {
        data: {
          labels: ['Speed', 'Reliability', 'Ease of Use', 'Features', 'Support', 'Value'],
          datasets: [
            { label: 'Nimbus', data: [85, 90, 75, 80, 70, 88], fill: true },
            { label: 'Atlas', data: [70, 80, 90, 85, 92, 75], fill: true },
          ],
        },
      };
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
