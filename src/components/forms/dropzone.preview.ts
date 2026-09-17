/**
 * Behavior migrado desde HTML inline de is-dropzone.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../../previews/_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext): Promise<void> {
  const root = ctx.main;
  void root;
  const dz = document.getElementById('dz') as (HTMLElement & { upload?: () => void }) | null;
  const log = document.getElementById('log') as HTMLElement | null;
  if (!dz || !log) return;
  const append = (line: string): void => { log.textContent = line + '\n' + log.textContent; log.scrollTop = 0; };
  dz.addEventListener('is-files-change', (e: Event) => {
    const detail = (e as CustomEvent<{ files: unknown[] }>).detail;
    append(`files: ${detail.files.length}`);
  });
  dz.addEventListener('is-upload-start', (e: Event) => {
    const detail = (e as CustomEvent<{ file: File }>).detail;
    append(`start: ${detail.file.name}`);
  });
  dz.addEventListener('is-upload-progress', (e: Event) => {
    const detail = (e as CustomEvent<{ file: File; progress: number }>).detail;
    append(`progress: ${detail.file.name} ${detail.progress}%`);
  });
  dz.addEventListener('is-upload-end', (e: Event) => {
    const detail = (e as CustomEvent<{ file: File; ok: boolean }>).detail;
    append(`end: ${detail.file.name} ok=${detail.ok}`);
  });
  dz.addEventListener('is-error', (e: Event) => {
    const detail = (e as CustomEvent<{ reason: string }>).detail;
    append(`error: ${detail.reason}`);
  });
  const uploadBtn = document.getElementById('uploadBtn');
  uploadBtn?.addEventListener('click', () => dz.upload?.());
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}
