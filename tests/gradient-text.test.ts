// tests/gradient-text.test.ts
//
// El texto con degradado (`background-clip: text` + texto transparente) es
// invisible si el degradado no se aplica. Dos formas reales de romperlo, las
// dos ya ocurridas en este repo:
//
//   1. El degradado esta calibrado para fondo oscuro y en el tema light queda
//      pastel sobre blanco (el titulo del home era ilegible).
//   2. El elemento hereda una `text-shadow`. Con el relleno del glifo en
//      transparente, la sombra NO queda tapada por el texto: se ve a traves y
//      lo despinta. El titulo del home heredaba una sombra blanca al 70% y las
//      letras salian palidas, con el degradado visible solo en el borde.
//   3. Se usa sintaxis que el navegador puede no soportar —color relativo
//      `oklch(from …)` o `min()` dentro de el—. Si no la soporta, la
//      declaracion entera se descarta y el texto queda transparente.
//
// Este test exige, para cada bloque que recorta texto:
//   - un color plano de fallback (no depende del degradado),
//   - que las variantes con color relativo o min() vayan dentro de @supports,
//   - que exista una regla equivalente para el tema light.
//
// Uso:  node tests/gradient-text.test.ts

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

const SCAN = ['previews', 'styles', 'components'];
const EXT = /\.(css|html)$/;

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXT.test(name)) out.push(full);
  }
  return out;
};

const files = [];
for (const d of SCAN) {
  try { walk(join(root, d), files); } catch { /* carpeta ausente */ }
}

const failures = [];

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  if (!/background-clip:\s*text/.test(src)) continue;
  const rel = relative(root, file).split(sep).join('/');

  // Selectores que recortan texto (se toma la clase del selector para poder
  // buscar su contraparte en light).
  const clipped = [...src.matchAll(/([^{}]+)\{([^{}]*background-clip:\s*text[^{}]*)\}/g)];

  for (const [, selectorRaw, body] of clipped) {
    const selector = selectorRaw.trim().split('\n').pop().trim();
    // El nombre de clase principal del selector recortado.
    const cls = (/\.([a-zA-Z0-9_-]+)/.exec(selector) || [])[1];
    if (!cls) continue;

    // 1. Sintaxis fragil sin @supports.
    const usaFragil = /oklch\(\s*from|min\(|color-mix\(/.test(body);
    if (usaFragil) {
      // Debe existir un @supports que envuelva ESE selector en el archivo.
      const dentroDeSupports = new RegExp(
        `@supports[^{]*\\{[\\s\\S]*?\\.${cls}\\b[\\s\\S]*?background-clip:\\s*text`,
      ).test(src);
      if (!dentroDeSupports) {
        failures.push(
          `${rel}: .${cls} recorta texto con sintaxis que puede no soportarse `
          + '(color relativo / min / color-mix) fuera de @supports: si falla, el texto queda invisible',
        );
      }
    }

    // 2. Fallback plano: alguna regla del mismo selector debe fijar un color
    //    solido (o -webkit-text-fill-color no transparente).
    const tieneFallback = new RegExp(
      `\\.${cls}[^{}]*\\{[^{}]*(?:-webkit-text-fill-color:\\s*(?!transparent)|color:\\s*var\\(|color:\\s*#)`,
    ).test(src);
    if (!tieneFallback) {
      failures.push(
        `${rel}: .${cls} no declara un color plano de fallback antes del degradado`,
      );
    }

    // 3. Sombra heredada. `text-shadow` se pinta DEBAJO del texto, pero un
    //    glifo con relleno transparente no la tapa: la sombra se ve a traves y
    //    aclara la letra. Todo selector que recorte texto debe cancelarla.
    // Se busca en el cuerpo del propio bloque recortado o en cualquier otro
    // bloque cuyo selector mencione la misma clase (el fallback plano y la
    // variante light suelen vivir en bloques aparte).
    const cancelaSombra = /text-shadow:\s*none/.test(body)
      || clipped.some(([, selOtro, bodyOtro]) => selOtro.includes(`.${cls}`)
        && /text-shadow:\s*none/.test(bodyOtro))
      || [...src.matchAll(/([^{}]+)\{([^{}]*)\}/g)].some(
        ([, selOtro, bodyOtro]) => selOtro.includes(`.${cls}`)
          && /text-shadow:\s*none/.test(bodyOtro));
    if (!cancelaSombra) {
      failures.push(
        `${rel}: .${cls} recorta texto pero no declara \`text-shadow: none\` — `
        + 'una sombra heredada se ve a traves del glifo transparente y lo despinta',
      );
    }

    // 4. Contraparte para el tema light (los degradados se calibran en dark).
    const tieneLight = new RegExp(`\\[data-theme="light"\\][^{}]*\\.${cls}\\b`).test(src)
      || /prefers-color-scheme:\s*light/.test(src);
    if (!tieneLight) {
      failures.push(
        `${rel}: .${cls} no tiene regla para el tema light — un degradado pensado `
        + 'para fondo oscuro queda ilegible sobre blanco',
      );
    }
  }
}

if (failures.length) {
  console.log('FAIL:');
  for (const f of [...new Set(failures)]) console.log(`  - ${f}`);
  process.exit(1);
}

console.log(`gradient-text.test.ts: PASS — ${files.length} archivos revisados, texto con degradado con fallback, @supports, sin sombra heredada y variante light`);
process.exit(0);
