/**
 * TAHistory — undo/redo + protección del árbol.
 *
 * Mantiene dos stacks (`_historyPast` / `_historyFuture`) con snapshots
 * JSON-serializados del `List2Rows`. Cada vez que el consumidor llama a
 * `historyPush()`, captura el estado actual. `historyUndo` / `historyRedo`
 * navegan entre snapshots.
 *
 * La "protección" (`_protectionMode` / `_historyViewingPast`) bloquea
 * mutaciones cuando el árbol está en un estado pasado o cuando el usuario
 * lo protegió manualmente.
 *
 * Notas de tipado
 * ---------------
 * - `_historyPast`, `_historyFuture`, `_historySuspended`,
 *   `_historyViewingPast`, `_protectionMode`, `_protectionPromptOpen`,
 *   `isProtected`, `canMutate`, etc. son campos heredados vía
 *   `__publicField` (invisibles a TS) — los re-declaramos aquí para
 *   tipar las operaciones.
 */
import { TAMutations } from "./06-mutations.js";
import { TNode, TRecord } from "./_types.js";

/** Límite máximo de snapshots en el stack de undo. */
const HISTORY_LIMIT = 50;

class TAHistory extends TAMutations {
  // ── Inicialización de campos heredados ─────────────────────────────────
  // Sin estos defaults, getters como `historyCanUndo` rompen con
  // "Cannot read properties of undefined (reading 'length')" si se
  // consultan antes del primer historyPush() (caso real: tree-view demo
  // que asigna tv.list y dispara historyCanRedo antes de mutar nada).
  _historyPast: string[] = [];
  _historyFuture: string[] = [];
  _historySuspended: number = 0;
  _historyViewingPast: boolean = false;
  _protectionMode: boolean = false;
  _protectionPromptOpen: boolean = false;

  // ── Getters públicos ───────────────────────────────────────────────────
  /** ¿Hay algo que deshacer? */
  get historyCanUndo(): boolean {
    return this._historyPast.length > 0;
  }

  /** ¿Hay algo que rehacer? */
  get historyCanRedo(): boolean {
    return this._historyFuture.length > 0;
  }

  /** ¿El árbol está visualizando un estado pasado (no el presente)? */
  get historyIsViewingPast(): boolean {
    return this._historyViewingPast;
  }

  /** ¿El árbol está protegido (manual o por undo/redo)? */
  get isProtected(): boolean {
    return this._protectionMode || this._historyViewingPast;
  }

  /** ¿El modal de "desproteger" está abierto? */
  get isProtectionPromptOpen(): boolean {
    return this._protectionPromptOpen;
  }

  /** ¿El árbol es read-only externo (override del getter de contexto)? */
  get isReadOnlyExternal(): boolean {
    return super.isReadOnly;
  }

  /** ¿El usuario puede alternar la protección manualmente? */
  get canToggleProtection(): boolean {
    return !super.isReadOnly;
  }

  /** Read-only efectivo (externo + viewing-past). */
  override get isReadOnly(): boolean {
    return super.isReadOnly || this._historyViewingPast;
  }

  /** ¿Se puede mutar? (no readOnly y no protegido) */
  override get canMutate(): boolean {
    return !this.isReadOnly && !this._protectionMode;
  }

  /** Toggle de protección: si está protegido pide release, si no lo activa. */
  protectionToggle(): void {
    if (this.isProtected) {
      this.confirmProtectionRelease();
      return;
    }
    if (!this.canToggleProtection) return;
    this._protectionMode = true;
    this.notifyUI();
  }

  /** Setter externo del flag de protección. */
  setProtected(v: boolean): void {
    const next = !!v;
    if (this._protectionMode === next) return;
    this._protectionMode = next;
    if (!next) this._protectionPromptOpen = false;
    this.notifyUI();
  }

  /** Pide confirmación para desproteger (abre el modal). */
  requestProtectionRelease(): void {
    if (!this.isProtected) return;
    this._protectionPromptOpen = true;
    this.notifyUI();
  }

  /** Confirma el desproteger y sale del estado "viewing past". */
  confirmProtectionRelease(): void {
    this._protectionMode = false;
    this._historyViewingPast = false;
    this._protectionPromptOpen = false;
    this.notifyUI();
  }

  /** Cierra el modal de desproteger sin desproteger. */
  dismissProtectionPrompt(): void {
    this._protectionPromptOpen = false;
    this.notifyUI();
  }

  // ── Snapshots ──────────────────────────────────────────────────────────
  /** Serializa el `List2Rows` actual a JSON para el stack de undo. */
  historySnapshotList(): string {
    try {
      const list: TNode[] = this.List2Rows ?? [];
      return JSON.stringify(
        list.map((p: TNode) => {
          const toJsonFn = (p as unknown as { toJSON?: () => unknown }).toJSON;
          return typeof toJsonFn === "function" ? toJsonFn.call(p) : p;
        }),
      );
    } catch {
      try {
        return JSON.stringify(this.List2Rows ?? []);
      } catch {
        return "[]";
      }
    }
  }

  /**
   * Restaura un snapshot serializado: parsea, mapea a nodos vía `toNode`,
   * y aplica. Notifica UI y resincroniza expandidos.
   */
  historyRestoreList(snapshot: string): void {
    try {
      const parsed = JSON.parse(snapshot);
      const items: TNode[] = (
        Array.isArray(parsed) ? parsed : []
      ).map((data: unknown) => this.toNode(data as Partial<TNode>)).filter(
        (n: TNode | null): n is TNode => n != null,
      );
      this.List2Rows = items;
      this.onrefresh();
      this.resyncExpandedToCurrentTree();
      this.syncAllRowAdapters();
      this.notifyUI();
    } catch (e: unknown) {
      const msg = e instanceof Error ? `\r\n${e.message}` : "";
      (this as unknown as { onError?: (m: string) => void }).onError?.(
        "No se pudo restaurar el estado del árbol." + msg,
      );
    }
  }

  /** Captura el estado actual al stack de undo (no-op si está suspendido). */
  historyPush(): void {
    if (this._historySuspended > 0) return;
    const snap = this.historySnapshotList();
    const top =
      this._historyPast.length > 0
        ? this._historyPast[this._historyPast.length - 1]
        : null;
    if (top === snap) return;
    this._historyPast.push(snap);
    if (this._historyPast.length > HISTORY_LIMIT) this._historyPast.shift();
    this._historyFuture = [];
    this._historyViewingPast = false;
    this.notifyUI();
  }

  /** Deshace la última mutación. */
  historyUndo(): void {
    if (!this.historyCanUndo) return;
    const present = this.historySnapshotList();
    const prev = this._historyPast.pop();
    if (prev == null) return;
    this._historyFuture.push(present);
    this._historyViewingPast = true;
    this._historySuspended++;
    try {
      this.historyRestoreList(prev);
    } finally {
      this._historySuspended--;
    }
    this.notifyUI();
  }

  /** Rehace la última mutación deshecha. */
  historyRedo(): void {
    if (!this.historyCanRedo) return;
    const present = this.historySnapshotList();
    const next = this._historyFuture.pop();
    if (next == null) return;
    this._historyPast.push(present);
    this._historyViewingPast = this._historyFuture.length > 0;
    this._historySuspended++;
    try {
      this.historyRestoreList(next);
    } finally {
      this._historySuspended--;
    }
    this.notifyUI();
  }

  /** Rehace todas las mutaciones pendientes y sale del estado "viewing past". */
  historyRedoAll(): void {
    if (!this.historyCanRedo) return;
    this._historySuspended++;
    try {
      while (this._historyFuture.length > 0) {
        const present = this.historySnapshotList();
        const next = this._historyFuture.pop();
        if (next == null) break;
        this._historyPast.push(present);
        this.historyRestoreList(next);
      }
    } finally {
      this._historySuspended--;
    }
    this._historyViewingPast = false;
    this.notifyUI();
  }

  /** Descarta el redo stack y sale del estado "viewing past". */
  historyRecover(): void {
    this._historyFuture = [];
    this._historyViewingPast = false;
    this.notifyUI();
  }

  /** Limpia ambos stacks. */
  historyClear(): void {
    this._historyPast = [];
    this._historyFuture = [];
    this._historyViewingPast = false;
    this.notifyUI();
  }
}

export { TAHistory };
