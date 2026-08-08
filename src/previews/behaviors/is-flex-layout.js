/**
 * Playground <is-flex-layout>: switches booleanos + selects + snippet en vivo.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  const flex = root.querySelector('#fxPlay');
  if (!flex) return;

  const dir = root.querySelector('#fxDirection');
  const justify = root.querySelector('#fxJustify');
  const align = root.querySelector('#fxAlign');
  const gap = root.querySelector('#fxGap');
  const wrap = root.querySelector('#fxWrap');
  const grow = root.querySelector('#fxGrow');
  const inline = root.querySelector('#fxInline');
  const snippet = root.querySelector('#fxAttrSnippet');

  const setOrRemove = (el, attr, value) => {
    if (value == null || value === '') el.removeAttribute(attr);
    else el.setAttribute(attr, value);
  };

  const sync = () => {
    if (dir?.value && dir.value !== 'row') flex.setAttribute('direction', dir.value);
    else flex.removeAttribute('direction');

    setOrRemove(flex, 'justify', justify?.value);
    setOrRemove(flex, 'align', align?.value);
    setOrRemove(flex, 'gap', gap?.value);

    flex.toggleAttribute('wrap', !!wrap?.checked);
    flex.toggleAttribute('grow', !!grow?.checked);
    flex.toggleAttribute('inline', !!inline?.checked);

    if (snippet) snippet.textContent = buildSnippet(flex);
  };

  for (const el of [dir, justify, align, gap]) {
    el?.addEventListener('change', sync);
  }
  for (const sw of [wrap, grow, inline]) {
    sw?.addEventListener('is-change', sync);
  }

  sync();
}

function buildSnippet(el) {
  const parts = ['<is-flex-layout'];
  for (const name of [
    'direction', 'justify', 'align', 'gap',
    'wrap', 'grow', 'inline',
  ]) {
    if (!el.hasAttribute(name)) continue;
    const v = el.getAttribute(name);
    if (v === '' || v == null) parts.push(` ${name}`);
    else parts.push(` ${name}="${v}"`);
  }
  parts.push('>…</is-flex-layout>');
  return parts.join('');
}

export function unmount() {
  /* no-op */
}
