/**
 * Utilidades mínimas para form-associated custom elements.
 * No es un mixin de clase: cada CE llama helpers sobre su ElementInternals.
 */

/** @param {HTMLElement} host */
export function attachFormInternals(host) {
  if (!('attachInternals' in host)) return null;
  try { return host.attachInternals(); } catch { return null; }
}

/** @param {ElementInternals | null} internals @param {string} name @param {boolean} on */
export function setCustomState(internals, name, on) {
  const s = internals?.states;
  if (!s) return;
  try {
    if (on) s.add(name);
    else s.delete(name);
  } catch { /* older engines */ }
}

/**
 * @param {ElementInternals | null} internals
 * @param {FormDataEntryValue | null} value
 * @param {FormDataEntryValue | null} [state]
 */
export function setFormValue(internals, value, state) {
  if (!internals) return;
  try {
    if (state === undefined) internals.setFormValue(value);
    else internals.setFormValue(value, state);
  } catch { /* noop */ }
}

/**
 * @param {ElementInternals | null} internals
 * @param {ValidityStateFlags} flags
 * @param {string} [message]
 * @param {HTMLElement} [anchor]
 */
export function setValidity(internals, flags, message = '', anchor) {
  if (!internals) return;
  try {
    if (anchor) internals.setValidity(flags, message, anchor);
    else internals.setValidity(flags, message);
  } catch { /* noop */ }
}

export function clearValidity(internals, anchor) {
  setValidity(internals, {}, '', anchor);
}
