/**
 * Behavior migrado desde HTML inline de is-switch.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../../previews/_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext): Promise<void> {
  const root = ctx.main;
  void root;
  await customElements.whenDefined('is-switch');

  const log = document.getElementById('swLog') as HTMLElement | null;
  document.querySelectorAll<HTMLElement & { name: string }>('#intro is-switch[name]').forEach((sw) => {
    sw.addEventListener('is-change', (e: Event) => {
      const detail = (e as CustomEvent<{ checked: boolean }>).detail;
      if (log) {
        log.innerHTML = `<div class="row"><span class="t">${sw.name}</span> <span class="e">${detail.checked ? 'activado' : 'apagado'}</span></div>`;
      }
    });
  });

  const form = document.getElementById('demoForm') as HTMLFormElement | null;
  const formLog = document.getElementById('formLog') as HTMLElement | null;
  if (form && formLog) {
    form.addEventListener('submit', (e: Event) => {
      e.preventDefault();
      const entries = [...new FormData(form)].map(([k, v]) => `${k}=${v}`);
      formLog.innerHTML = `<div class="row"><span class="e">${entries.join(' · ') || 'sin entradas'}</span></div>`;
    });
    form.addEventListener('reset', () => {
      formLog.innerHTML = '<div class="row hint">Formulario reiniciado.</div>';
    });
    document.getElementById('btnSend')?.addEventListener('click', () => form.requestSubmit());
    document.getElementById('btnReset')?.addEventListener('click', () => form.reset());
  }
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}
