/**
 * Behavior de is-relative-time: fechas relativas al now + grid de locales.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */

function applyOffsets(root) {
  const now = Date.now();
  for (const el of root.querySelectorAll<HTMLElement>('[data-rt-offset]')) {
    const sec = Number(el.getAttribute('data-rt-offset'));
    if (!Number.isFinite(sec)) continue;
    const iso = new Date(now + sec * 1000).toISOString();
    if (el.tagName === 'IS-FORMAT') {
      el.setAttribute('date', iso);
    } else {
      el.setAttribute('date', iso);
    }
  }
  const live = root.querySelector<HTMLElement>('#live');
  if (live && !live.hasAttribute('date')) {
    live.setAttribute('date', new Date(now - 45_000).toISOString());
  }
}

export async function mount(ctx) {
  const root = ctx.main;
  await customElements.whenDefined('is-relative-time');

  applyOffsets(root);

  const CANDIDATES = [
    'es', 'es-CO', 'es-MX', 'es-AR',
    'en', 'en-US', 'en-GB',
    'pt-BR', 'fr', 'de', 'it',
    'ja', 'zh-CN', 'ko', 'ar', 'ru', 'nl', 'pl',
  ];

  const uiLang = document.documentElement.lang || navigator.language || 'es';
  let supported = [];
  try {
    supported = Intl.RelativeTimeFormat.supportedLocalesOf(CANDIDATES, { localeMatcher: 'lookup' });
  } catch {
    supported = ['es', 'en'];
  }
  // Garantiza al menos es + en en el demo.
  for (const must of ['es', 'en']) {
    if (!supported.includes(must)) supported.unshift(must);
  }

  const names = typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames([uiLang], { type: 'language' })
    : null;

  const grid = root.querySelector<HTMLElement>('#localeGrid');
  const caption = root.querySelector<HTMLElement>('#localeCaption');
  const hints = root.querySelector<HTMLElement>('#localeHints');
  const sampleIso = new Date(Date.now() - 3 * 3600 * 1000).toISOString();

  if (caption) {
    caption.textContent = `${supported.length} locales soportados de ${CANDIDATES.length} pedidos (RelativeTimeFormat.supportedLocalesOf). Ejemplo: hace ~3 h.`;
  }

  if (grid) {
    grid.replaceChildren();
    for (const tag of supported) {
      const card = document.createElement('div');
      card.className = 'demo-locale-card';
      const label = names?.of(tag) || tag;
      card.innerHTML = `
        <div class="demo-locale-card__meta">
          <span class="demo-locale-card__name"></span>
          <span class="demo-locale-card__code"></span>
        </div>
        <is-relative-time format="long"></is-relative-time>
      `;
      card.querySelector<HTMLElement>('.demo-locale-card__name').textContent = label;
      card.querySelector<HTMLElement>('.demo-locale-card__code').textContent = tag;
      const rt = card.querySelector<HTMLElement>('is-relative-time');
      rt.setAttribute('locale', tag);
      rt.setAttribute('date', sampleIso);
      grid.appendChild(card);

      if (hints) {
        const opt = document.createElement('option');
        opt.value = tag;
        hints.appendChild(opt);
      }
    }
  }

  const probe = root.querySelector<HTMLElement>('#localeProbe');
  const probeOut = root.querySelector<HTMLElement>('#localeProbeOut');
  const renderProbe = () => {
    if (!probe || !probeOut) return;
    const tag = probe.value.trim();
    if (!tag) { probeOut.textContent = ''; return; }
    let ok = false;
    try {
      ok = Intl.RelativeTimeFormat.supportedLocalesOf([tag]).length > 0;
    } catch { ok = false; }
    probeOut.replaceChildren();
    if (!ok) {
      probeOut.textContent = 'no soportado por este motor';
      return;
    }
    const chip = document.createElement('span');
    chip.className = 'demo-label';
    chip.textContent = names?.of(tag) || tag;
    const fmt = document.createElement('is-relative-time');
    fmt.setAttribute('locale', tag);
    fmt.setAttribute('date', sampleIso);
    fmt.setAttribute('format', 'long');
    probeOut.append(chip, document.createTextNode(' '), fmt);
  };
  probe?.addEventListener('input', renderProbe);
  renderProbe();
}

export function unmount() {
  /* no-op */
}
