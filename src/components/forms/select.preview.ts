/**
 * Behavior migrado desde HTML inline de is-select.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../../previews/_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext): Promise<void> {
  const root = ctx.main;
  void root;
  const sel = document.getElementById('sel') as HTMLElement | null;
  const logSingle = document.getElementById('log-single') as HTMLElement | null;
  if (sel && logSingle) {
    sel.addEventListener('is-change', (e: Event) => {
      const detail = (e as CustomEvent<{ value: string }>).detail;
      logSingle.textContent = `value: ${detail.value || '—'}`;
    });
  }

  const multi = document.getElementById('multi') as (HTMLElement & { values?: string[] }) | null;
  const logMulti = document.getElementById('log-multi') as HTMLElement | null;
  if (multi && logMulti) {
    const paint = (): void => { logMulti.textContent = `values: ${(multi.values ?? []).join(', ') || '—'}`; };
    multi.addEventListener('is-change', paint);
    paint();
  }

  const form = document.getElementById('demo-form') as HTMLFormElement | null;
  const logForm = document.getElementById('log-form') as HTMLElement | null;
  if (form && logForm) {
    form.addEventListener('submit', (e: Event) => {
      e.preventDefault();
      const entries = [...new FormData(form).entries()].map(([k, v]) => `${k}=${v}`);
      logForm.textContent = `FormData: ${entries.join(' · ') || 'vacío'}`;
    });
    form.addEventListener('reset', () => { logForm.textContent = 'FormData: —'; });
  }
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}
