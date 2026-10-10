// vendor-iswc-tools.mjs — copia las herramientas del kit iswc-root al MISMO SHA del pin de la app.
//
//   deno task vendor:iswc            # al SHA de src/js/iswc.ts (pin canonico): raw por SHA, jsDelivr de respaldo
//   deno task vendor:iswc --local    # desde el checkout local del kit (ISWC_LOCAL o rutas por defecto),
//                                    # para probar cambios del kit antes de publicarlos (cabecera +local)
//
// Protocolo: `deno task pin --nuevo=<sha40|ultimo>` sube el pin; despues `deno task vendor:iswc`,
// build y tests. La copia lleva cabecera `@vendor iswc-root@<sha> <origen>` y NO se edita: se cambia
// en el kit y se vuelve a descargar. Un guardian exige vendor == pin.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';

const ROOT = join(import.meta.dirname, '..', '..');
const REPO = '__REPO__';
const pin = readFileSync(join(ROOT, 'src', 'js', 'iswc.ts'), 'utf8').match(/@([0-9a-f]{40})\//)?.[1];
if (!pin) {
  console.error('vendor-iswc: src/js/iswc.ts no declara un pin de 40 hex');
  process.exit(2);
}

/** Herramientas comunes de las apps del kit (pruebas, cooldown, sync, pines) y del build (hashes). */
export const ARCHIVOS = [
  ...['ISTestCooldown.ts', 'ISTestCooldown.schemas.ts', 'ISTestQueue.ts', 'ISPruebas.ts', 'ISPruebas.schemas.ts', 'ISPruebasHijo.ts',
    'ISSyncEntregable.ts', 'ISSyncEntregable.schemas.ts', 'ISPinUpdate.mjs'].map((f) => `tools/${f}`),
  ...['index.ts', 'content-hash.ts', 'asset-url.ts', 'asset-url.schemas.ts', 'stamp-hashes.ts', 'bundle-min.ts',
    'bundle-min.schemas.ts', 'asset-store.ts'].map((f) => `build/${f}`),
];

const local = process.argv.includes('--local');
const RAIZ_LOCAL = [process.env.ISWC_LOCAL, 'C:/ContaPyme/Personal/apps/iswc-root', 'C:/ContaPyme/Personal/apps/is-webcomponents']
  .find((p) => p && existsSync(join(p, 'src', 'cdn')));

for (const rel of ARCHIVOS) {
  let texto;
  let etiqueta = pin;
  if (local) {
    if (!RAIZ_LOCAL) throw new Error('vendor-iswc --local: no hay checkout local del kit (define ISWC_LOCAL)');
    const origen = [join(RAIZ_LOCAL, 'src', 'cdn', rel), join(RAIZ_LOCAL, 'dist', 'cdn', rel)].find(existsSync);
    if (!origen) throw new Error(`vendor-iswc --local: falta ${rel} en ${RAIZ_LOCAL}`);
    texto = readFileSync(origen, 'utf8');
    etiqueta = `${pin}+local`;
  } else {
    // raw por SHA primero (inmutable y sin el limite de 50 MB de jsDelivr); jsDelivr de respaldo.
    const urls = [`https://raw.githubusercontent.com/${REPO}/${pin}/src/cdn/${rel}`, `https://cdn.jsdelivr.net/gh/${REPO}@${pin}/dist/cdn/${rel}`];
    for (const url of urls) {
      const r = await fetch(url);
      if (r.ok) { texto = await r.text(); break; }
      await r.body?.cancel();
    }
    if (texto === undefined) throw new Error(`vendor-iswc: ${rel} no responde en ${urls.join(' ni en ')}`);
  }
  // Una cabecera @vendor previa (copia de otra copia) se reemplaza, no se apila.
  texto = texto.replace(/^\/\/ @vendor [^\n]*\n\/\/ No editar[^\n]*\n/, '');
  const destino = join(ROOT, 'src', 'vendor', 'iswc-root', rel);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, `// @vendor iswc-root@${etiqueta} dist/cdn/${rel}\n// No editar: se cambia en el kit y se descarga con \`deno task vendor:iswc\`.\n${texto}`);
}
// Skill general del kit (índice de todos los componentes) en specs/iswc/kit/, fijada al pin.
const SKILL_KIT = ['SKILL.md', 'catalog.md', 'reference.md', 'PROMPT.md', 'tools/build.md', 'tools/local.md', 'tools/migrate.md', 'tools/runtime.md'];
const fijar = (md) => md
  .replaceAll('Jeff-Aporta/iswc-root', REPO)
  .replace(new RegExp(`(github\.com/${REPO}/(?:blob|tree))/main/`, 'g'), `$1/${pin}/`)
  .replace(new RegExp(`(raw\.githubusercontent\.com/${REPO})/main/`, 'g'), `$1/${pin}/`)
  .replace(/\]\(\.\.\/((?!catalog\.md|reference\.md|SKILL\.md|PROMPT\.md)[a-z0-9-]+\/[^)]*)\)/g, `](https://raw.githubusercontent.com/${REPO}/${pin}/skills/$1)`);
for (const rel of SKILL_KIT) {
  let texto;
  if (local) texto = readFileSync(join(RAIZ_LOCAL, 'skills', 'iswc-root', rel), 'utf8');
  else {
    const r = await fetch(`https://raw.githubusercontent.com/${REPO}/${pin}/skills/iswc-root/${rel}`);
    if (!r.ok) { console.warn(`[vendor:iswc] sin skills/iswc-root/${rel} en ${pin.slice(0, 12)} (${r.status})`); continue; }
    texto = await r.text();
  }
  const destino = join(ROOT, 'specs', 'iswc', 'kit', rel);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, `<!-- Copia de skills/iswc-root/${rel} del kit ${REPO}@${pin}. No editar: se refresca con \`deno task vendor:iswc\`. -->\n${fijar(texto)}`);
}

console.log(`[vendor:iswc] ${ARCHIVOS.length} archivos <- iswc-root@${pin.slice(0, 12)}${local ? ' (checkout local)' : ''}`);
