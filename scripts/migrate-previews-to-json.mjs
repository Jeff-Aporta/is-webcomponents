// scripts/migrate-previews-to-json.mjs
//
// Convierte src/previews/**/*.html → *.json (PreviewDefinition is-preview/v1)
// y extrae <script type="module"> inline a behaviors/<tag>.js.
// Conserva solo _shell.html.
//
// Uso: node scripts/migrate-previews-to-json.mjs [--dry]
// Luego regenera catalog: se escribe src/previews/catalog.js

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, unlinkSync, existsSync } from 'node:fs';
import { join, dirname, basename, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const previewsRoot = join(root, 'src', 'previews');
const behaviorsRoot = join(previewsRoot, 'behaviors');
const dry = process.argv.includes('--dry');

/** @param {string} dir @param {string[]} acc */
function walkHtml(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'behaviors' || name === '_kit') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkHtml(p, acc);
    else if (name.endsWith('.html') && name !== '_shell.html') acc.push(p);
  }
  return acc;
}

function decodeEntities(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]+>/g, '')).trim();
}

/**
 * Particiona el interior de una section en bloques tipados.
 * @param {string} inner
 */
function parseSectionInner(inner) {
  let title = '';
  let titleHtml = false;
  let lede = '';
  /** @type {import('../src/previews/_kit/types.d.ts').PreviewBlock[]} */
  const blocks = [];

  const h2 = inner.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
  if (h2) {
    const raw = h2[1].trim();
    if (/</.test(raw)) {
      title = raw;
      titleHtml = true;
    } else {
      title = stripTags(raw);
    }
    inner = inner.replace(h2[0], '');
  }

  const ledeM = inner.match(/<p\s+class="lede"[^>]*>([\s\S]*?)<\/p>/i);
  if (ledeM) {
    lede = ledeM[1].trim();
    inner = inner.replace(ledeM[0], '');
  }

  // Tokenizar bloques conocidos en orden de aparición
  const tokenRe =
    /<(is-demo\b[^>]*>[\s\S]*?<\/is-demo)|(?:div\s+class="callout"[^>]*>[\s\S]*?<\/div)|(?:is-callout\b[^>]*>[\s\S]*?<\/is-callout)|(?:pre\s+class="code"[^>]*>[\s\S]*?<\/pre)|(?:table\b[^>]*>[\s\S]*?<\/table)|(?:h3\b[^>]*>[\s\S]*?<\/h3)>/gi;

  // Approach más simple: split por is-demo / callout / pre.code / table / h3
  const pieces = [];
  const re =
    /<is-demo\b([^>]*)>([\s\S]*?)<\/is-demo>|<div\s+class="callout"[^>]*>([\s\S]*?)<\/div>|<is-callout\b[^>]*>([\s\S]*?)<\/is-callout>|<pre\s+class="code"[^>]*>([\s\S]*?)<\/pre>|<table\b([^>]*)>([\s\S]*?)<\/table>|<h3\b[^>]*>([\s\S]*?)<\/h3>/gi;

  let last = 0;
  let m;
  while ((m = re.exec(inner)) !== null) {
    const before = inner.slice(last, m.index).trim();
    if (before) pieces.push({ type: 'raw', html: before });
    if (m[0].startsWith('<is-demo')) {
      const attrs = m[1] || '';
      const html = m[2] || '';
      const heading = (attrs.match(/heading="([^"]*)"/) || [])[1];
      const contain = /\bcontain\b/.test(attrs);
      const noCode = /data-no-code|no-code/.test(attrs);
      pieces.push({
        type: 'demo',
        html: html.trim(),
        heading,
        contain,
        noCode,
      });
    } else if (m[0].startsWith('<div') || m[0].startsWith('<is-callout')) {
      pieces.push({ type: 'callout', html: (m[3] || m[4] || '').trim() });
    } else if (m[0].startsWith('<pre')) {
      pieces.push({ type: 'code', code: decodeEntities(m[5] || '').replace(/^\n/, '') });
    } else if (m[0].startsWith('<table')) {
      pieces.push({ type: 'table', html: m[0] });
    } else if (m[0].startsWith('<h3')) {
      pieces.push({ type: 'html', html: m[0] });
    }
    last = m.index + m[0].length;
  }
  const tail = inner.slice(last).trim();
  if (tail) pieces.push({ type: 'raw', html: tail });

  for (const p of pieces) {
    if (p.type === 'demo') {
      /** @type {import('../src/previews/_kit/types.d.ts').PreviewDemoBlock} */
      const block = { kind: 'demo', html: p.html };
      if (p.heading) block.heading = p.heading;
      if (p.contain) block.contain = true;
      if (p.noCode) block.noCode = true;
      blocks.push(block);
    } else if (p.type === 'callout') {
      blocks.push({ kind: 'callout', html: p.html });
    } else if (p.type === 'code') {
      blocks.push({ kind: 'code', code: p.code, lang: 'html' });
    } else if (p.type === 'table') {
      blocks.push(parseTable(p.html));
    } else if (p.type === 'html' || p.type === 'raw') {
      if (!p.html || /^<!--/.test(p.html) && !/-->/.test(p.html.slice(0, 20))) continue;
      const cleaned = p.html.replace(/<!--[\s\S]*?-->/g, '').trim();
      if (!cleaned) continue;
      blocks.push({ kind: 'html', html: cleaned });
    }
  }

  return { title, titleHtml, lede, blocks };
}

/** @param {string} tableHtml */
function parseTable(tableHtml) {
  const columns = [];
  const rows = [];
  const thRe = /<th[^>]*>([\s\S]*?)<\/th>/gi;
  let tm;
  while ((tm = thRe.exec(tableHtml)) !== null) columns.push(tm[1].trim());
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let first = true;
  let tr;
  while ((tr = trRe.exec(tableHtml)) !== null) {
    if (first && /<th/i.test(tr[1])) {
      first = false;
      continue;
    }
    first = false;
    const cells = [];
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let td;
    while ((td = tdRe.exec(tr[1])) !== null) cells.push(td[1].trim());
    if (cells.length) rows.push(cells);
  }
  return {
    kind: 'table',
    columns: columns.length ? columns : ['Col'],
    rows,
  };
}

/**
 * @param {string} html
 * @param {string} filePath
 */
function convertFile(html, filePath) {
  const rel = relative(previewsRoot, filePath).split(sep).join('/');
  const parts = rel.split('/');
  const file = parts.pop();
  const category = parts.length ? parts.join('/') : '_root';
  const tag = basename(file, '.html');

  const titleTag = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || tag;
  const pageTitle = stripTags(titleTag).replace(/\s*·\s*IS Web Components\s*$/i, '').trim() || tag;
  const description =
    ((html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || [])[1] || '').trim() || undefined;

  const storageKey =
    ((html.match(/<is-main[^>]*storage-key="([^"]+)"/i) || [])[1] || `docs-${tag}`).trim();

  // Estilos locales del body/preview (todos los <style> del archivo)
  const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((x) => x[1].trim())
    .filter(Boolean)
    .join('\n\n');

  // Contenido principal
  let mainInner = '';
  const mainM = html.match(/<is-main\b[^>]*>([\s\S]*?)<\/is-main>/i);
  if (mainM) mainInner = mainM[1];
  else {
    const bodyM = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    mainInner = bodyM ? bodyM[1] : html;
    // quitar scripts del body dump
    mainInner = mainInner.replace(/<script[\s\S]*?<\/script>/gi, '');
  }

  /** @type {import('../src/previews/_kit/types.d.ts').PreviewSection[]} */
  const sections = [];
  const secRe = /<section\b([^>]*)>([\s\S]*?)<\/section>/gi;
  let sm;
  while ((sm = secRe.exec(mainInner)) !== null) {
    const attrs = sm[1] || '';
    if (!/\bsection\b/.test(attrs) && !/\bid=/.test(attrs)) {
      // aún así aceptar sections con id
    }
    const id =
      ((attrs.match(/\bid=["']([^"']+)["']/) || [])[1] || `section-${sections.length + 1}`).trim();
    const parsed = parseSectionInner(sm[2]);
    if (!parsed.title) parsed.title = id;
    sections.push({
      id,
      title: parsed.title,
      ...(parsed.titleHtml ? { titleHtml: true } : {}),
      ...(parsed.lede ? { lede: parsed.lede } : {}),
      blocks: parsed.blocks,
    });
  }

  // Sin sections: un bloque html con todo el main
  if (!sections.length) {
    const cleaned = mainInner
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<aside[\s\S]*?<\/aside>/gi, '')
      .trim();
    sections.push({
      id: 'main',
      title: pageTitle.startsWith('<') ? pageTitle : `<${tag}>`,
      titleHtml: true,
      blocks: cleaned ? [{ kind: 'html', html: cleaned }] : [],
    });
  }

  // Scripts module inline → behavior
  const scripts = [...html.matchAll(/<script\s+type="module">([\s\S]*?)<\/script>/gi)].map((x) =>
    x[1].trim(),
  );
  // Ignorar scripts que solo importan el preview host (shells finos)
  const realScripts = scripts.filter(
    (s) =>
      !/is-preview-component/.test(s) ||
      s.length > 400 ||
      /addEventListener|querySelector|getElementById/.test(s),
  );
  // Shells que solo hacen `host.preview = new …` no aportan behavior post-JSON
  const behaviorScripts = realScripts.filter(
    (s) => !/new\s+\w+Preview\s*\(/.test(s) || /addEventListener/.test(s),
  );

  // Si ya hay .preview.js con mount, generar behavior desde él más abajo
  const previewJsPath = filePath.replace(/\.html$/, '.preview.js');
  let hasBehavior = behaviorScripts.length > 0;

  /** @type {import('../src/previews/_kit/types.d.ts').PreviewDefinition} */
  const def = {
    $schema: 'is-preview/v1',
    tag,
    category: category === '_root' ? '' : category,
    title: sections[0]?.titleHtml ? sections[0].title : pageTitle.includes('<') ? pageTitle : tag.startsWith('is-') ? `<${tag}>` : pageTitle,
    titleHtml: true,
    ...(description ? { description } : {}),
    ...(styles ? { styles } : {}),
    storageKey,
    ...(hasBehavior ? { hasBehavior: true } : {}),
    sections,
  };

  // Prefer title from first section if looks like component tag
  if (sections[0]?.title) {
    def.title = sections[0].title;
    def.titleHtml = !!sections[0].titleHtml || /</.test(sections[0].title);
  }

  return {
    tag,
    category: def.category,
    def,
    behaviorScripts,
    previewJsPath,
    hasBehavior,
    relJson: category === '_root' ? `${tag}.json` : `${category}/${tag}.json`,
  };
}

function wrapBehavior(tag, scriptBodies) {
  const body = scriptBodies.join('\n\n');
  // Extraer imports al tope
  const importLines = [];
  let rest = body.replace(/^(\s*import\s[\s\S]*?;\s*)+/m, (m) => {
    importLines.push(m.trim());
    return '';
  });
  // también imports sueltos línea a línea
  const lines = rest.split('\n');
  const kept = [];
  for (const line of lines) {
    if (/^\s*import\s/.test(line)) importLines.push(line.trim());
    else kept.push(line);
  }
  rest = kept.join('\n').trim();

  return `${importLines.join('\n')}${importLines.length ? '\n\n' : ''}/**
 * Behavior migrado desde HTML inline de ${tag}.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
${rest
  .split('\n')
  .map((l) => (l ? `  ${l}` : ''))
  .join('\n')}
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
`;
}

/** Convert existing *.preview.js (class) → behavior mount extracting mount body is hard;
 *  instead keep importing the class as behavior adapter. */
function wrapPreviewClassBehavior(tag, previewJsRel) {
  return `/**
 * Behavior adapter: reusa mount() de la clase legacy ${tag}.preview.js
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 * @param {import('../_kit/types.d.ts').ISComponentPreviewLike} preview
 */
import PreviewClass from '${previewJsRel}';

export async function mount(ctx, preview) {
  const inst = new PreviewClass();
  // La definition ya viene del JSON; solo reutilizar mount de la clase.
  await inst.mount(ctx);
  preview.__legacy = inst;
}

export function unmount(ctx, preview) {
  preview.__legacy?.unmount?.(ctx);
}
`;
}

// ── run ──────────────────────────────────────────────────────────────
mkdirSync(behaviorsRoot, { recursive: true });
const htmlFiles = walkHtml(previewsRoot);
const catalog = {};
let converted = 0;
let behaviors = 0;

for (const filePath of htmlFiles) {
  const html = readFileSync(filePath, 'utf8');
  const result = convertFile(html, filePath);
  const { tag, def, behaviorScripts, previewJsPath, relJson } = result;

  // button-group y cualquier *.preview.js existente: la definition vive en la clase
  if (existsSync(previewJsPath)) {
    try {
      const mod = await import(pathToFileURL(previewJsPath).href);
      const Ctor = mod.default;
      const inst = new Ctor();
      const fromClass = inst.definition;
      Object.assign(def, {
        title: fromClass.title,
        titleHtml: fromClass.titleHtml,
        description: fromClass.description ?? def.description,
        styles: fromClass.styles ?? def.styles,
        storageKey: fromClass.storageKey ?? def.storageKey,
        sections: fromClass.sections,
      });
      // strip non-serializable if any
      def.$schema = 'is-preview/v1';
      def.tag = tag;
      def.category = result.category;
    } catch (err) {
      console.warn(`  warn: no se pudo leer definition de ${previewJsPath}:`, err.message);
    }
    def.hasBehavior = true;
    const fixedRel = `../${relative(previewsRoot, previewJsPath).split(sep).join('/')}`;
    const behFixed = wrapPreviewClassBehavior(tag, fixedRel);
    if (!dry) writeFileSync(join(behaviorsRoot, `${tag}.js`), behFixed, 'utf8');
    behaviors++;
  } else if (behaviorScripts.length) {
    def.hasBehavior = true;
    if (!dry) writeFileSync(join(behaviorsRoot, `${tag}.js`), wrapBehavior(tag, behaviorScripts), 'utf8');
    behaviors++;
  }

  const outJson = join(previewsRoot, relJson);
  if (!dry) {
    mkdirSync(dirname(outJson), { recursive: true });
    writeFileSync(outJson, `${JSON.stringify(def, null, 2)}\n`, 'utf8');
  }
  catalog[tag] = {
    json: `./${relJson}`,
    ...(def.hasBehavior ? { behavior: `./behaviors/${tag}.js` } : {}),
    category: def.category || '',
  };
  converted++;
}

const catalogJs = `/**
 * AUTO-GENERADO por scripts/migrate-previews-to-json.mjs — no editar a mano.
 * tag → { json, behavior?, category }
 */
export default ${JSON.stringify(catalog, null, 2)};
`;

if (!dry) {
  writeFileSync(join(previewsRoot, 'catalog.js'), catalogJs, 'utf8');
  // borrar HTML excepto _shell
  for (const filePath of htmlFiles) {
    unlinkSync(filePath);
  }
}

console.log(
  `${dry ? 'DRY ' : ''}migrate-previews: ${converted} JSON, ${behaviors} behaviors, catalog keys=${Object.keys(catalog).length}`,
);
if (!dry) console.log('HTML de previews eliminados (queda _shell.html).');
