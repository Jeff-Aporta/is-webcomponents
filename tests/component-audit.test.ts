// tests/component-audit.test.ts
//
// Higiene de componentes: corre scripts/audit-components.ts y falla si
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

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

let out = '';
try {
  out = execFileSync(process.execPath, [join(root, 'scripts', 'audit-components.ts')], {
    cwd: root,
    encoding: 'utf8',
  });
} catch (e) {
  console.error('audit-components.ts no pudo ejecutarse:', e.message);
  process.exit(1);
}

const m = /(\d+) componentes con hallazgos de (\d+)/.exec(out);
if (!m) {
  console.error('Salida inesperada del audit:\n' + out);
  process.exit(1);
}

const [, hallazgos, total] = m;
if (Number(hallazgos) > 0) {
  console.error(out.trim());
  console.error(`\ncomponent-audit.test.mjs: FAIL — ${hallazgos} componentes con problemas de higiene`);
  process.exit(1);
}

console.log(`component-audit.test.ts: PASS — ${total} componentes sin fugas de listeners/observers ni registros rotos`);
process.exit(0);
