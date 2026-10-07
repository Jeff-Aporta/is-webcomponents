#!/usr/bin/env -S deno run -A --no-check --sloppy-imports
// scripts/render-labs.mjs — re-render COMPLETO del lote de diagramas.
//
// Regla (Jeff 2026-10-07): tras cualquier ajuste de diagramas se re-renderiza
// TODO el lote, para detectar regresiones que un cambio cause en otros
// diagramas. Nada de renders sueltos a mano.
//
// Pasos (aborta con exit != 0 si alguno falla tras reintentar):
//   1. `deno task build` del kit (los labs y el ISS cargan dist/cdn).
//   2. Sincroniza `labs/iss-ayudascpia-secuencias/payloads/` desde los
//      editables del ISS (docs-experimental/diagramas), si el ISS existe.
//   3. Corre `render.mjs` de CADA carpeta de `labs/` (descubiertas, no listadas
//      a mano), con hasta 3 intentos (Chromium a veces no arranca). Un intento
//      solo cuenta si TODOS los SVG de su `out/` quedaron reescritos.
//   4. En el ISS: `npm run docs:diagramas` + `npm run docs:publicar`.
//
// Uso:
//   deno task labs:render            # todo
//   deno task labs:render --sin-iss  # solo labs del kit
//   ISS_DIR=<ruta> deno task labs:render
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const KIT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LABS = join(KIT, 'labs');
const ISS = resolve(process.env.ISS_DIR || join(KIT, '..', '..', '..', 'PatyIA', '_experimental', 'ISS-AyudasCPIA'));
const sinIss = process.argv.includes('--sin-iss');
const win = process.platform === 'win32';
const resumen = [];

/** SVG de `dir` que NO se reescribieron desde `t0` (un rc=0 no basta: el lote debe quedar completo). */
function viejos(dir, t0, esperados = null) {
  if (!dir || !existsSync(dir)) return [];
  const svgs = esperados ?? readdirSync(dir).filter((f) => f.endsWith('.svg'));
  return svgs.filter((f) => !existsSync(join(dir, f)) || statSync(join(dir, f)).mtimeMs < t0 - 1000);
}

function correr(label, cmd, args, cwd, intentos = 1, outDir = null, esperados = null) {
  for (let i = 1; i <= intentos; i++) {
    const t0 = Date.now();
    const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: win });
    const sinRegenerar = r.status === 0 ? viejos(outDir, t0, esperados) : [];
    if (sinRegenerar.length) console.warn(`[render-labs] ${label}: sin regenerar: ${sinRegenerar.join(', ')}`);
    const ok = r.status === 0 && !sinRegenerar.length;
    if (ok || i === intentos) {
      resumen.push({ label, ok, ms: Date.now() - t0, intentos: i });
      if (!ok) {
        imprimir();
        console.error(`[render-labs] FALLO: ${label} (rc=${r.status})`);
        process.exit(r.status || 2);
      }
      return;
    }
    console.warn(`[render-labs] ${label}: intento ${i} falló, reintento…`);
  }
}

function imprimir() {
  console.log('\n[render-labs] resumen');
  for (const s of resumen) console.log(`  ${s.ok ? 'OK  ' : 'FAIL'} ${s.label.padEnd(48)} ${s.ms} ms${s.intentos > 1 ? ` (${s.intentos} intentos)` : ''}`);
}

// 1) build
correr('build del kit', 'deno', ['task', 'build'], KIT);

// 2) payloads de secuencias desde el ISS
const editables = join(ISS, 'docs-experimental', 'diagramas');
const payloadsSec = join(LABS, 'iss-ayudascpia-secuencias', 'payloads');
if (existsSync(editables) && existsSync(payloadsSec)) {
  let n = 0;
  for (const f of readdirSync(payloadsSec).filter((x) => x.endsWith('.json'))) {
    const src = join(editables, f);
    if (existsSync(src)) { copyFileSync(src, join(payloadsSec, f)); n++; }
  }
  resumen.push({ label: `payloads de secuencias sincronizados (${n})`, ok: true, ms: 0, intentos: 1 });
}

// 3) cada lab
const labs = existsSync(LABS)
  ? readdirSync(LABS).filter((d) => statSync(join(LABS, d)).isDirectory() && existsSync(join(LABS, d, 'render.mjs'))).sort()
  : [];
for (const lab of labs) {
  correr(`lab ${lab}`, 'deno', ['run', '-A', '--no-check', '--sloppy-imports', 'render.mjs'], join(LABS, lab), 3, join(LABS, lab, 'out'));
}

// 4) ISS
if (!sinIss && existsSync(join(ISS, 'package.json'))) {
    // Un SVG por editable (docs-experimental/diagramas/*.json); otros archivos
  // de la carpeta de salida no son del lote.
  const slugs = existsSync(editables) ? readdirSync(editables).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '.svg')) : null;
  correr('ISS docs:diagramas', 'npm', ['run', 'docs:diagramas'], ISS, 2, join(ISS, 'docs-experimental', 'gen', 'diagrams', 'iswc', 'svg'), slugs);
  correr('ISS docs:publicar', 'npm', ['run', 'docs:publicar'], ISS);
} else if (!sinIss) {
  resumen.push({ label: `ISS no encontrado en ${ISS} (omitido)`, ok: true, ms: 0, intentos: 1 });
}

imprimir();
console.log('[render-labs] lote completo en verde.');
