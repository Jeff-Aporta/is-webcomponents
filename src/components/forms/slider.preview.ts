/**
 * Behavior migrado desde HTML inline de is-slider.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../../previews/_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext): Promise<void> {
  const root = ctx.main;
  void root;
  const demo = document.getElementById('demo') as HTMLElement | null;
  const log = document.getElementById('log') as HTMLElement | null;
  if (demo && log) {
    const paint = (v: unknown): void => { log.innerHTML = `value: <code class="code">${String(v)}</code>`; };
    demo.addEventListener('is-input', (e: Event) => paint((e as CustomEvent<{ value: unknown }>).detail.value));
  }

  const rangeDemo = document.getElementById('rangeDemo') as HTMLElement | null;
  const rangeLog = document.getElementById('rangeLog') as HTMLElement | null;
  if (rangeDemo && rangeLog) {
    rangeDemo.addEventListener('is-input', (e: Event) => {
      const detail = (e as CustomEvent<{ values: [number, number] }>).detail;
      const [a, b] = detail.values;
      rangeLog.innerHTML = `rango: <code class="code">${a} – ${b}</code>`;
    });
  }

  // Slider ↔ input
  const linkedSlider = document.getElementById('linkedSlider') as (HTMLElement & { value?: number }) | null;
  const linkedInput = document.getElementById('linkedInput') as (HTMLElement & { value?: string | number }) | null;
  if (linkedSlider && linkedInput) {
    linkedSlider.addEventListener('is-input', (e: Event) => {
      const detail = (e as CustomEvent<{ value: unknown }>).detail;
      linkedInput.value = String(detail.value);
    });
    linkedInput.addEventListener('is-input', (e: Event) => {
      const detail = (e as CustomEvent<{ value?: unknown }>).detail;
      const n = Number(detail?.value ?? linkedInput.value);
      if (Number.isFinite(n)) linkedSlider.value = n;
    });
  }

  // Escala no lineal: x → 2^x bytes
  const UNITS: string[] = ['B', 'KB', 'MB', 'GB', 'TB'];
  const formatBytes = (bytes: number): string => {
    let n = bytes;
    let i = 0;
    while (n >= 1024 && i < UNITS.length - 1) { n /= 1024; i++; }
    return `${Math.round(n * 10) / 10} ${UNITS[i]}`;
  };
  const scaleDemo = document.getElementById('scaleDemo') as (HTMLElement & { scale?: (x: number) => number; valueLabelFormat?: (v: number) => string; value?: number }) | null;
  const scaleLabel = document.getElementById('scaleLabel') as HTMLElement | null;
  if (scaleDemo && scaleLabel) {
    scaleDemo.scale = (x: number): number => 2 ** x;
    scaleDemo.valueLabelFormat = (bytes: number): string => formatBytes(bytes);
    const paintScale = (): void => {
      scaleLabel.innerHTML = `Almacenamiento: <code class="code">${formatBytes(2 ** (scaleDemo.value ?? 0))}</code>`;
    };
    scaleDemo.addEventListener('is-input', paintScale);
    paintScale();
  }
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}
