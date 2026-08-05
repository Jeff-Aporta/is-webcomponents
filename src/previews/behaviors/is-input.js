/**
 * Behavior migrado desde HTML inline de is-input.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
  const demo = document.getElementById('demo');
      const log = document.getElementById('log');
      demo.addEventListener('is-input', (e) => {
        log.innerHTML = `value: <code class="code">${JSON.stringify(e.detail.value)}</code>`;
      });
  
      const reportErr = document.getElementById('reportErr');
      document.getElementById('btnReport').addEventListener('click', () => reportErr.reportValidity());
  
      const autoErr = document.getElementById('autoErr');
      document.getElementById('btnToggleErr').addEventListener('click', () => {
        autoErr.error = !autoErr.error;
      });
  
      const f = document.getElementById('f');
      const out = document.getElementById('out');
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = [...new FormData(f)].map(([k, v]) => `${k}=${v}`).join(' · ');
        out.textContent = `FormData: ${data || '—'}`;
      });
      f.addEventListener('reset', () => { out.textContent = 'FormData: —'; });
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
