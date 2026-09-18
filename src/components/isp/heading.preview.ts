/**
 * Playground <is-heading>: level / color / mix / mix-with / size / texto.
 * @param {import('../../previews/_kit/types.d.ts').PreviewMountContext} ctx
 */

/** `<is-heading>` con `level`, `color`, `mix`, `mixWith`, `size`. */
interface _HeadingLike extends HTMLElement {
  level: string;
  color: string | null;
  mix: string | null;
  mixWith: string | null;
  size: string | null;
}

/** Input element con `value`/`checked`/`disabled` y `textContent`. */
interface _InputLike {
  value: string;
  checked: boolean;
  disabled: boolean;
  textContent: string | null;
  addEventListener(type: string, listener: EventListener): void;
}

export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext): Promise<void> {
  const root = ctx.main;
  const el = root.querySelector<HTMLElement>('#hdLive') as _HeadingLike | null;
  if (!el) return;

  const level = root.querySelector<HTMLElement>('#hdLevel') as _InputLike | null;
  const levelVal = root.querySelector<HTMLElement>('#hdLevelVal');
  const colorMode = root.querySelector<HTMLElement>('#hdColorMode') as _InputLike | null;
  const colorCss = root.querySelector<HTMLElement>('#hdColorCss') as _InputLike | null;
  const mix = root.querySelector<HTMLElement>('#hdMix') as _InputLike | null;
  const mixVal = root.querySelector<HTMLElement>('#hdMixVal');
  const mixDefault = root.querySelector<HTMLElement>('#hdMixDefault') as _InputLike | null;
  const mixWith = root.querySelector<HTMLElement>('#hdMixWith') as _InputLike | null;
  const size = root.querySelector<HTMLElement>('#hdSize') as _InputLike | null;
  const text = root.querySelector<HTMLElement>('#hdText') as _InputLike | null;
  const snippet = root.querySelector<HTMLElement>('#hdSnippet');

  const DEFAULT_MIX: Record<number, number> = { 1: 15, 2: 30, 3: 45, 4: 65, 5: 80, 6: 90 };

  const syncMixUi = (): void => {
    const useDefault = !!mixDefault?.checked;
    if (mix) mix.disabled = useDefault;
    if (useDefault) {
      const lv = Number(level?.value || 2);
      const d = DEFAULT_MIX[lv] ?? 30;
      if (mix) mix.value = String(d);
      if (mixVal) mixVal.textContent = `${d}% (default)`;
    } else if (mixVal && mix) {
      mixVal.textContent = `${mix.value}%`;
    }
  };

  const syncColorUi = (): void => {
    const mode = colorMode?.value || '';
    if (colorCss) colorCss.disabled = mode !== 'css';
  };

  const sync = (): void => {
    const lv = String(level?.value || '2');
    el.level = lv;
    if (levelVal) levelVal.textContent = lv;

    syncColorUi();
    const mode = colorMode?.value || '';
    if (!mode) el.removeAttribute('color');
    else if (mode === 'css') el.color = colorCss?.value?.trim() || '#e8590c';
    else el.color = mode;

    syncMixUi();
    if (mixDefault?.checked) el.mix = null;
    else el.mix = `${mix?.value ?? 30}%`;

    const mw = mixWith?.value || '';
    el.mixWith = mw || null;

    const sz = size?.value?.trim();
    el.size = sz || null;

    const label = text?.value ?? 'Título de ejemplo';
    el.textContent = label;

    if (snippet) {
      const attrs: string[] = [`level="${el.level}"`];
      if (el.color) attrs.push(`color="${el.color}"`);
      if (el.mix) attrs.push(`mix="${el.mix}"`);
      if (el.mixWith) attrs.push(`mix-with="${el.mixWith}"`);
      if (el.size) attrs.push(`size="${el.size}"`);
      snippet.textContent = `<is-heading ${attrs.join(' ')}>${label}</is-heading>`;
    }
  };

  level?.addEventListener('input', sync);
  colorMode?.addEventListener('change', sync);
  colorCss?.addEventListener('input', sync);
  mix?.addEventListener('input', sync);
  mixDefault?.addEventListener('change', sync);
  mixWith?.addEventListener('change', sync);
  size?.addEventListener('input', sync);
  text?.addEventListener('input', sync);

  if (mixDefault) mixDefault.checked = true;
  sync();
}

export function unmount(): void {
  /* no-op */
}