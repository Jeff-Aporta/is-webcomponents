/**
 * w26-lede-trivia-guardian.test.ts — Guardian de párrafos triviales en
 * `src/components/` (recursivo en `*.json`).
 *
 * Estandar W26 (zod-migration): los lede / code / html de los JSON de
 * componentes deben aportar información que el código del demo NO muestre
 * ya de forma obvia. Tres patrones de párrafo trivial que NO deben
 * volver a aparecer:
 *
 *   1. "Pasa el mouse por encima: el borde se rellena. Util cuando..."
 *      Re-explica lo que el <h4> justo encima o el <iswc-button> de abajo
 *      ya muestran por sí solos. (Ejemplo literal del brief W26.)
 *
 *   2. "API declarada en el módulo fuente <code>components/.../X.js</code>."
 *      Puntero muerto: la mayoría apunta a un .js que ni siquiera existe
 *      en este repo (los sub-componentes viven dentro del .js del padre).
 *      Y aunque existiera, la API del componente ya está documentada en
 *      la sección `reference` del propio JSON (tabla atributos/slots/
 *      eventos/parts). No aporta.
 *
 *   3. "Componente InSoft accesible y personalizable, escrito con
 *      JavaScript nativo, Shadow DOM y sin frameworks." (y variantes:
 *      "JavaScript nativo, Shadow DOM, sin frameworks." al final del
 *      párrafo, "Componente InSoft accesible, escrito en JavaScript
 *      nativo con Shadow DOM, sin frameworks."). Marketing boilerplate
 *      genérico que no describe NADA específico de ESTE componente y
 *      se repite en varios .json — el lector ya sabe que es InSoft/
 *      Shadow DOM / zero deps por estar navegando la galeria.
 *
 * El guardian recorre `src/components/` recursivo en `*.json` y FALLA si reaparece
 * cualquiera de los tres patrones. Si necesitas reintroducir uno (p.ej.
 * refactorizas el wording de un lede), actualiza este test junto con el
 * cambio: el guardián es contrato, no sugerencia.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../../..');
const COMPONENTS = join(root, 'src', 'components');

/** Patrones de párrafo trivial. Multi-línea; toleran CRLF y escapes \r\n. */
type Pattern = { id: string; re: RegExp; reason: string };

const PATTERNS: Pattern[] = [
  {
    id: 'pasa-el-mouse',
    re: /Pasa el mouse por encima[^\n<]*Util cuando/,
    reason:
      're-explica el h4/demo de arriba y añade un "Util cuando..." tutorial. ' +
      'El lector ya lo ve al pasar el cursor sobre el botón del demo.',
  },
  {
    id: 'api-declarada-en-el-modulo-fuente',
    re: /API declarada en el m[oó]dulo fuente/,
    reason:
      'puntero a un .js que no existe (los sub-componentes viven dentro del .js ' +
      'del padre). La API ya está en la sección reference del propio JSON.',
  },
  {
    id: 'componente-insoft-accesible-boilerplate',
    re: /Componente InSoft accesible y personalizable,? escrito con JavaScript nativo/,
    reason:
      'marketing boilerplate genérico. No describe nada específico de este ' +
      'componente y se repite en todos los .json — el lector ya lo sabe por ' +
      'estar navegando la galería ISWC.',
  },
  {
    id: 'componente-insoft-accesible-shadow-dom-boilerplate',
    re: /Componente InSoft accesible,? escrito en JavaScript nativo con Shadow DOM,? sin frameworks/,
    reason:
      'variante del boilerplate "Componente InSoft accesible". Tampoco ' +
      'describe este componente.',
  },
  {
    id: 'javascript-nativo-shadow-dom-suffix',
    // Acepta la coma o el punto final, y tolera el sufijo " sin frameworks."
    re: /[.;]\s*JavaScript nativo,?\s*Shadow DOM,?\s*sin frameworks\.?$/m,
    reason:
      'sufijo "JavaScript nativo, Shadow DOM, sin frameworks" en un lede o ' +
      'ficha anatomia. Es genérico del kit, no de ESTE componente.',
  },
];

function walk(dir: string, out: string[] = []): string[] {
  for (const ent of readdirSync(dir)) {
    const p = join(dir, ent);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (p.endsWith('.json')) out.push(p);
  }
  return out;
}

const files = walk(COMPONENTS);

test('W26: hay al menos un .json en src/components/ (sanity check del barrido)', () => {
  assert.ok(
    files.length > 0,
    `src/components/ (recursivo) debería tener archivos JSON; se encontraron ${files.length}. ` +
      'Si renombraste la carpeta, actualiza el guardián.',
  );
});

for (const pat of PATTERNS) {
  test(`W26: ningún .json contiene patrón trivial "${pat.id}"`, () => {
    const offending: string[] = [];
    for (const f of files) {
      const text = readFileSync(f, 'utf8');
      if (pat.re.test(text)) {
        offending.push(relative(root, f).split(sep).join('/'));
      }
    }
    assert.equal(
      offending.length,
      0,
      `Patrón trivial "${pat.id}" reapareció en ${offending.length} archivo(s):\n` +
        offending.map((p) => `  - ${p}`).join('\n') +
        `\n\nMotivo: ${pat.reason}\n` +
        'Si reintroduces el patrón a propósito, actualiza este guardián.',
    );
  });
}

test('W26: barrido cubre los 3 archivos del brief (button, split-panel, card) como caso de regresión', () => {
  // Estos 3 son los archivos donde originalmente vivía el boilerplate
  // "Componente InSoft accesible..." en lede + ficha anatomia. Si vuelven
  // a contenerlo, falla el guardián anterior; este test confirma que
  // esos archivos siguen parseando como JSON después de la limpieza.
  for (const rel of [
    'src/components/actions/button.json',
    'src/components/layout/split-panel.json',
    'src/components/layout/card.json',
  ]) {
    const abs = join(root, rel);
    const text = readFileSync(abs, 'utf8');
    assert.doesNotThrow(
      () => JSON.parse(text),
      `${rel} debe seguir siendo JSON válido`,
    );
    assert.ok(
      !PATTERNS.find((p) => p.id === 'componente-insoft-accesible-boilerplate')!.re.test(text),
      `${rel} no debe contener el boilerplate eliminado en W26`,
    );
  }
});
