import { defineElement, siblingCssHref } from '../../core/element.js';
import { IswcLightbox } from './lightbox.js';
import { getDiagramTag } from './diagram-kinds.js';
import { expandSequencePayloadForJson } from './sequence-spec.js';
import '../media/icon.js';

/**
 * <iswc-diagram-lightbox> — colore del lightbox para diagramas.
 *
 * Es un <iswc-lightbox> con la barra específica de la animación tortuga
 * (<< ▶/⏸ ■ >>), el anillo de cuenta regresiva del auto-replay, el botón
 * de código JSON y el share kit (`iswc-share-button`). El resto del visor
 * (zoom, pan, dialog, slots) lo hereda de iswc-lightbox.
 *
 * La tortuga solo aplica a procesos/flujos/secuencias (no DER ni layouts
 * estáticos). Si el diagrama no expone API turtle o emite total=0, la barra
 * de tramos queda oculta.
 *
 * Atributos: kind (default "sequence"), animation (passthrough al diagrama),
 *             open
 *             + todos los de <iswc-lightbox>
 * Propiedades: payload, kind, animation, open
 *              + todas las de <iswc-lightbox>
 * Eventos: iswc-close, iswc-share, iswc-reposition
 *          + iswc-turtle-state { playing, idx, total, replay }
 *          + iswc-toggle-group { id }
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

/** Estado del motor tortuga publicado por los diagramas en `iswc-turtle-state`. */
interface TurtleStateDetail {
  playing: boolean;
  replay: number;
  idx: number;
  total: number;
}

/** `iswc-toggle-group` detail: el grupo que el usuario alterna en la leyenda. */
interface ToggleGroupDetail { id: string; }

/** API `turtle` opcional expuesta por los diagramas con animación segmentada. */
interface TurtleApi {
  play(): void;
  pause(): void;
  stop(): void;
  next(): void;
  prev(): void;
}

/** Forma del componente-diagrama tal como la usa este visor. */
type DiagramHost = HTMLElement & {
  payload: unknown;
  hiddenGroups?: Set<string>;
  turtle?: TurtleApi | null;
};

/** Botón de la barra del lightbox (lleva `data-act`). */
function isActionable(n: EventTarget | null): n is HTMLElement {
  return n instanceof HTMLElement && !!n.dataset.act;
}

/** Botón de la barra con un `iswc-icon` dentro. */
function findPlayIcon(btn: HTMLElement): HTMLElement | null {
  return btn.querySelector<HTMLElement>('iswc-icon');
}

function isSequenceKind(kind: string | null | undefined): boolean {
  const k = String(kind ?? '').toLowerCase();
  return k === 'sequence' || k === 'sequence-diagram';
}

function diagramCodeJson(kind: string | null | undefined, payload: unknown): string {
  const p: Record<string, unknown> = (payload && typeof payload === 'object')
    ? (payload as Record<string, unknown>)
    : {};
  const expanded: unknown = isSequenceKind(kind) ? expandSequencePayloadForJson(p) : p;
  return JSON.stringify({ kind: String(kind ?? 'sequence').toLowerCase(), payload: expanded }, null, 2);
}

function buildViewerUrl(kind: string, payload: unknown): string {
  const json = JSON.stringify({ kind, payload });
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(json)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const url = new URL(window.location.href);
  url.searchParams.set('d', b64);
  return url.toString();
}

class IswcDiagramLightbox extends IswcLightbox {
  static get observedAttributes(): string[] {
    return [...super.observedAttributes, 'kind', 'animation', 'min-gap'];
  }

  #payload: unknown = null;
  #basePayload: unknown = null;
  #hiddenGroups: Set<string> = new Set();
  #diagramEl: DiagramHost | null = null;
  #turtleState: TurtleStateDetail = { playing: false, replay: 0, idx: 0, total: 0 };
  /** Guard: el listener del shadow se monta una sola vez por instancia. */
  #dgWired = false;
  #btnPlay: HTMLElement | null = null;
  #btnStop: HTMLElement | null = null;
  #ring: HTMLElement | null = null;
  #ringLabel: HTMLElement | null = null;

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
    if (!this.#dgWired) {
      this.#dgWired = true;
      // Capture para que corra antes que el handler del padre y podamos
      // anular los actos propios (share con payload, code, prev/next...).
      // `addEventListener` sobrecargado en `ShadowRoot` espera `(evt: Event)`
      // — casteamos el listener tipado a `EventListener` (mismo patrón que el
      // resto del kit cuando usa firmas más específicas).
      this.shadowRoot!.addEventListener('click', this.#onClick as EventListener, { capture: true });
    }
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
    super.attributeChangedCallback(name, oldVal, newVal);
    if (oldVal === newVal) return;
    if (name === 'kind' || name === 'animation') this.#mountDiagram();
    if (name === 'open' && this.open) this.#mountDiagram();
  }

  get kind(): string { return this.getAttribute('kind') || 'sequence'; }
  set kind(v: string) { this.setAttribute('kind', v); }

  get animation(): string { return this.getAttribute('animation') || ''; }
  set animation(v: string) {
    if (v) this.setAttribute('animation', String(v));
    else this.removeAttribute('animation');
  }

  get payload(): unknown { return this.#payload; }
  set payload(v: unknown) {
    this.#payload = v;
    this.#basePayload = v;
    this.#hiddenGroups = new Set();
    this.#mountDiagram();
  }

  show(): void {
    super.show();
    // El <dialog> del lightbox base ya aporta role=dialog y aria-modal=nativos
    // cuando se abre con showModal(). Añadimos aria-label por accesibilidad
    // (g06 #13) para describir el tipo de diagrama que se está viendo.
    const dlg = (this as unknown as { shadowRoot?: ShadowRoot }).shadowRoot
      ?.querySelector<HTMLDialogElement>('.lb');
    if (dlg && !dlg.getAttribute('aria-label')) {
      dlg.setAttribute('aria-label', `Visor de diagrama: ${this.kind}`);
    }
    this.#mountDiagram();
  }

  /** Inyecta en el shadow del lightbox la barra específica de diagramas. */
  #installDiagramToolbar(): void {
    const bar = this.shadowRoot!.querySelector<HTMLElement>('.lb-bar');
    if (!bar) return;

    const lead = bar.querySelector<HTMLElement>('.lb-bar__lead');
    if (!lead) return;

    // Lead: play/pause/stop/prev/next + anillo + contador
    const nav = document.createElement('div');
    nav.className = 'lb-nav';
    nav.innerHTML = /* html */ `
      <button type="button" class="lb-btn" data-act="prev" title="Tramo anterior" aria-label="Tramo anterior">
        <iswc-icon icon="${ICON.prev}"></iswc-icon>
      </button>
      <button type="button" class="lb-btn" data-act="play" title="Reproducir" aria-label="Reproducir">
        <iswc-icon icon="${ICON.play}"></iswc-icon>
      </button>
      <button type="button" class="lb-btn" data-act="stop" title="Detener" aria-label="Detener" hidden>
        <iswc-icon icon="${ICON.stop}"></iswc-icon>
      </button>
      <button type="button" class="lb-btn" data-act="next" title="Tramo siguiente" aria-label="Tramo siguiente">
        <iswc-icon icon="${ICON.next}"></iswc-icon>
      </button>
      <span class="lb-ring" title="Cuenta regresiva del auto-replay">
        <svg viewBox="0 0 22 22" aria-hidden="true">
          <circle class="lb-ring__track" cx="11" cy="11" r="${RING_R}"></circle>
          <circle class="lb-ring__fill" cx="11" cy="11" r="${RING_R}"
                  stroke-dasharray="${RING_C}" stroke-dashoffset="${RING_C}"></circle>
        </svg>
        <iswc-icon icon="${ICON.turtle}" class="lb-ring__icon"></iswc-icon>
      </span>
      <span class="lb-step" aria-live="polite"></span>
    `;
    lead.prepend(nav);

    const trail = bar.querySelector<HTMLElement>('.lb-bar__trail');
    if (trail) {
      const codeBtn = document.createElement('button');
      codeBtn.type = 'button';
      codeBtn.className = 'lb-btn';
      codeBtn.dataset.act = 'code';
      codeBtn.title = 'Ver / editar código';
      codeBtn.setAttribute('aria-label', 'Ver o editar código');
      codeBtn.innerHTML = `<iswc-icon icon="${ICON.code}"></iswc-icon>`;
      const zoomReset = trail.querySelector<HTMLElement>('[data-act="zoom-reset"]');
      if (zoomReset) trail.insertBefore(codeBtn, zoomReset);
      else trail.appendChild(codeBtn);
    }

    this.#btnPlay = nav.querySelector<HTMLElement>('[data-act="play"]');
    this.#btnStop = nav.querySelector<HTMLElement>('[data-act="stop"]');
    this.#ring = nav.querySelector<HTMLElement>('.lb-ring__fill');
    this.#ringLabel = nav.querySelector<HTMLElement>('.lb-step');

    // Mostrar share kit (iswc-share-button del lightbox base).
    const share = trail?.querySelector<HTMLElement>('[data-act="share"]');
    if (share) share.hidden = false;
    this.#refreshShareUrl();

    const codePanel = this.shadowRoot!.querySelector<HTMLElement>('.lb-code');
    if (codePanel) {
      codePanel.innerHTML = `
        <div class="lb-code__head">
          <strong>Código del diagrama</strong>
          <span class="lb-code__hint">editable · no se guarda en BD</span>
        </div>
        <textarea class="lb-code__area" spellcheck="false" aria-label="Código JSON del diagrama"></textarea>
        <p class="lb-code__err" hidden></p>
        <div class="lb-code__actions">
          <button type="button" class="lb-text-btn" data-act="code-cancel">Descartar</button>
          <button type="button" class="lb-text-btn iswc-primary" data-act="code-save">Guardar</button>
        </div>
      `;
    }
  }

  /** Click delegado. Gestiona los actos específicos del diagrama antes de
   *  caer al comportamiento del lightbox base (zoom, share, close, etc.).
   *  Se registra con capture:true y corta la propagación para que el padre
   *  no procese dos veces los actos que redefinimos (share, etc.). */
  #onClick = (e: MouseEvent): void => {
    const btn = e.composedPath().find(isActionable);
    if (!btn) return;
    const act = btn.dataset.act;
    switch (act) {
      case 'prev': this.#turtle()?.prev(); e.stopImmediatePropagation(); break;
      case 'next': this.#turtle()?.next(); e.stopImmediatePropagation(); break;
      case 'stop': this.#turtle()?.stop(); e.stopImmediatePropagation(); break;
      case 'play':
        if (this.#turtleState.playing) this.#turtle()?.pause();
        else this.#turtle()?.play();
        e.stopImmediatePropagation();
        break;
      case 'code': this.#openCode(); e.stopImmediatePropagation(); break;
      case 'code-cancel': {
        const code = this.shadowRoot!.querySelector<HTMLElement>('.lb-code');
        if (code) code.hidden = true;
        e.stopImmediatePropagation();
        break;
      }
      case 'code-save': this.#saveCode(); e.stopImmediatePropagation(); break;
      case 'share':
        // iswc-share-button del lightbox base; solo refrescar URL del viewer.
        this.#refreshShareUrl();
        break;
      default: break;
    }
  };

  #mountDiagram(): void {
    if (!this.isConnected || !this.shadowRoot) return;
    const host = this.shadowRoot.querySelector<HTMLElement>('.lb-host');
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
    const el = document.createElement(tag) as DiagramHost;
    el.setAttribute('color', 'viewer');
    // Propagar efectos opt-in (animation) para que la copia del visor
    // conserve el dashed flow animado que pidió la fuente.
    const anim = this.getAttribute('animation');
    if (anim) el.setAttribute('animation', anim);
    const minGap = this.getAttribute('min-gap');
    if (minGap) el.setAttribute('min-gap', minGap);
    // theme (p.ej. insoft) vive en el host del lightbox tras openOwnViewer;
    // sin esto el DER del visor cae a colores default.
    const theme = this.getAttribute('theme');
    if (theme) el.setAttribute('theme', theme);
    el.payload = this.#basePayload;
    el.hiddenGroups = this.#hiddenGroups;
    el.addEventListener('iswc-turtle-state', (e: Event) => {
      const detail = (e as CustomEvent<TurtleStateDetail>).detail;
      this.#onTurtleState(detail);
    });
    el.addEventListener('iswc-toggle-group', (e: Event) => {
      const detail = (e as CustomEvent<ToggleGroupDetail>).detail;
      this.#onToggleGroup(detail.id);
    });
    host.appendChild(el);
    this.#diagramEl = el;
    this.#refreshShareUrl();
    // Diagramas sin API turtle (DER, org-chart, mindmap…) nunca emiten
    // `iswc-turtle-state` actionable: ocultamos la barra ya mismo.
    if (!el.turtle) this.#onTurtleState({ playing: false, replay: 0, idx: 0, total: 0 });
  }

  #onToggleGroup(id: string): void {
    const next = new Set(this.#hiddenGroups);
    if (next.has(id)) next.delete(id); else next.add(id);
    this.#hiddenGroups = next;
    if (this.#diagramEl) this.#diagramEl.hiddenGroups = next;
  }

  #onTurtleState(state: TurtleStateDetail): void {
    this.#turtleState = state;
    // Sin tramos que recorrer (barras, rebanadas) los controles no aplican.
    const playable = (state.total || 0) > 0;
    for (const act of ['prev', 'play', 'next']) {
      const btn = this.shadowRoot?.querySelector<HTMLElement>(`[data-act="${act}"]`);
      if (btn) btn.hidden = !playable;
    }
    const ring = this.shadowRoot?.querySelector<HTMLElement>('.lb-ring');
    if (ring) ring.hidden = !playable;
    if (!playable) {
      if (this.#btnStop) this.#btnStop.hidden = true;
      if (this.#ringLabel) this.#ringLabel.textContent = '';
      return;
    }
    if (!this.#btnPlay) return;
    const playIcon = findPlayIcon(this.#btnPlay);
    if (playIcon) playIcon.setAttribute('icon', state.playing ? ICON.pause : ICON.play);
    this.#btnPlay.title = state.playing ? 'Pausar' : 'Reproducir';
    this.#btnPlay.setAttribute('aria-label', this.#btnPlay.title);
    if (this.#btnStop) this.#btnStop.hidden = !state.playing;
    if (this.#ring) {
      this.#ring.setAttribute('stroke-dashoffset', String(RING_C * (1 - (state.replay || 0))));
    }
    if (this.#ringLabel) {
      this.#ringLabel.textContent = state.total ? `${Math.min(state.idx + 1, state.total)}/${state.total}` : '';
    }
  }

  #turtle(): TurtleApi | null {
    return this.#diagramEl?.turtle ?? null;
  }

  #refreshShareUrl(): void {
    try {
      const url = buildViewerUrl(this.kind, this.#basePayload);
      this.setShareUrl(url, document.title, url);
    } catch { /* payload aún vacío */ }
  }

  #openCode(): void {
    const area = this.shadowRoot?.querySelector<HTMLTextAreaElement>('.lb-code__area');
    const err = this.shadowRoot?.querySelector<HTMLElement>('.lb-code__err');
    const code = this.shadowRoot?.querySelector<HTMLElement>('.lb-code');
    if (!area || !err || !code) return;
    area.value = diagramCodeJson(this.kind, this.#basePayload);
    err.hidden = true;
    code.hidden = false;
  }

  #saveCode(): void {
    const area = this.shadowRoot?.querySelector<HTMLTextAreaElement>('.lb-code__area');
    const err = this.shadowRoot?.querySelector<HTMLElement>('.lb-code__err');
    const code = this.shadowRoot?.querySelector<HTMLElement>('.lb-code');
    if (!area || !err || !code) return;
    let parsed: unknown;
    try { parsed = JSON.parse(area.value); }
    catch (e) {
      err.textContent = `JSON inválido: ${(e as Error)?.message ?? String(e)}`;
      err.hidden = false;
      return;
    }
    const next: unknown = parsed && typeof parsed === 'object' && 'payload' in (parsed as Record<string, unknown>)
      ? (parsed as { payload: unknown }).payload
      : parsed;
    this.#basePayload = next;
    this.#hiddenGroups = new Set();
    code.hidden = true;
    this.#mountDiagram();
  }
}

defineElement('iswc-diagram-lightbox', IswcDiagramLightbox, 'IswcDiagramLightbox');

export { IswcDiagramLightbox };
