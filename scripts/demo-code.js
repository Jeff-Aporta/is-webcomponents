/**
 * Añade a cada `.demo` un botón info que muestra el HTML del ejemplo.
 * Override opcional: data-code="..." | data-no-code
 * Depende de highlight-pre.js (window.__isHighlightCode) e is-icon.
 */
(() => {
  const iconModuleUrl = (() => {
    const self = [...document.scripts].find((s) => s.src.includes('demo-code.js'));
    if (self) return new URL('../components/media/icon.js', self.src).href;
    return new URL('../components/media/icon.js', location.href).href;
  })();

  const ensureIsIcon = () => {
    if (customElements.get('is-icon')) return customElements.whenDefined('is-icon');
    if (![...document.querySelectorAll('script[type="module"]')].some((s) => s.src.includes('/media/icon.js'))) {
      const el = document.createElement('script');
      el.type = 'module';
      el.src = iconModuleUrl;
      document.head.appendChild(el);
    }
    return customElements.whenDefined('is-icon');
  };

  /** Serializa el contenido del demo (sin el chrome del botón/popover). */
  const sourceFromDemo = (demo) => {
    const raw = demo.getAttribute('data-code');
    if (raw != null && raw !== '') return raw.trim();

    const parts = [];
    for (const node of demo.childNodes) {
      if (node.nodeType === 1) {
        if (node.matches('.demo-code-btn, .demo-code-pop, dialog')) continue;
        parts.push(node.outerHTML);
      } else if (node.nodeType === 3) {
        const t = node.textContent.trim();
        if (t) parts.push(t);
      }
    }
    return pretty(parts.join('\n'));
  };

  const pretty = (html) => {
    const flat = html
      .replace(/>\s+</g, '>\n<')
      .replace(/^\s+|\s+$/g, '');
    const lines = flat.split('\n');
    let depth = 0;
    const out = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/^<\//.test(trimmed)) depth = Math.max(0, depth - 1);
      out.push(`${'  '.repeat(depth)}${trimmed}`);
      if (/^<[^/!][^>]*[^/]>$/.test(trimmed) && !/^<(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b/i.test(trimmed)) {
        depth += 1;
      }
    }
    return out.join('\n');
  };

  const highlight = (pre) => {
    if (!pre.getAttribute('data-lang')) pre.setAttribute('data-lang', 'html');
    delete pre.dataset.cm;
    if (typeof window.__isHighlightCode === 'function') {
      window.__isHighlightCode(pre);
      return;
    }
    if (typeof CodeMirror?.runMode === 'function') {
      const text = pre.textContent;
      pre.textContent = '';
      CodeMirror.runMode(text, 'htmlmixed', pre);
      pre.classList.add('cm-s-material-darker');
      pre.dataset.cm = '1';
    }
  };

  const enhance = (demo) => {
    if (demo.dataset.codeReady || demo.hasAttribute('data-no-code')) return;
    demo.dataset.codeReady = '1';
    demo.classList.add('demo--with-code');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'demo-code-btn';
    btn.setAttribute('aria-label', 'Ver código del ejemplo');
    btn.title = 'Ver código';
    btn.innerHTML = '<is-icon icon="mdi:information-outline"></is-icon>';

    const pop = document.createElement('div');
    pop.className = 'demo-code-pop';
    pop.setAttribute('popover', 'auto');
    pop.innerHTML = `
      <div class="demo-code-pop__bar">
        <span class="demo-code-pop__title">Código</span>
        <button type="button" class="demo-code-pop__copy" title="Copiar">Copiar</button>
      </div>
      <pre class="code demo-code-pop__pre"></pre>
    `;

    const pre = pop.querySelector('pre');
    const copyBtn = pop.querySelector('.demo-code-pop__copy');

    const fill = () => {
      if (pre.dataset.filled === '1') return;
      pre.textContent = sourceFromDemo(demo);
      delete pre.dataset.cm;
      highlight(pre);
      pre.dataset.filled = '1';
    };

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      fill();
      if (typeof pop.showPopover === 'function') {
        const r = btn.getBoundingClientRect();
        const w = Math.min(36 * 16, innerWidth - 32);
        const x = Math.max(12, Math.min(r.right - w, innerWidth - w - 12));
        const y = Math.min(r.bottom + 8, innerHeight - 80);
        pop.style.setProperty('--demo-code-x', `${x}px`);
        pop.style.setProperty('--demo-code-y', `${y}px`);
        if (pop.matches(':popover-open')) pop.hidePopover();
        else pop.showPopover();
      } else {
        pop.hidden = !pop.hidden;
        demo.classList.toggle('demo--code-open', !pop.hidden);
      }
    });

    copyBtn.addEventListener('click', async () => {
      const text = sourceFromDemo(demo);
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = 'Copiado';
        setTimeout(() => { copyBtn.textContent = 'Copiar'; }, 1200);
      } catch {
        copyBtn.textContent = 'Error';
      }
    });

    if (typeof pop.showPopover !== 'function') {
      pop.hidden = true;
      pop.removeAttribute('popover');
      pop.classList.add('demo-code-pop--fallback');
    }

    demo.append(btn, pop);
  };

  const boot = async () => {
    try { await ensureIsIcon(); } catch { /* botón sin icono custom ok */ }
    document.querySelectorAll('.demo').forEach(enhance);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { boot().catch(console.error); });
  } else {
    boot().catch(console.error);
  }
})();
