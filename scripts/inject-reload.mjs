#!/usr/bin/env node
/**
 * inject-reload.mjs — inyecta el cliente de auto-reload en cada HTML.
 *
 *   node scripts/inject-reload.mjs            # procesa index.html + previews/ + demos/
 *   node scripts/inject-reload.mjs --check    # solo reporta qué inyectaría, sin escribir
 *
 * El cliente embebido hace polling de `dist/cdn/reload-pin` y recarga el
 * browser cuando el watcher (`scripts/watch.mjs`) detecta un cambio. Es
 * agnóstico del static server: deno serve, Live Server, python -m http.server,
 * etc. sirven el mismo HTML y el mismo endpoint.
 *
 * El bloque inyectado lleva un marker (`iswc-auto-reload: do not remove`) y la
 * función es idempotente — re-ejecuciones del injector no duplican el snippet.
 *
 * Si no encuentra `</body>` ni `</html>`, deja el archivo intacto y avisa.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

const MARKER = 'iswc-auto-reload: do not remove';

const SNIPPET = `<script>
/* ${MARKER} — polling client agnóstico del static server */
(function () {
  var tries = [
    'dist/cdn/reload-pin',
    '../dist/cdn/reload-pin',
    '../../dist/cdn/reload-pin',
    '../../../dist/cdn/reload-pin',
    '../../../../dist/cdn/reload-pin'
  ];
  var pinUrl = null;
  var last = null;
  function poll() {
    if (!pinUrl) return;
    fetch(pinUrl, { cache: 'no-store' })
      .then(function (r) { return r.text(); })
      .then(function (h) {
        h = h.trim();
        if (last !== null && last !== h) location.reload();
        last = h;
      })
      .catch(function () {});
  }
  function probe(i) {
    if (i >= tries.length) return; // sin dev-server activo, no hacer nada
    fetch(tries[i], { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw 0;
        pinUrl = tries[i];
        setInterval(poll, 1500);
      })
      .catch(function () { probe(i + 1); });
  }
  probe(0);
})();
</script>
`;

/**
 * Devuelve el relative path al repo root para un archivo dentro del repo.
 * Usado sólo para logging — el cliente embebido resuelve URLs solo.
 */
function rel(file) {
  return relative(root, file).replace(/\\/g, '/');
}

async function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of await readdir(dir, { withFileTypes: true })) {
    if (name.name.startsWith('.')) continue;
    if (name.name === 'node_modules') continue;
    const p = join(dir, name.name);
    if (name.isDirectory()) {
      yield* walk(p);
    } else if (name.isFile() && name.name.toLowerCase().endsWith('.html')) {
      yield p;
    }
  }
}

async function injectFile(file) {
  const html = await readFile(file, 'utf8');
  if (html.includes(MARKER)) {
    return { file, status: 'skip', reason: 'ya tiene el marker' };
  }
  let updated = html.replace(/<\/body>/i, SNIPPET + '</body>');
  if (updated !== html) {
    await writeFile(file, updated, 'utf8');
    return { file, status: 'ok', kind: '</body>' };
  }
  updated = html.replace(/<\/html>/i, SNIPPET + '</html>');
  if (updated !== html) {
    await writeFile(file, updated, 'utf8');
    return { file, status: 'ok', kind: '</html>' };
  }
  return { file, status: 'skip', reason: 'no </body> ni </html>' };
}

async function main() {
  const checkOnly = process.argv.includes('--check');
  const targets = [join(root, 'index.html'), join(root, 'previews'), join(root, 'demos')];

  const files = [];
  for (const t of targets) {
    if (!existsSync(t)) continue;
    const stat = await import('node:fs/promises').then((m) => m.stat(t));
    if (stat.isFile()) files.push(t);
    else for await (const f of walk(t)) files.push(f);
  }

  let injected = 0;
  let skipped = 0;
  const errs = [];

  for (const file of files) {
    if (checkOnly) {
      const html = await readFile(file, 'utf8').catch(() => '');
      const has = html.includes(MARKER);
      console.log(`${has ? '✓' : '✗'} ${rel(file)}`);
      if (has) skipped++; else injected++;
      continue;
    }
    try {
      const r = await injectFile(file);
      if (r.status === 'ok') {
        injected++;
        console.log(`  + ${rel(r.file)}  (antes de ${r.kind})`);
      } else {
        skipped++;
        console.log(`  · ${rel(r.file)}  (${r.reason})`);
      }
    } catch (e) {
      errs.push({ file, err: e });
      console.error(`  ! ${rel(file)}: ${e?.message ?? e}`);
    }
  }

  console.log('');
  if (checkOnly) {
    console.log(`check: ${injected} pendientes, ${skipped} ya listos (de ${files.length}).`);
    process.exit(injected === 0 ? 0 : 1);
  }
  console.log(`inyectados: ${injected}, saltados: ${skipped}, errores: ${errs.length} (de ${files.length}).`);
  if (errs.length) process.exit(1);
}

await main();