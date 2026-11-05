/**
 * code-text.js — utilidades de texto para código (sin CodeMirror ni editors).
 * Extraído para evitar ciclos highlight-code ↔ code ↔ code-format.
 */
import type { DiffLineKind, StatLineParts, FormatDiffCfg, CodeLangDef, LanguageSummary, CodeEditor } from './schemas/code.schemas.js';

/** Quita indentación común heredada del markup del preview. */
export const dedent = (text: unknown): string => {
  const normalized = String(text).replace(/\r\n/g, '\n').replace(/^\n+|\n+$/g, '');
  const lines = normalized.split('\n');
  const indents = lines
    .filter((l: string) => l.trim().length)
    .map((l) => {
      const m = l.match(/^[ \t]*/) || [''];
      return m[0].replace(/\t/g, '  ').length;
    });
  const min = indents.length ? Math.min(...indents) : 0;
  return lines
    .map((l: string) => {
      const expanded = l.replace(/^\t+/, (tabs) => '  '.repeat(tabs.length));
      const lead = (expanded.match(/^ */) || [''])[0].length;
      return expanded.slice(Math.min(min, lead));
    })
    .join('\n')
    .replace(/[ \t]+$/gm, '');
};

const HAND_HL_OPEN = /<span\s+class="(?:tag|attr|val|str|kw|com)">/gi;
const HAND_HL_CLOSE = /<\/span>/gi;
const HAND_HL_PROBE = /<span\s+class="(?:tag|attr|val|str|kw|com)"/i;

export const unwrapHandHighlight = (text: unknown): string => {
  const raw = String(text);
  if (!HAND_HL_PROBE.test(raw)) return raw;
  return raw.replace(HAND_HL_OPEN, '').replace(HAND_HL_CLOSE, '');
};

const VOID_HTML = /^(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b/i;

/** true si una comilla de atributo sigue abierta al saltar de línea. */
function quoteCrossesLine(text: string): boolean {
  let q: '"' | "'" | null = null;
  const lines = text.split('\n');
  for (let li = 0; li < lines.length; li += 1) {
    const line = lines[li]!;
    for (let i = 0; i < line.length; i += 1) {
      const c = line[i];
      if (q) {
        if (c === '\\') { i += 1; continue; }
        if (c === q) q = null;
      } else if (c === '"' || c === "'") q = c as '"' | "'";
    }
    if (q && li < lines.length - 1) return true;
  }
  return false;
}

export const prettyHtml = (text: unknown): string => {
  const lines = String(text)
    .replace(/\r\n/g, '\n')
    .replace(/>\s*</g, '>\n<')
    .split('\n')
    .map((line: string) => line.trim())
    .filter(Boolean);

  let depth = 0;
  const out = [];
  for (const line of lines) {
    const isClose = /^<\//.test(line);
    if (isClose) depth = Math.max(0, depth - 1);
    out.push(`${'  '.repeat(depth)}${line}`);
    const isOpen = /^<[^/!?][^>]*>$/.test(line)
      && !/\/>$/.test(line)
      && !VOID_HTML.test(line.slice(1));
    if (!isClose && isOpen) depth += 1;
  }
  return out.join('\n').replace(
    /^(\s*)(<([a-zA-Z][\w:-]*)\b[^>]*>)\n\1(<\/\3>)/gm,
    '$1$2$4',
  );
};

/**
 * Formato ligero: saltos básicos para HTML/JS compactos.
 * @param {string} text
 * @param {string} mode  htmlmixed|html|javascript|…
 */
export const softFormatMode = (langOrMode: unknown): string => {
  const m = String(langOrMode || '').toLowerCase();
  if (['html', 'htm', 'htmlmixed', 'xml', 'svg'].includes(m)) return 'htmlmixed';
  if (['ts', 'typescript'].includes(m)) return 'javascript';
  if (m === 'js') return 'javascript';
  return m || 'javascript';
};

export const softFormat = (text: unknown, mode?: string): string => {
  let t = dedent(unwrapHandHighlight(text));
  const compact = t.replace(/\s+/g, ' ').trim();
  const fewLines = t.split('\n').length <= 2;
  const inlineNest = t.split('\n').some((line) => />\s*</.test(line));

  // Snippets HTML: pretty si hay nesting o pocas líneas con tags.
  // Un atributo ya partido en líneas trae su sangría: no recortar.
  if ((mode === 'htmlmixed' || mode === 'html') && t.includes('<') && (fewLines || inlineNest) && !quoteCrossesLine(t)) {
    t = prettyHtml(t);
  }

  if ((mode === 'javascript' || mode === 'js') && fewLines && /[{;]/.test(compact) && compact.length > 60) {
    t = compact
      .replace(/;\s*/g, ';\n')
      .replace(/\{\s*/g, '{\n')
      .replace(/\s*\}/g, '\n}')
      .replace(/,\s*(?=[{\[])/g, ',\n');
    let depth = 0;
    t = t.split('\n').map((raw: string) => {
      const line = raw.trim();
      if (!line) return '';
      if (line.startsWith('}') || line.startsWith(']')) depth = Math.max(0, depth - 1);
      const out = `${'  '.repeat(depth)}${line}`;
      if (/[{\[]$/.test(line)) depth += 1;
      return out;
    }).filter((l, i: number, arr) => l || (i > 0 && i < arr.length - 1)).join('\n');
  }

  return dedent(t);
};

// ── code-diff ──
/**
 * code-diff.js — clasificador y alineador de diffs unificados y resúmenes de
 * commit para el motor nativo de `<iswc-code>`.
 *
 * Por qué existe: pintar un diff con el tokenizador de lenguaje (javascript u
 * otro) sale mal siempre, y de forma engañosa. El `+` y el `-` de la primera
 * columna no son parte del código: son marcas de línea. Un tokenizador de JS los
 * lee como operadores, arrastra el resto de la línea a un estado sintáctico que
 * no existe, y el resultado es un bloque coloreado casi al azar donde lo único
 * que el lector necesita —qué se añadió y qué se quitó— es justo lo que no se ve.
 *
 * Este módulo trabaja por LÍNEA, no por expresión: clasifica cada línea entera por
 * su primer carácter y no intenta entender el lenguaje de dentro (de eso se
 * encarga `code-highlight` al pintar). Cubre las tres formas en que git presenta
 * un cambio:
 *
 *   1. diff unificado      `@@ -1,4 +1,6 @@`, `+añadido`, `-quitado`
 *   2. cabecera de commit  `commit <sha>`, `Author:`, `Merge:`
 *   3. resumen (`--stat`)  ` src/app.js | 12 ++++++----` y el total de abajo
 *
 * El resumen es el caso que da nombre a `lang="commit"`: ahí los `+` y `-` no
 * encabezan la línea sino que forman una barra proporcional al final, y hay que
 * colorearlos por tramos dentro de la línea, no de una pieza.
 */

/** Clases de línea (fondo) que expone el modo. */
export const DIFF_LINE_CLASS = Object.freeze({
  add: 'iswc-diff-line-add',
  del: 'iswc-diff-line-del',
  hunk: 'iswc-diff-line-hunk',
  file: 'iswc-diff-line-file',
  commit: 'iswc-diff-line-commit',
});

/** Todas las clases de línea, para poder limpiarlas sin saber cuál había. */
export const DIFF_LINE_CLASSES: readonly string[] = Object.freeze(Object.values(DIFF_LINE_CLASS));

/** Categoría que `classifyDiffLine` puede devolver. */

/**
 * Clasifica una línea suelta de diff / resumen de commit.
 *
 * El orden de las comprobaciones es la parte delicada: `--- a/file` y `+++
 * b/file` empiezan por `-` y `+`, así que si se prueba la regla de
 * añadido/borrado primero, las cabeceras de archivo se pintan como si fueran
 * contenido cambiado. Van antes, siempre.
 */
export function classifyDiffLine(line: string | null | undefined): DiffLineKind {
  const s = String(line ?? '');
  if (/^commit\s+[0-9a-f]{7,40}\b/i.test(s)) return 'commit';
  if (/^(Author|Date|Merge|AuthorDate|CommitDate|Committer)\s*:/i.test(s)) return 'header';
  if (/^diff --git\s/.test(s)) return 'file';
  if (/^index\s+[0-9a-f]+\.\.[0-9a-f]+/i.test(s)) return 'header';
  if (/^(new file mode|deleted file mode|old mode|new mode|similarity index|rename (from|to)|copy (from|to))\b/.test(s)) return 'header';
  // Cabeceras de archivo antes que add/del: empiezan por - y + pero no lo son.
  if (/^(---|\+\+\+)(\s|$)/.test(s)) return 'file';
  if (/^@@[^@]*@@/.test(s)) return 'hunk';
  // Marca de línea antes que comentario: `+// nota` es una línea añadida que
  // resulta ser un comentario, no un comentario suelto del narrador.
  if (/^\+/.test(s)) return 'add';
  if (/^-/.test(s)) return 'del';
  // Comentario de contexto: el que escribe el extracto lo usa para situar el
  // archivo o explicar el recorte. No es parte del cambio.
  if (/^\s*(\/\/|#(?!\d)|\/\*|\*)/.test(s)) return 'comment';
  // Anotación suelta: `(commit 8936adb)` en su propia línea.
  if (/^\s*\([^)]*\)\s*$/.test(s)) return 'note';
  // ` src/app.js | 12 ++++----`  (barra proporcional del `--stat`)
  if (/^\s*\S.*\|\s*\d+\s*[+\-\s]*(\([^)]*\)\s*)?$/.test(s)) return 'stat';
  // Barra huérfana, sin ruta: pasa cuando el `--stat` se copia desalineado.
  if (/^\s*\|\s*\d+\s*[+\-\s]*(\([^)]*\)\s*)?$/.test(s)) return 'stat';
  // ` 2 files changed, 8 insertions(+), 4 deletions(-)`
  if (/\b\d+\s+files?\s+changed\b/i.test(s)) return 'total';
  return 'context';
}

/** Clase de fondo para una línea, o `null` si la línea no lleva banda.
 * La usa `<iswc-code>` vía `CodeLangDef.lineClass`.
 */
export function diffLineClass(line: string | null | undefined): string | null {
  const kind = classifyDiffLine(line);
  if (kind === 'add') return DIFF_LINE_CLASS.add;
  if (kind === 'del') return DIFF_LINE_CLASS.del;
  if (kind === 'hunk') return DIFF_LINE_CLASS.hunk;
  if (kind === 'file') return DIFF_LINE_CLASS.file;
  if (kind === 'commit') return DIFF_LINE_CLASS.commit;
  return null;
}

/** Piezas de una línea de `--stat`. */

/**
 * Descompone una línea de `--stat` en sus cuatro piezas.
 * Devuelve `null` si la línea no es un `--stat`.
 */
export function parseStatLine(line: string | null | undefined): StatLineParts | null {
  const s = String(line ?? '');
  const m = s.match(/^\s*(.*?)\s*\|\s*(\d+)\s*([+\-\s]*?)\s*(\([^)]*\))?\s*$/);
  if (!m) return null;
  return {
    path: m[1] || '',
    count: m[2] || '',
    // Los espacios dentro de la barra (`++ --`) son basura de copiado: la barra
    // es una sola tirada de signos, y separada deja de leerse como proporción.
    bar: (m[3] || '').replace(/\s+/g, ''),
    note: m[4] || '',
  };
}

/**
 * Alinea en columnas el bloque `--stat` de un resumen de commit.
 *
 * Un `--stat` recién salido de git ya viene alineado, pero en cuanto pasa por
 * un copiado, un PDF o un guion de vídeo pierde el padding y queda como una
 * lista irregular donde no se puede comparar el tamaño de un cambio con el de
 * al lado. Esto lo devuelve a rejilla: ruta, contador y barra en columnas
 * fijas, calculadas sobre el bloque contiguo (no sobre el archivo entero, para
 * que dos tablas separadas por prosa no se contaminen entre sí).
 *
 * Las líneas que no son `--stat` se devuelven intactas.
 */
export function formatDiff(text: string | null | undefined, cfg: FormatDiffCfg = {}): string {
  const eol = cfg.eol === 'crlf' ? '\r\n' : '\n';
  const lines = String(text ?? '').split(/\r?\n/);
  type Block = { i: number; parts: StatLineParts };
  let bloque: Block[] = [];
  const out = lines.slice();

  const volcar = (): void => {
    if (!bloque.length) return;
    const anchoRuta = Math.max(...bloque.map((b) => b.parts.path.length));
    const anchoNum = Math.max(...bloque.map((b) => b.parts.count.length));
    for (const { i, parts } of bloque) {
      const ruta = parts.path.padEnd(anchoRuta);
      const num = parts.count.padStart(anchoNum);
      const cola = [parts.bar, parts.note].filter(Boolean).join(' ');
      out[i] = `${ruta} | ${num}${cola ? ` ${cola}` : ''}`.trimEnd();
    }
    bloque = [];
  };

  lines.forEach((line, i) => {
    const parts = classifyDiffLine(line) === 'stat' ? parseStatLine(line) : null;
    if (parts) bloque.push({ i, parts });
    else volcar();
  });
  volcar();

  return out.join(eol);
}

// ── code-langs ──
/**
 * code-langs.js — registro de lenguajes para `<iswc-code>`.
 *
 * El resaltado lo hace el motor NATIVO (code-highlight): aquí solo vive el
 * registro de ids/alias, la inferencia por texto y las clases de línea.
 * Ya no se descarga ningún modo de CodeMirror desde CDN.
 */
/**
 * Definición de un lenguaje: id, alias, y opcionalmente una clase de fondo
 * por línea (la piden los lenguajes cuyo significado vive en la línea
 * completa, p. ej. diff: esta fila entra, esta sale).
 */

const LANGS = new Map<string, CodeLangDef>();
/** alias → id */
const ALIASES = new Map<string, string>();

/**
 * Registra un lenguaje y lo deja disponible por su `id` y por cada `aliases`.
 */
export function registerLanguage(def: CodeLangDef): void {
  if (!def?.id) throw new Error('[code-langs] id obligatorio');
  LANGS.set(def.id, def);
  ALIASES.set(def.id.toLowerCase(), def.id);
  for (const a of def.aliases || []) ALIASES.set(String(a).toLowerCase(), def.id);
}

/** Resuelve un nombre (id o alias) a la `CodeLangDef` registrada, o `null`. */
export function resolveLanguage(name: string | null | undefined): CodeLangDef | null {
  if (!name) return LANGS.get('javascript') ?? null;
  const key = String(name).trim().toLowerCase();
  const id = ALIASES.get(key) || key;
  return LANGS.get(id) || null;
}

/**
 * Infiere lang cuando el consumidor no pasó `lang` (p. ej. snippets de demos).
 * Sin esto, HTML cae al default `javascript` y `<` se pinta como operador.
 */
export function inferLanguage(text: string): string {
  const t = String(text || '').trim();
  if (!t) return 'javascript';
  if (/^(?:@|:root|[.#]?[a-z][\w-]*)\s*\{/i.test(t)
    || (/:\s*[^;]+;/m.test(t) && !/[<(]/.test(t.slice(0, 40)))) {
    if (!/\b(?:const|let|var|function|=>)\b/.test(t) && !/^</.test(t)) return 'css';
  }
  if (/^</.test(t) || /<\/?[a-z][\w:-]*[\s>]/i.test(t.slice(0, 120))) return 'html';
  if (/^\{[\s\S]*\}$/.test(t) || /^\[[\s\S]*\]$/.test(t)) {
    try {
      JSON.parse(t);
      return 'json';
    } catch { /* no json */ }
  }
  if (/\b(?:def |class |import |from |print\()/.test(t) && !/\b(?:const|let|var|function)\b/.test(t)) {
    return 'python';
  }
  if (/^(?:diff --git|Index: |--- |\+\+\+ |@@ )/.test(t) || /^[+-]{3} /m.test(t)) return 'diff';
  if (/^curl\b/i.test(t) || /^#!\s*\/(?:usr\/)?bin\/(?:ba)?sh\b/.test(t)) return 'shell';
  if (/\b(?:const|let|var|function|=>|import|export|class)\b/.test(t) || /\.\w+\s*=/.test(t)) {
    return 'javascript';
  }
  return 'javascript';
}

export function listLanguages(): LanguageSummary[] {
  return [...LANGS.values()].map((d) => ({
    id: d.id,
    aliases: [...(d.aliases || [])],
    heavy: !!d.heavy,
  }));
}

// —— Built-ins (motor nativo code-highlight; sin modos CM) ——

registerLanguage({
  id: 'javascript',
  aliases: ['js', 'mjs', 'cjs'],
});

registerLanguage({
  id: 'typescript',
  aliases: ['ts', 'mts', 'cts'],
});

registerLanguage({
  id: 'jsx',
  aliases: ['react'],
});

registerLanguage({
  id: 'tsx',
  aliases: [],
});

registerLanguage({
  id: 'html',
  aliases: ['htm', 'htmlmixed'],
});

registerLanguage({
  id: 'css',
  aliases: ['scss', 'less'],
});

registerLanguage({
  id: 'json',
  aliases: [],
});

registerLanguage({
  id: 'python',
  aliases: ['py'],
});

/** cURL / shell: tokenizer nativo del motor (code-highlight). */
registerLanguage({
  id: 'shell',
  aliases: ['bash', 'sh', 'zsh', 'curl', 'cli'],
});

registerLanguage({
  id: 'plaintext',
  aliases: ['text', 'plain', 'txt'],
});

// —— Diff y resumen de commit ——
// El motor nativo banda las líneas (code-highlight.diffLineClass); la clase de
// línea se conserva en el registro para quien la pida vía resolveLanguage.

registerLanguage({
  id: 'diff',
  aliases: ['patch', 'udiff', 'unified-diff'],
  lineClass: diffLineClass,
});

registerLanguage({
  id: 'commit',
  aliases: ['commit-resume', 'resumen-commit', 'git', 'git-log', 'gitlog', 'git-show'],
  lineClass: diffLineClass,
});

// ── highlight-code ──
/**
 * highlight-code.js — monta `<iswc-code readonly compact>` sobre los
 * `<pre class="code">` de la documentación (antes se coloreaban con
 * CodeMirror.runMode; hoy el resaltado lo hace el motor nativo del propio
 * `<iswc-code>`).
 *
 * Vive en `_shared/` (no en `scripts/`): `<iswc-cdn-snippet>` y el docs lo
 * importan. No carga CodeMirror ni ningún CDN.
 *
 * API pública estable:
 * - softFormat / dedent / prettyHtml / unwrapHandHighlight
 * - paint / repaint / watchDom
 *
 * No importa `code.js` en estático (ciclo con el bootstrap de <iswc-code>). Se
 * carga bajo demanda en `paint`.
 */
/** data-lang / heurística → mode legacy (softFormat) + lang del editor. */
export const resolveMode = (el: HTMLElement, text: string): string => {
  const raw = ((el.getAttribute?.('data-lang') || el.getAttribute?.('data-language') || el.dataset?.lang) ?? '').toLowerCase();
  if (['js', 'javascript'].includes(raw)) return 'javascript';
  if (['ts', 'typescript'].includes(raw)) return 'typescript';
  if (['jsx', 'tsx'].includes(raw)) return raw;
  if (raw === 'css') return 'css';
  if (['html', 'htm', 'htmlmixed', 'xml', 'svg'].includes(raw)) return 'htmlmixed';
  if (['py', 'python'].includes(raw)) return 'python';
  if (raw === 'json') return 'json';
  if (['diff', 'patch'].includes(raw)) return 'diff';
  return softFormatMode(inferLanguage(text));
};

/** Mode legacy → lang de `<iswc-code>`. */
export const modeToLang = (mode: string | null | undefined): string => {
  const m = String(mode || '').toLowerCase();
  if (m === 'htmlmixed' || m === 'htm' || m === 'xml' || m === 'svg') return 'html';
  if (m === 'js') return 'javascript';
  if (m === 'ts') return 'typescript';
  if (m === 'py') return 'python';
  return m || 'javascript';
};

const isMountedEditor = (el: Element): boolean => el instanceof HTMLElement
  && el.localName === 'iswc-code'
  && el.dataset.cm === '1';

let editorImport: Promise<unknown> | null = null;
const ensureEditorDefined = (): Promise<unknown> => {
  if (customElements.get('iswc-code')) return Promise.resolve();
  editorImport ??= import('@jeff-aporta/iswc-base/components/code/code.js');
  return editorImport;
};

/** Editor `<iswc-code>` ya montado (con atributos de configuración). */

/**
 * Crea o actualiza un `<iswc-code readonly compact>` a partir de un
 * `<pre class="code">` o de un editor ya montado.
 */
const paintOne = async (el: HTMLElement): Promise<void> => {
  if (!(el instanceof HTMLElement)) return;
  if (el.classList.contains('demo-code-pop__pre')
    && !(el.localName === 'iswc-code' ? (el as CodeEditor).value : el.textContent ?? '').trim()
    && !el.dataset.forceCm) return;

  await ensureEditorDefined();

  const source = el.dataset.cmSource
    || el.dataset.src
    || (isMountedEditor(el) ? (el as CodeEditor).value : el.textContent)
    || '';
  if (!source.trim() && el.classList.contains('demo-code-pop__pre')) return;

  const mode = el.dataset.cmMode || resolveMode(el, source);
  const text = softFormat(source, mode === 'typescript' ? 'javascript' : mode);
  if (!text.trim() && (el.dataset.src || el.dataset.cmSource)) return;
  const lang = modeToLang(mode);

  if (isMountedEditor(el) || el.localName === 'iswc-code') {
    const ed = el as CodeEditor;
    ed.toggleAttribute('readonly', true);
    // Opt-out: `data-no-compact` permite al consumidor mantener el scroll vertical
    // cuando el contenedor tiene max-height. Por defecto `compact` desactiva el
    // scroll vertical en .ic-scroll (es para snippets inline de docs).
    const noCompact = el.hasAttribute('data-no-compact');
    ed.toggleAttribute('compact', !noCompact);
    if (!ed.hasAttribute('wrap')) ed.setAttribute('wrap', '');
    if (!ed.hasAttribute('line-numbers')) ed.setAttribute('line-numbers', 'false');
    ed.lang = lang;
    // Siempre asignar: el getter de iswc-code puede devolver el seed aunque la
    // vista aún no esté montada.
    ed.value = text;
    ed.dataset.cm = '1';
    ed.dataset.cmSource = text;
    ed.dataset.cmMode = mode;
    ed.refresh?.();
    return;
  }

  if (el.localName !== 'pre' && !el.classList.contains('code')) return;

  const ed = document.createElement('iswc-code') as unknown as CodeEditor;
  ed.className = `${el.className} iswc-code-view`.replace(/\s+/g, ' ').trim();
  ed.setAttribute('readonly', '');
  // Opt-out: `data-no-compact` permite al consumidor mantener el scroll vertical
  // cuando el contenedor tiene max-height. Por defecto `compact` desactiva el
  // scroll vertical en .ic-scroll (es para snippets inline de docs).
  if (!el.hasAttribute('data-no-compact')) ed.setAttribute('compact', '');
  ed.setAttribute('wrap', '');
  ed.setAttribute('line-numbers', 'false');
  ed.setAttribute('lang', lang);
  ed.setAttribute('value', text);
  ed.dataset.cm = '1';
  ed.dataset.cmSource = text;
  ed.dataset.cmMode = mode;
  if (el.id) ed.id = el.id;
  if (el.dataset.codeId) ed.dataset.codeId = el.dataset.codeId;
  if (el.hasAttribute('data-no-copy')) ed.setAttribute('data-no-copy', '');

  el.replaceWith(ed);
};

/**
 * Monta editores readonly sobre `pre.code` pendientes (o actualiza uno).
 */
export const paint = (root: ParentNode | Element = document): Promise<unknown[]> => {
  let targets: HTMLElement[];
  if (root instanceof Element && (root.matches?.('pre.code') || root.localName === 'iswc-code')) {
    targets = [root as HTMLElement];
  } else {
    const scope: ParentNode = root instanceof Element || root instanceof DocumentFragment || root instanceof ShadowRoot
      ? root
      : document;
    const list = [
      ...scope.querySelectorAll<HTMLElement>('pre.code:not([data-cm])'),
      ...scope.querySelectorAll<HTMLElement>('iswc-code.code:not([data-cm]), iswc-code.iswc-code-view:not([data-cm])'),
    ];
    targets = [...new Set(list)];
  }
  return Promise.all(targets.map((el) => paintOne(el).catch(console.error)));
};

/** Fuerza re-montar / actualizar contenido. */
export const repaint = (el: HTMLElement | null | undefined): Promise<void> => {
  if (!(el instanceof Element)) return Promise.resolve();
  delete el.dataset.cm;
  if (el.localName === 'iswc-code') {
    return paintOne(el as HTMLElement);
  }
  delete el.dataset.cmSource;
  delete el.dataset.cmMode;
  return paintOne(el as HTMLElement);
};

let observer: MutationObserver | null = null;
let pendientes: Set<HTMLElement> | null = null;
let pintando = false;

const procesarPendientes = (): void => {
  const lote = pendientes;
  pendientes = null;
  if (!lote?.size) return;
  const pintar = (): void => {
    pintando = true;
    try {
      for (const el of lote) {
        if (!el.isConnected) continue;
        if (el.localName === 'iswc-code') {
          const ed = el as CodeEditor;
          if (ed.dataset.cmSource !== undefined && ed.value !== ed.dataset.cmSource) {
            repaint(el);
          }
          continue;
        }
        if (!el.dataset.cm) paintOne(el);
      }
    } finally {
      pintando = false;
    }
  };
  // Sin puertas ni CDN: <iswc-code> pinta con su motor nativo (read-only y
  // editable) y se re-pinta solo cuando su fuente cambia.
  pintar();
};

const encolar = (el: HTMLElement): void => {
  pendientes ??= new Set();
  if (!pendientes.size) queueMicrotask(procesarPendientes);
  pendientes.add(el);
};

export const watchDom = (root: Element | Document = document.documentElement): void => {
  if (observer || typeof MutationObserver !== 'function') return;

  observer = new MutationObserver((muts) => {
    if (pintando) return;
    for (const m of muts) {
      if (m.type !== 'childList') continue;
      for (const node of m.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches?.('pre.code') || node.localName === 'iswc-code') encolar(node as HTMLElement);
        const nested = node.querySelectorAll?.('pre.code, iswc-code.code, iswc-code.iswc-code-view') ?? [];
        for (const pre of Array.from(nested)) encolar(pre as HTMLElement);
      }
    }
  });
  observer.observe(root, { childList: true, subtree: true });
};
