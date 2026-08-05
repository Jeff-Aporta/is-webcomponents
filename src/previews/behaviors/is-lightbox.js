/**
 * Behavior migrado desde HTML inline de is-lightbox.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
  const lb1 = document.getElementById('lb1');
      document.getElementById('open1').addEventListener('click', () => lb1.show());
  
      // Galería: cada target clona el template correspondiente en el lightbox.
      const lbG = document.getElementById('lb-gallery');
      document.querySelectorAll('[data-lb-target]').forEach((target) => {
        target.addEventListener('click', () => {
          const key = target.dataset.lbTarget;
          const tpl = lbG.querySelector(`template[data-tpl="${key}"]`);
          // Limpia hijos previos y monta el template clonado.
          lbG.replaceChildren();
          lbG.append(tpl.content.cloneNode(true));
          lbG.show();
        });
      });
  
      // Toolbar custom: rotar, descargar, info.
      const lbTb = document.getElementById('lb-tb');
      document.getElementById('open-tb').addEventListener('click', () => lbTb.show());
      lbTb.addEventListener('click', (e) => {
        const btn = e.composedPath().find((n) => n?.id);
        const svg = lbTb.querySelector('#tb-svg');
        if (!svg) return;
        if (btn === 'tb-rotate') {
          const cur = svg.style.transform || '';
          const m = cur.match(/rotate\(([-\d.]+)deg\)/);
          const next = (m ? Number(m[1]) : 0) + 90;
          svg.style.transform = `rotate(${next}deg)`;
        } else if (btn === 'tb-download') {
          const xml = new XMLSerializer().serializeToString(svg);
          const blob = new Blob([xml], { type: 'image/svg+xml' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'figura.svg';
          a.click();
          URL.revokeObjectURL(a.href);
        } else if (btn === 'tb-info') {
          alert('Vista: 600×400 · ' + (svg.style.transform || 'sin rotar'));
        }
      });
  
      document.getElementById('open-vid').addEventListener('click', () => {
        document.getElementById('lb-vid').show();
      });
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
