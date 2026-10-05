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

const MARKER = 'iswc-auto-rereload v2: backoff';
// Compat: la v1 usaba otro marker. Si está, lo reemplazamos.
const MARKER_V1 = 'iswc-auto-reload: do not remove';

const SNIPPET = `<script>
/* ${MARKER} — polling client agnóstico del static server
 * W17: backoff exponencial + readyState wait + giveup tras MAX_FAILS fallos
 * consecutivos. Evita el loop infinito de reload-pin que vimos con Live
 * Server 5505 cuando el endpoint no responde. */
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
  var interval = 1500;          // arranca en 1.5s
  var MAX_INTERVAL = 30000;     // tope: 30s
  var MAX_FAILS = 6;            // tras 6 fallos consecutivos sin dev-server, dar up
  var fails = 0;
  var timer = 0;

  function poll() {
    if (!pinUrl) return;
    fetch(pinUrl, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw 0;
        return r.text();
      })
      .then(function (h) {
        h = h.trim();
        fails = 0;
        if (interval !== 1500) interval = 1500; // reset a 1.5s en éxito
        if (last !== null && last !== h) {
          location.reload();
          return;
        }
        last = h;
        schedule();
      })
      .catch(function () {
        fails++;
        if (fails >= MAX_FAILS) {
          // Sin dev-server o server muerto: dejar de gastar batería.
          if (timer) clearTimeout(timer);
          return;
        }
        // Backoff exponencial: 1.5s → 3s → 6s → 12s → 24s → 30s.
        interval = Math.min(interval * 2, MAX_INTERVAL);
        schedule();
      });
  }
  function schedule() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(poll, interval);
  }
  function probe(i) {
    if (i >= tries.length) return; // sin dev-server activo, no hacer nada
    fetch(tries[i], { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw 0;
        pinUrl = tries[i];
        last = null;
        schedule();
      })
      .catch(function () { probe(i + 1); });
  }
  // Esperar a que la página esté lista antes de empezar (no quemar el
  // primer frame de CPU + red en una página que aún no pintó).
  function start() {
    if (document.readyState === 'complete') probe(0);
    else window.addEventListener('load', function () { probe(0); }, { once: true });
  }
  start();
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
  // Si ya tiene la v2, skip.
  if (html.includes(MARKER)) {
    return { file, status: 'skip', reason: 'ya tiene v2' };
  }
  // Si tiene v1, reemplazar el bloque v1 por la v2.
  let work = html;
  if (html.includes(MARKER_V1)) {
    work = work.replace(
      new RegExp(
        `<script>\\s*/\\*\\s*${MARKER_V1}[\\s\\S]*?</script>`,
        'm',
      ),
      SNIPPET.trimEnd(),
    );
    await writeFile(file, work, 'utf8');
    return { file, status: 'replaced-v1' };
  }
  let updated = work.replace(/<\/body>/i, SNIPPET + '</body>');
  if (updated !== work) {
    await writeFile(file, updated, 'utf8');
    return { file, status: 'ok', kind: '</body>' };
  }
  updated = work.replace(/<\/html>/i, SNIPPET + '</html>');
  if (updated !== work) {
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
    // Dry-run output uses v2 marker.
    void MARKER_V1;
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