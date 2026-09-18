/**
 * Behavior migrado desde HTML inline de is-input.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../../previews/_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext): Promise<void> {
  const root = ctx.main;
  void root;
  const demo = document.getElementById('demo') as HTMLElement | null;
  const log = document.getElementById('log') as HTMLElement | null;
  if (demo && log) {
    demo.addEventListener('is-input', (e: Event) => {
      const detail = (e as CustomEvent<{ value: unknown }>).detail;
      log.innerHTML = `value: <code class="code">${JSON.stringify(detail.value)}</code>`;
    });
  }

  const reportErr = document.getElementById('reportErr') as (HTMLElement & { reportValidity?: () => boolean }) | null;
  document.getElementById('btnReport')?.addEventListener('click', () => reportErr?.reportValidity?.());

  const autoErr = document.getElementById('autoErr') as (HTMLElement & { error?: boolean }) | null;
  document.getElementById('btnToggleErr')?.addEventListener('click', () => {
    if (autoErr) autoErr.error = !autoErr.error;
  });

  const f = document.getElementById('f') as HTMLFormElement | null;
  const out = document.getElementById('out') as HTMLElement | null;
  if (f && out) {
    f.addEventListener('submit', (e: Event) => {
      e.preventDefault();
      const data = [...new FormData(f)].map(([k, v]) => `${k}=${v}`).join(' · ');
      out.textContent = `FormData: ${data || '—'}`;
    });
    f.addEventListener('reset', () => { out.textContent = 'FormData: —'; });
  }
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}
