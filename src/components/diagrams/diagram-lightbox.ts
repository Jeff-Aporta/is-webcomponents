import { defineElement, emit, siblingCssHref } from '../../core/element.js';
import { IsLightbox } from './lightbox.js';
import { getDiagramTag } from './diagram-kinds.js';
import { expandSequencePayloadForJson } from './sequence-spec.js';
import '../media/icon.js';
import { sharePayload } from '../_shared/web-share.js';

/**
 * <is-diagram-lightbox> — colore del lightbox para diagramas.
 *
 * Es un <is-lightbox> con la barra específica de la animación tortuga
 * (<< ▶/⏸ ■ >>), el anillo de cuenta regresiva del auto-replay, el botón
 * de código JSON y el botón de compartir enlace. El resto del visor
 * (zoom, pan, dialog, slots) lo hereda de is-lightbox.
 *
 * Conceptualmente, un diagrama es "un nodo que tiene un payload JSON y
 * expone una API turtle {play,pause,stop,next,prev}". El visor hace de
 * puente entre ese contrato y la barra por defecto. Si en algún momento
 * hay otro componente con la misma forma, se hace un wrapper igual sin
 * tocar el lightbox genérico.
 *
 * Atributos: kind (default "sequence"), animation (passthrough al diagrama),
 *             open
 *             + todos los de <is-lightbox>
 * Propiedades: payload, kind, animation, open
 *              + todas las de <is-lightbox>
 * Eventos: is-close, is-share, is-reposition
 *          + is-turtle-state { playing, idx, total, replay }
 *          + is-toggle-group { id }
 */

const ICON = {
  share: 'mdi:share-variant-outline',
  code: 'mdi:code-json',
  play: 'mdi:play',
  pause: 'mdi:pause',
  stop: 'mdi:stop',
  prev: 'mdi:skip-previous',
  next: 'mdi:skip-next',
  turtle: 'mdi:tortoise',
  fit: 'mdi:fit-to-screen-outline',
};

const RING_R = 9;
const RING_C = 2 * Math.PI * RING_R;

function isSequenceKind(kind) {
  const k = String(kind || '').toLowerCase();
  return k === 'sequence' || k === 'sequence-diagram';
}

function diagramCodeJson(kind, payload) {
  let p = payload || {};
  if (isSequenceKind(kind)) p = expandSequencePayloadForJson(p);
  return JSON.stringify({ kind: String(kind || 'sequence').toLowerCase(), payload: p }, null, 2);
}

function buildViewerUrl(kind, payload) {
  const json = JSON.stringify({ kind, payload });
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(json)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const url = new URL(window.location.href);
  url.searchParams.set('d', b64);
  return url.toString();
}

class IsDiagramLightbox extends IsLightbox {
  static get observedAttributes(): string[] {
    return [...super.observedAttributes, 'kind', 'animation', 'min-gap'];
  }

  #payload = null;
  #basePayload = null;
  #hiddenGroups = new Set();
  #diagramEl = null;
  #turtleState = { playing: false, replay: 0, idx: 0, total: 0 };
  #btnPlay!: HTMLElement | null;
  #btnStop!: HTMLElement | null;
  #ring!: HTMLElement | null;
  #ringLabel!: HTMLElement | null;
  constructor() {
    super();
    // CSS específico encima del base que ya inyectó `adoptCss()` en el padre.
    // Usar siblingCssHref para respetar .min.js → .min.css en el CDN.
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = siblingCssHref(import.meta.url);
    this.shadowRoot!.appendChild(link);
    this.#installDiagramToolbar();
  }

  connectedCallback(): void {
    super.connectedCallback();
    if (this.open) this.#mountDiagram();
    if (!this.__dgWired) {
      this.__dgWired = true;
      // Capture para que corra antes que el handler del padre y podamos
      // anular los actos propios (share con payload, code, prev/next...).
      this.shadowRoot!.addEventListener('click', this.#onClick, { capture: true });
    }
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
    super.attributeChangedCallback?.(name, oldVal, newVal);
    if (oldVal === newVal) return;
    if (name === 'kind' || name === 'animation') this.#mountDiagram();
    if (name === 'open' && this.open) this.#mountDiagram();
  }

  get kind() { return this.getAttribute('kind') || 'sequence'; }
  set kind(v) { this.setAttribute('kind', v); }

  get animation() { return this.getAttribute('animation') || ''; }
  set animation(v) {
    if (v) this.setAttribute('animation', String(v));
    else this.removeAttribute('animation');
  }

  get payload() { return this.#payload; }
  set payload(v) {
    this.#payload = v;
    this.#basePayload = v;
    this.#hiddenGroups = new Set();
    this.#mountDiagram();
  }

  show() {
    super.show();
    this.#mountDiagram();
  }

  /** Inyecta en el shadow del lightbox la barra específica de diagramas. */
  #installDiagramToolbar() {
    const bar = this.shadowRoot!.querySelector<HTMLElement>('.lb-bar');
    if (!bar) return;

    const lead = bar.querySelector<HTMLElement>('.lb-bar__lead');

    // Lead: play/pause/stop/prev/next + anillo + contador
    const nav = document.createElement('div');
    nav.className = 'lb-nav';
    nav.innerHTML = /* html */ `
      <button type="button" class="lb-btn" data-act="prev" title="Tramo anterior" aria-label="Tramo anterior">
        <is-icon icon="${ICON.prev}"></is-icon>
      </button>
      <button type="button" class="lb-btn" data-act="play" title="Reproducir" aria-label="Reproducir">
        <is-icon icon="${ICON.play}"></is-icon>
      </button>
      <button type="button" class="lb-btn" data-act="stop" title="Detener" aria-label="Detener" hidden>
        <is-icon icon="${ICON.stop}"></is-icon>
      </button>
      <button type="button" class="lb-btn" data-act="next" title="Tramo siguiente" aria-label="Tramo siguiente">
        <is-icon icon="${ICON.next}"></is-icon>
      </button>
      <span class="lb-ring" title="Cuenta regresiva del auto-replay">
        <svg viewBox="0 0 22 22" aria-hidden="true">
          <circle class="lb-ring__track" cx="11" cy="11" r="${RING_R}"></circle>
          <circle class="lb-ring__fill" cx="11" cy="11" r="${RING_R}"
                  stroke-dasharray="${RING_C}" stroke-dashoffset="${RING_C}"></circle>
        </svg>
        <is-icon icon="${ICON.turtle}" class="lb-ring__icon"></is-icon>
      </span>
      <span class="lb-step" aria-live="polite"></span>
    `;
    lead.prepend(nav);

    const trail = bar.querySelector<HTMLElement>('.lb-bar__trail');
    const codeBtn = document.createElement('button');
    codeBtn.type = 'button';
    codeBtn.className = 'lb-btn';
    codeBtn.dataset.act = 'code';
    codeBtn.title = 'Ver / editar código';
    codeBtn.setAttribute('aria-label', 'Ver o editar código');
    codeBtn.innerHTML = `<is-icon icon="${ICON.code}"></is-icon>`;
    trail.insertBefore(codeBtn, trail.querySelector<HTMLElement>('[data-act="zoom-reset"]'));

    this.#btnPlay = nav.querySelector<HTMLElement>('[data-act="play"]');
    this.#btnStop = nav.querySelector<HTMLElement>('[data-act="stop"]');
    this.#ring = nav.querySelector<HTMLElement>('.lb-ring__fill');
    this.#ringLabel = nav.querySelector<HTMLElement>('.lb-step');

    // Mostrar los botones por defecto que sí tienen sentido en diagramas.
    const share = trail.querySelector<HTMLElement>('[data-act="share"]');
    if (share) share.hidden = false;

    const codePanel = this.shadowRoot!.querySelector<HTMLElement>('.lb-code');
    codePanel.innerHTML = `
      <div class="lb-code__head">
        <strong>Código del diagrama</strong>
        <span class="lb-code__hint">editable · no se guarda en BD</span>
      </div>
      <textarea class="lb-code__area" spellcheck="false" aria-label="Código JSON del diagrama"></textarea>
      <p class="lb-code__err" hidden></p>
      <div class="lb-code__actions">
        <button type="button" class="lb-text-btn" data-act="code-cancel">Descartar</button>
        <button type="button" class="lb-text-btn is-primary" data-act="code-save">Guardar</button>
      </div>
    `;
  }

  /** Click delegado. Gestiona los actos específicos del diagrama antes de
   *  caer al comportamiento del lightbox base (zoom, share, close, etc.).
   *  Se registra con capture:true y corta la propagación para que el padre
   *  no procese dos veces los actos que redefinimos (share, etc.). */
  #onClick = (e: PointerEvent) => {
    const btn = e.composedPath().find((n) => n?.dataset?.act);
    if (!btn) return;
    switch (btn.dataset.act) {
      case 'prev': this.#turtle()?.prev(); e.stopImmediatePropagation(); break;
      case 'next': this.#turtle()?.next(); e.stopImmediatePropagation(); break;
      case 'stop': this.#turtle()?.stop(); e.stopImmediatePropagation(); break;
      case 'play':
        if (this.#turtleState.playing) this.#turtle()?.pause();
        else this.#turtle()?.play();
        e.stopImmediatePropagation();
        break;
      case 'code': this.#openCode(); e.stopImmediatePropagation(); break;
      case 'code-cancel':
        this.shadowRoot!.querySelector<HTMLElement>('.lb-code').hidden = true;
        e.stopImmediatePropagation();
        break;
      case 'code-save': this.#saveCode(); e.stopImmediatePropagation(); break;
      case 'share': this.#shareDiagram(); e.stopImmediatePropagation(); break;
      default: break;
    }
  };

  #mountDiagram() {
    if (!this.isConnected || !this.shadowRoot!) return;
    const host = this.shadowRoot!.querySelector<HTMLElement>('.lb-host');
    if (!host) return;
    const tag = getDiagramTag(this.kind);
    host.innerHTML = '';
    this.#diagramEl = null;
    if (!tag) {
      const msg = document.createElement('p');
      msg.className = 'lb-unsupported';
      msg.textContent = `Tipo de diagrama aún no soportado en el visor: ${this.kind}`;
      host.appendChild(msg);
      this.#onTurtleState({ playing: false, replay: 0, idx: 0, total: 0 });
      return;
    }
    const el = document.createElement(tag);
    el.setAttribute('color', 'viewer');
    // Propagar efectos opt-in (animation) para que la copia del visor
    // conserve el dashed flow animado que pidió la fuente.
    const anim = this.getAttribute('animation');
    if (anim) el.setAttribute('animation', anim);
    const minGap = this.getAttribute('min-gap');
    if (minGap) el.setAttribute('min-gap', minGap);
    el.payload = this.#basePayload;
    el.hiddenGroups = this.#hiddenGroups;
    el.addEventListener('is-turtle-state', (e) => this.#onTurtleState(e.detail));
    el.addEventListener('is-toggle-group', (e) => this.#onToggleGroup(e.detail.id));
    host.appendChild(el);
    this.#diagramEl = el;
    // Diagramas sin API turtle (org-chart, mindmap, timeline…) nunca emiten
    // `is-turtle-state`: ocultamos la barra ya mismo en vez de esperar un
    // evento que no va a llegar. Los que sí tienen turtle corrigen este
    // estado apenas termina su primer render (ver #onTurtleState arriba).
    if (!el.turtle) this.#onTurtleState({ playing: false, replay: 0, idx: 0, total: 0 });
  }

  #onToggleGroup(id) {
    const next = new Set(this.#hiddenGroups);
    if (next.has(id)) next.delete(id); else next.add(id);
    this.#hiddenGroups = next;
    if (this.#diagramEl) this.#diagramEl.hiddenGroups = next;
  }

  #onTurtleState(state) {
    this.#turtleState = state;
    // Sin tramos que recorrer (barras, rebanadas) los controles no aplican.
    const playable = (state.total || 0) > 0;
    for (const act of ['prev', 'play', 'next']) {
      const btn = this.shadowRoot!.querySelector<HTMLElement>(`[data-act="${act}"]`);
      if (btn) btn.hidden = !playable;
    }
    const ring = this.shadowRoot!.querySelector<HTMLElement>('.lb-ring');
    if (ring) ring.hidden = !playable;
    if (!playable) { this.#btnStop.hidden = true; this.#ringLabel.textContent = ''; return; }
    if (!this.#btnPlay) return;
    const playIcon = this.#btnPlay.querySelector<HTMLElement>('is-icon');
    playIcon.setAttribute('icon', state.playing ? ICON.pause : ICON.play);
    this.#btnPlay.title = state.playing ? 'Pausar' : 'Reproducir';
    this.#btnPlay.setAttribute('aria-label', this.#btnPlay.title);
    this.#btnStop.hidden = !state.playing;
    this.#ring.setAttribute('stroke-dashoffset', String(RING_C * (1 - (state.replay || 0))));
    this.#ringLabel.textContent = state.total ? `${Math.min(state.idx + 1, state.total)}/${state.total}` : '';
  }

  #turtle() { return this.#diagramEl?.turtle ?? null; }

  #openCode() {
    const area = this.shadowRoot!.querySelector<HTMLElement>('.lb-code__area');
    const err = this.shadowRoot!.querySelector<HTMLElement>('.lb-code__err');
    area.value = diagramCodeJson(this.kind, this.#basePayload);
    err.hidden = true;
    this.shadowRoot!.querySelector<HTMLElement>('.lb-code').hidden = false;
  }

  #saveCode() {
    const area = this.shadowRoot!.querySelector<HTMLElement>('.lb-code__area');
    const err = this.shadowRoot!.querySelector<HTMLElement>('.lb-code__err');
    let parsed;
    try { parsed = JSON.parse(area.value); }
    catch (e) {
      err.textContent = `JSON inválido: ${e?.message || e}`;
      err.hidden = false;
      return;
    }
    const next = parsed && typeof parsed.payload === 'object' ? parsed.payload : parsed;
    this.#basePayload = next;
    this.#hiddenGroups = new Set();
    this.shadowRoot!.querySelector<HTMLElement>('.lb-code').hidden = true;
    this.#mountDiagram();
  }

  async #shareDiagram() {
    let url;
    try { url = buildViewerUrl(this.kind, this.#basePayload); }
    catch { return; }
    const how = await sharePayload({ title: document.title, url, text: url });
    if (how === 'abort') return;
    const t = this.shadowRoot!.querySelector<HTMLElement>('.lb-toast');
    if (t) {
      t.hidden = false;
      setTimeout(() => { t.hidden = true; }, 1800);
    }
    emit(this, 'is-share', { url, how });
  }
}

defineElement('is-diagram-lightbox', IsDiagramLightbox, 'IsDiagramLightbox');

export { IsDiagramLightbox };
