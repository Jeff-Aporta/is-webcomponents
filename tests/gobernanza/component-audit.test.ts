// tests/component-audit.test.ts
//
// Higiene de componentes: corre scripts/audits/components.ts y falla si
// cualquier componente presenta:
//   - listeners de document/window sin removeEventListener simétrico
//   - observers (Mutation/Resize/Intersection) sin disconnect()
//   - setInterval sin clearInterval
//   - clase HTMLElement sin registrar / define sin guard idempotente
//   - .css huérfano o adoptCss sin .css hermano
//   - observedAttributes sin attributeChangedCallback (o viceversa)
//
// Estos son exactamente los bugs que se corrigieron en la auditoría de
// 2026-08: este test evita reintroducirlos.
//
// Uso:  node tests/component-audit.test.ts

import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

test('gobernanza/component-audit', async () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = dirname(dirname(here));
  
  let out = '';
  try {
    out = execFileSync(process.execPath, [join(root, 'scripts', 'audits', 'components.ts')], {
      cwd: root,
      encoding: 'utf8',
    });
  } catch (e) {
    console.error('audit-components.ts no pudo ejecutarse:', e.message);
    { const salida = 1; if (salida) throw new Error(`salida ${salida}`); return; }
  }
  
  const m = /(\d+) componentes con hallazgos de (\d+)/.exec(out);
  if (!m) {
    console.error('Salida inesperada del audit:\n' + out);
    { const salida = 1; if (salida) throw new Error(`salida ${salida}`); return; }
  }
  
  const [, hallazgos, total] = m;
  if (Number(hallazgos) > 0) {
    console.error(out.trim());
    console.error(`\ncomponent-audit.test.mjs: FAIL — ${hallazgos} componentes con problemas de higiene`);
    { const salida = 1; if (salida) throw new Error(`salida ${salida}`); return; }
  }
  
  console.log(`component-audit.test.ts: PASS — ${total} componentes sin fugas de listeners/observers ni registros rotos`);
  return;
});

export default lista();
