// sync-protocolo.mjs — GATE unico de `sync:entregable`: la luz verde que autoriza copiar.
//
// Corre la bateria completa (`run-test-all.mjs`, sin halt, CON cooldown: un verde reciente no se repite,
// un rojo corre siempre). Si cualquier paso queda en rojo, exit != 0 y el entregable no se toca.
// Si la app depende de un backend, este es el lugar para resolver/sondear su destino ANTES de la bateria
// (exit 2 = "no se pudo probar", distinto de 1 = "se probo y fallo").
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const r = spawnSync('deno', ['run', '-A', 'scripts/gate/run-test-all.mjs'], { stdio: 'inherit', shell: process.platform === 'win32' });
const code = r.status ?? 1;
if (code !== 0) console.error(`[sync-protocolo] GATE EN ROJO (rc=${code}): el entregable NO se toca.`);
process.exit(code);
