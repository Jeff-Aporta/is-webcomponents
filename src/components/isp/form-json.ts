/**
 * Valores de controles con `name` bajo un host (p.ej. `<is-form>`).
 * El cuerpo del formulario se define con html2json / json2html (`_shared/json-html.js`).
 */

const CONTROL_SELECTOR = [
  'is-input[name]',
  'is-textarea[name]',
  'is-select[name]',
  'is-checkbox[name]',
  'is-switch[name]',
  'is-combobox[name]',
  'is-slider[name]',
  'is-radio[name]',
  'input[name]',
  'textarea[name]',
  'select[name]',
].join(',');

const BOOL_TAGS = new Set(['is-checkbox', 'is-switch']);

export function listControls(root) {
  if (!root) return [];
  return [...root.querySelectorAll<HTMLElement>(CONTROL_SELECTOR)];
}

export function getControlValue(el) {
  if (!el) return undefined;
  const tag = el.localName;

  if (BOOL_TAGS.has(tag) || (tag === 'input' && (el.type === 'checkbox' || el.type === 'radio'))) {
    if (tag === 'input' && el.type === 'radio') return el.checked ? el.value : undefined;
    return !!el.checked;
  }
  if (tag === 'is-select' && el.multiple) return el.values ?? [];
  if (tag === 'is-slider' && typeof el.values === 'object' && el.values?.length > 1) {
    return [...el.values];
  }
  if (tag === 'select' && el.multiple) {
    return [...el.selectedOptions].map((o) => o.value);
  }
  if ('value' in el) return el.value;
  return el.getAttribute('value') ?? '';
}

export function setControlValue(el, value: string) {
  if (!el) return;
  const tag = el.localName;

  if (BOOL_TAGS.has(tag)) {
    el.checked = value === true || value === 'true' || value === 1 || value === el.value;
    return;
  }
  if (tag === 'input' && el.type === 'checkbox') {
    el.checked = !!value;
    return;
  }
  if (tag === 'input' && el.type === 'radio') {
    el.checked = String(el.value) === String(value);
    return;
  }
  if (tag === 'is-select' && el.multiple) {
    const arr = Array.isArray(value)
      ? value
      : (value == null || value === '' ? [] : String(value).split(','));
    el.values = arr.map(String);
    return;
  }
  if (tag === 'select' && el.multiple) {
    const set = new Set(
      Array.isArray(value) ? value.map(String) : String(value ?? '').split(',').filter(Boolean),
    );
    for (const opt of el.options) opt.selected = set.has(opt.value);
    return;
  }
  if ('value' in el) el.value = value == null ? '' : value;
  else if (value == null) el.removeAttribute('value');
  else el.setAttribute('value', String(value));
}

/** `{ [name]: value }` */
export function getValues(root) {
  const out = {};
  const radiosDone = new Set();
  for (const el of listControls(root)) {
    const name = el.getAttribute('name');
    if (!name) continue;
    if (el.localName === 'is-radio' || (el.localName === 'input' && el.type === 'radio')) {
      if (radiosDone.has(name)) continue;
      radiosDone.add(name);
      const group = listControls(root).filter(
        (c) => c.getAttribute('name') === name
          && (c.localName === 'is-radio' || (c.localName === 'input' && c.type === 'radio')),
      );
      const checked = group.find((c) => c.checked);
      out[name] = checked ? (checked.value ?? true) : null;
      continue;
    }
    out[name] = getControlValue(el);
  }
  return out;
}

export function setValues(root, values = {}) {
  if (!root || !values || typeof values !== 'object') return;
  for (const el of listControls(root)) {
    const name = el.getAttribute('name');
    if (!name || !Object.prototype.hasOwnProperty.call(values, name)) continue;
    setControlValue(el, values[name]);
  }
}
