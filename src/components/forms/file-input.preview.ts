/**
 * Behavior migrado desde HTML inline de is-file-input.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../../previews/_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext): Promise<void> {
  const root = ctx.main;
  void root;
  const fi = document.getElementById('fi') as HTMLElement | null;
  const log = document.getElementById('log') as HTMLElement | null;
  if (fi && log) {
    fi.addEventListener('is-change', (e: Event) => {
      const detail = (e as CustomEvent<{ files: File[] }>).detail;
      const names = detail.files.map((f: File) => f.name).join(', ');
      log.textContent = `Archivos: ${detail.files.length} — ${names || 'ninguno'}`;
    });
  }
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}
