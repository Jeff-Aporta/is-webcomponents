#!/usr/bin/env node
/**
 * w26-remove-api-source-paragraphs.mjs
 *
 * Phase W26: elimina el párrafo trivial `<p class="lede">API declarada en
 * el módulo fuente <code>...</code>.</p>` de los JSON de sub-componentes.
 * Es un puntero a un .js que ni siquiera existe en este repo (los
 * sub-componentes viven dentro del .js del padre). No aporta información
 * que ya esté en la sección de Referencia del propio JSON.
 *
 * Uso:
 *   node scripts/w26-remove-api-source-paragraphs.mjs [--dry-run]
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const COMPONENTS = join(ROOT, 'src', 'components');

const dryRun = process.argv.includes('--dry-run');

// Los JSON tienen CRLF en el archivo (línea física) pero DENTRO de los
// strings guardan la secuencia literal `\r\n` (4 bytes: backslash,r,backslash,n)
// — escrita por la herramienta de authoring. El regex matchea esa forma
// exacta. "Módulo" se busca con [oó] para tolerar encoding.
const BLOCK_RE = new RegExp(
  '^[ \\t]*\\{[ \\t]*\\r?\\n' +
  '[ \\t]*"kind":[ \\t]*"html",[ \\t]*\\r?\\n' +
  '[ \\t]*"html":[ \\t]*"<p class=\\\\"lede\\\\">\\\\r\\\\n' +
  '[ \\t]*API declarada en el m[oó]dulo fuente\\\\r\\\\n' +
  '[ \\t]*<code class=\\\\"code\\\\">components/[^<]+</code>\\.\\\\r\\\\n' +
  '[ \\t]*</p>"[ \\t]*\\r?\\n' +
  '[ \\t]*\\},?[ \\t]*\\r?\\n',
  'gm',
);

function walk(dir, out = []) {
  for (const ent of readdirSync(dir)) {
    const p = join(dir, ent);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (p.endsWith('.json')) out.push(p);
  }
  return out;
}

let touched = 0;
let removedBlocks = 0;
const samples = [];

for (const file of walk(COMPONENTS)) {
  const rel = relative(ROOT, file);
  const original = readFileSync(file, 'utf8');
  const matches = original.match(BLOCK_RE);
  if (!matches || matches.length === 0) continue;
  const cleaned = original.replace(BLOCK_RE, '');
  if (cleaned === original) continue;
  if (!dryRun) writeFileSync(file, cleaned, 'utf8');
  touched += 1;
  removedBlocks += matches.length;
  if (samples.length < 3) samples.push(rel);
}

console.log(`w26-api-source: ${touched} archivos, ${removedBlocks} párrafos eliminados${dryRun ? ' (dry-run)' : ''}`);
if (samples.length) console.log('  ejemplos:', samples.join(', '));
