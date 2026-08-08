/**
 * Playground <is-heading>: level / color / mix / mix-with / size / texto.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  const el = root.querySelector('#hdLive');
  if (!el) return;

  const level = root.querySelector('#hdLevel');
  const levelVal = root.querySelector('#hdLevelVal');
  const colorMode = root.querySelector('#hdColorMode');
  const colorCss = root.querySelector('#hdColorCss');
  const mix = root.querySelector('#hdMix');
  const mixVal = root.querySelector('#hdMixVal');
  const mixDefault = root.querySelector('#hdMixDefault');
  const mixWith = root.querySelector('#hdMixWith');
  const size = root.querySelector('#hdSize');
  const text = root.querySelector('#hdText');
  const snippet = root.querySelector('#hdSnippet');

  const DEFAULT_MIX = { 1: 15, 2: 30, 3: 45, 4: 65, 5: 80, 6: 90 };

  const syncMixUi = () => {
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

  const syncColorUi = () => {
    const mode = colorMode?.value || '';
    if (colorCss) colorCss.disabled = mode !== 'css';
  };

  const sync = () => {
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
      const attrs = [`level="${el.level}"`];
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

export function unmount() {
  /* no-op */
}
