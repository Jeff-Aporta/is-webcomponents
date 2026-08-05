/**
 * Behavior migrado desde HTML inline de is-chart.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
  await customElements.whenDefined('is-chart');
      const el = document.querySelector('#jsChart');
      el.config = {
        data: {
          labels: ['Q1', 'Q2', 'Q3', 'Q4'],
          datasets: [{ label: 'Ventas', data: [420, 580, 630, 710], tension: 0.4, fill: true }],
        },
      };
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
