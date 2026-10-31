// verify-theme-contract.cjs — contrato de tema/paletas, ejecutable suelto:
//
//   deno run -A --no-check scripts/verify-theme-contract.cjs
//
// 1. palettes.scss coincide con palettesScss() (generado desde palettes.json).
// 2. Contraste AA de las 25 paletas × claro/oscuro × Panda (texto ≥ 4.5,
//    on-brand ≥ 3), con la misma matemática que las recetas CSS.
// 3. is-base.scss y palettes.scss reaccionan a data-theme y data-panda.
// La versión de suite es tests/gobernanza/palettes-contrast.test.ts + theme-contract.test.ts.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.dirname(__dirname);
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8').replace(/\r\n/g, '\n');

(async () => {
  const build = await import(require('node:url').pathToFileURL(path.join(root, 'src', 'styles', 'palette-build.ts')).href);
  const palettes = read('src', 'styles', 'palettes.scss');
  const isBase = read('src', 'styles', 'is-base.scss');
  const html = read('index.html');

  assert.equal(palettes, build.palettesScss(), 'palettes.scss desactualizado: corre scripts/gen-palettes.mjs');
  assert.equal(build.PALETTES.length, 25, 'deben ser 25 paletas');
  for (const p of build.PALETTES) assert(palettes.includes(`[data-palette="${p.value}"]`), `falta la paleta ${p.value}`);
  assert(html.includes(`data-palette="${build.DEFAULT_PALETTE}"`), `index.html debe abrir con data-palette="${build.DEFAULT_PALETTE}"`);
  for (const css of [isBase, palettes]) {
    assert(/\[data-theme="light"\]\[data-panda\]/.test(css), 'data-panda en tema claro');
    assert(/\[data-theme="dark"\]\[data-panda\]/.test(css), 'data-panda en tema oscuro');
  }

  const { checked, failures } = build.checkPaletteContrast();
  for (const f of failures) console.error(`  ${f.palette} ${f.theme}${f.panda ? '+panda' : ''}: ${f.fg}/${f.bg} = ${f.ratio} (< ${f.min})`);
  assert.equal(failures.length, 0, `${failures.length} pares sin contraste suficiente`);
  console.log(`theme contract: ok — ${build.PALETTES.length} paletas × claro/oscuro × panda, ${checked} pares de contraste`);
})().catch((err) => { console.error(err.message); process.exit(1); });
