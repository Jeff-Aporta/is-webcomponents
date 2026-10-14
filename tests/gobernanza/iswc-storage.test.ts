// iswc-storage.test.ts — QUÉ guarda el kit en el navegador (src/core/iswc-storage.ts).
//   S1 guardián: ningún módulo del kit (src/**/*.ts, salvo iswc-storage.ts y los tests) llama a `setItem`
//      directo: toda escritura pasa por `writeIswc`, que pone el prefijo `iswc:`.
//   S2 `listIswcKeys()` lista solo las `iswc:`; `clearIswcStorage()` las borra (local y session), vacía las
//      cachés en memoria registradas y no toca lo ajeno al kit.
//   S3 migración: las llaves del formato viejo (`iswc-app-cfg`, `iswc-root`, `iswc-icon:*`, `iswc-diagram:*`,
//      `iswc-wc-asset-hashes`, `iswc-theming-seeds`, `<clave>:paneles`, y en sesión `iswc-wc:cdn-*`) pasan a
//      `iswc:` y la vieja se borra; una nueva que ya exista no se pisa.
//   S4 `<iswc-prefs-clear>` limpia con `clearIswcStorage()` (un clic = primera carga) y reporta las llaves.
import { assert, assertEquals } from 'jsr:@std/assert@1';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { denoTestCon } from '../_shared/deno-test.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const denoTest = denoTestCon(test);


/** Storage en memoria: el localStorage real de Deno se comparte entre archivos de test en paralelo. */
function storageEnMemoria(inicial: Record<string, string> = {}): Storage {
  const m = new Map<string, string>(Object.entries(inicial));
  return {
    get length() { return m.size; },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, String(v)); },
    removeItem: (k: string) => { m.delete(k); },
    clear: () => m.clear(),
  };
}
const instalar = (local: Storage, session: Storage) => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: local });
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, writable: true, value: session });
};
const llaves = (s: Storage) => Array.from({ length: s.length }, (_, i) => s.key(i) ?? '').sort();

// Estado viejo ANTES de cargar el módulo: la migración corre al importarlo.
const local = storageEnMemoria({
  'iswc-app-cfg': '{"theme":"dark"}',
  'iswc-root': '{"iswc-main":{}}',
  'iswc-icon:mdi:home': '{"t":1,"s":"<svg/>"}',
  'iswc-diagram:d1': '{}',
  'iswc-wc-asset-hashes': '{}',
  'iswc-theming-seeds': '{}',
  'docs:paneles': '{"start":true}',
  'iswc:root': '{"ya":"nuevo"}',
  'ajena': '1',
});
const session = storageEnMemoria({ 'iswc-wc:cdn-ref': 'abc', 'iswc-wc:cdn-mirror': 'jsdelivr', 'token': 't' });
instalar(local, session);
const { clearIswcStorage, listIswcKeys, readIswc, registerMemoryCache, writeIswc, migrateIswcStorage } = await import('../../src/core/iswc-storage.ts');

denoTest('iswc-storage: S1 ningún módulo del kit escribe storage sin pasar por writeIswc (prefijo iswc:)', () => {
  const raiz = join(import.meta.dirname!, '..', '..', '..');
  const malos: string[] = [];
  const visitar = (d: string) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) { if (n !== 'node_modules' && !n.startsWith('.')) visitar(p); continue; }
      if (!p.endsWith('.ts') || /\.test\.ts$|[\\/]_testing[\\/]/.test(p) || /[\\/]core[\\/]iswc-storage\.ts$/.test(p)) continue;
      const texto = readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      for (const [i, l] of texto.split('\n').entries()) {
        if (/\.setItem\s*\(|(?:local|session)Storage\s*\[[^\]]+\]\s*=(?!=)/.test(l)) malos.push(`${relative(raiz, p)}:${i + 1}: ${l.trim()}`);
      }
    }
  };
  visitar(raiz);
  assertEquals(malos, [], `escribir con writeIswc(nombre, valor) de core/iswc-storage:\n${malos.join('\n')}`);
});

denoTest('iswc-storage: S3 migra el formato viejo a iswc: y borra lo viejo', () => {
  assertEquals(llaves(local), [
    'ajena',
    'iswc:app-cfg', 'iswc:asset-hashes', 'iswc:diagram:d1', 'iswc:docs:paneles', 'iswc:icon:mdi:home', 'iswc:root', 'iswc:theming-seeds',
  ]);
  assertEquals(local.getItem('iswc:app-cfg'), '{"theme":"dark"}');
  assertEquals(local.getItem('iswc:root'), '{"ya":"nuevo"}', 'la nueva no se pisa');
  assertEquals(llaves(session), ['iswc:cdn-mirror', 'iswc:cdn-ref', 'token']);
  assertEquals(migrateIswcStorage(), [], 'idempotente');
});

denoTest('iswc-storage: S2 listar y limpiar todo lo iswc: (más la memoria)', () => {
  assert(writeIswc('x', '1'));
  assertEquals(local.getItem('iswc:x'), '1');
  assertEquals(readIswc('x'), '1');
  assert(writeIswc('s', '2', 'session'));
  assert(listIswcKeys().every((k) => k.startsWith('iswc:')));
  assert(listIswcKeys().includes('iswc:x'));
  let vaciadas = 0;
  registerMemoryCache(() => { vaciadas++; });
  const r = clearIswcStorage();
  assert(r.local.includes('iswc:x') && r.local.includes('iswc:app-cfg'));
  assert(r.session.includes('iswc:s') && r.session.includes('iswc:cdn-ref'));
  assertEquals(vaciadas, 1);
  assert(r.memorias >= 1);
  assertEquals(listIswcKeys(), []);
  assertEquals(listIswcKeys('session'), []);
  assertEquals(llaves(local), ['ajena'], 'lo ajeno al kit no se toca');
  assertEquals(llaves(session), ['token']);
});

denoTest('iswc-storage: S4 <iswc-prefs-clear> limpia con clearIswcStorage', () => {
  const fuente = readFileSync(join(import.meta.dirname!, '..', '..', '..', 'components', 'feedback', 'prefs-clear.ts'), 'utf8');
  assert(/import \{[^}]*\bclearIswcStorage\b[^}]*\} from '\.\.\/\.\.\/core\/iswc-storage\.js'/.test(fuente), 'importa clearIswcStorage');
  const run = fuente.slice(fuente.indexOf('async #run()'));
  assert(/clearIswcStorage\(\)/.test(run), '#run llama a clearIswcStorage()');
  assert(/keys,/.test(run), 'el detalle del evento lleva las llaves borradas');
});

export default lista();
