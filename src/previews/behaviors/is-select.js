/**
 * Behavior migrado desde HTML inline de is-select.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
  const sel = document.getElementById('sel');
      const logSingle = document.getElementById('log-single');
      sel.addEventListener('is-change', (e) => { logSingle.textContent = `value: ${e.detail.value || '—'}`; });
  
      const multi = document.getElementById('multi');
      const logMulti = document.getElementById('log-multi');
      const paint = () => { logMulti.textContent = `values: ${multi.values.join(', ') || '—'}`; };
      multi.addEventListener('is-change', paint);
      paint();
  
      const form = document.getElementById('demo-form');
      const logForm = document.getElementById('log-form');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const entries = [...new FormData(form).entries()].map(([k, v]) => `${k}=${v}`);
        logForm.textContent = `FormData: ${entries.join(' · ') || 'vacío'}`;
      });
      form.addEventListener('reset', () => { logForm.textContent = 'FormData: —'; });
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
