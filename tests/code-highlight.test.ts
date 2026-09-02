/**
 * code-highlight.test.ts — invariantes del motor nativo de resaltado
 * (sustituto de CodeMirror en <is-code>). No toca DOM ni CM: puro Node.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  tokenizeCode, normalizeLang, diffLineClass, lineToHtml, emptyState, tokensToText,
} from '../src/components/_shared/code-highlight.ts';

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

console.log('code-highlight.test.ts: PASS — motor nativo');
