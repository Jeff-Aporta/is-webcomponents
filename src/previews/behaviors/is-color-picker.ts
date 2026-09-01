/**
 * Behavior migrado desde HTML inline de is-color-picker.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../_kit/types.d.ts').PreviewMountContext) {
  const root = ctx.main;
  void root;
  const cp = document.getElementById('cp');
      const chip = document.getElementById('chip');
      const log = document.getElementById('log');
      cp.addEventListener('is-input', (e) => {
        chip.style.background = e.detail.value;
        log.textContent = `value: ${e.detail.value}`;
      });
  
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
