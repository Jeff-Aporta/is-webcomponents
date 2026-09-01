/**
 * Playground <is-flex-layout>: switches booleanos + selects + snippet en vivo.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../_kit/types.d.ts').PreviewMountContext) {
  const root = ctx.main;
  const flex = root.querySelector<HTMLElement>('#fxPlay');
  if (!flex) return;

  const dir = root.querySelector<HTMLElement>('#fxDirection');
  const justify = root.querySelector<HTMLElement>('#fxJustify');
  const align = root.querySelector<HTMLElement>('#fxAlign');
  const gap = root.querySelector<HTMLElement>('#fxGap');
  const wrap = root.querySelector<HTMLElement>('#fxWrap');
  const grow = root.querySelector<HTMLElement>('#fxGrow');
  const inline = root.querySelector<HTMLElement>('#fxInline');
  const snippet = root.querySelector<HTMLElement>('#fxAttrSnippet');

  const setOrRemove = (el: HTMLElement, attr, value) => {
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

function buildSnippet(el: HTMLElement) {
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
