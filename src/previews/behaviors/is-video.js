/**
 * Behavior migrado desde HTML inline de is-video.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
  const v = document.getElementById('v1');
      const log = document.getElementById('log');
      for (const ev of ['is-play', 'is-pause', 'is-ended']) {
        v.addEventListener(ev, () => { log.textContent = `eventos: ${ev}`; });
      }
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
