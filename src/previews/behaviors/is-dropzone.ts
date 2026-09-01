/**
 * Behavior migrado desde HTML inline de is-dropzone.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../_kit/types.d.ts').PreviewMountContext) {
  const root = ctx.main;
  void root;
  const dz = document.getElementById('dz');
      const log = document.getElementById('log');
      const append = (line) => { log.textContent = line + '\n' + log.textContent; log.scrollTop = 0; };
      dz.addEventListener('is-files-change', (e) => append(`files: ${e.detail.files.length}`));
      dz.addEventListener('is-upload-start', (e) => append(`start: ${e.detail.file.name}`));
      dz.addEventListener('is-upload-progress', (e) => append(`progress: ${e.detail.file.name} ${e.detail.progress}%`));
      dz.addEventListener('is-upload-end', (e) => append(`end: ${e.detail.file.name} ok=${e.detail.ok}`));
      dz.addEventListener('is-error', (e) => append(`error: ${e.detail.reason}`));
      document.getElementById('uploadBtn').addEventListener('click', () => dz.upload());
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
