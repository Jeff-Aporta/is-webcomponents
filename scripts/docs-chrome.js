/**
 * docs-chrome.js — piezas comunes de TODAS las páginas de componente.
 *
 * Botón de copiar (<is-copy-button>) en cada `pre.code` de la página.
 * El bloque "Consumo por CDN" es responsabilidad EXCLUSIVA de
 * <is-cdn-snippet>, auto-inyectado por preview-chrome.js — aquí no se
 * duplica ningún callout CDN.
 *
 * Opt-out: data-no-copy en un <pre>.
 */
(() => {
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

    // El bloque CDN lo pinta <is-cdn-snippet> (auto-inyectado por
    // preview-chrome.js). Aquí solo queda el botón de copiar de los <pre>.
    document.querySelectorAll('pre.code').forEach(addCopy);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { boot().catch(console.error); });
  } else {
    boot().catch(console.error);
  }
})();
