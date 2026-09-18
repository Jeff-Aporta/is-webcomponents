/**
 * Behavior preview: <is-code>
 */
import type { PreviewMountContext } from '../../previews/_kit/types.d.ts';

interface CodeMark {
  id?: string;
  from: number;
  to: number;
  kind: 'tooltip' | 'highlight';
  title?: string;
  body?: string;
  tone?: string;
  message?: string;
}

interface CodeDoc {
  text: string;
  marks?: CodeMark[];
}

interface IsCodeEl extends HTMLElement {
  lang: string;
  mode: 'inline' | 'block';
  value: string;
  lineNumbers: boolean | string;
  ready: boolean;
  themeConfig?: Record<string, string> | null;
  setMarks(marks: CodeMark[]): void;
  code2json(opts: { marks: CodeMark[] }): CodeDoc;
  setDocument(doc: CodeDoc): void;
  format(): void;
  refresh(): void;
}

interface IsFormatEl extends HTMLElement {
  format(): void;
}

const SAMPLES: Record<string, string> = {
  javascript: `function greet(name) {\n  return \`Hola, \${name}\`;\n}\n\nconsole.log(greet('IS'));`,
  typescript: `type User = { id: number; name: string };\n\nexport function label(u: User): string {\n  return \`#\${u.id} \${u.name}\`;\n}`,
  html: `<main class="page">\n  <h1>ContaPyme</h1>\n  <p>Web components</p>\n</main>`,
  css: `.card {\n  display: grid;\n  gap: 0.75rem;\n  padding: 1rem;\n  border-radius: 12px;\n}`,
  python: `def greet(name: str) -> str:\n    return f"Hola, {name}"\n\nprint(greet("IS"))`,
  json: `{\n  "ok": true,\n  "items": [1, 2, 3]\n}`,
  plaintext: `nota sin resaltado`,
};

export function mount(preview: PreviewMountContext): void {
  const root = preview.main || preview.root;
  if (!root) return;

  const langEd = root.querySelector<HTMLElement>('#demo-lang');
  if (langEd) {
    (langEd as HTMLTextAreaElement).value = SAMPLES.typescript;
    const setLang = (lang: string): void => {
      langEd.lang = lang;
      (langEd as HTMLTextAreaElement).value = SAMPLES[lang] || SAMPLES.javascript;
    };
    root.querySelector<HTMLElement>('#lang-js')?.addEventListener('click', () => setLang('javascript'));
    root.querySelector<HTMLElement>('#lang-ts')?.addEventListener('click', () => setLang('typescript'));
    root.querySelector<HTMLElement>('#lang-html')?.addEventListener('click', () => setLang('html'));
    root.querySelector<HTMLElement>('#lang-css')?.addEventListener('click', () => setLang('css'));
    root.querySelector<HTMLElement>('#lang-py')?.addEventListener('click', () => setLang('python'));
  }

  root.querySelector<HTMLElement>('#btn-format')?.addEventListener('click', () => {
    (root.querySelector<IsFormatEl>('#demo-format'))?.format();
  });

  // El --stat del demo llega adrede desalineado (barras partidas, columnas
  // irregulares) para que se vea qué hace `format()` sobre un diff: no toca el
  // contenido, solo devuelve la rejilla.
  root.querySelector<HTMLElement>('#diff-format')?.addEventListener('click', () => {
    (root.querySelector<IsFormatEl>('#demo-diff-stat'))?.format();
  });

  const themeEd = root.querySelector<IsCodeEl>('#demo-theme');
  root.querySelector<HTMLElement>('#theme-ocean')?.addEventListener('click', () => {
    if (!themeEd) return;
    themeEd.themeConfig = {
      background: '#0b1220',
      foreground: '#e2e8f0',
      gutterBackground: '#0b1220',
      gutterForeground: '#64748b',
      activeLine: 'rgba(56, 189, 248, 0.08)',
      keyword: '#7dd3fc',
      string: '#86efac',
      number: '#fbbf24',
      comment: '#64748b',
      property: '#c4b5fd',
      punctuation: '#94a3b8',
      tag: '#fb7185',
      attribute: '#fcd34d',
    };
  });
  root.querySelector<HTMLElement>('#theme-reset')?.addEventListener('click', () => {
    if (!themeEd) return;
    themeEd.themeConfig = null;
  });

  const marksEd = root.querySelector<IsCodeEl>('#demo-marks');
  const applyMarksDemo = (): void => {
    if (!marksEd) return;
    const value = `function add(a, b) {\n  return a + b;\n}\n\nadd(1, 2);`;
    marksEd.value = value;
    const addFrom = value.indexOf('add');
    const addTo = addFrom + 3;
    const aFrom = value.indexOf(' a');
    marksEd.setMarks([
      {
        id: 'tip-add',
        from: addFrom,
        to: addTo,
        kind: 'tooltip',
        title: 'add(a, b)',
        body: 'Devuelve la suma de a y b.',
      },
      {
        id: 'warn-a',
        from: aFrom + 1,
        to: aFrom + 2,
        kind: 'highlight',
        tone: 'warning',
        message: 'Parámetro sin tipo',
      },
      {
        id: 'err-call',
        from: value.lastIndexOf('add'),
        to: value.lastIndexOf('add') + 3,
        kind: 'highlight',
        tone: 'error',
        message: 'Ejemplo de highlight de error (externo)',
      },
    ]);
  };
  if (marksEd) {
    if (marksEd.ready) applyMarksDemo();
    else marksEd.addEventListener('is-ready', applyMarksDemo, { once: true });
  }

  const jsonEd = root.querySelector<IsCodeEl>('#demo-json');
  const out = root.querySelector<HTMLElement>('#json-out');
  let lastDoc: CodeDoc | null = null;
  root.querySelector<HTMLElement>('#btn-to-json')?.addEventListener('click', () => {
    if (!jsonEd || !out) return;
    lastDoc = jsonEd.code2json({
      marks: [
        {
          from: 16,
          to: 18,
          kind: 'tooltip',
          title: 'Hi',
          body: 'Componente de saludo',
        },
      ],
    });
    out.textContent = JSON.stringify(lastDoc, null, 2);
  });
  root.querySelector<HTMLElement>('#btn-from-json')?.addEventListener('click', () => {
    if (!jsonEd || !lastDoc) return;
    jsonEd.setDocument(lastDoc);
  });

  mountPlayground(root, SAMPLES);
}

function mountPlayground(root: ParentNode, samples: Record<string, string>): void {
  const ed = root.querySelector<IsCodeEl>('#pgCode');
  if (!ed) return;

  const stage = root.querySelector<HTMLElement>('#pgStage');
  const prose = root.querySelector<HTMLElement>('#pgProse');
  const inlineHost = root.querySelector<HTMLElement>('#pgInlineHost');
  const modeSel = root.querySelector<HTMLSelectElement>('#pgMode');
  const langSel = root.querySelector<HTMLSelectElement>('#pgLang');
  const valueTa = root.querySelector<HTMLTextAreaElement>('#pgValue');
  const meta = root.querySelector<HTMLElement>('#pgMeta');
  const flags = {
    readonly: root.querySelector<HTMLInputElement>('#pgReadonly'),
    wrap: root.querySelector<HTMLInputElement>('#pgWrap'),
    lines: root.querySelector<HTMLInputElement>('#pgLines'),
    compact: root.querySelector<HTMLInputElement>('#pgCompact'),
    disabled: root.querySelector<HTMLInputElement>('#pgDisabled'),
  };

  const syncMeta = (): void => {
    if (!meta) return;
    const rect = ed.getBoundingClientRect();
    meta.textContent = [
      `mode=${ed.mode}`,
      `lang=${ed.lang}`,
      `lineNumbers=${ed.lineNumbers}`,
      `ready=${ed.ready}`,
      `${Math.round(rect.width)}×${Math.round(rect.height)}px`,
    ].join(' · ');
  };

  const placeEditor = (): void => {
    const inline = modeSel?.value === 'inline';
    stage?.classList.toggle('is-inline', inline);
    if (prose) prose.hidden = !inline;
    if (inline && inlineHost && ed.parentElement !== inlineHost) {
      inlineHost.append(ed);
    } else if (!inline && stage && ed.parentElement !== stage) {
      stage.append(ed);
    }
  };

  const apply = (): void => {
    const mode = modeSel?.value === 'inline' ? 'inline' : 'block';
    ed.mode = mode;
    placeEditor();

    const lang = langSel?.value || 'javascript';
    if (ed.lang !== lang) ed.lang = lang;

    const ro = !!flags.readonly?.checked;
    const wrap = !!flags.wrap?.checked;
    const compact = !!flags.compact?.checked;
    const disabled = !!flags.disabled?.checked;

    ed.toggleAttribute('readonly', ro);
    ed.toggleAttribute('wrap', wrap);
    ed.toggleAttribute('compact', compact);
    ed.toggleAttribute('disabled', disabled);

    if (flags.lines?.checked) {
      if (mode === 'inline') ed.setAttribute('line-numbers', '');
      else ed.removeAttribute('line-numbers');
    } else {
      ed.setAttribute('line-numbers', 'false');
    }

    ed.refresh();
    requestAnimationFrame(syncMeta);
  };

  if (valueTa) {
    valueTa.value = ed.value || samples.javascript;
    valueTa.addEventListener('input', () => {
      ed.value = valueTa.value;
      syncMeta();
    });
  }

  ed.addEventListener('is-input', () => {
    if (valueTa && valueTa !== document.activeElement) valueTa.value = ed.value;
    syncMeta();
  });
  ed.addEventListener('is-ready', () => {
    if (valueTa) valueTa.value = ed.value;
    syncMeta();
  });

  modeSel?.addEventListener('change', () => {
    if (modeSel.value === 'inline') {
      if (flags.lines) flags.lines.checked = false;
      if (flags.compact) flags.compact.checked = true;
      if (valueTa && /\n/.test(valueTa.value)) {
        valueTa.value = 'greet(name)';
        ed.value = valueTa.value;
      }
    } else if (flags.compact) {
      flags.compact.checked = false;
    }
    apply();
  });
  langSel?.addEventListener('change', () => {
    const lang = langSel.value;
    ed.lang = lang;
    const sample = samples[lang];
    if (sample && valueTa) {
      valueTa.value = sample;
      ed.value = sample;
    }
    apply();
  });

  // Delegación: Live Server / re-paint no dejan listeners huérfanos en flags.
  root.querySelector<HTMLElement>('.playground .controls')?.addEventListener('change', (e: Event) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.id === 'pgMode' || t.id === 'pgLang') return; // ya tienen handler
    if (
      t.id === 'pgReadonly'
      || t.id === 'pgWrap'
      || t.id === 'pgLines'
      || t.id === 'pgCompact'
      || t.id === 'pgDisabled'
      || t.closest?.('.checks')
    ) {
      apply();
    }
  });

  root.querySelector<HTMLElement>('#pgFormat')?.addEventListener('click', () => {
    ed.format();
    if (valueTa) valueTa.value = ed.value;
    syncMeta();
  });
  root.querySelector<HTMLElement>('#pgFocus')?.addEventListener('click', () => ed.focus());

  apply();
  window.addEventListener('resize', syncMeta, { passive: true });
}

export function unmount(): void {
  /* listeners viven en nodos que se descartan con el preview */
}
