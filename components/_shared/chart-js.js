/** Lazy-load Chart.js (UMD → window.Chart) once. */

const CDN = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.8/dist/chart.umd.min.js';

let loading = null;

export function loadChartJs() {
  if (typeof window !== 'undefined' && window.Chart) return Promise.resolve(window.Chart);
  if (loading) return loading;

  loading = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-is-chartjs]`);
    if (existing) {
      if (window.Chart) {
        resolve(window.Chart);
        return;
      }
      existing.addEventListener('load', () => resolve(window.Chart), { once: true });
      existing.addEventListener('error', () => reject(new Error('Chart.js failed to load')), { once: true });
      return;
    }
    const s = document.createElement('script');
    s.src = CDN;
    s.async = true;
    s.dataset.isChartjs = '';
    s.onload = () => resolve(window.Chart);
    s.onerror = () => reject(new Error('Chart.js failed to load'));
    document.head.appendChild(s);
  });

  return loading;
}
