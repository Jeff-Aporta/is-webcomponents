/**
 * Behavior migrado desde HTML inline de is-video-playlist.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
  const placePl = document.getElementById('plPlace');
      const placeBtns = [
        ['placeLeft', 'left'],
        ['placeRight', 'right'],
        ['placeBottom', 'bottom'],
      ];
      for (const [id, val] of placeBtns) {
        document.getElementById(id)?.addEventListener('click', () => {
          placePl.placement = val;
          for (const [bid] of placeBtns) {
            const b = document.getElementById(bid);
            if (b) b.setAttribute('appearance', bid === id ? 'filled' : 'outlined');
          }
        });
      }
  
      const log = document.getElementById('eventLog');
      document.getElementById('eventPl')?.addEventListener('is-video-change', (e) => {
        const t = e.detail.video?.getAttribute('title') || '';
        const ch = e.detail.video?.getAttribute('channel') || '';
        log.textContent = `Cambio ${e.detail.previousIndex} → ${e.detail.currentIndex}: "${t}" (${ch})`;
      });
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
