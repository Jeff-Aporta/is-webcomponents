/**
 * Behavior migrado desde HTML inline de is-toast.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../_kit/types.d.ts').PreviewMountContext) {
  const root = ctx.main;
  // El JSON de demos solo trae botones; el contenedor vive a nivel de página.
  let toaster = document.getElementById('toaster');
  if (!toaster) {
    toaster = document.createElement('is-toast');
    toaster.id = 'toaster';
    toaster.setAttribute('placement', 'top-end');
    (document.body || root).append(toaster);
  }

  const wait = (ms, fail) => new Promise((res, rej) =>
    setTimeout(() => (fail ? rej(new Error('timeout del servidor')) : res({ total: 42 })), ms));

  const on = (id, fn) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', fn);
  };

  on('btn-promise-ok', () => {
    toaster.promise(wait(1500), {
      loading: 'Guardando…',
      success: 'Guardado',
      error: 'No se pudo guardar',
    }).catch(() => {});
  });
  on('btn-promise-err', () => {
    toaster.promise(wait(1500, true), {
      loading: 'Guardando…',
      success: 'Guardado',
      error: (err) => `Falló: ${err.message}`,
    }).catch(() => {});
  });
  on('btn-promise-dynamic', () => {
    toaster.promise(wait(1800), {
      loading: 'Cargando filas…',
      success: (data) => `${data.total} filas cargadas`,
      error: (err) => `Falló: ${err.message}`,
    }).catch(() => {});
  });

  on('btn-brand', () => {
    toaster.create('Mensaje brand', { variant: 'brand' });
  });
  on('btn-success', () => {
    toaster.create('Operación correcta', { variant: 'success' });
  });
  on('btn-warning', () => {
    toaster.create('Revisa los datos', { variant: 'warning' });
  });
  on('btn-danger', () => {
    toaster.create('Error al guardar', { variant: 'danger' });
  });
  on('btn-sticky', () => {
    toaster.create('Quédate hasta cerrar', { variant: 'neutral', duration: 0 });
  });

  root.querySelectorAll<HTMLElement>('[data-place]').forEach((btn: HTMLElement) => {
    btn.addEventListener('click', () => {
      const placement = btn.dataset.place;
      toaster.placement = placement;
      toaster.create(placement, { variant: 'brand' });
    });
  });
}

export function unmount() {
  /* listeners: teardown no crítico en galería (main se vacía al cambiar preview) */
}
