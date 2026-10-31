// tests/gobernanza/contrato-controles.test.ts
//
// Contrato de actions/ y forms/: cada componente trae .ts, .scss, .md y .json iswc-preview/v1;
// las fichas son UTF-8 limpio (sin BOM ni doble codificación) y los controles usan los mismos
// tokens de radio y la misma opacidad de deshabilitado.
//
// Uso: deno run -A --no-check tests/gobernanza/contrato-controles.test.ts
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CARPETAS = ['actions', 'forms'];
/** Otro frente los está migrando: se suman al contrato al cerrar. */
const AJENOS = /^(dropdown|dropdown-item)$/;
/** Subcomponentes definidos en el .ts del padre. */
const SUBCOMPONENTES: Record<string, string> = { 'speed-dial-action': 'speed-dial' };
const MOJIBAKE = /Ã[\u0080-¿¡-¿]|â€|â†|Â[¡-¿]/;

const componentes = (carpeta: string): string[] => {
  const dir = join(ROOT, 'src', 'components', carpeta);
  const nombres = new Set(readdirSync(dir).map((f) => /^(.+)\.(ts|md|json)$/.exec(f)?.[1]).filter(Boolean) as string[]);
  return [...nombres].filter((n) => !AJENOS.test(n)).sort();
};

test('gobernanza/contrato-controles', () => {
  const fallos: string[] = [];
  for (const carpeta of CARPETAS) {
    const dir = join(ROOT, 'src', 'components', carpeta);
    for (const n of componentes(carpeta)) {
      const fuente = SUBCOMPONENTES[n] ?? n;
      for (const ext of ['ts', 'scss']) {
        if (!existsSync(join(dir, `${fuente}.${ext}`))) fallos.push(`${carpeta}/${n}: falta .${ext}`);
      }
      const md = join(dir, `${n}.md`);
      const json = join(dir, `${n}.json`);
      if (!existsSync(md)) fallos.push(`${carpeta}/${n}: falta .md`);
      else {
        const texto = readFileSync(md, 'utf8');
        if (texto.charCodeAt(0) === 0xfeff) fallos.push(`${carpeta}/${n}.md: BOM`);
        if (MOJIBAKE.test(texto)) fallos.push(`${carpeta}/${n}.md: doble codificación`);
      }
      if (!existsSync(json)) fallos.push(`${carpeta}/${n}: falta .json`);
      else if (JSON.parse(readFileSync(json, 'utf8')).$schema !== 'iswc-preview/v1') {
        fallos.push(`${carpeta}/${n}.json: $schema distinto de iswc-preview/v1`);
      }
      const scss = join(dir, `${fuente}.scss`);
      if (!existsSync(scss)) continue;
      const css = readFileSync(scss, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      if (css.includes('--iswc-control-radius')) fallos.push(`${fuente}.scss: --iswc-control-radius no existe`);
      if (/:host\[/.test(css)) fallos.push(`${fuente}.scss: :host[attr] no matchea, usar :host([attr])`);
      if (/\[disabled\][^{]*\{\s*opacity:\s*0?\.(?!55\b)\d+/.test(css)) fallos.push(`${fuente}.scss: deshabilitado distinto de 0.55`);
    }
  }
  assert.deepEqual(fallos, []);
  console.log('contrato-controles.test.ts: PASS');
});

export default lista();
