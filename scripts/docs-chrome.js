/**
 * docs-chrome.js — piezas comunes de TODAS las páginas de componente.
 *
 * 1. Bloque "Importar (CDN)" generado a partir del manifest (tag + categoría),
 *    insertado tras el primer `.demo` de la página. Se genera en vez de estar
 *    pegado a mano en cada preview: así es idéntico en las 90 y no se
 *    desincroniza cuando cambia la ruta del CDN.
 * 2. Botón de copiar (<is-copy-button>) en cada `pre.code` de la página.
 *
 * Opt-out: data-no-cdn en el <main>, data-no-copy en un <pre>.
 */
(() => {
  const CDN_BASE = 'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/cdn';

  const selfSrc = [...document.scripts].find((s) => s.src.includes('docs-chrome.js'))?.src
    || location.href;

  const ensureComponent = (tag, relPath) => {
    if (customElements.get(tag)) return customElements.whenDefined(tag);
    const url = new URL(relPath, selfSrc).href;
    if (![...document.querySelectorAll('script[type="module"]')].some((s) => s.src === url)) {
      const el = document.createElement('script');
      el.type = 'module';
      el.src = url;
      document.head.appendChild(el);
    }
    return customElements.whenDefined(tag);
  };

  const loadManifest = () => {
    if (Array.isArray(window.__IS_MANIFEST__)) return Promise.resolve(window.__IS_MANIFEST__);
    return import(new URL('../manifest.js', selfSrc).href)
      .then((m) => m.default || m)
      .catch(() => []);
  };

  /** Componente de la página: por nombre de archivo (is-button.html → is-button). */
  const pageTag = () => {
    const file = location.pathname.split('/').pop() || '';
    const base = file.replace(/\.html?$/i, '');
    return /^is-[a-z0-9-]+$/.test(base) ? base : '';
  };

  const escapeHtml = (s) => s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /** Bloque idéntico en todas las páginas: base, suelto, categoría, bundle. */
  const buildCdnBlock = (entry) => {
    const short = entry.tag.replace(/^is-/, '');
    const cat = entry.category;
    const box = document.createElement('div');
    box.className = 'callout callout--cdn';
    box.dataset.cdnBlock = '1';
    box.innerHTML = `
      <strong>Importar (CDN):</strong>
      <p>Carga el tema base y los componentes que necesites:</p>
      <pre class="code">${escapeHtml(`<link rel="stylesheet" href="${CDN_BASE}/is-base.min.css">`)}</pre>
      <p>Este componente suelto:</p>
      <pre class="code">${escapeHtml(`<script type="module" src="${CDN_BASE}/${short}.min.js"></script>`)}</pre>
      <p>Incluido en su categoría <code>${cat}.min.js</code>:</p>
      <pre class="code">${escapeHtml(`<script type="module" src="${CDN_BASE}/${cat}.min.js"></script>`)}</pre>
      <p>Incluido en el bundle único <code>all.min.js</code>:</p>
      <pre class="code">${escapeHtml(`<script type="module" src="${CDN_BASE}/all.min.js"></script>`)}</pre>
    `;
    return box;
  };

  const insertCdnBlock = (entry) => {
    const host = document.querySelector('is-main.main, main.main, is-main, main');
    if (!host || host.hasAttribute('data-no-cdn')) return;
    if (document.querySelector('[data-cdn-block]')) return;   // ya inyectado
    const block = buildCdnBlock(entry);
    // Tras el primer demo de la primera sección; si no hay demo, tras el lede.
    const anchor = host.querySelector('.demo') || host.querySelector('.lede');
    if (anchor) anchor.insertAdjacentElement('afterend', block);
    else host.querySelector('.section')?.appendChild(block);
  };

  /** Barra con botón de copiar sobre cada snippet. */
  const addCopy = (pre) => {
    if (pre.dataset.copyReady || pre.hasAttribute('data-no-copy')) return;
    // El panel del demo trae su propia barra de copiar.
    if (pre.closest('.demo-code-pop')) return;
    pre.dataset.copyReady = '1';

    const wrap = document.createElement('div');
    wrap.className = 'code-block';
    pre.replaceWith(wrap);

    const btn = document.createElement('is-copy-button');
    btn.className = 'code-block__copy';
    btn.setAttribute('value', pre.textContent);
    btn.setAttribute('copy-label', 'Copiar');
    btn.setAttribute('success-label', 'Copiado');
    btn.setAttribute('tooltip-placement', 'left');

    wrap.append(pre, btn);
  };

  const boot = async () => {
    ensureComponent('is-copy-button', '../components/actions/copy-button.js').catch(() => {});

    const tag = pageTag();
    if (tag) {
      const manifest = await loadManifest();
      const entry = Array.isArray(manifest) ? manifest.find((e) => e.tag === tag) : null;
      if (entry) insertCdnBlock(entry);
    }

    // Después de inyectar el bloque CDN, para que sus snippets también copien.
    document.querySelectorAll('pre.code').forEach(addCopy);
    if (typeof window.__isHighlightCode === 'function') {
      document.querySelectorAll('[data-cdn-block] pre.code').forEach(window.__isHighlightCode);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { boot().catch(console.error); });
  } else {
    boot().catch(console.error);
  }
})();
