/**
 * Behavior migrado desde HTML inline de is-switch.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
  await customElements.whenDefined('is-switch');
  
      const log = document.getElementById('swLog');
      document.querySelectorAll('#intro is-switch[name]').forEach((sw) => {
        sw.addEventListener('is-change', (e) => {
          log.innerHTML = `<div class="row"><span class="t">${sw.name}</span> <span class="e">${e.detail.checked ? 'activado' : 'apagado'}</span></div>`;
        });
      });
  
      const form = document.getElementById('demoForm');
      const formLog = document.getElementById('formLog');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const entries = [...new FormData(form)].map(([k, v]) => `${k}=${v}`);
        formLog.innerHTML = `<div class="row"><span class="e">${entries.join(' · ') || 'sin entradas'}</span></div>`;
      });
      form.addEventListener('reset', () => {
        formLog.innerHTML = '<div class="row hint">Formulario reiniciado.</div>';
      });
      document.getElementById('btnSend').addEventListener('click', () => form.requestSubmit());
      document.getElementById('btnReset').addEventListener('click', () => form.reset());
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
