/**
 * Behavior migrado desde HTML inline de is-rating.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../../previews/_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext): Promise<void> {
  const root = ctx.main;
  void root;
  const demo = document.getElementById('demo') as HTMLElement | null;
  const log = document.getElementById('log') as HTMLElement | null;
  if (demo && log) {
    demo.addEventListener('is-change', (e: Event) => {
      const detail = (e as CustomEvent<{ value: unknown }>).detail;
      log.innerHTML = `value: <code class="code">${String(detail.value)}</code>`;
    });
  }

  // highlight-selected-only + labels
  const faces = document.getElementById('faces') as (HTMLElement & { labels?: string[] }) | null;
  if (faces) faces.labels = ['Muy malo', 'Malo', 'Normal', 'Bueno', 'Excelente'];

  // labels / getLabelText
  const labelled = document.getElementById('labelled') as (HTMLElement & { labels?: string[] }) | null;
  if (labelled) labelled.labels = ['Pésimo', 'Malo', 'Normal', 'Bueno', 'Excelente'];

  const fn = document.getElementById('fn') as (HTMLElement & { getLabelText?: (v: number) => string }) | null;
  if (fn) {
    fn.getLabelText = (v: number): string => (v === 0 ? 'Sin valorar' : `${v} punto${v === 1 ? '' : 's'}`);
  }

  const hoverLog = document.getElementById('hoverLog') as HTMLElement | null;
  if (labelled && fn && hoverLog) {
    for (const el of [labelled, fn] as HTMLElement[]) {
      el.addEventListener('is-hover', (e: Event) => {
        const detail = (e as CustomEvent<{ phantomValue: number | null; label: string }>).detail;
        const { phantomValue, label } = detail;
        hoverLog.innerHTML = `hover: <code class="code">${phantomValue === null ? '—' : `${phantomValue} · ${label}`}</code>`;
      });
    }
  }

  // clearable
  const clearDemo = document.getElementById('clearDemo') as HTMLElement | null;
  const clearLog = document.getElementById('clearLog') as HTMLElement | null;
  if (clearDemo && clearLog) {
    clearDemo.addEventListener('is-change', (e: Event) => {
      const detail = (e as CustomEvent<{ value: unknown }>).detail;
      clearLog.innerHTML = `value: <code class="code">${String(detail.value)}</code>`;
    });
  }

  const f = document.getElementById('f') as HTMLFormElement | null;
  const out = document.getElementById('out') as HTMLElement | null;
  if (f && out) {
    f.addEventListener('submit', (e: Event) => {
      e.preventDefault();
      const data = [...new FormData(f)].map(([k, v]) => `${k}=${v}`).join(' · ');
      out.textContent = `FormData: ${data || '—'}`;
    });
    f.addEventListener('reset', () => { out.textContent = 'FormData: —'; });
  }
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}
