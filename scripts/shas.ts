// @contexto INDICE.md · src/cdn/loader.md
/**
 * shas.ts — SHA de HEAD del kit y de cada app plugin registrada, frente a los pines que usan los consumidores.
 *
 *   deno task shas                 tabla: HEAD actual vs. pin vigente de cada consumidor
 *   deno task shas --escribir      además guarda scripts/shas.lock.json (HEAD de cada repo, con fecha)
 *   deno task shas --json          salida JSON (para otros scripts)
 *
 * La lista vive en `scripts/plugins.json` (kit, plugins y consumidores con el archivo donde está el pin).
 * Consulta GitHub con `gh api` (repos privados incluidos si `gh` tiene acceso); sin red falla con mensaje claro.
 */
import { z } from 'zod';

const RepoSchema = z.object({ repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/), rama: z.string().default('main') });
const PluginSchema = RepoSchema.extend({ app: z.string(), prefijo: z.string(), privado: z.boolean().optional() });
const ConsumidorSchema = z.object({ repo: z.string(), archivo: z.string(), pinea: z.string(), comando: z.string() });
const ConfigSchema = z.object({ kit: RepoSchema, plugins: z.array(PluginSchema), consumidores: z.array(ConsumidorSchema) });
type Config = z.infer<typeof ConfigSchema>;

const SHA = /[0-9a-f]{40}/;

async function gh(args: string[]): Promise<string> {
  const salida = await new Deno.Command('gh', { args, stdout: 'piped', stderr: 'piped' }).output();
  if (!salida.success) throw new Error(new TextDecoder().decode(salida.stderr).trim() || `gh ${args.join(' ')}`);
  return new TextDecoder().decode(salida.stdout).trim();
}

async function headDe(repo: string, rama: string): Promise<string> {
  return await gh(['api', `repos/${repo}/commits/${rama}`, '--jq', '.sha']);
}

/** Pin vigente de `objetivo` ('kit' o app) leído del archivo del consumidor: el SHA pegado a su nombre de repo. */
async function pinDe(c: z.infer<typeof ConsumidorSchema>, cfg: Config): Promise<string | null> {
  const dest = c.pinea === 'kit' ? cfg.kit.repo : cfg.plugins.find((p) => p.app === c.pinea)?.repo;
  if (!dest) return null;
  const nombre = dest.split('/')[1]!;
  let texto: string;
  try {
    texto = await gh(['api', `repos/${c.repo}/contents/${c.archivo}`, '-H', 'Accept: application/vnd.github.raw']);
  } catch {
    return null;
  }
  const m = texto.match(new RegExp(`${nombre}@(${SHA.source})`)) ?? texto.match(new RegExp(`${dest.replace('/', '\/')}[\s\S]{0,120}?(${SHA.source})`));
  return m ? m[1]! : null;
}

const aqui = new URL('./plugins.json', import.meta.url);
const cfg = ConfigSchema.parse(JSON.parse(await Deno.readTextFile(aqui)));
const args = Deno.args;
const heads: Record<string, string> = {};
const errores: string[] = [];
for (const r of [{ nombre: 'kit', ...cfg.kit }, ...cfg.plugins.map((p) => ({ nombre: p.app, repo: p.repo, rama: p.rama }))]) {
  try {
    heads[r.nombre] = await headDe(r.repo, r.rama);
  } catch (e) {
    errores.push(`${r.nombre} (${r.repo}): ${(e as Error).message.split('\n')[0]}`);
  }
}
const filas = [];
for (const c of cfg.consumidores) {
  const pin = await pinDe(c, cfg);
  const head = heads[c.pinea] ?? null;
  filas.push({ consumidor: c.repo, archivo: c.archivo, pinea: c.pinea, pin, head, alDia: !!pin && pin === head, comando: c.comando });
}
if (args.includes('--json')) {
  console.log(JSON.stringify({ heads, filas, errores }, null, 2));
} else {
  console.log('HEAD por repo');
  for (const [k, v] of Object.entries(heads)) console.log(`  ${k.padEnd(10)} ${v.slice(0, 8)}  ${v}`);
  console.log('\nPines de los consumidores');
  for (const f of filas) {
    const est = f.pin === null ? 'sin pin legible' : f.alDia ? 'al dia' : `desfasado (${f.pin.slice(0, 8)} -> ${f.head?.slice(0, 8) ?? '?'})`;
    console.log(`  ${f.consumidor}  ${f.archivo}  [${f.pinea}]  ${est}${f.alDia || f.pin === null ? '' : `\n      actualizar: ${f.comando.replace('<sha>', f.head ?? '<sha>')}`}`);
  }
  for (const e of errores) console.warn(`aviso: no se pudo leer ${e}`);
}
if (args.includes('--escribir')) {
  const out = new URL('./shas.lock.json', import.meta.url);
  await Deno.writeTextFile(out, JSON.stringify({ fecha: new Date().toISOString(), heads, pines: filas.map(({ consumidor, pinea, pin }) => ({ consumidor, pinea, pin })) }, null, 2) + '\n');
  console.log(`\nescrito ${out.pathname}`);
}
Deno.exit(errores.length === cfg.plugins.length + 1 ? 1 : 0);
