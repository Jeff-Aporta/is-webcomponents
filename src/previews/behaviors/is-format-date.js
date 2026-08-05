/**
 * Behavior migrado desde HTML inline de is-format-date.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
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
  
      const grid = document.getElementById('localeGrid');
      const caption = document.getElementById('localeCaption');
      const hints = document.getElementById('localeHints');
      caption.textContent = `${supported.length} locales soportados de ${CANDIDATES.length} pedidos (supportedLocalesOf).`;
  
      for (const tag of supported) {
        const card = document.createElement('div');
        card.className = 'demo-locale-card';
        const label = names?.of(tag) || tag;
        card.innerHTML = `
          <div class="demo-locale-card__meta">
            <span class="demo-locale-card__name"></span>
            <span class="demo-locale-card__code"></span>
          </div>
          <is-format-date weekday="long" year="numeric" month="long" day="numeric"></is-format-date>
        `;
        card.querySelector('.demo-locale-card__name').textContent = label;
        card.querySelector('.demo-locale-card__code').textContent = tag;
        const el = card.querySelector('is-format-date');
        el.setAttribute('locale', tag);
        el.setAttribute('date', '2026-07-30');
        grid.appendChild(card);
  
        const opt = document.createElement('option');
        opt.value = tag;
        hints.appendChild(opt);
      }
  
      const probe = document.getElementById('localeProbe');
      const probeOut = document.getElementById('localeProbeOut');
      const renderProbe = () => {
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
        fmt.setAttribute('date', '2026-07-30');
        fmt.setAttribute('weekday', 'long');
        fmt.setAttribute('year', 'numeric');
        fmt.setAttribute('month', 'long');
        fmt.setAttribute('day', 'numeric');
        probeOut.append(chip, document.createTextNode(' '), fmt);
      };
      probe.addEventListener('input', renderProbe);
      renderProbe();
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
