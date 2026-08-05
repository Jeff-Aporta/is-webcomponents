/**
 * Behavior migrado desde HTML inline de is-scatter-chart.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
  await customElements.whenDefined('is-scatter-chart');
      document.querySelector('#scatterJs').config = {
        data: {
          datasets: [{
            label: 'Students',
            data: [
              { x: 2, y: 65 }, { x: 3, y: 72 }, { x: 4, y: 78 }, { x: 5, y: 82 },
              { x: 6, y: 88 }, { x: 7, y: 85 }, { x: 8, y: 92 }, { x: 9, y: 95 },
            ],
          }],
        },
      };
      document.querySelector('#scatterMulti').config = {
        data: {
          datasets: [
            {
              label: 'Tutored',
              data: [
                { x: 3, y: 78 }, { x: 4, y: 82 }, { x: 5, y: 86 }, { x: 6, y: 90 }, { x: 7, y: 94 },
              ],
            },
            {
              label: 'Self-study',
              data: [
                { x: 3, y: 68 }, { x: 4, y: 72 }, { x: 5, y: 77 }, { x: 7, y: 84 }, { x: 8, y: 89 },
              ],
            },
          ],
        },
      };
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
