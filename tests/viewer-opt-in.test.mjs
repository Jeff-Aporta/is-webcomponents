// tests/viewer-opt-in.test.mjs
//
// El visor a pantalla completa es OPT-IN: por defecto un componente no abre
// nada al hacer clic. Solo lo hace si el consumidor pone `open-on-click`.
//
// Antes era al reves (`without-viewer` desactivaba un visor que venia
// encendido), asi que cualquier chart o diagrama secuestraba el clic del
// usuario sin que nadie lo pidiera. Este test vigila que no se vuelva atras:
//
//   1. No queda rastro del atributo viejo `without-viewer`.
//   2. Todo componente que sepa abrir el visor (`#openOwnViewer`) exige
//      `open-on-click` antes de abrirlo.
//   3. El `cursor: zoom-in` esta condicionado a `open-on-click`: sin visor no
//      se debe insinuar que el elemento es clicable.
//
// Uso:  node tests/viewer-opt-in.test.mjs

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
};

const rel = (f) => relative(root, f).split(sep).join('/');
const failures = [];

// ── 1. El atributo viejo no debe sobrevivir en ningun lado ──────────
const scanned = [
  ...walk(join(root, 'src', 'components')),
  ...walk(join(root, 'src', 'previews')),
  join(root, 'index.html'),
].filter((f) => /\.(js|css|html|md)$/.test(f));

// LLM.md documenta los errores pasados por su nombre: ahi el atributo viejo
// tiene que poder mencionarse, o no se puede explicar que se dejo de hacer.
const NARRA_HISTORIA = new Set(['src/components/LLM.md']);

for (const f of scanned) {
  if (NARRA_HISTORIA.has(rel(f))) continue;
  if (readFileSync(f, 'utf8').includes('without-viewer')) {
    failures.push(`${rel(f)}: sigue usando \`without-viewer\`; el atributo ahora es \`open-on-click\` (opt-in)`);
  }
}

// ── 2. Quien pueda abrir el visor debe exigir el opt-in ─────────────
const conVisor = scanned.filter((f) => f.endsWith('.js') && readFileSync(f, 'utf8').includes('#openOwnViewer'));

if (!conVisor.length) failures.push('ningun componente define #openOwnViewer — el escaneo no esta mirando donde debe');

for (const f of conVisor) {
  const src = readFileSync(f, 'utf8');
  // La llamada solo puede ocurrir tras comprobar el atributo.
  if (!/hasAttribute\(\s*['"]open-on-click['"]\s*\)/.test(src)) {
    failures.push(`${rel(f)}: abre el visor sin comprobar \`open-on-click\` — el visor volveria a venir encendido por defecto`);
  }
}

// ── 3. El cursor no debe prometer un visor apagado ──────────────────
const cssConZoom = scanned.filter((f) => f.endsWith('.css') && /cursor:\s*zoom-in/.test(readFileSync(f, 'utf8')));

for (const f of cssConZoom) {
  const src = readFileSync(f, 'utf8');
  for (const [, selector] of src.matchAll(/([^{}]*)\{[^{}]*cursor:\s*zoom-in[^{}]*\}/g)) {
    const sel = selector.trim().split('\n').pop().trim();
    if (!sel.includes('open-on-click')) {
      failures.push(
        `${rel(f)}: \`cursor: zoom-in\` en "${sel}" no esta condicionado a `
        + '`open-on-click` — insinua un clic que no abre nada',
      );
    }
  }
}

if (failures.length) {
  console.log('FAIL:');
  for (const f of [...new Set(failures)]) console.log(`  - ${f}`);
  process.exit(1);
}

console.log(
  `viewer-opt-in.test.mjs: PASS — ${conVisor.length} componentes con visor, todos opt-in; `
  + `${cssConZoom.length} hojas con cursor zoom-in, todas condicionadas`,
);
process.exit(0);
