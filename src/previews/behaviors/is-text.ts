/**
 * Playground <is-text>: color / mix / lines / texto.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../_kit/types.d.ts').PreviewMountContext) {
  const root = ctx.main;
  const el = root.querySelector<HTMLElement>('#txLive');
  if (!el) return;

  const colorMode = root.querySelector<HTMLElement>('#txColorMode');
  const colorCss = root.querySelector<HTMLElement>('#txColorCss');
  const mix = root.querySelector<HTMLElement>('#txMix');
  const mixVal = root.querySelector<HTMLElement>('#txMixVal');
  const mixOn = root.querySelector<HTMLElement>('#txMixOn');
  const mixWith = root.querySelector<HTMLElement>('#txMixWith');
  const lines = root.querySelector<HTMLElement>('#txLines');
  const linesVal = root.querySelector<HTMLElement>('#txLinesVal');
  const text = root.querySelector<HTMLElement>('#txText');
  const snippet = root.querySelector<HTMLElement>('#txSnippet');

  const sync = () => {
    const mode = colorMode?.value || '';
    if (colorCss) colorCss.disabled = mode !== 'css';
    if (!mode) el.removeAttribute('color');
    else if (mode === 'css') el.color = colorCss?.value?.trim() || '#e8590c';
    else el.color = mode;

    const useMix = !!mixOn?.checked;
    if (mix) mix.disabled = !useMix;
    if (useMix) {
      el.mix = `${mix?.value ?? 40}%`;
      if (mixVal) mixVal.textContent = `${mix?.value ?? 40}%`;
    } else {
      el.mix = null;
      if (mixVal) mixVal.textContent = 'off';
    }

    const mw = mixWith?.value || '';
    el.mixWith = useMix && mw ? mw : null;

    const n = Number(lines?.value || 0);
    el.lines = n;
    if (linesVal) linesVal.textContent = String(n);

    const body = text?.value ?? '';
    el.textContent = body;

    if (snippet) {
      const attrs = [];
      if (el.color) attrs.push(`color="${el.color}"`);
      if (el.mix) attrs.push(`mix="${el.mix}"`);
      if (el.mixWith) attrs.push(`mix-with="${el.mixWith}"`);
      if (n >= 1) attrs.push(`lines="${n}"`);
      const a = attrs.length ? ` ${attrs.join(' ')}` : '';
      snippet.textContent = `<is-text${a}>${body.slice(0, 48)}${body.length > 48 ? '…' : ''}</is-text>`;
    }
  };

  colorMode?.addEventListener('change', sync);
  colorCss?.addEventListener('input', sync);
  mix?.addEventListener('input', sync);
  mixOn?.addEventListener('change', sync);
  mixWith?.addEventListener('change', sync);
  lines?.addEventListener('input', sync);
  text?.addEventListener('input', sync);
  sync();
}

export function unmount() {
  /* no-op */
}
