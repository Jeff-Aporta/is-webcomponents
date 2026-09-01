/**
 * Behavior migrado desde HTML inline de is-textarea.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../_kit/types.d.ts').PreviewMountContext) {
  const root = ctx.main;
  void root;
  const demo = document.getElementById('demo');
      const log = document.getElementById('log');
      demo.addEventListener('is-input', (e) => {
        log.textContent = `${e.detail.value.length} caracteres`;
      });
  
      const autoErr = document.getElementById('autoErr');
      document.getElementById('btnReport').addEventListener('click', () => autoErr.reportValidity());
  
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
