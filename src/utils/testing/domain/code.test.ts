/**
 * code.test.ts — invariantes del motor de código: resaltado nativo (highlight),
 * inferencia de lenguaje y softFormat. Consolidación de code-highlight, code-infer-lang
 * y soft-format en un solo archivo robusto.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  tokenizeCode, normalizeLang, diffLineClass, lineToHtml, emptyState, tokensToText,
} from '../../../components/_shared/code-highlight.ts';
import { inferLanguage, resolveLanguage } from '../../../components/_shared/code-langs.ts';
import { softFormat, softFormatMode } from '../../../components/_shared/code-text.ts';
import { formatCode } from '../../../components/_shared/code-format.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const hl = await import(pathToFileURL(join(root, 'src/components/_shared/highlight-code.ts')).href);
const typesOf = (tokens) => tokens.map((t) => t.type);

test('normalizeLang mapea alias legacy', () => {
  assert.equal(normalizeLang('htmlmixed'), 'html');
  assert.equal(normalizeLang('js'), 'javascript');
  assert.equal(normalizeLang('ts'), 'typescript');
  assert.equal(normalizeLang('python'), 'plaintext');
  assert.equal(normalizeLang('py'), 'plaintext');
  assert.equal(normalizeLang('bash'), 'shell');
  assert.equal(normalizeLang('git'), 'diff');
  assert.equal(normalizeLang(''), 'javascript');
  assert.equal(normalizeLang(null), 'javascript');
  assert.equal(normalizeLang('patata'), 'javascript');
});

test('javascript: keywords, strings, números, comentarios y operadores', () => {
  const { lines, lang } = tokenizeCode('const n = 42; // tope\nlet s = "hola";', 'javascript');
  assert.equal(lang, 'javascript');
  assert.equal(lines.length, 2);
  const t0 = typesOf(lines[0].tokens);
  assert.ok(t0.includes('keyword'), 'const debe ser keyword');
  assert.ok(t0.includes('number'), '42 debe ser number');
  assert.ok(t0.includes('comment'), '// tope debe ser comment');
  const t1 = typesOf(lines[1].tokens);
  assert.ok(t1.includes('string'), '"hola" debe ser string');
  assert.equal(tokensToText(lines[0].tokens), 'const n = 42; // tope');
});

test('javascript: template literal y comentario bloque multilínea cruzan líneas', () => {
  const a = tokenizeCode('const t = `linea', 'javascript');
  assert.ok(typesOf(a.lines[0].tokens).includes('string'), 'apertura template = string');
  assert.equal(a.state.template, true, 'el estado guarda el template abierto');
  const b = tokenizeCode('siguiente`;', 'javascript', a.state);
  assert.ok(typesOf(b.lines[0].tokens).includes('string'), 'cierre template en línea 2');
  assert.equal(b.state.template, false);

  const c = tokenizeCode('/* abre', 'javascript');
  assert.equal(c.state.inComment, true);
  const d = tokenizeCode('cierra */', 'javascript', c.state);
  assert.equal(typesOf(d.lines[0].tokens).includes('comment'), true, 'resto del comentario');
  assert.equal(d.state.inComment, false);
});

test('html: tag + atributo + string; regiones script/style tokenizadas como js/css', () => {
  const { lines } = tokenizeCode('<button class="x" @click="go">OK</button>', 'html');
  const flat = lines.flatMap((l) => l.tokens);
  const types = typesOf(flat);
  assert.ok(types.includes('tag'), 'nombre del tag');
  assert.ok(types.includes('string'), 'valor del atributo');
  assert.ok(!types.includes('keyword'), 'texto plano no se pinta como código');

  const js = tokenizeCode('<script>\nconst a = 1;\n</script>', 'html');
  assert.ok(typesOf(js.lines[1].tokens).includes('keyword'), 'dentro de <script> se tokeniza js');
  assert.equal(js.state.region, null, 'la región se cierra con </script>');

  const css = tokenizeCode('<style>\n.foo { color: red; }\n</style>', 'html');
  assert.ok(typesOf(css.lines[1].tokens).includes('variable'), 'selector css');
});

test('css: propiedad, atom y comentario', () => {
  const { lines } = tokenizeCode('a {\n  color: red;\n  /* nota */\n}', 'css');
  const t1 = typesOf(lines[1].tokens);
  assert.ok(t1.includes('property') || t1.includes('atom'), 'valor de propiedad');
  assert.ok(typesOf(lines[2].tokens).includes('comment'), 'comentario css');
});

test('diff: clase de línea por banda y tokens', () => {
  assert.equal(diffLineClass('@@ -1,3 +1,4 @@'), 'is-diff-line-hunk');
  assert.equal(diffLineClass('+hola'), 'is-diff-line-add');
  assert.equal(diffLineClass('-chau'), 'is-diff-line-del');
  assert.equal(diffLineClass('diff --git a/x b/x'), 'is-diff-line-file');
  const { lines } = tokenizeCode('@@ -1 +1 @@\n+agregado\n normal\n', 'diff');
  assert.equal(lines[0].lineClass, 'is-diff-line-hunk');
  assert.equal(lines[1].lineClass, 'is-diff-line-add');
  assert.equal(lines[2].lineClass, null);
});

test('shell: comentario y variable', () => {
  const { lines } = tokenizeCode('#!/bin/sh\nNAME="x"\necho $NAME # nota', 'shell');
  assert.ok(typesOf(lines[0].tokens).includes('comment'), 'shebang = comentario');
  assert.ok(typesOf(lines[2].tokens).includes('atom'), '$NAME variable');
});

test('seguridad: lineToHtml escapa y reconstruye el texto', () => {
  const { lines } = tokenizeCode('if (a < b && c > "&") { x = 1; }', 'javascript');
  const html = lines.map((l) => lineToHtml(l.tokens)).join('\n');
  assert.ok(!html.includes('<b &&'), 'no debe quedar < crudo');
  assert.ok(html.includes('&lt;'), 'escapa <');
  assert.equal(tokensToText(lines[0].tokens), 'if (a < b && c > "&") { x = 1; }');
});

test('estado vacío no se muta entre llamadas', () => {
  const st = emptyState();
  tokenizeCode('/* x', 'javascript', st);
  assert.equal(st.inComment, false, 'tokenizeCode clona el estado de entrada');
});

test('HTML de demos se infiere como html (no javascript)', () => {
  const snippet = '<is-button color="success">Aprobado</is-button>\n'
    + '<is-button color="danger" variant="outlined">Eliminar</is-button>';
  assert.equal(inferLanguage(snippet), 'html');
});

test('curl se infiere como shell', () => {
  assert.equal(
    inferLanguage('curl -X PUT \'https://api.example/api/x\' \\\n  -H \'Authorization: Bearer TOKEN\''),
    'shell',
  );
});

test('JS se sigue infiriendo como javascript', () => {
  assert.equal(inferLanguage('const x = 1;\nexport function f() {}'), 'javascript');
});

test('CSS se infiere como css', () => {
  assert.equal(inferLanguage(':root { --x: 1; }\n.foo { color: red; }'), 'css');
});

test('softFormat separa tags HTML en líneas', () => {
  const raw = '<is-button color="success">Aprobado</is-button> <is-button color="danger">X</is-button>';
  const out = softFormat(raw, softFormatMode('html'));
  assert.match(out, /\n/);
  assert.match(out, /is-button/);
});

test('alias curl resuelve al lenguaje shell', () => {
  assert.equal(resolveLanguage('curl')?.id, 'shell');
  assert.equal(resolveLanguage('bash')?.id, 'shell');
});

test('formatCode no reescribe un cURL', () => {
  const curl = 'curl -X PUT \'https://x/api\' \\\n  -d \'{"a":1}\'';
  assert.equal(formatCode(curl, 'curl'), curl);
  assert.equal(formatCode(curl, 'shell'), curl);
});

test('unwrapHandHighlight quita el coloreado a mano de la migración', () => {
  const dirty = '<span class="tag"><button</span> <span class="attr">part</span>=<span class="val">"button"</span><span class="tag">></span>';
  assert.equal(hl.unwrapHandHighlight(dirty), '<button part="button">');
});

test('softFormat expande anidación HTML en la misma línea', () => {
  const src = '<button class="btn"><span part="start"><slot name="start"></slot></span></button>';
  const out = hl.softFormat(src, 'htmlmixed');
  const lines = out.split('\n');
  assert.ok(lines.length >= 5, `esperaba varias líneas, got:\n${out}`);
  assert.match(lines[0], /^<button/);
  assert.match(lines[1], /^  <span/);
  assert.match(lines[2], /^    <slot/);
  assert.match(lines.at(-1), /^<\/button>/);
});

test('softFormat no aplana HTML ya bien indentado sin anidación inline', () => {
  const src = '<div>\n  <p>hola</p>\n</div>';
  assert.equal(hl.softFormat(src, 'htmlmixed'), src);
});

test('softFormat repara el markup a mano de anatomy y lo indenta', () => {
  const dirty = [
    '<span class="tag"><button</span> <span class="attr">part</span>=<span class="val">"button"</span> <span class="attr">class</span>=<span class="val">"btn"</span><span class="tag">></span>',
    '  <span class="tag"><span</span> <span class="attr">part</span>=<span class="val">"start"</span> <span class="attr">class</span>=<span class="val">"btn__prefix"</span><span class="tag">></span><span class="tag"><slot</span> <span class="attr">name</span>=<span class="val">"start"</span><span class="tag">></slot></span></span>',
    '<span class="tag"></button></span>',
  ].join('\n');
  const out = hl.softFormat(dirty, 'htmlmixed');
  assert.doesNotMatch(out, /class="tag"/);
  assert.match(out, /<button part="button" class="btn">/);
  assert.match(out, /^\s+<span part="start"/m);
  assert.match(out, /^\s+<slot name="start">/m);
});

test('sin cm-error en el docs: el rojo de CodeMirror ya no existe (motor nativo)', () => {
  const css = readFileSync(join(root, 'src/styles/presentation.css'), 'utf8');
  assert.doesNotMatch(css, /\.cm-error/);
});

test('el highlighter vigila el DOM: nada se queda sin colorear', () => {
  assert.equal(typeof hl.watchDom, 'function', 'falta watchDom');
  assert.equal(typeof hl.repaint, 'function', 'falta repaint');

  const src = readFileSync(join(root, 'src/components/_shared/highlight-code.ts'), 'utf8');
  assert.match(src, /el\.value\s*!==\s*el\.dataset\.cmSource/);
  assert.match(src, /if\s*\(pintando\)\s*return/);
  assert.match(src, /childList:\s*true/);

  const boot = readFileSync(join(root, 'scripts/highlight-pre.js'), 'utf8');
  assert.match(boot, /watchDom\(\)/, 'highlight-pre.js debe arrancar el observer');
});

test('las salidas vivas del docs son pre.code o is-code (paint → editor)', () => {
  const casos = [
    ['src/pages/theming.json', 'cssOut', 'css'],
    ['src/components/forms/rte.json', 'outHTML', 'html'],
    ['src/components/forms/doc-editor.json', 'out', 'javascript'],
  ];
  for (const [archivo, id, lang] of casos) {
    const raw = readFileSync(join(root, archivo), 'utf8');
    const def = JSON.parse(raw);
    const html = (def.sections ?? []).flatMap((s) => s.blocks ?? [])
      .map((b) => b.html).filter((h) => typeof h === 'string').join('\n');
    const tag = html.match(new RegExp(`<(?:pre|is-code)\\b[^>]*id="${id}"[^>]*>`))?.[0];
    assert.ok(tag, `${archivo}: no encontré #${id} (pre o is-code)`);
    assert.match(tag, /class="[^"]*\bcode\b/, `${archivo}#${id}: sin la clase code no se monta el editor`);
    assert.match(tag, new RegExp(`data-lang="${lang}"`), `${archivo}#${id}: falta data-lang="${lang}"`);
  }
});

test('el prompt para agentes del CDN no se tokeniza como markup', () => {
  const src = readFileSync(join(root, 'src/components/feedback/cdn-snippet.ts'), 'utf8');
  assert.match(src, /data-slot="llm-prompt"/);
  assert.match(src, /IS-MD-EDITOR/);
  assert.doesNotMatch(src, /#adoptCodeMirrorCss/);
});
