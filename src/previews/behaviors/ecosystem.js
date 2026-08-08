/**
 * Preview «Ecosistema JS»: lista TODOS los módulos de `_shared/`.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 * @param {import('../_kit/types.d.ts').ISComponentPreviewLike} preview
 */
export async function mount(ctx, preview) {
  const root = ctx.main;
  const list = root.querySelector('#ecoList');
  const count = root.querySelector('#ecoCount');
  const filter = root.querySelector('#ecoFilter');
  if (!list) return;

  const signal = preview?.signal;
  const opts = signal ? { signal } : undefined;

  let modules = [];
  try {
    const url = new URL('../data/shared-modules.json', import.meta.url);
    const res = await fetch(url, { cache: 'no-cache', signal });
    if (!res.ok) throw new Error(`${res.status}`);
    const catalog = await res.json();
    modules = catalog.modules || [];
  } catch (err) {
    list.innerHTML = `<p class="lede">No se pudo cargar <code>shared-modules.json</code>. Ejecuta <code>node scripts/gen-shared-index.mjs</code>. (${err?.message || err})</p>`;
    return;
  }

  const esc = (s) => String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  const paint = (q = '') => {
    const needle = q.trim().toLowerCase();
    const rows = needle
      ? modules.filter((m) => {
        const hay = `${m.id} ${m.file} ${m.path} ${m.summary} ${(m.exports || []).join(' ')}`.toLowerCase();
        return hay.includes(needle);
      })
      : modules;

    if (count) {
      count.textContent = needle
        ? `${rows.length} de ${modules.length} módulos`
        : `${modules.length} módulos en src/components/_shared/`;
    }

    list.replaceChildren(...rows.map((m) => {
      const card = document.createElement('article');
      card.className = 'eco-card';
      card.innerHTML = `
        <div class="eco-card__head">
          <is-heading class="eco-card__id" level="4">${esc(m.id)}</is-heading>
          <span class="eco-card__path">${esc(m.path)}</span>
        </div>
        <p class="eco-card__sum">${esc(m.summary)}</p>
        ${m.exports?.length
          ? `<ul class="eco-exports">${m.exports.map((e) => `<li><code>${esc(e)}</code></li>`).join('')}</ul>`
          : ''}
        <p class="eco-meta">${Math.round((m.bytes || 0) / 1024 * 10) / 10} KB</p>
      `;
      return card;
    }));
  };

  filter?.addEventListener('input', () => paint(filter.value), opts);
  paint();
}

export function unmount() {
  /* AbortSignal */
}
