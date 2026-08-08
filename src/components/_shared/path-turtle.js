import { tkHueToHex } from './tk-hue.js';
import { contrastFontColor } from './tk-color.js';
import { inlineMdWeb } from './tk-inline-md.js';
import { svgEl } from './svg-chart-engine.js';

/**
 * Dot "tortuga cometa" controlable: recorre los flujos en orden, con cola de cometa
 * (color del grupo) y un chip (índice + log) que persigue al dot sin salirse del
 * lienzo. API imperativa (play/pause/stop/next/prev) y reporte de estado por
 * callback `onState` ({ playing, idx, total, replay }).
 *
 * Port del componente React `SequenceTurtle.jsx`: mismas constantes, mismas fases
 * y el mismo bucle conducido por requestAnimationFrame.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

const TRAIL = 14;
const SPEED = 2.5; // ms por unidad de longitud
const MIN_DUR = 360;
const PAUSE_BETWEEN = 200; // ms entre tramos
const AUTO_GAP = 45000; // ms del contador de auto-anim (avanza solo en idle, sin hover)
const CHIP_W = 216;
const CHIP_H = 46;
const MARGIN = 10; // margen mínimo para que el chip no se corte

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/* svgEl → _shared/svg-chart-engine.js */

export class PathTurtle {
  #group;
  #measurePath;
  #headLayer;
  #messages = [];
  #theme;
  #viewW = 0;
  #viewH = 0;
  #paused = false;
  #autoLoop = false;
  #onState = null;
  #raf = 0;
  #st = { idx: 0, elapsed: 0, autoElapsed: 0, phase: 'idle', lastTs: 0, gapStart: 0, lastPct: -1 };

  /** @param {SVGGElement} group grupo donde se dibuja la tortuga (dentro del SVG). */
  constructor(group) {
    this.#group = group;
    this.#group.setAttribute('class', 'seq-turtle');
    this.#group.setAttribute('pointer-events', 'none');
    this.#group.setAttribute('aria-hidden', 'true');
    // Path oculto: sólo se usa para medir longitudes con getPointAtLength.
    this.#measurePath = svgEl('path', { fill: 'none', stroke: 'none' });
    this.#headLayer = svgEl('g', { class: 'seq-turtle-head' });
    this.#group.appendChild(this.#measurePath);
    this.#group.appendChild(this.#headLayer);
  }

  get total() { return this.#messages.length; }

  /** Reinicia con nuevos mensajes/geometría. Equivale al efecto de montaje del React. */
  setData({ messages, theme, viewW, viewH, autoLoop, onState }) {
    this.#stopRaf();
    this.#messages = messages ?? [];
    this.#theme = theme;
    this.#viewW = viewW ?? 0;
    this.#viewH = viewH ?? 0;
    this.#autoLoop = !!autoLoop;
    if (onState !== undefined) this.#onState = onState;
    this.#st = { idx: 0, elapsed: 0, autoElapsed: 0, phase: 'idle', lastTs: 0, gapStart: 0, lastPct: -1 };
    this.#clearHead();
    if (this.#autoLoop && this.total) {
      this.#st.phase = 'waiting';
      this.#report();
      if (!this.#paused) this.#ensureLoop();
    } else {
      this.#report();
    }
  }

  /** Hover sobre un mensaje congela la animación sin perder el progreso. */
  setPaused(paused) {
    this.#paused = !!paused;
    const phase = this.#st.phase;
    const active = phase === 'playing' || phase === 'between' || phase === 'waiting';
    if (this.#paused) this.#stopRaf();
    else if (active && !this.#raf) {
      this.#st.lastTs = 0; // no contar el tiempo de hover
      this.#raf = requestAnimationFrame(this.#loop);
    }
  }

  destroy() {
    this.#stopRaf();
    this.#clearHead();
  }

  /* ── API imperativa (la usa la barra de controles del lightbox) ── */

  play() {
    const s = this.#st;
    // Reanuda desde el tramo actual (incl. tras usar << / >> o waiting); reinicia solo si terminó.
    if (s.phase === 'done' || s.idx >= this.total) {
      s.idx = 0;
      s.elapsed = 0;
    }
    s.phase = 'playing';
    s.lastTs = 0;
    s.autoElapsed = AUTO_GAP; // ring vacío (0) mientras anima; se rellena al terminar
    this.#report();
    this.#ensureLoop();
  }

  pause() {
    this.#st.phase = 'paused';
    this.#stopRaf();
    this.#report();
  }

  stop() {
    const s = this.#st;
    s.idx = 0;
    s.elapsed = 0;
    s.autoElapsed = 0; // el contador de auto-anim vuelve a empezar en 0
    s.lastTs = 0;
    s.phase = this.#autoLoop ? 'waiting' : 'idle';
    this.#stopRaf();
    this.#clearHead();
    this.#report();
    if (this.#autoLoop) this.#ensureLoop();
  }

  // << / >>: saltan de tramo y quedan EN PAUSA en ese tramo (play reanuda desde ahí).
  next() {
    const s = this.#st;
    s.idx = Math.min(this.total - 1, s.idx + 1);
    s.elapsed = 0;
    s.lastTs = 0;
    s.phase = 'paused';
    this.#stopRaf();
    this.#renderAt(s.idx, 0.0001);
    this.#report();
  }

  prev() {
    const s = this.#st;
    s.idx = Math.max(0, s.idx - 1);
    s.elapsed = 0;
    s.lastTs = 0;
    s.phase = 'paused';
    this.#stopRaf();
    this.#renderAt(s.idx, 0.0001);
    this.#report();
  }

  /* ── interno ── */

  /** `replay` = fracción restante del contador de auto-anim (1 lleno → 0 vacío → arranca). */
  #report() {
    const s = this.#st;
    const active = s.phase === 'playing' || s.phase === 'between';
    const replay = this.#autoLoop ? clamp(1 - s.autoElapsed / AUTO_GAP, 0, 1) : 0;
    s.lastPct = Math.round(replay * 100);
    this.#onState?.({ playing: active, idx: s.idx, total: this.total, replay });
  }

  #measure(idx) {
    const m = this.#messages[idx];
    if (!m || !m.path) return null;
    this.#measurePath.setAttribute('d', m.path);
    const len = this.#measurePath.getTotalLength() || 1;
    return { m, len, dur: Math.max(MIN_DUR, len * SPEED) };
  }

  #stopRaf() {
    if (this.#raf) cancelAnimationFrame(this.#raf);
    this.#raf = 0;
  }

  #ensureLoop() {
    if (!this.#raf && !this.#paused) {
      this.#st.lastTs = 0;
      this.#raf = requestAnimationFrame(this.#loop);
    }
  }

  #clearHead() {
    while (this.#headLayer.firstChild) this.#headLayer.removeChild(this.#headLayer.firstChild);
  }

  #renderAt(idx, t) {
    const info = this.#measure(idx);
    if (!info) {
      this.#clearHead();
      return;
    }
    const el = this.#measurePath;
    const pt = el.getPointAtLength(info.len * t);
    const color = info.m.color
      || (info.m.groupHue != null && tkHueToHex(info.m.groupHue))
      || this.#theme.accent;

    this.#clearHead();

    // Cola de cometa: puntos decrecientes detrás de la cabeza.
    const span = 0.16;
    for (let i = TRAIL; i >= 0; i--) {
      const tt = Math.max(0, t - (span * i) / TRAIL);
      const p = el.getPointAtLength(info.len * tt);
      const k = (TRAIL - i + 1) / (TRAIL + 1);
      this.#headLayer.appendChild(svgEl('circle', {
        cx: p.x, cy: p.y, r: 1 + 4 * k, fill: color, opacity: 0.05 + 0.34 * k,
      }));
    }

    this.#headLayer.appendChild(svgEl('circle', { cx: pt.x, cy: pt.y, r: 7, fill: color, opacity: 0.22 }));
    this.#headLayer.appendChild(svgEl('circle', { cx: pt.x, cy: pt.y, r: 3.6, fill: color }));

    // Chip arriba-derecha del dot, con clamp y margen dentro del lienzo.
    const chipX = clamp(pt.x + 12, MARGIN, Math.max(MARGIN, this.#viewW - CHIP_W - MARGIN));
    const chipY = clamp(pt.y - CHIP_H - 6, MARGIN, Math.max(MARGIN, this.#viewH - CHIP_H - MARGIN));
    const fo = svgEl('foreignObject', {
      x: chipX, y: chipY, width: CHIP_W, height: CHIP_H, overflow: 'visible',
    });
    const chip = document.createElement('div');
    chip.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
    chip.className = 'dg-chip';
    chip.style.borderColor = color;
    const idxEl = document.createElement('span');
    idxEl.className = 'dg-chip__idx';
    idxEl.style.background = color;
    idxEl.style.color = contrastFontColor(color);
    idxEl.textContent = String(info.m.step);
    chip.appendChild(idxEl);
    if (info.m.log) {
      const log = document.createElement('span');
      log.innerHTML = inlineMdWeb(info.m.log);
      chip.appendChild(log);
    }
    fo.appendChild(chip);
    this.#headLayer.appendChild(fo);
  }

  /** Bucle único conducido por la fase. */
  #loop = (ts) => {
    const s = this.#st;
    if (this.#paused) {
      this.#raf = 0; // hover: congela (setPaused reanuda)
      return;
    }

    const finishRun = () => {
      this.#clearHead();
      if (this.#autoLoop) {
        s.phase = 'waiting';
        s.autoElapsed = 0; // contador vuelve a empezar tras completar
        s.lastTs = ts;
      } else {
        s.phase = 'done';
      }
      this.#report();
    };

    if (s.phase === 'playing') {
      const info = this.#measure(s.idx);
      if (!info) {
        s.idx += 1;
        s.elapsed = 0;
        if (s.idx >= this.total) finishRun();
      } else {
        if (!s.lastTs) s.lastTs = ts;
        s.elapsed += ts - s.lastTs;
        s.lastTs = ts;
        const t = Math.min(1, s.elapsed / info.dur);
        this.#renderAt(s.idx, t);
        if (t >= 1) {
          s.phase = 'between';
          s.gapStart = ts;
        }
      }
    } else if (s.phase === 'between') {
      if (ts - s.gapStart >= PAUSE_BETWEEN) {
        s.idx += 1;
        s.elapsed = 0;
        s.lastTs = ts;
        if (s.idx >= this.total) finishRun();
        else {
          s.phase = 'playing';
          this.#report();
        }
      }
    } else if (s.phase === 'waiting') {
      if (!s.lastTs) s.lastTs = ts;
      s.autoElapsed += ts - s.lastTs;
      s.lastTs = ts;
      if (s.autoElapsed >= AUTO_GAP) {
        // El ring llegó a 0 → arranca la auto-anim (autoElapsed queda en GAP → ring 0 mientras anima).
        s.phase = 'playing';
        s.idx = 0;
        s.elapsed = 0;
        s.autoElapsed = AUTO_GAP;
        this.#clearHead();
        this.#report();
      } else {
        const pct = Math.round(clamp(1 - s.autoElapsed / AUTO_GAP, 0, 1) * 100);
        if (pct !== s.lastPct) this.#report();
      }
    } else {
      this.#raf = 0; // idle / paused / done → detener bucle
      return;
    }

    this.#raf = requestAnimationFrame(this.#loop);
  };
}

export { AUTO_GAP as TURTLE_AUTO_GAP };
/** Nombre histórico: lo usan los diagramas. */
export { PathTurtle as SequenceTurtle };
