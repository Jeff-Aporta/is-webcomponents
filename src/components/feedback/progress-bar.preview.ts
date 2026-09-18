/**
 * Behavior migrado desde HTML inline de is-progress-bar.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../../previews/_kit/types.d.ts').PreviewMountContext} ctx
 */

interface ProgressBarEl extends HTMLElement {
  value: number;
  label: string;
}

export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext): Promise<void> {
  void ctx.main;
  await customElements.whenDefined('is-progress-bar');
  await customElements.whenDefined('is-button');

  let value = 0;
  const bar = document.getElementById('pbLive') as ProgressBarEl | null;
  const pct = document.getElementById('pbPct');
  const status = document.getElementById('pbStatus');

  const sync = (): void => {
    if (bar) {
      bar.value = value;
      bar.label = `Progreso ${value}%`;
    }
    if (pct) pct.textContent = String(value);
    if (status) {
      if (value <= 0) status.textContent = 'Listo para empezar';
      else if (value >= 100) status.textContent = 'Completado';
      else status.textContent = `Avance · click ${Math.round(value / 10)}`;
    }
  };

  const plus = document.getElementById('pbPlus');
  const minus = document.getElementById('pbMinus');
  const reset = document.getElementById('pbReset');

  plus?.addEventListener('click', () => {
    value = Math.min(100, value + 10);
    sync();
  });
  minus?.addEventListener('click', () => {
    value = Math.max(0, value - 10);
    sync();
  });
  reset?.addEventListener('click', () => {
    value = 0;
    sync();
  });
  sync();
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}