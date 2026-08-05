/**
 * Behavior migrado desde HTML inline de is-progress-bar.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
  await customElements.whenDefined('is-progress-bar');
      await customElements.whenDefined('is-button');
  
      let value = 0;
      const bar = document.getElementById('pbLive');
      const pct = document.getElementById('pbPct');
      const status = document.getElementById('pbStatus');
  
      const sync = () => {
        bar.value = value;
        bar.label = `Progreso ${value}%`;
        pct.textContent = String(value);
        if (value <= 0) status.textContent = 'Listo para empezar';
        else if (value >= 100) status.textContent = 'Completado';
        else status.textContent = `Avance · click ${Math.round(value / 10)}`;
      };
  
      document.getElementById('pbPlus').addEventListener('click', () => {
        value = Math.min(100, value + 10);
        sync();
      });
      document.getElementById('pbMinus').addEventListener('click', () => {
        value = Math.max(0, value - 10);
        sync();
      });
      document.getElementById('pbReset').addEventListener('click', () => {
        value = 0;
        sync();
      });
      sync();
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
