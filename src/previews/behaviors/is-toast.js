/**
 * Behavior migrado desde HTML inline de is-toast.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
  const toaster = document.getElementById('toaster');
  
      const wait = (ms, fail) => new Promise((res, rej) =>
        setTimeout(() => (fail ? rej(new Error('timeout del servidor')) : res({ total: 42 })), ms));
  
      document.getElementById('btn-promise-ok').addEventListener('click', () => {
        toaster.promise(wait(1500), {
          loading: 'Guardando…',
          success: 'Guardado',
          error: 'No se pudo guardar',
        }).catch(() => {});
      });
      document.getElementById('btn-promise-err').addEventListener('click', () => {
        toaster.promise(wait(1500, true), {
          loading: 'Guardando…',
          success: 'Guardado',
          error: (err) => `Falló: ${err.message}`,
        }).catch(() => {});
      });
      document.getElementById('btn-promise-dynamic').addEventListener('click', () => {
        toaster.promise(wait(1800), {
          loading: 'Cargando filas…',
          success: (data) => `${data.total} filas cargadas`,
          error: (err) => `Falló: ${err.message}`,
        }).catch(() => {});
      });
  
      document.getElementById('btn-brand').addEventListener('click', () => {
        toaster.create('Mensaje brand', { variant: 'brand' });
      });
      document.getElementById('btn-success').addEventListener('click', () => {
        toaster.create('Operación correcta', { variant: 'success' });
      });
      document.getElementById('btn-warning').addEventListener('click', () => {
        toaster.create('Revisa los datos', { variant: 'warning' });
      });
      document.getElementById('btn-danger').addEventListener('click', () => {
        toaster.create('Error al guardar', { variant: 'danger' });
      });
      document.getElementById('btn-sticky').addEventListener('click', () => {
        toaster.create('Quédate hasta cerrar', { variant: 'neutral', duration: 0 });
      });
  
      document.querySelectorAll('[data-place]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const placement = btn.dataset.place;
          toaster.placement = placement;
          toaster.create(placement, { variant: 'brand' });
        });
      });
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
