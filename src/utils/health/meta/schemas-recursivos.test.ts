/**
 * Guardián WHAT: un schema Zod recursivo nunca se referencia a sí mismo de forma directa dentro de
 * su `z.object({...})`. Con la referencia directa (`children: z.array(NodoSchema)`) TypeScript no
 * puede cerrar el ciclo del inicializador y el tipo inferido (`z.infer`) degenera en `any` en
 * silencio: todo lo que toque ese tipo pierde el chequeo. La recursión va con getter (patrón de
 * Zod 4), con su tipo de retorno explícito:
 *   get children(): z.ZodArray<typeof NodoSchema> { return z.array(NodoSchema); }
 *   R1 ningún `*.schemas.ts` de src/ tiene un z.object que mencione su propio nombre fuera de un getter.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const RAIZ = join(import.meta.dirname, '..', '..', '..', '..');

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
      yield* walk(p);
    } else if (entry.name.endsWith('.schemas.ts')) {
      yield p;
    }
  }
}

/** Pares `[nombre, cuerpo]` de cada `export const XSchema = z.object({ ... })` top-level (llaves balanceadas). */
export function objetosZod(fuente: string): Array<{ nombre: string; cuerpo: string }> {
  const out: Array<{ nombre: string; cuerpo: string }> = [];
  const re = /^export const (\w+Schema)\s*=\s*z\.object\(\{/gm;
  for (let m = re.exec(fuente); m; m = re.exec(fuente)) {
    const inicio = m.index + m[0].length;
    let nivel = 1;
    let i = inicio;
    for (; i < fuente.length && nivel > 0; i++) {
      if (fuente[i] === '{') nivel += 1;
      else if (fuente[i] === '}') nivel -= 1;
    }
    // Una llave dentro de un string/regex desbalancea el conteo: el cuerpo nunca pasa del siguiente `export`.
    const cuerpo = fuente.slice(inicio, i - 1).split(/\nexport /)[0]!;
    out.push({ nombre: m[1]!, cuerpo });
  }
  return out;
}

/** Líneas del cuerpo que nombran al propio schema sin ser un getter. */
export function autorreferenciasDirectas(nombre: string, cuerpo: string): string[] {
  const propio = new RegExp(`\\b${nombre}\\b`);
  return cuerpo.split('\n').filter((linea) => propio.test(linea) && !/^\s*get \w+\(\)/.test(linea) && !/^\s*(\/\/|\*|\/\*)/.test(linea));
}

test('schemas: R1 ningún z.object se referencia a sí mismo sin getter (TS lo inferiría como any)', async () => {
  const ofensores: string[] = [];
  for await (const p of walk(join(RAIZ, 'src'))) {
    const fuente = await readFile(p, 'utf-8');
    for (const { nombre, cuerpo } of objetosZod(fuente)) {
      for (const linea of autorreferenciasDirectas(nombre, cuerpo)) ofensores.push(`${p} · ${nombre}: ${linea.trim()}`);
    }
  }
  assert.deepEqual(ofensores, [], `Schemas recursivos con referencia directa (usar getter con tipo de retorno):\n${ofensores.join('\n')}`);
});

test('schemas: R1 el detector distingue referencia directa de getter', () => {
  const directo = objetosZod('export const NodoSchema = z.object({\n  id: z.string(),\n  children: z.array(NodoSchema),\n});\n')[0]!;
  assert.equal(autorreferenciasDirectas(directo.nombre, directo.cuerpo).length, 1);
  const getter = objetosZod('export const NodoSchema = z.object({\n  id: z.string(),\n  get children(): z.ZodArray<typeof NodoSchema> { return z.array(NodoSchema); },\n});\n')[0]!;
  assert.deepEqual(autorreferenciasDirectas(getter.nombre, getter.cuerpo), []);
});
