/**
 * Playground <is-flex-layout>: switches booleanos + selects + snippet en vivo.
 * @param {import('../../previews/_kit/types.d.ts').PreviewMountContext} ctx
 */

interface InputLike extends HTMLElement {
  value: string;
  checked: boolean;
}

export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext): Promise<void> {
  const root = ctx.main;
  const flex = root.querySelector<HTMLElement>('#fxPlay');
  if (!flex) return;

  const dir = root.querySelector<HTMLElement>('#fxDirection') as InputLike | null;
  const justify = root.querySelector<HTMLElement>('#fxJustify') as InputLike | null;
  const align = root.querySelector<HTMLElement>('#fxAlign') as InputLike | null;
  const gap = root.querySelector<HTMLElement>('#fxGap') as InputLike | null;
  const wrap = root.querySelector<HTMLElement>('#fxWrap') as InputLike | null;
  const grow = root.querySelector<HTMLElement>('#fxGrow') as InputLike | null;
  const inline = root.querySelector<HTMLElement>('#fxInline') as InputLike | null;
  const snippet = root.querySelector<HTMLElement>('#fxAttrSnippet');

  const setOrRemove = (el: HTMLElement, attr: string, value: string | null | undefined): void => {
    if (value == null || value === '') el.removeAttribute(attr);
    else el.setAttribute(attr, value);
  };

  const sync = (): void => {
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

function buildSnippet(el: HTMLElement): string {
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

export function unmount(): void {
  /* no-op */
}