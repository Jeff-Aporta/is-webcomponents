/**
 * manifest.ts — regenera `templates/manifest.json` (la lista de plantillas que copia create-iswc-app).
 * Por HTTPS no se puede listar una carpeta: la herramienta lee esta lista.
 *   deno run -A skills/iswc-foundation/tools/manifest.ts           # escribe
 *   deno run -A skills/iswc-foundation/tools/manifest.ts --check   # exit 1 si está desactualizada
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const T = fileURLToPath(new URL('../templates/', import.meta.url));
const listar = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = join(dir, e.name);
  return e.isDirectory() ? listar(p) : [relative(T, p).split('\\').join('/')];
});
const archivos = listar(T).filter((f) => f !== 'manifest.json').sort();
const texto = `${JSON.stringify({ archivos }, null, 2)}\n`;
const ruta = join(T, 'manifest.json');
if (Deno.args.includes('--check')) {
  let actual = '';
  try { actual = readFileSync(ruta, 'utf8'); } catch { /* falta */ }
  if (actual !== texto) {
    console.error('templates/manifest.json desactualizado: deno run -A skills/iswc-foundation/tools/manifest.ts');
    Deno.exit(1);
  }
  console.log(`templates/manifest.json al día (${archivos.length} archivos)`);
} else {
  writeFileSync(ruta, texto);
  console.log(`templates/manifest.json: ${archivos.length} archivos`);
}
