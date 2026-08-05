/**
 * Behavior migrado desde HTML inline de is-observer.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
  // Demo wiring: feed mutation + resize events into a log area
      const mo = document.getElementById('mo');
      const moLog = document.getElementById('mo-log');
      let moCount = 0;
      mo?.addEventListener('is-mutate', (e) => {
        moCount += e.detail.records.length;
        moLog.textContent = `Mutaciones observadas: ${moCount}`;
      });
      document.getElementById('add')?.addEventListener('click', () => {
        const target = document.querySelector('#mo');
        target?.toggleAttribute('data-tag');
      });
  
      const ro = document.getElementById('ro');
      let roCount = 0;
      ro?.addEventListener('is-resize', () => { roCount += 1; });
  
      const io = document.getElementById('io');
      let ioCount = 0;
      io?.addEventListener('is-intersect', () => { ioCount += 1; });
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
