/**
 * Behavior migrado desde HTML inline de is-checkbox.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../../previews/_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext): Promise<void> {
  const root = ctx.main;
  void root;
  await customElements.whenDefined('is-checkbox');

  const parent = document.getElementById('parentBox') as (HTMLElement & { checked: boolean; indeterminate: boolean }) | null;
  const children = [...document.querySelectorAll<HTMLElement>('.childBox')] as (HTMLElement & { checked: boolean })[];
  if (parent) {
    const syncParent = (): void => {
      const all = children.every((c) => c.checked);
      parent.checked = all;
      parent.indeterminate = !all && children.some((c) => c.checked);
    };
    parent.addEventListener('is-change', (e: Event) => {
      const detail = (e as CustomEvent<{ checked: boolean }>).detail;
      children.forEach((c) => { c.checked = detail.checked; });
      syncParent();
    });
    children.forEach((c) => c.addEventListener('is-change', syncParent));
    syncParent();
  }

  const form = document.getElementById('demoForm') as HTMLFormElement | null;
  const log = document.getElementById('formLog') as HTMLElement | null;
  if (form && log) {
    form.addEventListener('submit', (e: Event) => {
      e.preventDefault();
      const entries = [...new FormData(form)].map(([k, v]) => `${k}=${v}`);
      log.innerHTML = `<div class="row"><span class="e">${entries.join(' · ') || 'sin entradas'}</span></div>`;
    });
    form.addEventListener('reset', () => {
      log.innerHTML = '<div class="row hint">Formulario reiniciado.</div>';
    });
    const btnSend = document.getElementById('btnSend');
    const btnReset = document.getElementById('btnReset');
    btnSend?.addEventListener('click', () => form.requestSubmit());
    btnReset?.addEventListener('click', () => form.reset());
  }
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}
