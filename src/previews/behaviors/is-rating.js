/**
 * Behavior migrado desde HTML inline de is-rating.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
  const demo = document.getElementById('demo');
      const log = document.getElementById('log');
      demo.addEventListener('is-change', (e) => {
        log.innerHTML = `value: <code class="code">${e.detail.value}</code>`;
      });
  
      // highlight-selected-only + labels
      const faces = document.getElementById('faces');
      faces.labels = ['Muy malo', 'Malo', 'Normal', 'Bueno', 'Excelente'];
  
      // labels / getLabelText
      const labelled = document.getElementById('labelled');
      labelled.labels = ['Pésimo', 'Malo', 'Normal', 'Bueno', 'Excelente'];
  
      const fn = document.getElementById('fn');
      fn.getLabelText = (v) => (v === 0 ? 'Sin valorar' : `${v} punto${v === 1 ? '' : 's'}`);
  
      const hoverLog = document.getElementById('hoverLog');
      for (const el of [labelled, fn]) {
        el.addEventListener('is-hover', (e) => {
          const { phantomValue, label } = e.detail;
          hoverLog.innerHTML = `hover: <code class="code">${phantomValue === null ? '—' : `${phantomValue} · ${label}`}</code>`;
        });
      }
  
      // clearable
      const clearDemo = document.getElementById('clearDemo');
      const clearLog = document.getElementById('clearLog');
      clearDemo.addEventListener('is-change', (e) => {
        clearLog.innerHTML = `value: <code class="code">${e.detail.value}</code>`;
      });
  
      const f = document.getElementById('f');
      const out = document.getElementById('out');
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = [...new FormData(f)].map(([k, v]) => `${k}=${v}`).join(' · ');
        out.textContent = `FormData: ${data || '—'}`;
      });
      f.addEventListener('reset', () => { out.textContent = 'FormData: —'; });
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
