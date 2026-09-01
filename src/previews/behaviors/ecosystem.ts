/**
 * Preview «Ecosistema JS»: get started + playground del loader + catálogo _shared.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 * @param {import('../_kit/types.d.ts').ISComponentPreviewLike} preview
 */
export async function mount(ctx: import('../_kit/types.d.ts').PreviewMountContext, preview: import('../_kit/types.d.ts').ISComponentPreviewLike) {
  const root = ctx.main;
  const signal = preview?.signal;
  const opts = signal ? { signal } : undefined;

  const getStarted = root.querySelector<HTMLElement>('#ecoGetStarted');
  if (getStarted) {
    const snip = `<script type="module">
  import { ISWebComponentsLoader } from 'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/cdn/core/loader.min.js';

  // Pin a un commit (inmutable) o unpin() / sin pin → tip de main
  // ISWebComponentsLoader.pin('abcdef0123456789…');
  ISWebComponentsLoader.configure({ mirrors: ['jsdelivr', 'pages'] });

  await ISWebComponentsLoader.loadCSSBase();
  await ISWebComponentsLoader.loadCSSPalettesDefault();
  await ISWebComponentsLoader.load('is-button', 'is-button-group');
  // Categorías: load('actions', 'data-viz')  // alias: charts → data-viz
  // Todo el kit: load('all')
</script>

<is-button color="brand">Hola</is-button>`;
    getStarted.value = snip;
    getStarted.dataset.cmSource = snip;
  }

  await mountPlayground(root, opts);
  await mountSharedCatalog(root, preview, opts);
}

/**
 * @param {ParentNode} root
 * @param {AddEventListenerOptions | undefined} opts
 */
async function mountPlayground(root: ParentNode, opts: AddEventListenerOptions | undefined) {
  const catsEl = root.querySelector<HTMLElement>('#ecoCats');
  const tagsEl = root.querySelector<HTMLElement>('#ecoTags');
  const snipEl = root.querySelector<HTMLElement>('#ecoSnippet');
  const liveEl = root.querySelector<HTMLElement>('#ecoLive');
  const applyBtn = root.querySelector<HTMLElement>('#ecoApply');
  if (!catsEl || !tagsEl) return;

  /** @type {{ categories: Record<string, string[]>, tags: Record<string, { category: string, file: string }> }} */
  let catalog = { categories: {}, tags: {} };
  try {
    const { ISWebComponentsLoader } = await import('../../../dist/cdn/core/loader.min.js');
    catalog = ISWebComponentsLoader.catalog;
  } catch {
    catsEl.innerHTML = '<p class="lede">Corré <code>npm run build</code> para generar <code>loader.min.js</code>.</p>';
    return;
  }

  const quickTags = ['is-button', 'is-button-group', 'is-icon', 'is-input', 'is-card', 'is-toast', 'is-code'];
  const catNames = Object.keys(catalog.categories).sort();

  for (const c of catNames) {
    const lab = document.createElement('label');
    lab.innerHTML = `<input type="checkbox" data-kind="cat" value="${c}" /> <span>${c}</span> <code>${catalog.categories[c].length}</code>`;
    catsEl.appendChild(lab);
  }
  for (const t of quickTags) {
    if (!catalog.tags[t]) continue;
    const lab = document.createElement('label');
    lab.innerHTML = `<input type="checkbox" data-kind="tag" value="${t}" /> <code>${t}</code>`;
    tagsEl.appendChild(lab);
  }

  const selected = () => {
    const cats = [...catsEl.querySelectorAll<HTMLInputElement>('input:checked')].map((el) => el.value);
    const tags = [...tagsEl.querySelectorAll<HTMLInputElement>('input:checked')].map((el) => el.value);
    return { cats, tags };
  };

  const paintSnippet = () => {
    const { cats, tags } = selected();
    const args = [...cats, ...tags].map((x) => `'${x}'`).join(', ');
    const body = args
      ? `await ISWebComponentsLoader.load(${args});`
      : `await ISWebComponentsLoader.load('is-button'); // elegí arriba`;
    const snip = `<script type="module">
  import { ISWebComponentsLoader } from './dist/cdn/core/loader.min.js';
  await ISWebComponentsLoader.loadCSSBase();
  await ISWebComponentsLoader.loadCSSPalettesDefault();
  ${body}
</script>`;
    if (snipEl) {
      snipEl.value = snip;
      snipEl.dataset.cmSource = snip;
    }
  };

  catsEl.addEventListener('change', paintSnippet, opts);
  tagsEl.addEventListener('change', paintSnippet, opts);
  paintSnippet();

  applyBtn?.addEventListener('click', async () => {
    const { cats, tags } = selected();
    const ids = [...cats, ...tags];
    if (!ids.length) {
      if (liveEl) liveEl.textContent = 'Elegí al menos un tag o categoría.';
      return;
    }
    try {
      const { ISWebComponentsLoader } = await import('../../../dist/cdn/core/loader.min.js');
      await ISWebComponentsLoader.load(...ids);
      if (liveEl) {
        liveEl.replaceChildren();
        if (ids.some((id) => id === 'is-button' || id === 'actions' || catalog.tags[id]?.file === 'button')) {
          const b = document.createElement('is-button');
          b.setAttribute('color', 'brand');
          b.textContent = 'Brand listo';
          liveEl.appendChild(b);
        }
        const note = document.createElement('span');
        note.textContent = ` load(${ids.map((x) => `"${x}"`).join(', ')}) OK`;
        liveEl.appendChild(note);
      }
    } catch (err) {
      if (liveEl) liveEl.textContent = String(err?.message || err);
    }
  }, opts);
}

/**
 * @param {ParentNode} root
 * @param {import('../_kit/types.d.ts').ISComponentPreviewLike} preview
 * @param {AddEventListenerOptions | undefined} opts
 */
async function mountSharedCatalog(root: ParentNode, preview: import('../_kit/types.d.ts').ISComponentPreviewLike, opts: AddEventListenerOptions | undefined) {
  const list = root.querySelector<HTMLElement>('#ecoList');
  const count = root.querySelector<HTMLElement>('#ecoCount');
  const filter = root.querySelector<HTMLElement>('#ecoFilter');
  if (!list) return;

  let modules = [];
  try {
    const url = new URL('../data/shared-modules.json', import.meta.url);
    const res = await fetch(url, { cache: 'no-cache', signal: preview?.signal });
    if (!res.ok) throw new Error(`${res.status}`);
    const catalog = await res.json();
    modules = catalog.modules || [];
  } catch (err) {
    list.innerHTML = `<p class="lede">No se pudo cargar <code>shared-modules.json</code>. Ejecuta <code>node scripts/gen-shared-index.ts</code>. (${err?.message || err})</p>`;
    return;
  }

  const esc = (s) => String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  const paint = (q: string = '') => {
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
          ? `<ul class="eco-exports">${m.exports.map((e: Event) => `<li><code>${esc(e)}</code></li>`).join('')}</ul>`
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
