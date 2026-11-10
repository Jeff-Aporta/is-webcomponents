// @contexto INDICE.md · src/core/README.md
/**
 * Preferencias compartidas de Web Components (un solo JSON en localStorage).
 *
 * Forma:
 * {
 *   "iswc-split-panel": { "gallery-nav": { "positionInPixels": 200 } },
 *   "iswc-main": { "docs-iswc-button": { "top": 420, "savedAt": 1710000000000 } },
 *   "iswc-ag-grid": { "mi-tabla": { … snapshot del grid … } }
 * }
 *
 * ROOT_KEY = "iswc:root" (core/iswc-storage migra la vieja `iswc-root`). `is-webcomponents` (nombre del
 * kit antes de iswc-root) e `is-components` son SOLO legacy: se leen una vez para migrar y se borran; nunca se escriben.
 */

/** Forma del root de prefs: mapa de `tag -> key -> prefs`. */

/** Entrada individual: objeto plano `{ clave: valor }`. */
import type { PrefsRoot, PrefsEntry, ClearAllPrefsResult, RestorePolicy, ScrollMemoryOpts } from './schemas/prefs.schemas.js';
import { iswcKey, readIswc, removeIswc, writeIswc } from './iswc-storage.js';

const ROOT_NOMBRE = 'root';
const ROOT_KEY = iswcKey(ROOT_NOMBRE);
const LEGACY_ROOT_KEY = 'is-components';
/** Roots anteriores, del más reciente al más viejo. */
const LEGACY_ROOT_KEYS = ['is-webcomponents', LEGACY_ROOT_KEY] as const; // antes de iswc-root

function parseRoot(raw: string | null): PrefsRoot | null {
  if (!raw) return null;
  try {
    const data: unknown = JSON.parse(raw);
    return data && typeof data === 'object' && !Array.isArray(data) ? data as PrefsRoot : null;
  } catch {
    return null;
  }
}

function readRoot(): PrefsRoot {
  try {
    const current = parseRoot(readIswc(ROOT_NOMBRE));
    if (current) return current;
    // Migración desde el root legacy: se copia tal cual y se retira el viejo,
    // así la siguiente lectura ya sale por el camino corto.
    for (const key of LEGACY_ROOT_KEYS) {
      const legacy = parseRoot(localStorage.getItem(key));
      if (!legacy) continue;
      writeRoot(legacy);
      for (const k of LEGACY_ROOT_KEYS) {
        try { localStorage.removeItem(k); } catch { /* noop */ }
      }
      return legacy;
    }
    return {};
  } catch {
    return {};
  }
}

function writeRoot(data: PrefsRoot): void {
  writeIswc(ROOT_NOMBRE, JSON.stringify(data)); // quota / private mode: false, sin más
}

/** Devuelve la entrada prefs de `(tag, key)`, o `null` si no existe. */
export function getComponentPrefs(tag: string, key: string): PrefsEntry | null {
  if (!tag || !key) return null;
  const root = readRoot();
  const bucket = root[tag];
  if (!bucket || typeof bucket !== 'object') return null;
  const entry = bucket[key];
  return entry && typeof entry === 'object' ? entry : null;
}

/** Merge shallow de `patch` en la entrada tag/key. */
export function setComponentPrefs(tag: string, key: string, patch: PrefsEntry): void {
  if (!tag || !key || !patch || typeof patch !== 'object') return;
  const root = readRoot();
  const bucket = root[tag] && typeof root[tag] === 'object' ? { ...root[tag] } : {};
  const existing = bucket[key] && typeof bucket[key] === 'object' ? bucket[key] as PrefsEntry : {};
  bucket[key] = { ...existing, ...patch };
  root[tag] = bucket;
  writeRoot(root);
}

/** Reemplaza la entrada completa: sin merge, para snapshots que deben quedar
 *  exactamente como se guardan (estado de grid, donde un merge dejaría
 *  columnas o filtros viejos que ya no existen). */
export function replaceComponentPrefs(tag: string, key: string, value: PrefsEntry): void {
  if (!tag || !key || !value || typeof value !== 'object') return;
  const root = readRoot();
  const bucket = root[tag] && typeof root[tag] === 'object' ? { ...root[tag] } : {};
  bucket[key] = value;
  root[tag] = bucket;
  writeRoot(root);
}

/** Borra la entrada tag/key (y el bucket si queda vacío). */
export function removeComponentPrefs(tag: string, key: string): void {
  if (!tag || !key) return;
  const root = readRoot();
  const bucket = root[tag];
  if (!bucket || typeof bucket !== 'object' || !(key in bucket)) return;
  const next = { ...bucket };
  delete next[key];
  if (Object.keys(next).length) root[tag] = next;
  else delete root[tag];
  writeRoot(root);
}

/** Snapshot del root (solo lectura; para auditoría). */
export function peekComponentPrefsRoot(): PrefsRoot {
  return readRoot();
}

/**
 * Limpia TODA la memoria de componentes (`iswc:root` + legacy).
 * Splits, scrolls, grids, etc. Vuelve a los defaults del markup.
 */
export function clearAllComponentPrefs(): ClearAllPrefsResult {
  const before = readRoot();
  const tags = Object.keys(before || {});
  try {
    removeIswc(ROOT_NOMBRE);
    for (const k of LEGACY_ROOT_KEYS) localStorage.removeItem(k);
  } catch {
    /* quota / private */
  }
  return { cleared: true, tags };
}

export function getPrefsRootKey(): string {
  return ROOT_KEY;
}

export function getLegacyPrefsRootKey(): string {
  return LEGACY_ROOT_KEY;
}

// ── scroll-memory ──
/**
 * ScrollMemory — persistencia opt-in de scrollTop para cualquier host scrolleable.
 *
 * Requiere remember-scroll + storage-key. Sin ambos no lee ni escribe.
 * Prefs: localStorage['iswc:root'][tag][storage-key] = { top, savedAt }.
 *
 * restorePolicy:
 *   - 'reload'  → solo F5 / atrás (iswc-main / galería)
 *   - 'always'  → cada connect con lectura vigente (listas en layouts)
 */
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
