/**
 * Pintado DOM de filas (port de _rowItem.svelte). Recursivo, keyed por pathInit.
 */
import "../../flex-options.js";
import "../../float-card.js";

function rowLabel(node, opts) {
  if (typeof opts.renderRow === "function") return null;
  const field = opts.labelField || "titulo";
  const v = node?.[field] ?? node?.label ?? node?.name ?? node?.flatPath;
  return v == null ? "" : String(v);
}

function helperText(node, opts) {
  if (typeof opts.renderHelper === "function") return null;
  const field = opts.helperField;
  if (!field) return "";
  const v = node?.[field];
  return v == null ? "" : String(v);
}

function applySummaryClass(sum: HTMLElement, rc) {
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
  ].filter(Boolean).join(" ");
  sum.setAttribute("aria-selected", rc.isSelected ? "true" : "false");
  if (rc.hasChildren) sum.setAttribute("aria-expanded", rc.isNodeOpen ? "true" : "false");
  else sum.removeAttribute("aria-expanded");
  sum.setAttribute("draggable", rc.isDraggable ? "true" : "false");
}

function bindOnce(el, type, fn, key) {
  const store = el._trvwrH || (el._trvwrH = {});
  if (store[key]) el.removeEventListener(type, store[key]);
  store[key] = fn;
  el.addEventListener(type, fn);
}

function ensureIcon(parent, sel, icon) {
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

function paintHandle(row, rc) {
  let h = row.querySelector<HTMLElement>(".trvwr-drag-handle");
  if (!h) {
    h = document.createElement("span");
    h.className = "trvwr-drag-handle";
    row.querySelector<HTMLElement>(".trvwr-sum-row")?.prepend(h);
  }
  const mode = rc.isDraggable ? "drag" : rc.isLockedByProtection ? "lock" : (rc.isFrozen && !rc.mergedDisabled) ? "frozen" : "none";
  h.classList.toggle("trvwr-drag-handle--locked", mode === "lock");
  h.classList.toggle("trvwr-drag-handle--frozen", mode === "frozen");
  if (h.dataset.mode === mode && h.querySelector<HTMLElement>("is-icon")) {
    return;
  }
  h.dataset.mode = mode;
  h.replaceChildren();
  if (mode === "drag") {
    h.title = "Arrastrar para reordenar";
    h.setAttribute("draggable", "true");
    const ic = document.createElement("is-icon");
    ic.setAttribute("icon", "mdi:dots-grid");
    h.appendChild(ic);
    bindOnce(h, "dragstart", (e: Event) => rc.ondragstart(e), "ds");
    bindOnce(h, "dragend", (e: Event) => rc.ondragend(e), "de");
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

function paintRow(host: HTMLElement, adapter, node, opts) {
  const rc = adapter.getOrCreateRowAdapter({
    treeController: adapter,
    node,
    get forceRefresh() {
      return () => paintRow(host, adapter, node, opts);
    },
  });
  host.dataset.flatpath = rc.flatPath;
  host.className = "trvwr-row-host";

  let details = host.querySelector<HTMLDetailsElement>(":scope > details.trvwr-itm");
  if (!details) {
    details = document.createElement("details");
    details.className = "trvwr-itm";
    details.dataset.testid = "tree-item";
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
    details._trvwrSyncOpen = true;
    details.open = rc.isNodeOpen;
    details._trvwrSyncOpen = false;
  }
  details.toggleAttribute("aria-disabled", !!rc.mergedDisabled);

  const sum = details.querySelector<HTMLElement>(":scope > summary");
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
  bindOnce(details, "toggle", (e: Event) => rc.ondetailstoggle(e), "tg");
  bindOnce(sum, "click", (e: Event) => rc.onsummaryclick(e), "cl");
  bindOnce(sum, "dblclick", (e: Event) => rc.onsummarydblclick(e), "dc");
  bindOnce(sum, "keydown", (e: Event) => rc.onkeydown(e), "kd");
  bindOnce(sum, "focus", (e: Event) => rc.onsummaryfocus(e), "fc");
  bindOnce(sum, "blur", () => rc.onsummaryblur(), "bl");
  bindOnce(sum, "pointerenter", (e: Event) => rc.onsummarypointerenter(e), "pe");
  bindOnce(sum, "pointerleave", (e: Event) => rc.onsummarypointerleave(e), "pl");
  bindOnce(sum, "dragstart", (e: Event) => rc.ondragstart(e), "ds");
  bindOnce(sum, "dragend", (e: Event) => rc.ondragend(e), "de");
  bindOnce(sum, "dragenter", (e: Event) => rc.onsummarydragenter(e), "den");
  bindOnce(sum, "dragover", (e: Event) => rc.onsummarydragover(e), "dov");
  bindOnce(sum, "dragleave", (e: Event) => rc.onsummarydragleave(e), "dlv");
  bindOnce(sum, "drop", (e: Event) => rc.ondrop(e), "dp");

  const row = sum.querySelector<HTMLElement>(".trvwr-sum-row");
  paintHandle(sum, rc);

  const symb = row.querySelector<HTMLElement>(".trvwr-itm-symb");
  const lead = row.querySelector<HTMLElement>(".trvwr-itm-lead");
  symb.hidden = !rc.showCaret;
  lead.hidden = !(!rc.showCaret && rc.rowIcono);
  if (rc.showCaret) {
    const chev = ensureIcon(symb, ".trvwr-chevron", "mdi:chevron-down");
    if (chev) chev.style.transform = rc.isNodeOpen ? "" : "rotate(-90deg)";
    if (rc.rowIcono) {
      const ic = ensureIcon(symb, ".trvwr-row-icon", rc.rowIcono.icon);
      if (ic && rc.rowIcono.mergedStyle) ic.setAttribute("style", rc.rowIcono.mergedStyle);
    } else {
      symb.querySelector<HTMLElement>(".trvwr-row-icon")?.remove();
    }
  } else if (rc.rowIcono) {
    const ic = ensureIcon(lead, ".trvwr-row-icon", rc.rowIcono.icon);
    if (ic && rc.rowIcono.mergedStyle) ic.setAttribute("style", rc.rowIcono.mergedStyle);
    lead.classList.toggle("trvwr-itm-lead--add", !!rc.onLeadIconClick);
    lead.title = rc.onLeadIconClick ? "Agregar hijo" : "";
    bindOnce(lead, "click", (e: Event) => {
      if (!rc.onLeadIconClick) return;
      e.stopPropagation();
      rc.onLeadIconClick();
    }, "lead");
  }

  const content = row.querySelector<HTMLElement>(".trvwr-itm-content");
  const helper = row.querySelector<HTMLElement>(".trvwr-itm-helper");
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
    fc.linearTransform = rc.floatCard;
    fc.open = !!(rc.floatVisible && rc.hasRowTools);
  }
  if (fo) {
    bindOnce(fo, "click", (e: Event) => e.stopPropagation(), "stop");
    bindOnce(fo, "dblclick", (e: Event) => e.stopPropagation(), "stop2");
    bindOnce(fo, "pointerdown", (e: Event) => e.stopPropagation(), "stop3");
    if (typeof fo.setConfig === "function") {
      fo.setConfig(rc.hasRowTools
        ? { actions: rc.filteredActions, more: rc.cascadeOptions, moreDisabled: rc.cascadeDisabled }
        : { actions: [], more: [] });
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
    paintForest(kids, adapter, node.childrens, opts);
  } else if (kids) {
    kids.remove();
  }
}

export function paintForest(container, adapter, nodes, opts) {
  const existing = new Map();
  for (const el of [...container.children]) {
    if (el.dataset?.pathinit) existing.set(el.dataset.pathinit, el);
  }
  const keep = new Set();
  const order = [];
  for (const node of nodes || []) {
    const key = String(node.pathInit || node.flatPath || "");
    keep.add(key);
    let el = existing.get(key);
    if (!el) {
      el = document.createElement("div");
      el.dataset.pathinit = key;
      container.appendChild(el);
    }
    order.push(el);
    paintRow(el, adapter, node, opts);
  }
  for (const [key, el] of existing) {
    if (keep.has(key)) continue;
    adapter.disposeRowAdapterByFlatPath?.(el.dataset.flatpath);
    el.remove();
  }
  const kids = [...container.children];
  let sameOrder = kids.length === order.length;
  if (sameOrder) {
    for (let i = 0; i < order.length; i++) {
      if (kids[i] !== order[i]) { sameOrder = false; break; }
    }
  }
  if (!sameOrder) for (const el of order) container.appendChild(el);
}
