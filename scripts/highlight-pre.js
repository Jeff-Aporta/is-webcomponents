/**
 * Highlight all <pre class="code"> with CodeMirror runMode.
 * - Dedenta indentación del HTML fuente
 * - Detecta modo: data-lang | heurística (html / javascript / css)
 * - Theme material-darker
 */
(() => {
  const CDN = 'https://cdn.jsdelivr.net/npm/codemirror@5.65.16';

  const ensureCss = (href) => {
    if ([...document.querySelectorAll('link[rel="stylesheet"]')].some((l) => l.href === href || l.getAttribute('href') === href)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  };

  const loadScript = (src) => new Promise((resolve, reject) => {
    if ([...document.scripts].some((s) => s.src === src || s.getAttribute('src') === src)) {
      resolve();
      return;
    }
    const el = document.createElement('script');
    el.src = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(el);
  });

  /** Quita indentación común heredada del markup del preview. */
  const dedent = (text) => {
    const normalized = String(text).replace(/\r\n/g, '\n').replace(/^\n+|\n+$/g, '');
    const lines = normalized.split('\n');
    const indents = lines
      .filter((l) => l.trim().length)
      .map((l) => {
        const m = l.match(/^[ \t]*/) || [''];
        return m[0].replace(/\t/g, '  ').length;
      });
    const min = indents.length ? Math.min(...indents) : 0;
    return lines
      .map((l) => {
        const expanded = l.replace(/^\t+/, (tabs) => '  '.repeat(tabs.length));
        const lead = (expanded.match(/^ */) || [''])[0].length;
        return expanded.slice(Math.min(min, lead));
      })
      .join('\n')
      .replace(/[ \t]+$/gm, '');
  };

  /**
   * Formato ligero: si viene casi en una línea, inserta saltos básicos
   * para HTML y JS sin un prettier completo.
   */
  const softFormat = (text, mode) => {
    let t = dedent(text);
    const compact = t.replace(/\s+/g, ' ').trim();
    const fewLines = t.split('\n').length <= 2;

    if (mode === 'htmlmixed' && fewLines && compact.includes('<') && compact.length > 80) {
      t = compact
        .replace(/>\s*</g, '>\n<')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .reduce((acc, line) => {
          const depth = acc.depth;
          const out = acc.out;
          const isClose = /^<\//.test(line);
          const nextDepth = isClose ? Math.max(0, depth - 1) : depth;
          out.push(`${'  '.repeat(nextDepth)}${line}`);
          const isOpen = /^<[^/!?][^>]*[^/]>$/.test(line)
            && !/^<(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b/i.test(line);
          return { out, depth: isClose ? nextDepth : depth + (isOpen ? 1 : 0) };
        }, { out: [], depth: 0 }).out.join('\n');
    }

    if (mode === 'javascript' && fewLines && /[{;]/.test(compact) && compact.length > 60) {
      t = compact
        .replace(/;\s*/g, ';\n')
        .replace(/\{\s*/g, '{\n')
        .replace(/\s*\}/g, '\n}')
        .replace(/,\s*(?=[{\[])/g, ',\n');
      // re-indent braces
      let depth = 0;
      t = t.split('\n').map((raw) => {
        const line = raw.trim();
        if (!line) return '';
        if (line.startsWith('}') || line.startsWith(']')) depth = Math.max(0, depth - 1);
        const out = `${'  '.repeat(depth)}${line}`;
        if (/[{\[]$/.test(line)) depth += 1;
        return out;
      }).filter((l, i, arr) => l || (i > 0 && i < arr.length - 1)).join('\n');
    }

    return dedent(t);
  };

  const resolveMode = (el, text) => {
    const raw = (el.getAttribute('data-lang') || el.getAttribute('data-language') || '').toLowerCase();
    if (['js', 'javascript', 'ts', 'typescript'].includes(raw)) return 'javascript';
    if (raw === 'css') return 'css';
    if (['html', 'htm', 'htmlmixed', 'xml', 'svg'].includes(raw)) return 'htmlmixed';

    const t = text.trim();
    if (!t) return 'htmlmixed';
    // CSS
    if (/^(?:@|:root|[.#]?[a-z][\w-]*)\s*\{/i.test(t) || /:\s*[^;]+;/m.test(t) && !/[<(]/.test(t.slice(0, 40))) {
      if (!/\b(?:const|let|var|function|=>)\b/.test(t) && !/^</.test(t)) return 'css';
    }
    // HTML / markup
    if (/^</.test(t) || /<\/?[a-z][\w:-]*[\s>]/i.test(t.slice(0, 120))) return 'htmlmixed';
    // JS default for scripts
    if (/\b(?:const|let|var|function|=>|import|export|class)\b/.test(t) || /\.\w+\s*=/.test(t)) return 'javascript';
    return 'javascript';
  };

  const paintOne = (el) => {
    if (typeof CodeMirror?.runMode !== 'function') return;
    if (el.classList.contains('demo-code-pop__pre') && !el.textContent.trim() && !el.dataset.forceCm) return;

    const original = el.textContent;
    const mode = resolveMode(el, original);
    const text = softFormat(original, mode);

    el.textContent = '';
    CodeMirror.runMode(text, mode, el);
    el.classList.add('cm-s-material-darker');
    el.dataset.cm = '1';
    el.dataset.cmMode = mode;
    // Guarda texto limpio para copiar / re-pintar
    el.dataset.cmSource = text;
  };

  const paint = (root = document) => {
    if (typeof CodeMirror?.runMode !== 'function') return;
    let targets;
    if (root instanceof Element && root.matches('pre.code')) {
      targets = root.dataset.cm ? [] : [root];
    } else {
      const scope = root instanceof Element || root instanceof DocumentFragment ? root : document;
      targets = [...scope.querySelectorAll('pre.code:not([data-cm])')];
    }
    targets.forEach(paintOne);
  };

  window.__isHighlightCode = paint;
  window.__isFormatCode = softFormat;

  const boot = async () => {
    ensureCss(`${CDN}/lib/codemirror.min.css`);
    ensureCss(`${CDN}/theme/material-darker.min.css`);

    if (!window.CodeMirror) await loadScript(`${CDN}/lib/codemirror.min.js`);
    if (typeof CodeMirror.runMode !== 'function') {
      await loadScript(`${CDN}/addon/runmode/runmode.min.js`);
    }
    if (!CodeMirror.modes?.xml) await loadScript(`${CDN}/mode/xml/xml.min.js`);
    if (!CodeMirror.modes?.javascript) await loadScript(`${CDN}/mode/javascript/javascript.min.js`);
    if (!CodeMirror.modes?.css) await loadScript(`${CDN}/mode/css/css.min.js`);
    if (!CodeMirror.modes?.htmlmixed) await loadScript(`${CDN}/mode/htmlmixed/htmlmixed.min.js`);

    paint();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { boot().catch(console.error); });
  } else {
    boot().catch(console.error);
  }
})();
