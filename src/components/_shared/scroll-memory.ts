/**
 * ScrollMemory — persistencia opt-in de scrollTop para cualquier host scrolleable.
 *
 * Requiere remember-scroll + storage-key. Sin ambos no lee ni escribe.
 * Prefs: localStorage['is-webcomponents'][tag][storage-key] = { top, savedAt }.
 *
 * restorePolicy:
 *   - 'reload'  → solo F5 / atrás (is-main / galería)
 *   - 'always'  → cada connect con lectura vigente (listas en layouts)
 */

import { getComponentPrefs, setComponentPrefs } from './prefs.js';

export const SCROLL_MEMORY_ATTRS: readonly string[] = Object.freeze([
  'remember-scroll',
  'storage-key',
  'scroll-ttl',
]);

const DEFAULT_TTL = 3_600_000;
const RESTORE_WINDOW = 4_500;
const RESTORE_STEP = 60;
const USER_INTENT: readonly string[] = ['wheel', 'touchstart', 'pointerdown', 'keydown'];
const SAVE_DEBOUNCE_MS = 120;

export type RestorePolicy = 'reload' | 'always';

export type ScrollMemoryOpts = {
  tag: string;
  restorePolicy?: RestorePolicy;
};

export class ScrollMemory {
  host: HTMLElement;
  tag: string;
  restorePolicy: RestorePolicy;

  /** @param host Elemento al que se ata la persistencia.
   *  @param opts.tag Nombre lógico del componente (prefijo en storage).
   *  @param opts.restorePolicy Cuándo rehidratar el scrollTop. */
  constructor(host: HTMLElement, { tag, restorePolicy = 'reload' }: ScrollMemoryOpts) {
    this.host = host;
    this.tag = tag;
    this.restorePolicy = restorePolicy === 'always' ? 'always' : 'reload';
    this.#saveTimer = 0;
    this.#onScroll = null;
    this.#bootedKey = null;
    this.#restoring = false;
    this.#restoreTimer = 0;
    this.#restoreUntil = 0;
    this.#onUserScrollIntent = null;
    this.#connected = false;
  }

  #saveTimer: number;
  #onScroll: (() => void) | null;
  #bootedKey: string | null;
  #restoring: boolean;
  #restoreTimer: number;
  #restoreUntil: number;
  #onUserScrollIntent: (() => void) | null;
  #connected: boolean;

  get enabled(): boolean {
    return this.rememberScroll && !!this.storageKey;
  }

  get rememberScroll(): boolean {
    return this.host.hasAttribute('remember-scroll');
  }

  set rememberScroll(v: boolean) {
    this.host.toggleAttribute('remember-scroll', !!v);
  }

  get storageKey(): string {
    return (this.host.getAttribute('storage-key') || '').trim();
  }

  set storageKey(v: string) {
    if (v == null || v === '') this.host.removeAttribute('storage-key');
    else this.host.setAttribute('storage-key', String(v));
  }

  get scrollTtl(): number {
    const n = Number(this.host.getAttribute('scroll-ttl'));
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_TTL;
  }

  set scrollTtl(v: number) {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) this.host.removeAttribute('scroll-ttl');
    else this.host.setAttribute('scroll-ttl', String(Math.round(n)));
  }

  connect(): void {
    this.#connected = true;
    if (this.rememberScroll && !this.storageKey) {
      setTimeout(() => {
        if (this.#connected && this.rememberScroll && !this.storageKey) {
          console.warn(`[${this.tag}] remember-scroll requiere storage-key; persistencia desactivada`);
        }
      }, 0);
    }
    this.#bind();
    this.#bootScroll();
  }

  disconnect(): void {
    // Flush antes de morir: un repaint del consumidor no debe perder los últimos px.
    this.saveScroll();
    this.#connected = false;
    this.#unbind();
    this.#cancelRestore();
    clearTimeout(this.#saveTimer);
  }

  onAttributeChanged(name: string, prev: string | null, next: string | null): void {
    if (!this.#connected) return;
    if (name === 'remember-scroll' || name === 'storage-key') {
      this.#unbind();
      this.#bind();
    }
    if (name !== 'storage-key') return;
    const key = (next || '').trim();
    if (!key || key === (prev || '').trim()) return;
    if (this.#bootedKey === null) this.#bootScroll();
    else if (key !== this.#bootedKey) {
      this.#bootedKey = key;
      this.#cancelRestore();
      this.scrollToTop();
      this.clearRememberedScroll();
    }
  }

  scrollToTop({ behavior = 'auto' }: ScrollToOptions = {}): void {
    this.host.scrollTo({ top: 0, left: 0, behavior });
  }

  clearRememberedScroll(): void {
    if (!this.storageKey) return;
    setComponentPrefs(this.tag, this.storageKey, { top: 0, savedAt: 0 });
  }

  saveScroll(): void {
    if (!this.enabled || this.#restoring) return;
    setComponentPrefs(this.tag, this.storageKey, {
      top: Math.max(0, Math.round(this.host.scrollTop)),
      savedAt: Date.now(),
    });
  }

  restoreScroll(): boolean {
    if (!this.enabled) return false;
    const top = this.#savedTop();
    if (top <= 0) return false;
    this.host.scrollTop = top;
    return true;
  }

  #bootScroll(): void {
    if (!this.enabled) {
      this.host.scrollTop = 0;
      return;
    }
    this.#bootedKey = this.storageKey;
    if (this.restorePolicy === 'always') {
      this.#scheduleRestore();
      return;
    }
    const nav = performance.getEntriesByType?.('navigation')?.[0];
    const type = (nav as { type?: string } | undefined)?.type || 'navigate';
    if (type === 'reload' || type === 'back_forward') this.#scheduleRestore();
    else this.host.scrollTop = 0;
  }

  #scheduleRestore(): void {
    this.#cancelRestore();
    this.#restoring = true;
    this.#restoreUntil = Date.now() + RESTORE_WINDOW;
    this.#onUserScrollIntent = () => this.#cancelRestore();
    for (const evt of USER_INTENT) {
      this.host.addEventListener(evt, this.#onUserScrollIntent, { passive: true });
    }
    const tick = (): void => {
      this.#restoreTimer = 0;
      if (!this.#restoring) return;
      const target = this.#savedTop();
      if (target <= 0) return this.#cancelRestore();
      this.host.scrollTop = target;
      if (Math.round(this.host.scrollTop) >= target || Date.now() > this.#restoreUntil) {
        this.#cancelRestore();
        return;
      }
      this.#restoreTimer = setTimeout(tick, RESTORE_STEP) as unknown as number;
    };
    tick();
  }

  #cancelRestore(): void {
    clearTimeout(this.#restoreTimer);
    this.#restoreTimer = 0;
    this.#restoring = false;
    if (this.#onUserScrollIntent) {
      for (const evt of USER_INTENT) {
        this.host.removeEventListener(evt, this.#onUserScrollIntent);
      }
      this.#onUserScrollIntent = null;
    }
  }

  #savedTop(): number {
    const saved = getComponentPrefs(this.tag, this.storageKey);
    if (!saved) return 0;
    const top = Number((saved as { top?: unknown }).top);
    const savedAt = Number((saved as { savedAt?: unknown }).savedAt);
    if (!Number.isFinite(top) || top <= 0) return 0;
    if (!Number.isFinite(savedAt) || savedAt <= 0) return 0;
    if (Date.now() - savedAt > this.scrollTtl) return 0;
    return top;
  }

  #bind(): void {
    if (!this.enabled) return;
    this.#onScroll = () => {
      clearTimeout(this.#saveTimer);
      this.#saveTimer = setTimeout(() => this.saveScroll(), SAVE_DEBOUNCE_MS) as unknown as number;
    };
    this.host.addEventListener('scroll', this.#onScroll, { passive: true });
  }

  #unbind(): void {
    if (this.#onScroll) this.host.removeEventListener('scroll', this.#onScroll);
    this.#onScroll = null;
    clearTimeout(this.#saveTimer);
  }
}

/** Copia getters/setters y métodos públicos de ScrollMemory al host (API estable). */
export function bindScrollMemoryApi(host: HTMLElement, memory: ScrollMemory): void {
  Object.defineProperties(host, {
    rememberScroll: {
      configurable: true,
      get: () => memory.rememberScroll,
      set: (v: boolean) => { memory.rememberScroll = v; },
    },
    storageKey: {
      configurable: true,
      get: () => memory.storageKey,
      set: (v: string) => { memory.storageKey = v; },
    },
    scrollTtl: {
      configurable: true,
      get: () => memory.scrollTtl,
      set: (v: number) => { memory.scrollTtl = v; },
    },
  });
  (host as HTMLElement & { scrollToTop: ScrollMemory['scrollToTop'] }).scrollToTop = (...args: Parameters<ScrollMemory['scrollToTop']>) => memory.scrollToTop(...args);
  (host as HTMLElement & { clearRememberedScroll: () => void }).clearRememberedScroll = () => memory.clearRememberedScroll();
  (host as HTMLElement & { saveScroll: () => void }).saveScroll = () => memory.saveScroll();
  (host as HTMLElement & { restoreScroll: () => boolean }).restoreScroll = () => memory.restoreScroll();
}
