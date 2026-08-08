/**
 * Genera src/previews/data/shared-modules.json con TODOS los módulos de
 * src/components/_shared/ (sin ocultar ninguno). Lo consume el preview
 * «Ecosistema JS».
 *
 * Uso: node scripts/gen-shared-index.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'src/components/_shared');
const outDir = path.join(root, 'src/previews/data');
const outFile = path.join(outDir, 'shared-modules.json');

/** Primera frase útil del bloque de comentario inicial. */
function summarize(src, file) {
  const m = src.match(/^\/\*\*?([\s\S]*?)\*\//);
  if (!m) return `Módulo compartido \`${file}\`.`;
  const lines = m[1]
    .split('\n')
    .map((l) => l.replace(/^\s*\*\s?/, '').trim())
    .filter((l) => l && !l.startsWith('@') && !/^[=─-]{3,}/.test(l));
  const title = lines[0]?.replace(/\.js\s*[—–-].*/, '').trim() || file;
  const body = lines.slice(1).find((l) => l.length > 20) || lines[1] || '';
  return body ? `${title} — ${body}` : title;
}

const files = fs.readdirSync(dir)
  .filter((f) => f.endsWith('.js'))
  .sort((a, b) => a.localeCompare(b));

const modules = files.map((file) => {
  const src = fs.readFileSync(path.join(dir, file), 'utf8');
  const exports = [...src.matchAll(/^export\s+(?:async\s+)?(?:function|class|const|let|\{)\s*([A-Za-z0-9_,\s{}*]+)/gm)]
    .map((m) => m[1].replace(/[{}]/g, '').split(',').map((s) => s.trim().split(/\s+as\s+/).pop()).filter(Boolean))
    .flat()
    .filter((n) => n && n !== 'default')
    .slice(0, 12);

  return {
    file,
    id: file.replace(/\.js$/, ''),
    path: `src/components/_shared/${file}`,
    summary: summarize(src, file),
    bytes: Buffer.byteLength(src, 'utf8'),
    exports: [...new Set(exports)],
  };
});

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify({ generatedAt: new Date().toISOString(), count: modules.length, modules }, null, 2)}\n`);
console.log(`shared-modules.json: ${modules.length} módulos → ${path.relative(root, outFile)}`);
