var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { TAMutations } from "./06-mutations.js";
const HISTORY_LIMIT = 50;
class TAHistory extends TAMutations {
  constructor() {
    super(...arguments);
    __publicField(this, "_historyPast", []);
    __publicField(this, "_historyFuture", []);
    __publicField(this, "_historySuspended", 0);
    __publicField(this, "_historyViewingPast", false);
    __publicField(this, "_protectionMode", false);
    __publicField(this, "_protectionPromptOpen", false);
  }
  get historyCanUndo() {
    return this._historyPast.length > 0;
  }
  get historyCanRedo() {
    return this._historyFuture.length > 0;
  }
  get historyIsViewingPast() {
    return this._historyViewingPast;
  }
  get isProtected() {
    return this._protectionMode || this._historyViewingPast;
  }
  get isProtectionPromptOpen() {
    return this._protectionPromptOpen;
  }
  get isReadOnlyExternal() {
    return super.isReadOnly;
  }
  get canToggleProtection() {
    return !super.isReadOnly;
  }
  get isReadOnly() {
    return super.isReadOnly || this._historyViewingPast;
  }
  get canMutate() {
    return !this.isReadOnly && !this._protectionMode;
  }
  protectionToggle() {
    if (this.isProtected) {
      this.confirmProtectionRelease();
      return;
    }
    if (!this.canToggleProtection) return;
    this._protectionMode = true;
    this.notifyUI();
  }
  setProtected(v) {
    const next = !!v;
    if (this._protectionMode === next) return;
    this._protectionMode = next;
    if (!next) this._protectionPromptOpen = false;
    this.notifyUI();
  }
  requestProtectionRelease() {
    if (!this.isProtected) return;
    this._protectionPromptOpen = true;
    this.notifyUI();
  }
  confirmProtectionRelease() {
    this._protectionMode = false;
    this._historyViewingPast = false;
    this._protectionPromptOpen = false;
    this.notifyUI();
  }
  dismissProtectionPrompt() {
    this._protectionPromptOpen = false;
    this.notifyUI();
  }
  historySnapshotList() {
    try {
      const list = this.List2Rows ?? [];
      return JSON.stringify(list.map((p) => typeof p?.toJSON === "function" ? p.toJSON() : p));
    } catch {
      try {
        return JSON.stringify(this.List2Rows ?? []);
      } catch {
        return "[]";
      }
    }
  }
  historyRestoreList(snapshot) {
    try {
      const parsed = JSON.parse(snapshot);
      const items = (Array.isArray(parsed) ? parsed : []).map((data) => this.toNode(data));
      this.List2Rows = items;
      this.onrefresh();
      this.resyncExpandedToCurrentTree();
      this.syncAllRowAdapters();
      this.notifyUI();
    } catch (e) {
      const msg = e instanceof Error ? `\r
${e.message}` : "";
      this.onError?.("No se pudo restaurar el estado del árbol." + msg);
    }
  }
  historyPush() {
    if (this._historySuspended > 0) return;
    const snap = this.historySnapshotList();
    const top = this._historyPast.length > 0 ? this._historyPast[this._historyPast.length - 1] : null;
    if (top === snap) return;
    this._historyPast.push(snap);
    if (this._historyPast.length > HISTORY_LIMIT) this._historyPast.shift();
    this._historyFuture = [];
    this._historyViewingPast = false;
    this.notifyUI();
  }
  historyUndo() {
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
  historyRedo() {
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
  historyRedoAll() {
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
  historyRecover() {
    this._historyFuture = [];
    this._historyViewingPast = false;
    this.notifyUI();
  }
  historyClear() {
    this._historyPast = [];
    this._historyFuture = [];
    this._historyViewingPast = false;
    this.notifyUI();
  }
}
export {
  TAHistory
};
