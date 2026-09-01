/**
 * Behavior migrado desde HTML inline de is-checkbox.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../_kit/types.d.ts').PreviewMountContext) {
  const root = ctx.main;
  void root;
  await customElements.whenDefined('is-checkbox');
  
      const parent = document.getElementById('parentBox');
      const children = [...document.querySelectorAll<HTMLElement>('.childBox')];
      const syncParent = () => {
        const all = children.every((c) => c.checked);
        parent.checked = all;
        parent.indeterminate = !all && children.some((c) => c.checked);
      };
      parent.addEventListener('is-change', (e) => {
        children.forEach((c) => { c.checked = e.detail.checked; });
        syncParent();
      });
      children.forEach((c) => c.addEventListener('is-change', syncParent));
      syncParent();
  
      const form = document.getElementById('demoForm');
      const log = document.getElementById('formLog');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const entries = [...new FormData(form)].map(([k, v]) => `${k}=${v}`);
        log.innerHTML = `<div class="row"><span class="e">${entries.join(' · ') || 'sin entradas'}</span></div>`;
      });
      form.addEventListener('reset', () => {
        log.innerHTML = '<div class="row hint">Formulario reiniciado.</div>';
      });
      document.getElementById('btnSend').addEventListener('click', () => form.requestSubmit());
      document.getElementById('btnReset').addEventListener('click', () => form.reset());
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
