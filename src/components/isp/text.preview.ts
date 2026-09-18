/**
 * Playground <is-text>: color / mix / lines / texto.
 * @param {import('../../previews/_kit/types.d.ts').PreviewMountContext} ctx
 */

/** `<is-text>` con `color`, `mix`, `mixWith`, `lines`. */
interface _TextLike extends HTMLElement {
  color: string | null;
  mix: string | null;
  mixWith: string | null;
  lines: number;
}

/** Input/select con `value`/`checked`/`disabled` y `textContent`. */
interface _InputLike {
  value: string;
  checked: boolean;
  disabled: boolean;
  textContent: string | null;
  addEventListener(type: string, listener: EventListener): void;
}

export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext): Promise<void> {
  const root = ctx.main;
  const el = root.querySelector<HTMLElement>('#txLive') as _TextLike | null;
  if (!el) return;

  const colorMode = root.querySelector<HTMLElement>('#txColorMode') as _InputLike | null;
  const colorCss = root.querySelector<HTMLElement>('#txColorCss') as _InputLike | null;
  const mix = root.querySelector<HTMLElement>('#txMix') as _InputLike | null;
  const mixVal = root.querySelector<HTMLElement>('#txMixVal');
  const mixOn = root.querySelector<HTMLElement>('#txMixOn') as _InputLike | null;
  const mixWith = root.querySelector<HTMLElement>('#txMixWith') as _InputLike | null;
  const lines = root.querySelector<HTMLElement>('#txLines') as _InputLike | null;
  const linesVal = root.querySelector<HTMLElement>('#txLinesVal');
  const text = root.querySelector<HTMLElement>('#txText') as _InputLike | null;
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
