/**
 * dev-reload.js — polling de dist/cdn/reload-pin (galería / static server).
 * Cargado vía L.loadPageModules(['dev-reload']). Sin logic en index.html.
 *
 * Backoff exponencial; se apaga tras MAX_FAILS fallos (sin watcher).
 */
(() => {
  const tries = [
    'dist/cdn/reload-pin',
    '../dist/cdn/reload-pin',
    '../../dist/cdn/reload-pin',
    '../../../dist/cdn/reload-pin',
    '../../../../dist/cdn/reload-pin',
  ];
  let pinUrl = null;
  let last = null;
  let interval = 1500;
  const MAX_INTERVAL = 30000;
  const MAX_FAILS = 6;
  let fails = 0;
  let timer = 0;

  function schedule() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(poll, interval);
  }

  function poll() {
    if (!pinUrl) return;
    fetch(pinUrl, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw 0;
        return r.text();
      })
      .then((h) => {
        h = String(h).trim();
        fails = 0;
        if (interval !== 1500) interval = 1500;
        if (last !== null && last !== h) {
          location.reload();
          return;
        }
        last = h;
        schedule();
      })
      .catch(() => {
        fails += 1;
        if (fails >= MAX_FAILS) {
          if (timer) clearTimeout(timer);
          return;
        }
        interval = Math.min(interval * 2, MAX_INTERVAL);
        schedule();
      });
  }

  function probe(i) {
    if (i >= tries.length) return;
    fetch(tries[i], { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw 0;
        pinUrl = tries[i];
        last = null;
        schedule();
      })
      .catch(() => { probe(i + 1); });
  }

  function start() {
    if (document.readyState === 'complete') probe(0);
    else window.addEventListener('load', () => { probe(0); }, { once: true });
  }

  start();
})();
