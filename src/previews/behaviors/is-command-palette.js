/**
 * Behavior migrado desde HTML inline de is-command-palette.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
  const cmd = document.getElementById('cmd');
      document.getElementById('openBtn').addEventListener('click', () => cmd.open());
      cmd.addEventListener('is-select', (e) => console.log('ejecutar:', e.detail.command.id));
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
