/**
 * Behavior migrado desde HTML inline de is-slider.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../_kit/types.d.ts').PreviewMountContext) {
  const root = ctx.main;
  void root;
  const demo = document.getElementById('demo');
      const log = document.getElementById('log');
      const paint = (v) => { log.innerHTML = `value: <code class="code">${v}</code>`; };
      demo.addEventListener('is-input', (e) => paint(e.detail.value));
  
      const rangeDemo = document.getElementById('rangeDemo');
      const rangeLog = document.getElementById('rangeLog');
      rangeDemo.addEventListener('is-input', (e) => {
        const [a, b] = e.detail.values;
        rangeLog.innerHTML = `rango: <code class="code">${a} – ${b}</code>`;
      });
  
      // Slider ↔ input
      const linkedSlider = document.getElementById('linkedSlider');
      const linkedInput = document.getElementById('linkedInput');
      linkedSlider.addEventListener('is-input', (e) => { linkedInput.value = String(e.detail.value); });
      linkedInput.addEventListener('is-input', (e) => {
        const n = Number(e.detail?.value ?? linkedInput.value);
        if (Number.isFinite(n)) linkedSlider.value = n;
      });
  
      // Escala no lineal: x → 2^x bytes
      const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];
      const formatBytes = (bytes) => {
        let n = bytes;
        let i = 0;
        while (n >= 1024 && i < UNITS.length - 1) { n /= 1024; i++; }
        return `${Math.round(n * 10) / 10} ${UNITS[i]}`;
      };
      const scaleDemo = document.getElementById('scaleDemo');
      const scaleLabel = document.getElementById('scaleLabel');
      scaleDemo.scale = (x) => 2 ** x;
      scaleDemo.valueLabelFormat = (bytes) => formatBytes(bytes);
      const paintScale = () => {
        scaleLabel.innerHTML = `Almacenamiento: <code class="code">${formatBytes(2 ** scaleDemo.value)}</code>`;
      };
      scaleDemo.addEventListener('is-input', paintScale);
      paintScale();
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
