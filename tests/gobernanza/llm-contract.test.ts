// tests/llm-contract.test.ts — versión post-consolidación 2026-09-07.
//
// Antes este test verificaba el contenido de `LLM.md` en la raíz del repo.
// Consolidación 2026-09-07: el `LLM.md` raíz (carta de leyes / DO / DON'T /
// bitácora de errores) se consolidó en `specs/lessons.md` (tabla de errores
// + reglas + guardianes) + `specs/constraints.md` (reglas duras) +
// `specs/componentes.md` (catálogo de componentes).
//
// El guardián verifica que la consolidación esté completa y que los
// guardianes citados existan en disco.

import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

test('gobernanza/llm-contract', async () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const failures = [];
  
  const specsLessons = join(root, 'specs', 'lessons.md');
  const specsConstraints = join(root, 'specs', 'constraints.md');
  
  for (const [path, label] of [
    [specsLessons, 'specs/lessons.md'],
    [specsConstraints, 'specs/constraints.md'],
  ]) {
    if (!existsSync(path)) {
      failures.push(`falta ${label} (consolidación post-2026-09-07)`);
    }
  }
  
  const lessons = existsSync(specsLessons) ? readFileSync(specsLessons, 'utf8') : '';
  const constraints = existsSync(specsConstraints) ? readFileSync(specsConstraints, 'utf8') : '';
  const componentes = readFileSync(join(root, 'specs', 'componentes.md'), 'utf8');
  const consolidated = `${lessons}\n${constraints}\n${componentes}`;
  
  // Frases clave del antiguo LLM.md que ahora viven en specs/. El guardián
  // migra: comprueba que cada concepto sigue documentado en alguna parte.
  const requiredConcepts = [
    ['Reusar antes de inventar|reusar|reuso', 'carta de leyes: reuso'],
    ['inferLanguage|iswc-code infer|code-langs', 'iswc-code infer lang'],
    ['GALLERY_CHROME_TAGS|iswc-tab-group', 'chrome galería incluye tabs'],
    ['gallery-boot|FOUC', 'guardián gallery-boot'],
    ['preview-paths|preview-component', 'previews controlados'],
    ['specs/README|flujo-sdd|SDD', 'contrato SDD specs'],
    ['em-scale|font inherit|font-size contextual', 'guardián escala em'],
    ['palette-and-snippet|loadCSSPalettes', 'pesos autofit + paleta'],
    ['cdn-loader|loader\.min\.js|pin[\(\.]|mirrors', 'loader pin/mirrors'],
  ];
  
  for (const [needle, label] of requiredConcepts) {
    const re = new RegExp(needle, 'i');
    if (!re.test(consolidated)) {
      failures.push(`falta frase clave (${label}) — debería vivir en specs/ (lessons/constraints/componentes)`);
    }
  }
  
  /** Guardianes que las specs deben citar y que deben existir en disco. */
  const guardians = [
    'src-layout.test.ts',
    'robots-sitemap.test.ts',
    'helpers-homogeneity.test.ts',
    'preview-json-contract.test.ts',
    'preview-controller.test.ts',
    'preview-paths.test.ts',
    'dist-cdn-layout.test.ts',
    'attr-enums.test.ts',
    'token-vocabulary.test.ts',
    'button-events.test.ts',
    'button-color-appearance.test.ts',
    'em-scale-font-inherit.test.ts',
    'palette-and-snippet-contract.test.ts',
    'llm-contract.test.ts',
    'prefs-contract.test.ts',
    'url-nav.test.ts',
    'format-bytes-autofit.test.ts',
    'ux-gallery-invariants.test.ts',
    'cdn-loader.test.ts',
    'load-plan.test.ts',
    'code-infer-lang.test.ts',
    'demo-equiv.test.ts',
    'gallery-boot.test.ts',
    'gallery-sources-meta.test.ts',
    'cdn-folders.test.ts',
    'specs-sdd.test.ts',
  ];
  
  // Ubicación real de cada guardián: las pruebas volvieron de
  // src/utils/health/<sub>/ a tests/<carpeta>/ (gobernanza, componentes, …).
  const TEST_DIRS = ['gobernanza', 'componentes', 'exhaustivo', 'navegador', 'diagramas', 'server', 'auditoria', 'e2e'];
  function locateGuardian(name) {
    for (const sub of TEST_DIRS) {
      const p = join(root, 'tests', sub, name);
      if (existsSync(p)) return p;
    }
    return null;
  }

  for (const file of guardians) {
    const onDisk = locateGuardian(file);
    if (!onDisk) failures.push(`guardián citado no existe en disco: tests/<carpeta>/${file}`);
  }
  
  const gitignore = readFileSync(join(root, '.gitignore'), 'utf8');
  if (/^src\/utils\/health\/\s*$/m.test(gitignore) || /^\/src\/utils\/health\/?\s*$/m.test(gitignore)) {
    failures.push(
      '.gitignore ignora src/utils/health/ entero — solo deben ignorarse *.tmp / coverage / .cache (los *.test.ts se commitean)',
    );
  }
  if (!/(?:src\/utils\/health|tests)\/\*+\/?\*?\.tmp/.test(gitignore)) {
    failures.push('.gitignore debería ignorar src/utils/health/**/*.tmp (artefactos), no el directorio entero');
  }
  
  if (failures.length) {
    console.error(`llm-contract.test.ts: FAIL — ${failures.length}\n`);
    for (const f of failures) console.error(`  - ${f}`);
    { const salida = 1; if (salida) throw new Error(`salida ${salida}`); return; }
  }
  
  console.log(
    `llm-contract.test.ts: PASS — specs/lessons.md + specs/constraints.md + ${guardians.length} guardianes en disco`,
  );
});

export default lista();
