/**
 * Verificación manual del Phase V7 hook — emitFichaWarnings.
 *
 * Carga el bridge transpilado con esbuild, lo ejecuta con varias
 * definiciones (modo A, modo B, ficha limpia, ficha con exclude) y
 * captura los console.warn que produce el hook.
 *
 * Uso:
 *   node .audit/phase-v7-hook-verify.mjs
 *
 * Sale con exit 0 si el hook emite exactamente lo esperado (sin warns
 * extra ni misses). El .audit/ está en .gitignore local del WIP branch,
 * por lo que este script no se commitea.
 */
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO = process.cwd();
const ENTRY = join(REPO, 'src', 'previews', '_kit', 'ficha-bridge.ts');

const tmp = await mkdtemp(join(tmpdir(), 'phase-v7-hook-'));
const out = join(tmp, 'bridge.mjs');
const origWarn = console.warn;
try {
  await build({
    entryPoints: [ENTRY],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'es2022',
    outfile: out,
    sourcemap: 'inline',
    logLevel: 'silent',
  });

  const mod = await import(pathToFileURL(out).href);
  const { loadFichaLikeDefinition, emitFichaWarnings } = mod;

  const warnings = [];
  console.warn = (...args) => { warnings.push(args.map(String).join(' ')); };

  function reset() { warnings.length = 0; }
  function asserts(label, expects) {
    const got = warnings.length;
    const ok = got === expects;
    const dump = warnings.length ? `\n    >> ${warnings.join('\n    >> ')}` : '';
    console.log(`  ${ok ? '✓' : '✗'} ${label} → ${got} warn(s)${ok ? '' : ` (esperaba ${expects})${dump}`}`);
    if (!ok) process.exitCode = 1;
  }

  console.log('# Phase V7 hook — emitFichaWarnings smoke');

  // ── Caso 1: ficha modo A con 1 spurious-exclude ──
  reset();
  loadFichaLikeDefinition({
    $schema: 'iswc-ficha/v1',
    tag: 'iswc-smoke-a',
    sections: {
      anatomia: { content: 'texto anatomia' },
      atributos: { table: [{ name: 'foo', type: 'string' }] },
      slots: { table: [{ slot: 'default' }] },
    },
    exclude: ['parts'],
  });
  asserts('modo A: 1 spurious-exclude (parts)', 1);

  // ── Caso 2: ficha modo B (sub-objeto `ficha:`) con secciones vacías ──
  reset();
  loadFichaLikeDefinition({
    $schema: 'iswc-preview/v1',
    tag: 'iswc-smoke-b',
    sections: [{ id: 'intro', blocks: [] }],
    ficha: {
      sections: {
        anatomia: { content: 'anatomia' },
        slots: { table: [{ slot: 'default' }] },
      },
    },
  });
  asserts('modo B: 7 missing', 1); // un único warn consolidado

  // ── Caso 3: ficha limpia (todo cubierto) → silencio ──
  reset();
  loadFichaLikeDefinition({
    $schema: 'iswc-ficha/v1',
    tag: 'iswc-smoke-clean',
    exclude: [],
    sections: {
      anatomia: { content: 'a' },
      atributos: { table: [{ name: 'x' }] },
      props: { table: [{ name: 'x', type: 'string' }] },
      states: { table: [{ state: 'x', cuando: 'y' }] },
      eventos: { table: [{ evento: 'x', cuando: 'y' }] },
      slots: { table: [{ slot: 'x' }] },
      parts: { table: [{ part: 'x' }] },
      apiJs: { table: [{ metodo: 'x' }] },
      ejemplos: { content: 'e' },
    },
  });
  asserts('ficha completa → silencio', 0);

  // ── Caso 4: hook directo, sin pasar por loadFichaLikeDefinition ──
  reset();
  emitFichaWarnings('iswc-direct-hook', {
    sections: {}, // todo missing
    exclude: [],
  });
  asserts('hook directo → 1 warn con 9 missing', 1);
  console.log('    >> muestra warn (caso 4):', warnings[warnings.length - 1]);

  // ── Caso 5: shape passthrough → sin warn ──
  reset();
  loadFichaLikeDefinition({
    $schema: 'iswc-preview/v1',
    tag: 'iswc-passthrough',
    sections: [{ id: 'intro', blocks: [] }],
  });
  asserts('iswc-preview/v1 puro → silencio', 0);

  if (process.exitCode) {
    console.error('\nphase-v7-hook smoke: FAIL');
  } else {
    console.log('\nphase-v7-hook smoke: PASS');
  }
} finally {
  console.warn = origWarn;
  await rm(tmp, { recursive: true, force: true });
}