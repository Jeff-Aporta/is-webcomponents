/**
 * Behavior migrado desde HTML inline de is-signature.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../_kit/types.d.ts').PreviewMountContext) {
  const root = ctx.main;
  void root;
  const sig = document.getElementById('sig');
      const out = document.getElementById('output');
      const show = (kind, src) => {
        out.innerHTML = '';
        const fig = document.createElement('figure');
        const img = document.createElement('img');
        img.src = src;
        img.alt = `Firma exportada como ${kind}`;
        const cap = document.createElement('figcaption');
        cap.textContent = `export · ${kind}`;
        fig.appendChild(img);
        fig.appendChild(cap);
        out.appendChild(fig);
      };
      document.getElementById('bClear').addEventListener('click', () => sig.clear());
      document.getElementById('bPNG').addEventListener('click', () => show('PNG', sig.toDataURL('image/png')));
      document.getElementById('bSVG').addEventListener('click', () => show('SVG', sig.toDataURL('image/svg+xml')));
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
