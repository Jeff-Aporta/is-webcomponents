/**
 * Behavior de is-format-date: locales dinámicos + reloj en vivo (1 s).
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */

/** @type {ReturnType<typeof setInterval> | null} */
let liveTimer = null;
/** @type {HTMLElement | null} */
let mainRoot = null;

function tickNow() {
  if (!mainRoot) return;
  const now = new Date().toISOString();
  for (const el of mainRoot.querySelectorAll<HTMLElement>('is-format-date')) {
    el.setAttribute('date', now);
  }
}

export async function mount(ctx) {
  mainRoot = ctx.main;
  await customElements.whenDefined('is-format-date');

  const CANDIDATES = [
    'es', 'es-CO', 'es-MX', 'es-AR',
    'en', 'en-US', 'en-GB',
    'pt-BR', 'pt-PT',
    'fr', 'fr-CA',
    'de', 'it', 'nl',
    'ja', 'zh-CN', 'zh-TW', 'ko',
    'ar', 'he', 'hi', 'th', 'tr', 'ru', 'uk', 'pl',
    'sv', 'fi', 'da', 'nb',
  ];

  const uiLang = document.documentElement.lang || 'es';
  const supported = Intl.DateTimeFormat.supportedLocalesOf(CANDIDATES, { localeMatcher: 'lookup' });
  const names = typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames([uiLang], { type: 'language' })
    : null;

  const grid = mainRoot.querySelector<HTMLElement>('#localeGrid');
  const caption = mainRoot.querySelector<HTMLElement>('#localeCaption');
  const hints = mainRoot.querySelector<HTMLElement>('#localeHints');

  if (caption) {
    caption.textContent = `${supported.length} locales soportados de ${CANDIDATES.length} pedidos (supportedLocalesOf). Hora en vivo.`;
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
        <is-format-date weekday="long" year="numeric" month="long" day="numeric"
          hour="numeric" minute="numeric" second="numeric"></is-format-date>
      `;
      card.querySelector<HTMLElement>('.demo-locale-card__name').textContent = label;
      card.querySelector<HTMLElement>('.demo-locale-card__code').textContent = tag;
      card.querySelector<HTMLElement>('is-format-date').setAttribute('locale', tag);
      grid.appendChild(card);

      if (hints) {
        const opt = document.createElement('option');
        opt.value = tag;
        hints.appendChild(opt);
      }
    }
  }

  const probe = mainRoot.querySelector<HTMLElement>('#localeProbe');
  const probeOut = mainRoot.querySelector<HTMLElement>('#localeProbeOut');
  const renderProbe = () => {
    if (!probe || !probeOut) return;
    const tag = probe.value.trim();
    if (!tag) { probeOut.textContent = ''; return; }
    const ok = Intl.DateTimeFormat.supportedLocalesOf([tag]).length > 0;
    probeOut.replaceChildren();
    if (!ok) {
      probeOut.textContent = 'no soportado por este motor';
      return;
    }
    const chip = document.createElement('span');
    chip.className = 'demo-label';
    chip.textContent = names?.of(tag) || tag;
    const fmt = document.createElement('is-format-date');
    fmt.setAttribute('locale', tag);
    fmt.setAttribute('weekday', 'long');
    fmt.setAttribute('year', 'numeric');
    fmt.setAttribute('month', 'long');
    fmt.setAttribute('day', 'numeric');
    fmt.setAttribute('hour', 'numeric');
    fmt.setAttribute('minute', 'numeric');
    fmt.setAttribute('second', 'numeric');
    probeOut.append(chip, document.createTextNode(' '), fmt);
    tickNow();
  };
  probe?.addEventListener('input', renderProbe);
  renderProbe();

  tickNow();
  liveTimer = setInterval(tickNow, 1000);
}

export function unmount() {
  if (liveTimer != null) {
    clearInterval(liveTimer);
    liveTimer = null;
  }
  mainRoot = null;
}
