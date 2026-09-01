/**
 * Pinta FlexOptionsInput[] como is-button / is-check-icon-button / is-dropdown.
 * Misma forma que ISP FlexOptions: grupos, separator, icon+title, toggle checked.
 */

function mkIcon(name) {
  const ic = document.createElement("is-icon");
  ic.setAttribute("icon", name);
  ic.setAttribute("slot", "start");
  return ic;
}

function bindAction(el, spec) {
  el._trvwrOnClick = () => {
    if (!spec || spec.disabled) return;
    spec.onClick?.();
  };
  if (el._trvwrBound) return;
  el._trvwrBound = true;
  el.addEventListener("click", (e: Event) => {
    if (el.hasAttribute("disabled") || el.disabled) return;
    e.stopPropagation();
    el._trvwrOnClick?.();
  });
}

function mkBtn(spec, { compact = false } = {}) {
  if (spec && typeof spec === "object" && "checked" in spec && (spec.iconTrue || spec.iconFalse)) {
    const btn = document.createElement("is-check-icon-button");
    btn.setAttribute("icon", spec.iconFalse || spec.icon || "mdi:circle-outline");
    btn.setAttribute("checked-icon", spec.iconTrue || spec.icon || "mdi:circle");
    if (spec.checked) btn.setAttribute("checked", "");
    if (spec.disabled) btn.setAttribute("disabled", "");
    btn.setAttribute("label", spec.title || spec.label || "");
    btn.setAttribute("title", spec.title || spec.label || "");
    const color = spec.checked ? (spec.color || "warning") : (spec.colorFalse || spec.color || "neutral");
    btn.setAttribute("color", color);
    bindAction(btn, spec);
    return btn;
  }
  const btn = document.createElement("is-button");
  btn.setAttribute("variant", "plain");
  btn.setAttribute("color", spec.color || "neutral");
  if (spec.disabled) btn.setAttribute("disabled", "");
  btn.setAttribute("title", spec.title || spec.label || "");
  if (spec.icon) btn.appendChild(mkIcon(spec.icon));
  if (!compact && spec.label) btn.appendChild(document.createTextNode(spec.label));
  bindAction(btn, spec);
  return btn;
}

function flattenEntry(entry, out) {
  if (!entry) return;
  if (Array.isArray(entry)) {
    if (out.length) out.push({ separator: true });
    for (const it of entry) if (it) out.push(it);
    return;
  }
  out.push(entry);
}

function flattenActionable(list) {
  const flat = [];
  for (const entry of list || []) flattenEntry(entry, flat);
  return flat.filter((it) => it && !it.separator);
}

function applyHandlers(host, actions, more) {
  const btns = [...host.querySelectorAll<HTMLElement>(":scope > is-button-group > is-button, :scope > is-button-group > is-check-icon-button")];
  flattenActionable(actions).forEach((spec, i) => { if (btns[i]) bindAction(btns[i], spec); });
  const dd = host.querySelector<HTMLElement>(":scope > is-dropdown");
  if (!dd) return;
  const items = [...dd.querySelectorAll<HTMLElement>(":scope > is-dropdown-item")];
  flattenActionable(more).forEach((spec, i) => { if (items[i]) bindAction(items[i], spec); });
}

function actionsSig(actions, more, moreDisabled, compact) {
  const parts = [];
  const walk = (entry) => {
    if (!entry) return;
    if (Array.isArray(entry)) { entry.forEach(walk); return; }
    if (entry.separator) { parts.push("|"); return; }
    parts.push(entry.icon || "", entry.iconTrue || "", entry.iconFalse || "", entry.title || "", entry.label || "", entry.checked ? "1" : "0", entry.disabled ? "1" : "0", entry.color || "");
  };
  for (const entry of actions || []) walk(entry);
  parts.push("#more");
  for (const entry of more || []) walk(entry);
  parts.push(moreDisabled ? "md" : "", compact ? "c" : "");
  return parts.join("\0");
}

export function paintFlexOptions(host, actions, { more, moreDisabled, compact = false } = {}) {
  const sig = actionsSig(actions, more, moreDisabled, compact);
  if (host._trvwrFlexSig === sig && host.childElementCount) {
    applyHandlers(host, actions, more);
    return;
  }
  host._trvwrFlexSig = sig;
  host.replaceChildren();
  const flat = [];
  for (const entry of actions || []) flattenEntry(entry, flat);

  let group = document.createElement("is-button-group");
  const flushGroup = () => {
    if (group.childElementCount) host.appendChild(group);
    group = document.createElement("is-button-group");
  };
  for (const spec of flat) {
    if (spec?.separator) {
      flushGroup();
      continue;
    }
    group.appendChild(mkBtn(spec, { compact }));
  }
  flushGroup();

  const moreFlat = [];
  for (const entry of more || []) flattenEntry(entry, moreFlat);
  const actionable = moreFlat.filter((it) => it && !it.separator);
  if (!actionable.length) return;

  const dd = document.createElement("is-dropdown");
  const trigger = document.createElement("is-button");
  trigger.setAttribute("slot", "trigger");
  trigger.setAttribute("variant", "plain");
  trigger.setAttribute("color", "neutral");
  trigger.setAttribute("title", "Más opciones");
  if (moreDisabled) trigger.setAttribute("disabled", "");
  trigger.appendChild(mkIcon("mdi:dots-vertical"));
  dd.appendChild(trigger);
  for (const spec of moreFlat) {
    if (spec?.separator) {
      const div = document.createElement("is-divider");
      dd.appendChild(div);
      continue;
    }
    const item = document.createElement("is-dropdown-item");
    if (spec.color) item.setAttribute("color", spec.color);
    if (spec.disabled) item.setAttribute("disabled", "");
    if (spec.icon) {
      const ic = document.createElement("is-icon");
      ic.setAttribute("icon", spec.icon);
      ic.setAttribute("slot", "icon");
      item.appendChild(ic);
    }
    item.appendChild(document.createTextNode(spec.label || spec.title || ""));
    bindAction(item, spec);
    dd.appendChild(item);
  }
  host.appendChild(dd);
}
