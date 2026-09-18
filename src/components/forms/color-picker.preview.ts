/**
 * Behavior migrado desde HTML inline de is-color-picker.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../../previews/_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext): Promise<void> {
  const root = ctx.main;
  void root;
  const cp = document.getElementById('cp') as HTMLElement | null;
  const chip = document.getElementById('chip') as HTMLElement | null;
  const log = document.getElementById('log') as HTMLElement | null;
  if (cp && chip && log) {
    cp.addEventListener('is-input', (e: Event) => {
      const detail = (e as CustomEvent<{ value: string }>).detail;
      chip.style.background = detail.value;
      log.textContent = `value: ${detail.value}`;
    });
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
