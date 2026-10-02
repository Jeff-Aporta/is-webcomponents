/**
 * Behavior migrado desde HTML inline de iswc-video.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../../previews/_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext) {
  const root = ctx.main;
  void root;
  const v = document.getElementById('v1');
  const log = document.getElementById('log');
  if (v && log) {
    for (const ev of ['iswc-play', 'iswc-pause', 'iswc-ended']) {
      v.addEventListener(ev, () => { log.textContent = `eventos: ${ev}`; });
    }
  }
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
