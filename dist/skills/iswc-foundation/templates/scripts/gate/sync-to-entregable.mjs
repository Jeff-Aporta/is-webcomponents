// sync-to-entregable.mjs — mirror (`_experimental/<app>`) -> entregable (`_entregable/<app>`), sobre el
// motor comun del kit (`src/vendor/iswc-root/tools/sync-entregable.ts`).
//
//   deno task sync:entregable             # gate (test:all) en verde -> copia -> checkpoint (commit + push del MIRROR)
//   deno task sync:entregable --check     # drift por contenido, no escribe (exit 1 si hay drift)
//   deno task sync:entregable --dry-run   # plan, no escribe, sin gate
//
// La UNICA autorizacion es el gate en verde: no existen `--skip-gate` ni `--aprobado-por` (exit 2).
// Unidireccional. El entregable nunca recibe commits ni push automaticos (los hace la persona).
// Destino: `ENTREGABLE` o, por defecto, `../../_entregable/<carpeta del mirror>`. Si no existe, exit 2:
// una app sin entregable no usa este comando.
import { existsSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import process from 'node:process';
import { codigoSync, correrSync, modoDeArgv } from '../../src/vendor/iswc-root/tools/sync-entregable.ts';

const MIRROR = resolve(import.meta.dirname, '..', '..');
const ENTREGABLE = process.env.ENTREGABLE ?? resolve(MIRROR, '..', '..', '_entregable', basename(MIRROR));
const args = process.argv.slice(2);
if (args.some((a) => a === '--skip-gate' || a.startsWith('--aprobado-por'))) {
  console.error('--skip-gate y --aprobado-por no existen: la autorizacion es el gate en verde.');
  process.exit(2);
}
if (!existsSync(ENTREGABLE)) {
  console.error(`Entregable no existe: ${ENTREGABLE} (define ENTREGABLE o crea el par _entregable).`);
  process.exit(2);
}

/** QUE viaja (artefactos de la app), COMO, y que nunca se toca. */
export const CONFIG = {
  origen: MIRROR,
  destino: ENTREGABLE,
  entradas: [
    { desde: 'src', accion: 'replace', excluir: ['**/specs/**'] },
    { desde: 'dist', accion: 'replace' },
    { desde: 'index.html', accion: 'replace' },
    // Las demos y los e2e de cada vista solo viven en el mirror.
    { desde: 'view', accion: 'replace', excluir: ['**/demo/**', '**/stagehand/**'] },
    { desde: 'README.md', accion: 'replace' },
  ],
  bloqueados: ['.gitignore', 'node_modules/**', '.git/**', 'deno.json', 'deno.lock'],
  gate: { cmd: 'deno', args: ['run', '-A', 'scripts/gate/sync-protocolo.mjs'] },
  checkpoint: { mensaje: 'feat: sync to entregable', push: true },
};

const resumen = await correrSync(CONFIG, modoDeArgv(args));
process.exit(codigoSync(resumen));
