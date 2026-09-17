/**
 * Pintado DOM de filas (port de _rowItem.svelte). Recursivo, keyed por pathInit.
 *
 * Recibe un `container` y un árbol de nodos; por cada nodo crea un host
 * `<div class="trvwr-row-host">` con un `<details>` interno y un
 * `<summary>` clicable. Pinta chevron, ícono, label, helper, handle de
 * drag, float-card con actions y dropdown de cascade options. Recursivo:
 * si el nodo tiene hijos y está expandido, pinta los hijos dentro.
 */
import "../../flex-options.js";
import "../../float-card.js";
import type { TreeActionEntry, TreeActionSpec, TNode } from "./_types.js";

/** Opciones que recibe `paintForest` para customizar el pintado. */
interface RenderOpts {
  /** Campo del nodo a usar como label por defecto (default: "titulo"). */
  labelField?: string;
  /** Campo del nodo a usar como helper por defecto. */
  helperField?: string;
  /** Renderer custom para el label (recibe el nodo y el `<div>`). */
  renderRow?: (node: TNode, content: HTMLElement) => void;
  /** Renderer custom para el helper. */
  renderHelper?: (node: TNode, helper: HTMLElement) => void;
}

export type { RenderOpts };

/** Forma mínima que `paintRow` espera del adapter (`TreeRowAdapter.getOrCreateRowAdapter`). */
interface RenderAdapter {
  flatPath: string;
  getOrCreateRowAdapter(bridge: unknown): unknown;
}

/** Forma del "row config" que `paintRow` consume para aplicar CSS / aria. */
interface RowController {
  flatPath: string;
  isSelected: boolean;
  isHighlighted: boolean;
  isNodeOpen: boolean;
  hasChildren: boolean;
  isDraggable: boolean;
  mergedDisabled: boolean;
  isLockedByProtection: boolean;
  isFrozen: boolean;
  shouldFlash: boolean;
  shouldFlashError: boolean;
  dragOver: "before" | "after" | "into" | null;
  dragForbidden: boolean;
  showCaret: boolean;
  rowIcono: { icon: string; mergedStyle?: string } | null;
  showOptions: boolean;
  hasRowTools: boolean;
  filteredActions: TreeActionEntry[];
  cascadeOptions: TreeActionEntry[];
  cascadeDisabled: boolean;
  floatCard: Record<string, unknown>;
  floatVisible: boolean;
  onLeadIconClick: (() => void) | null;
  ondragstart(e: Event): void;
  ondragend(e: Event): void;
  ondetailstoggle(e: Event): void;
  onsummaryclick(e: Event): void;
  onsummarydblclick(e: Event): void;
  onkeydown(e: Event): void;
  onsummaryfocus(e: Event): void;
  onsummaryblur(): void;
  onsummarypointerenter(e: Event): void;
  onsummarypointerleave(e: Event): void;
  onsummarydragenter(e: Event): void;
  onsummarydragover(e: Event): void;
  onsummarydragleave(e: Event): void;
  ondrop(e: Event): void;
  requestRowUiSync(): void;
}

/** Devuelve el texto del label de una fila (o "" si no hay renderer custom). */
function rowLabel(node: TNode, opts: RenderOpts): string {
  if (typeof opts.renderRow === "function") return "";
  const field = opts.labelField || "titulo";
  const v = (node as Record<string, unknown>)[field] ?? node.label ?? node.name ?? node.flatPath;
  return v == null ? "" : String(v);
}

/** Devuelve el texto del helper de una fila. */
function helperText(node: TNode, opts: RenderOpts): string {
  if (typeof opts.renderHelper === "function") return "";
  const field = opts.helperField;
  if (!field) return "";
  const v = (node as Record<string, unknown>)[field];
  return v == null ? "" : String(v);
}

/** Aplica las clases CSS y atributos aria-* al `<summary>` según el `rc`. */
function applySummaryClass(sum: HTMLElement, rc: RowController): void {
  const drg = rc.dragOver;
  const forbidden = rc.dragForbidden && drg !== null;
  sum.className = [
    "trvwr-itm-sum",
    rc.mergedDisabled ? "trvwr-itm-sum--disabled" : "",
    rc.isHighlighted ? "trvwr-itm-sum--focused" : "",
    !forbidden && drg === "before" ? "trvwr-itm-sum--drg-bf" : "",
    !forbidden && drg === "after" ? "trvwr-itm-sum--drg-aftr" : "",
    !forbidden && drg === "into" ? "trvwr-itm-sum--drg-into" : "",
    forbidden && drg === "before" ? "trvwr-itm-sum--drg-forbidden-bf" : "",
    forbidden && drg === "after" ? "trvwr-itm-sum--drg-forbidden-aftr" : "",
    forbidden && drg === "into" ? "trvwr-itm-sum--drg-forbidden-into" : "",
  ]
    .filter(Boolean)
    .join(" ");
  sum.setAttribute("aria-selected", rc.isSelected ? "true" : "false");
  if (rc.hasChildren) sum.setAttribute("aria-expanded", rc.isNodeOpen ? "true" : "false");
  else sum.removeAttribute("aria-expanded");
  sum.setAttribute("draggable", rc.isDraggable ? "true" : "false");
}

/** Almacén de handlers en `._trvwrH` para evitar doble-binding. */
type HandlerStore = Record<string, EventListener | undefined>;

/** Liga un evento a `el` con `fn` y guarda el handler bajo `key` para idempotencia. */
function bindOnce(
  el: HTMLElement,
  type: string,
  fn: EventListener,
  key: string,
): void {
  const store = (el as unknown as { _trvwrH?: HandlerStore })._trvwrH ??
    ((el as unknown as { _trvwrH: HandlerStore })._trvwrH = {});
  if (store[key]) el.removeEventListener(type, store[key] as EventListener);
  store[key] = fn;
  el.addEventListener(type, fn);
}

/** Crea / actualiza un ícono dentro de `parent` con el nombre `sel` y el `icon` dado. */
function ensureIcon(
  parent: HTMLElement,
  sel: string,
  icon: string | null,
): HTMLElement | null {
  let ic = parent.querySelector<HTMLElement>(sel);
  if (!icon) {
    ic?.remove();
    return null;
  }
  if (!ic) {
    ic = document.createElement("is-icon");
    ic.className = sel.slice(1);
    parent.appendChild(ic);
  }
  ic.setAttribute("icon", icon);
  return ic;
}

/** Pinta el handle de drag (icono + título + clases locked/frozen). */
function paintHandle(row: HTMLElement, rc: RowController): void {
  let h = row.querySelector<HTMLElement>(".trvwr-drag-handle");
  if (!h) {
    h = document.createElement("span");
    h.className = "trvwr-drag-handle";
    const sumRow = row.querySelector<HTMLElement>(".trvwr-sum-row");
    sumRow?.prepend(h);
  }
  const mode = rc.isDraggable
    ? "drag"
    : rc.isLockedByProtection
      ? "lock"
      : (rc as unknown as { isFrozen?: boolean }).isFrozen && !rc.mergedDisabled
        ? "frozen"
        : "none";
  h.classList.toggle("trvwr-drag-handle--locked", mode === "lock");
  h.classList.toggle("trvwr-drag-handle--frozen", mode === "frozen");
  if (h.dataset["mode"] === mode && h.querySelector<HTMLElement>("is-icon")) {
    return;
  }
  h.dataset["mode"] = mode;
  h.replaceChildren();
  if (mode === "drag") {
    h.title = "Arrastrar para reordenar";
    h.setAttribute("draggable", "true");
    const ic = document.createElement("is-icon");
    ic.setAttribute("icon", "mdi:dots-grid");
    h.appendChild(ic);
    bindOnce(h, "dragstart", (e: Event): void => rc.ondragstart(e), "ds");
    bindOnce(h, "dragend", (e: Event): void => rc.ondragend(e), "de");
  } else if (mode === "lock") {
    h.title = "Protegido";
    h.removeAttribute("draggable");
    const ic = document.createElement("is-icon");
    ic.setAttribute("icon", "mdi:lock-outline");
    h.appendChild(ic);
  } else if (mode === "frozen") {
    h.title = "Posición fija";
    h.removeAttribute("draggable");
    const ic = document.createElement("is-icon");
    ic.setAttribute("icon", "mdi:hand-back-right-off-outline");
    h.appendChild(ic);
  } else {
    h.removeAttribute("title");
    h.removeAttribute("draggable");
  }
}

/** Tipo del `isLockedByProtection` que consume `paintHandle`. */
// (RowController ya incluye isLockedByProtection e isFrozen; se conserva
// el nombre ControllerWithLock como alias para no romper call-sites.)
type ControllerWithLock = RowController;

/**
 * Pinta una fila (host + details + summary + handle + iconos + label +
 * helper + float-card + actions + dropdown + recursión a hijos).
 */
function paintRow(
  host: HTMLElement,
  adapter: RenderAdapter,
  node: TNode,
  opts: RenderOpts,
): void {
  const rcResult = adapter.getOrCreateRowAdapter({
    treeController: adapter,
    node,
    get forceRefresh(): () => void {
      return (): void => paintRow(host, adapter, node, opts);
    },
  });
  // El adapter devuelve un "row controller" con la forma de TRABase.
  const rc = rcResult as unknown as ControllerWithLock;
  host.dataset["flatpath"] = rc.flatPath;
  host.className = "trvwr-row-host";

  let details = host.querySelector<HTMLDetailsElement>(":scope > details.trvwr-itm");
  if (!details) {
    details = document.createElement("details");
    details.className = "trvwr-itm";
    details.dataset["testid"] = "tree-item";
    const sum = document.createElement("summary");
    sum.setAttribute("role", "treeitem");
    sum.tabIndex = 0;
    const row = document.createElement("div");
    row.className = "trvwr-sum-row";
    const handle = document.createElement("span");
    handle.className = "trvwr-drag-handle";
    const symb = document.createElement("span");
    symb.className = "trvwr-itm-symb";
    const lead = document.createElement("span");
    lead.className = "trvwr-itm-lead";
    const content = document.createElement("div");
    content.className = "trvwr-itm-content";
    const helper = document.createElement("small");
    helper.className = "trvwr-itm-helper";
    row.append(handle, symb, lead, content, helper);
    const fc = document.createElement("is-float-card");
    fc.setAttribute("horizontal", "right");
    fc.setAttribute("vertical", "top+50");
    const fo = document.createElement("is-flex-options");
    fo.setAttribute("slot", "float");
    fo.setAttribute("compact", "");
    fc.append(row, fo);
    sum.append(fc);
    details.appendChild(sum);
    host.appendChild(details);
  }

  const isFolderSelected = rc.isSelected && rc.hasChildren;
  const isActive = rc.showOptions || rc.isHighlighted;
  details.classList.toggle("highlight", !!(isFolderSelected || isActive));
  details.classList.toggle("should-flash", !!rc.shouldFlash);
  details.classList.toggle("should-flash--error", !!rc.shouldFlashError);
  if (details.open !== rc.isNodeOpen) {
    (details as unknown as { _trvwrSyncOpen: boolean })._trvwrSyncOpen = true;
    details.open = rc.isNodeOpen;
    (details as unknown as { _trvwrSyncOpen: boolean })._trvwrSyncOpen = false;
  }
  details.toggleAttribute("aria-disabled", !!rc.mergedDisabled);

  const sum = details.querySelector<HTMLElement>(":scope > summary");
  if (!sum) return;
  if (!sum.querySelector<HTMLElement>(":scope > is-float-card")) {
    const row = sum.querySelector<HTMLElement>(".trvwr-sum-row");
    sum.querySelector<HTMLElement>(".trvwr-float-card")?.remove();
    const fc0 = document.createElement("is-float-card");
    fc0.setAttribute("horizontal", "right");
    fc0.setAttribute("vertical", "top+50");
    const fo0 = document.createElement("is-flex-options");
    fo0.setAttribute("slot", "float");
    fo0.setAttribute("compact", "");
    if (row) fc0.append(row);
    fc0.append(fo0);
    sum.append(fc0);
  }
  applySummaryClass(sum, rc);
  bindOnce(details, "toggle", (e: Event): void => rc.ondetailstoggle(e), "tg");
  bindOnce(sum, "click", (e: Event): void => rc.onsummaryclick(e), "cl");
  bindOnce(sum, "dblclick", (e: Event): void => rc.onsummarydblclick(e), "dc");
  bindOnce(sum, "keydown", (e: Event): void => rc.onkeydown(e), "kd");
  bindOnce(sum, "focus", (e: Event): void => rc.onsummaryfocus(e), "fc");
  bindOnce(sum, "blur", (): void => rc.onsummaryblur(), "bl");
  bindOnce(sum, "pointerenter", (e: Event): void => rc.onsummarypointerenter(e), "pe");
  bindOnce(sum, "pointerleave", (e: Event): void => rc.onsummarypointerleave(e), "pl");
  bindOnce(sum, "dragstart", (e: Event): void => rc.ondragstart(e), "ds");
  bindOnce(sum, "dragend", (e: Event): void => rc.ondragend(e), "de");
  bindOnce(sum, "dragenter", (e: Event): void => rc.onsummarydragenter(e), "den");
  bindOnce(sum, "dragover", (e: Event): void => rc.onsummarydragover(e), "dov");
  bindOnce(sum, "dragleave", (e: Event): void => rc.onsummarydragleave(e), "dlv");
  bindOnce(sum, "drop", (e: Event): void => rc.ondrop(e), "dp");

  const row = sum.querySelector<HTMLElement>(".trvwr-sum-row");
  if (!row) return;
  paintHandle(sum, rc);

  const symb = row.querySelector<HTMLElement>(".trvwr-itm-symb");
  const lead = row.querySelector<HTMLElement>(".trvwr-itm-lead");
  if (symb) symb.hidden = !rc.showCaret;
  if (lead) lead.hidden = !(!rc.showCaret && rc.rowIcono);
  if (rc.showCaret) {
    const chev = ensureIcon(symb ?? document.createElement("span"), ".trvwr-chevron", "mdi:chevron-down");
    if (chev) chev.style.transform = rc.isNodeOpen ? "" : "rotate(-90deg)";
    if (rc.rowIcono) {
      const ic = ensureIcon(symb ?? document.createElement("span"), ".trvwr-row-icon", rc.rowIcono.icon);
      if (ic && rc.rowIcono.mergedStyle) ic.setAttribute("style", rc.rowIcono.mergedStyle);
    } else {
      symb?.querySelector<HTMLElement>(".trvwr-row-icon")?.remove();
    }
  } else if (rc.rowIcono) {
    const ic = ensureIcon(lead ?? document.createElement("span"), ".trvwr-row-icon", rc.rowIcono.icon);
    if (ic && rc.rowIcono.mergedStyle) ic.setAttribute("style", rc.rowIcono.mergedStyle);
    if (lead) {
      lead.classList.toggle("trvwr-itm-lead--add", !!rc.onLeadIconClick);
      lead.title = rc.onLeadIconClick ? "Agregar hijo" : "";
      bindOnce(
        lead,
        "click",
        (e: Event): void => {
          if (!rc.onLeadIconClick) return;
          e.stopPropagation();
          rc.onLeadIconClick();
        },
        "lead",
      );
    }
  }

  const content = row.querySelector<HTMLElement>(".trvwr-itm-content");
  const helper = row.querySelector<HTMLElement>(".trvwr-itm-helper");
  if (!content || !helper) return;
  if (typeof opts.renderRow === "function") {
    opts.renderRow(node, content);
  } else {
    const nextLabel = rowLabel(node, opts);
    if (content.textContent !== nextLabel) content.textContent = nextLabel;
  }
  if (typeof opts.renderHelper === "function") {
    opts.renderHelper(node, helper);
  } else {
    const ht = helperText(node, opts);
    helper.textContent = ht;
    helper.hidden = !ht;
  }

  const fc = sum.querySelector<HTMLElement>("is-float-card");
  const fo = fc?.querySelector<HTMLElement>("is-flex-options");
  if (fc) {
    (fc as unknown as { linearTransform: unknown }).linearTransform = rc.floatCard;
    (fc as unknown as { open: boolean }).open = !!(rc.floatVisible && rc.hasRowTools);
  }
  if (fo) {
    bindOnce(fo, "click", (e: Event): void => e.stopPropagation(), "stop");
    bindOnce(fo, "dblclick", (e: Event): void => e.stopPropagation(), "stop2");
    bindOnce(fo, "pointerdown", (e: Event): void => e.stopPropagation(), "stop3");
    const setConfigFn = (fo as unknown as { setConfig?: (cfg: unknown) => void })
      .setConfig;
    if (typeof setConfigFn === "function") {
      setConfigFn.call(
        fo,
        rc.hasRowTools
          ? {
              actions: rc.filteredActions,
              more: rc.cascadeOptions,
              moreDisabled: rc.cascadeDisabled,
            }
          : { actions: [], more: [] },
      );
    }
  }

  let kids = details.querySelector<HTMLElement>(":scope > .trvwr-kids");
  if (rc.hasChildren && rc.isNodeOpen) {
    if (!kids) {
      kids = document.createElement("div");
      kids.className = "trvwr-kids";
      kids.setAttribute("role", "group");
      details.appendChild(kids);
    }
    paintForest(kids, adapter, node.childrens ?? [], opts);
  } else if (kids) {
    kids.remove();
  }
}

/**
 * Pinta un bosque de nodos dentro de `container`, reusando hosts previos
 * por `pathInit` (key estable) y eliminando los que ya no estén.
 */
export function paintForest(
  container: HTMLElement,
  adapter: RenderAdapter,
  nodes: readonly TNode[] | null | undefined,
  opts: RenderOpts,
): void {
  const existing = new Map<string, HTMLElement>();
  for (const el of Array.from(container.children)) {
    const child = el as HTMLElement;
    const key = child.dataset?.["pathinit"];
    if (key) existing.set(key, child);
  }
  const keep = new Set<string>();
  const order: HTMLElement[] = [];
  for (const node of nodes ?? []) {
    const key = String(
      (node as { pathInit?: string }).pathInit ?? node.flatPath ?? "",
    );
    keep.add(key);
    let el = existing.get(key);
    if (!el) {
      el = document.createElement("div");
      el.dataset["pathinit"] = key;
      container.appendChild(el);
    }
    order.push(el);
    paintRow(el, adapter, node, opts);
  }
  for (const [key, el] of existing) {
    if (keep.has(key)) continue;
    (adapter as unknown as {
      disposeRowAdapterByFlatPath?: (id: string) => void;
    }).disposeRowAdapterByFlatPath?.(el.dataset["flatpath"] ?? "");
    el.remove();
  }
  const kids = Array.from(container.children) as HTMLElement[];
  let sameOrder = kids.length === order.length;
  if (sameOrder) {
    for (let i = 0; i < order.length; i++) {
      if (kids[i] !== order[i]) {
        sameOrder = false;
        break;
      }
    }
  }
  if (!sameOrder) for (const el of order) container.appendChild(el);
}

// Mantén vivo el import de `TreeActionSpec` para tree-shaking / docs.
void (null as unknown as TreeActionSpec);
