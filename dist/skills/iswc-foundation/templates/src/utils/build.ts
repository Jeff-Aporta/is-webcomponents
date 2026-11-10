// @vendor 2026-10-14T16:13:19.844Z Jeff-Aporta/is-webcomponents@main skills/iswc-foundation/templates/src/utils/build.ts
// @contexto INDICE.md · skills/iswc-foundation/SKILL.md
/**
 * build.ts — `deno task build` (después de `build:scss`): el conversor del kit `construirApp`, al MISMO SHA que el pin
 * (`deno task pin` mueve esta URL con el resto). `src/js/**` y `view/**` → `dist/cdn/*.min.mjs` con splitting, `boot.ts`
 * en IIFE, `?v=`, `deps.json`, registrador `__PREFIJO__Loader.min.mjs` y bloque `iswc:precarga` de cada HTML.
 * Guía: skills/iswc-foundation/references/02-deno-y-build.md del kit.
 */
import { join } from 'node:path';
import { stop } from 'esbuild';
import { construirApp, vigilarApp } from 'https://cdn.jsdelivr.net/gh/__REPO__@__SHA__/dist/cdn/build/construir-app.ts';
import { KIT_TAGS, mapaRutas, PREFIJO, SHELL_CRITICO, tagsArranque, VIEW_TAGS } from '../js/kit-tags.ts';

const fuente = (rel: string) => (rel.startsWith('js/') ? `src/${rel}` : rel).replace(/\.js$/, '.ts');
const hola = { kit: [...SHELL_CRITICO], app: [...VIEW_TAGS.hola] };
const opts = {
  raiz: join(import.meta.dirname!, '..', '..'),
  prefijo: PREFIJO,
  planos: ['src/js/boot.ts'],
  tags: Object.fromEntries(Object.entries(mapaRutas()).map(([t, r]) => [t, fuente(r)])),
  html: [{ archivo: 'index.html', kit: [...SHELL_CRITICO], app: tagsArranque() }, { archivo: 'view/hola/index.html', ...hola }, { archivo: 'view/hola/demo/index.html', ...hola }, { archivo: 'view/demo/index.html', kit: [...KIT_TAGS], app: ['view/demo/components/__PREFIJO__-galeria.ts'] }],
};
await construirApp(opts);
if (Deno.args.includes('--watch')) await vigilarApp(opts, () => new Deno.Command(Deno.execPath(), { args: ['task', 'build:scss'], cwd: opts.raiz }).output());
else await stop();
