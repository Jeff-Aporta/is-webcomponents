/**
 * Behavior migrado desde HTML inline de is-lightbox.
 * Se ejecuta en mount() tras pintar la definition JSON.
 */

type LightboxLike = HTMLElement & { show(): void; };

function asLightbox(el: HTMLElement | null): LightboxLike | null {
  return (el as LightboxLike | null);
}

export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext): Promise<void> {
  void ctx.main;
  const lb1 = asLightbox(document.getElementById('lb1'));
  const lb1Solid = asLightbox(document.getElementById('lb1-solid'));
  const lbVBackdrop = asLightbox(document.getElementById('lb-v-backdrop'));
  const lbVSolid = asLightbox(document.getElementById('lb-v-solid'));
  const lbG = asLightbox(document.getElementById('lb-gallery'));
  const lbTb = asLightbox(document.getElementById('lb-tb'));
  const lbVid = asLightbox(document.getElementById('lb-vid'));

  document.getElementById('open1')?.addEventListener('click', () => lb1?.show());
  document.getElementById('open1-solid')?.addEventListener('click', () => {
    lb1Solid?.show();
  });

  document.getElementById('open-v-backdrop')?.addEventListener('click', () => {
    lbVBackdrop?.show();
  });
  document.getElementById('open-v-solid')?.addEventListener('click', () => {
    lbVSolid?.show();
  });

  // Galería: cada target clona el template correspondiente en el lightbox.
  document.querySelectorAll<HTMLElement>('[data-lb-target]').forEach((target: HTMLElement) => {
    target.addEventListener('click', () => {
      if (!lbG) return;
      const key = target.dataset.lbTarget;
      const tpl = lbG.querySelector<HTMLTemplateElement>(`template[data-tpl="${key}"]`);
      if (!tpl) return;
      // Limpia hijos previos y monta el template clonado.
      lbG.replaceChildren();
      lbG.append(tpl.content.cloneNode(true));
      lbG.show();
    });
  });

  // Toolbar custom: rotar, descargar, info.
  document.getElementById('open-tb')?.addEventListener('click', () => lbTb?.show());
  lbTb?.addEventListener('click', (e: Event) => {
    const btn = e.composedPath().find((n): n is HTMLElement => n instanceof HTMLElement && !!n.id);
    if (!btn) return;
    const svg = lbTb.querySelector<SVGElement>('#tb-svg');
    if (!svg) return;
    if (btn.id === 'tb-rotate') {
      const cur = svg.style.transform || '';
      const m = cur.match(/rotate\(([-\d.]+)deg\)/);
      const next = (m ? Number(m[1]) : 0) + 90;
      svg.style.transform = `rotate(${next}deg)`;
    } else if (btn.id === 'tb-download') {
      const xml = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([xml], { type: 'image/svg+xml' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'figura.svg';
      a.click();
      URL.revokeObjectURL(a.href);
    } else if (btn.id === 'tb-info') {
      alert('Vista: 600×400 · ' + (svg.style.transform || 'sin rotar'));
    }
  });

  document.getElementById('open-vid')?.addEventListener('click', () => {
    lbVid?.show();
  });
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}
