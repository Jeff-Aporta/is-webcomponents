/**
 * Behavior migrado desde HTML inline de is-video-playlist.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../../previews/_kit/types.d.ts').PreviewMountContext} ctx
 */

// Tipo mínimo del `<is-video-playlist>` para acceder a `placement`.
interface IsVideoPlaylist extends HTMLElement {
  placement: 'left' | 'right' | 'bottom';
}

export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext) {
  const root = ctx.main;
  void root;
  const placePl = document.getElementById('plPlace') as IsVideoPlaylist | null;
  const placeBtns: ReadonlyArray<readonly [string, 'left' | 'right' | 'bottom']> = [
    ['placeLeft', 'left'],
    ['placeRight', 'right'],
    ['placeBottom', 'bottom'],
  ];
  for (const [id, val] of placeBtns) {
    document.getElementById(id)?.addEventListener('click', () => {
      if (placePl) placePl.placement = val;
      for (const [bid] of placeBtns) {
        const b = document.getElementById(bid);
        if (b) b.setAttribute('appearance', bid === id ? 'filled' : 'outlined');
      }
    });
  }

  const log = document.getElementById('eventLog');
  document.getElementById('eventPl')?.addEventListener('is-video-change', (e: Event) => {
    const ev = e as CustomEvent<{ previousIndex: number; currentIndex: number; video: Element | null }>;
    const t = ev.detail.video?.getAttribute('title') || '';
    const ch = ev.detail.video?.getAttribute('channel') || '';
    if (log) log.textContent = `Cambio ${ev.detail.previousIndex} → ${ev.detail.currentIndex}: "${t}" (${ch})`;
  });
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
