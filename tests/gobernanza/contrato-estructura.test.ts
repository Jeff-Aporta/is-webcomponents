// @contexto INDICE.md · tests/gobernanza/README.md
// tests/gobernanza/contrato-estructura.test.ts
//
// Contrato de layout/, navigation/ e isp/: cada componente trae .ts, .scss, .md y .json iswc-preview/v1.
// Las fichas son UTF-8 limpio y documentan lo que un agente necesita para reusar el componente.
//
// Uso: deno run -A --no-check tests/gobernanza/contrato-estructura.test.ts
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CARPETAS = ['layout', 'navigation', 'isp'];
/** Otro frente los está migrando: se suman al contrato al cerrar. */
// El README de la categoria no es un componente: es el md del dominio.
const AJENOS = /^(dialog|login|login-gate|login-dropdown|session-menu|README)$/;
/** Subcomponentes definidos en el .ts del padre. */
const SUBCOMPONENTES: Record<string, string> = {
  'dock-item': 'dock',
  'carousel-item': 'carousel',
  'stepper-step': 'stepper',
  tab: 'tab-group',
  'tab-panel': 'tab-group',
  'tree-item': 'tree',
};
/** Light DOM a propósito: su caja vive en styles/presentation.scss. */
const SIN_HOJA = new Set(['demo']);
const MOJIBAKE = /Ã[\u0080-¿¡-¿]|â€|â†|Â[¡-¿]/;
const RELLENO = /Estructura, superficies, overlays|size colors?\b/;

const componentes = (carpeta: string): string[] => {
  const dir = join(ROOT, 'src', 'components', carpeta);
  const nombres = new Set(readdirSync(dir).map((f) => /^(.+)\.(ts|md|json)$/.exec(f)?.[1]).filter(Boolean) as string[]);
  return [...nombres].filter((n) => !AJENOS.test(n)).sort();
};

test('gobernanza/contrato-estructura', () => {
  const fallos: string[] = [];
  for (const carpeta of CARPETAS) {
    const dir = join(ROOT, 'src', 'components', carpeta);
    for (const n of componentes(carpeta)) {
      const fuente = SUBCOMPONENTES[n] ?? n;
      if (!existsSync(join(dir, `${fuente}.ts`))) fallos.push(`${carpeta}/${n}: falta .ts`);
      if (!SIN_HOJA.has(n) && !existsSync(join(dir, `${fuente}.scss`))) fallos.push(`${carpeta}/${n}: falta .scss`);
      const md = join(dir, `${n}.md`);
      const json = join(dir, `${n}.json`);
      if (!existsSync(md)) fallos.push(`${carpeta}/${n}: falta .md`);
      else {
        const texto = readFileSync(md, 'utf8');
        if (texto.charCodeAt(0) === 0xfeff) fallos.push(`${carpeta}/${n}.md: BOM`);
        if (MOJIBAKE.test(texto)) fallos.push(`${carpeta}/${n}.md: doble codificación`);
        if (RELLENO.test(texto)) fallos.push(`${carpeta}/${n}.md: texto de relleno`);
        if (!texto.startsWith('---')) fallos.push(`${carpeta}/${n}.md: sin frontmatter`);
      }
      if (!existsSync(json)) fallos.push(`${carpeta}/${n}: falta .json`);
      else if (JSON.parse(readFileSync(json, 'utf8')).$schema !== 'iswc-preview/v1') {
        fallos.push(`${carpeta}/${n}.json: $schema distinto de iswc-preview/v1`);
      }
      const ts = join(dir, `${fuente}.ts`);
      if (existsSync(ts) && /const CSS = `/.test(readFileSync(ts, 'utf8'))) fallos.push(`${fuente}.ts: CSS embebido, va en el .scss`);
      const scss = join(dir, `${fuente}.scss`);
      if (!existsSync(scss)) continue;
      const css = readFileSync(scss, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      if (css.includes('--iswc-control-radius')) fallos.push(`${fuente}.scss: --iswc-control-radius no existe`);
      if (/:host\[/.test(css)) fallos.push(`${fuente}.scss: :host[attr] no matchea, usar :host([attr])`);
      if (/::slotted\([^)]*\)\s+[.\w]/.test(css)) fallos.push(`${fuente}.scss: nada se selecciona después de ::slotted()`);
    }
  }
  assert.deepEqual(fallos, []);
  console.log('contrato-estructura.test.ts: PASS');
});

test('gobernanza/plantillas-sin-boton-anidado', () => {
  const fallos: string[] = [];
  for (const carpeta of CARPETAS) {
    const dir = join(ROOT, 'src', 'components', carpeta);
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.ts'))) {
      const fuente = readFileSync(join(dir, f), 'utf8');
      if (/<button\b(?:(?!<\/button>)[\s\S])*?<button\b/.test(fuente)) fallos.push(`${carpeta}/${f}: <button> dentro de <button>`);
    }
  }
  assert.deepEqual(fallos, []);
});

export default lista();
