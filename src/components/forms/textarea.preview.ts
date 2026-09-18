/**
 * Behavior migrado desde HTML inline de is-textarea.
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
      const detail = (e as CustomEvent<{ value: string }>).detail;
      log.textContent = `${detail.value.length} caracteres`;
    });
  }

  const autoErr = document.getElementById('autoErr') as (HTMLElement & { reportValidity?: () => boolean }) | null;
  document.getElementById('btnReport')?.addEventListener('click', () => autoErr?.reportValidity?.());

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
