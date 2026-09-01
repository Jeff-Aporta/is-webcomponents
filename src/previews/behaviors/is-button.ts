/**
 * Behavior: playground + log de eventos de `<is-button>`.
 *
 * El JSON traía controles (pgVariant/pgAppearance) sin `mount` — al cambiar
 * valores no pasaba nada. Además el naming era legacy: “variant” = color y
 * “appearance” = variant real del componente.
 */
import '../../components/media/icon.js';

const START_ICONS = {
  'i-floppy': 'mdi:content-save-outline',
  'i-edit': 'mdi:pencil-outline',
  'i-trash': 'mdi:trash-can-outline',
  'i-bell': 'mdi:bell-outline',
  'i-check': 'mdi:check',
  'i-gear': 'mdi:cog-outline',
  'i-search': 'mdi:magnify',
};

const END_ICONS = {
  'i-arrow-r': 'mdi:arrow-right',
  'i-download': 'mdi:download',
  'i-link': 'mdi:link-variant',
};

const escapeAttr = (v: string) => String(v)
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;');

/**
 * @param {ParentNode} root
 */
function wirePlayground(root: ParentNode) {
  const btn = root.querySelector<HTMLElement>('#pgBtn');
  if (!btn) return;

  const colorEl = root.querySelector<HTMLElement>('#pgColor') || root.querySelector<HTMLElement>('#pgVariant');
  const variantEl = root.querySelector<HTMLElement>('#pgColor')
    ? root.querySelector<HTMLElement>('#pgVariant')
    : (root.querySelector<HTMLElement>('#pgAppearance') || root.querySelector<HTMLElement>('#pgVariantAppearance'));
  const textEl = root.querySelector<HTMLElement>('#pgText');
  const startEl = root.querySelector<HTMLElement>('#pgStart');
  const endEl = root.querySelector<HTMLElement>('#pgEnd');
  const pillEl = root.querySelector<HTMLElement>('#pgPill');
  const caretEl = root.querySelector<HTMLElement>('#pgCaret');
  const loadingEl = root.querySelector<HTMLElement>('#pgLoading');
  const disabledEl = root.querySelector<HTMLElement>('#pgDisabled');
  const hrefEl = root.querySelector<HTMLElement>('#pgHref');
  const outEl = root.querySelector<HTMLElement>('#pgOut');
  const makeIcon = (mdi, slot) => {
    const icon = document.createElement('is-icon');
    icon.setAttribute('slot', slot);
    icon.setAttribute('icon', mdi);
    return icon;
  };

  const syncIcons = () => {
    for (const el of [...btn.querySelectorAll<HTMLElement>('is-icon[slot="start"], is-icon[slot="end"]')]) {
      el.remove();
    }
    // Quitar is-icon sin slot (markup viejo en demos).
    for (const el of [...btn.querySelectorAll<HTMLElement>(':scope > is-icon:not([slot])')]) {
      el.remove();
    }
    const startKey = startEl?.value || '';
    const endKey = endEl?.value || '';
    if (startKey && START_ICONS[startKey]) btn.prepend(makeIcon(START_ICONS[startKey], 'start'));
    if (endKey && END_ICONS[endKey]) btn.append(makeIcon(END_ICONS[endKey], 'end'));
  };

  const syncText = () => {
    const text = textEl?.value ?? 'Hola mundo';
    // Conservar solo los iconos; el resto del light DOM es la etiqueta.
    for (const node of [...btn.childNodes]) {
      if (node.nodeType === Node.ELEMENT_NODE && node.localName === 'is-icon') continue;
      node.remove();
    }
    const label = document.createTextNode(text);
    const startIcon = btn.querySelector<HTMLElement>('is-icon[slot="start"]');
    if (startIcon) startIcon.after(label);
    else btn.prepend(label);
  };

  const syncOut = () => {
    if (!outEl) return;
    const color = btn.getAttribute('color') || 'brand';
    const variant = btn.getAttribute('variant') || 'filled';
    const parts = ['<is-button', ` color="${escapeAttr(color)}"`];
    if (variant && variant !== 'filled') parts.push(` variant="${escapeAttr(variant)}"`);
    if (btn.hasAttribute('pill')) parts.push(' pill');
    if (btn.hasAttribute('with-caret')) parts.push(' with-caret');
    if (btn.hasAttribute('loading')) parts.push(' loading');
    if (btn.hasAttribute('disabled')) parts.push(' disabled');
    const href = btn.getAttribute('href');
    if (href) parts.push(` href="${escapeAttr(href)}"`, ' target="_blank"', ' rel="noopener"');
    parts.push('>');
    const start = btn.querySelector<HTMLElement>('is-icon[slot="start"]');
    const end = btn.querySelector<HTMLElement>('is-icon[slot="end"]');
    if (start) {
      parts.push(`\n  <is-icon slot="start" icon="${escapeAttr(start.getAttribute('icon') || '')}"></is-icon>`);
    }
    const text = (textEl?.value ?? btn.textContent ?? '').trim() || 'Hola mundo';
    parts.push(start || end ? `\n  ${escapeAttr(text)}\n` : escapeAttr(text));
    if (end) {
      parts.push(`  <is-icon slot="end" icon="${escapeAttr(end.getAttribute('icon') || '')}"></is-icon>\n`);
    }
    parts.push('</is-button>');
    const html = parts.join('');
    if (outEl.localName === 'is-code') {
      outEl.value = html;
      outEl.dataset.cmSource = html;
      delete outEl.dataset.cm;
    } else {
      outEl.textContent = html;
    }
  };

  const apply = () => {
    const color = colorEl?.value || 'brand';
    const variant = variantEl?.value || 'filled';

    btn.setAttribute('color', color);
    if (!variant || variant === 'filled') btn.removeAttribute('variant');
    else btn.setAttribute('variant', variant);

    btn.toggleAttribute('pill', !!pillEl?.checked);
    btn.toggleAttribute('with-caret', !!caretEl?.checked);
    btn.toggleAttribute('loading', !!loadingEl?.checked);
    btn.toggleAttribute('disabled', !!disabledEl?.checked);

    const href = (hrefEl?.value || '').trim();
    if (href) {
      btn.setAttribute('href', href);
      btn.setAttribute('target', '_blank');
      btn.setAttribute('rel', 'noopener');
    } else {
      btn.removeAttribute('href');
      btn.removeAttribute('target');
      btn.removeAttribute('rel');
    }

    syncIcons();
    syncText();
    syncOut();
  };

  const controls = root.querySelector<HTMLElement>('.playground .controls') || root.querySelector<HTMLElement>('#playground .controls');
  controls?.addEventListener('change', apply);
  controls?.addEventListener('input', (e) => {
    const t = e.target;
    if (t instanceof HTMLInputElement && (t.type === 'text' || t.id === 'pgText' || t.id === 'pgHref')) {
      apply();
    }
  });

  apply();
}

/**
 * @param {ParentNode} root
 */
function wireEvents(root: ParentNode) {
  const log = root.querySelector<HTMLElement>('#evtLog');
  if (!log) return;
  const stamp = (name, detail) => {
    const line = document.createElement('div');
    line.textContent = `${new Date().toLocaleTimeString()} · ${name}${detail ? ` ${JSON.stringify(detail)}` : ''}`;
    log.prepend(line);
    while (log.childElementCount > 12) log.lastElementChild?.remove();
  };
  for (const id of ['evtBtn', 'evtBtn2']) {
    const el = root.querySelector<HTMLElement>(`#${id}`);
    if (!el) continue;
    for (const ev of ['is-click', 'is-focus', 'is-blur', 'is-invalid']) {
      el.addEventListener(ev, (e) => stamp(`${id}:${ev}`, e.detail || null));
    }
  }
}

/**
 * @param {{ main?: ParentNode, root?: ParentNode }} ctx
 */
export async function mount(ctx) {
  const root = ctx?.main || ctx?.root || document;
  wirePlayground(root);
  wireEvents(root);
}

export function unmount() {
  /* nodos del preview se descartan con el paint */
}
