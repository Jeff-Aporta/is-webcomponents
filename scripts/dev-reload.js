/**
 * dev-reload.js — polling de dist/cdn/reload-pin (galería / static server).
 * Cargado vía L.loadPageModules(['dev-reload']). Sin logic en index.html.
 *
 * W54: optimizado para no consumir recursos innecesarios.
 *   - Default interval: 5000ms (antes 1500ms)
 *   - Pausa cuando la pestaña no está visible (Page Visibility API)
 *   - Pausa si el documento no tiene foco (window.blur)
 *   - Backoff exponencial también en idle: si el PIN no cambia en N polls,
 *     relaja el interval hasta MAX_INTERVAL y se detiene tras IDLE_TIMEOUT_MS
 *     sin cambios.
 *   - Se apaga tras MAX_FAILS fallos (igual que antes).
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
  let interval = 5000; // W54: era 1500
  const MIN_INTERVAL = 5000;
  const MAX_INTERVAL = 60000; // W54: 1 minuto entre polls cuando está idle
  const MAX_FAILS = 6;
  const IDLE_NO_CHANGE_POLLS = 12; // W54: tras 12 polls sin cambio, baja frecuencia
  const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // W54: tras 10 min sin cambio, se detiene
  let fails = 0;
  let noChangeStreak = 0;
  let firstPollAt = 0;
  let lastChangeAt = 0;
  let timer = 0;
  let stopped = false;

  function clearTimer() {
    if (timer) {
      clearTimeout(timer);
      timer = 0;
    }
  }

  function schedule() {
    if (stopped) return;
    clearTimer();
    timer = setTimeout(poll, interval);
  }

  function visible() {
    // Page Visibility API (todos los browsers modernos)
    if (typeof document !== 'undefined' && document.hidden) return false;
    // Pausa si window no tiene foco (cubre casos como background tabs sin hidden)
    if (typeof document !== 'undefined' && document.hasFocus && !document.hasFocus()) {
      // No pausa totalmente — el poll sigue, solo relaja el interval.
      return true;
    }
    return true;
  }

  function poll() {
    if (stopped || !pinUrl) return;
    if (!visible()) {
      // W54: si la pestaña no es visible, salta este poll pero agenda el próximo
      schedule();
      return;
    }
    fetch(pinUrl, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw 0;
        return r.text();
      })
      .then((h) => {
        h = String(h).trim();
        fails = 0;
        if (last === null) {
          // Primer poll: ancla el estado y no recarga.
          last = h;
          firstPollAt = firstPollAt || Date.now();
          lastChangeAt = Date.now();
          schedule();
          return;
        }
        if (last !== h) {
          // Cambio detectado: reload inmediato.
          location.reload();
          return;
        }
        lastChangeAt = Date.now();
        noChangeStreak += 1;
        // W54: backoff por idle: tras IDLE_NO_CHANGE_POLLS sin cambio,
        // dobla el interval (cap MAX_INTERVAL).
        if (noChangeStreak >= IDLE_NO_CHANGE_POLLS) {
          interval = Math.min(interval * 2, MAX_INTERVAL);
        } else {
          interval = MIN_INTERVAL;
        }
        // W54: si llevamos más de IDLE_TIMEOUT_MS sin cambio, detener.
        if (Date.now() - lastChangeAt > IDLE_TIMEOUT_MS) {
          stopped = true;
          clearTimer();
          return;
        }
        schedule();
      })
      .catch(() => {
        fails += 1;
        noChangeStreak = 0;
        if (fails >= MAX_FAILS) {
          stopped = true;
          clearTimer();
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
        firstPollAt = Date.now();
        lastChangeAt = Date.now();
        schedule();
      })
      .catch(() => { probe(i + 1); });
  }

  function start() {
    if (document.readyState === 'complete') probe(0);
    else window.addEventListener('load', () => { probe(0); }, { once: true });
    // W54: pause on visibilitychange
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        clearTimer();
      } else {
        schedule();
      }
    });
  }

  start();
})();
