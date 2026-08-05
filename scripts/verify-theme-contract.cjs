const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.dirname(__dirname);
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src', 'styles', 'presentation.css'), 'utf8');
const palettes = fs.readFileSync(path.join(root, 'src', 'styles', 'palettes.css'), 'utf8');
const component = fs.readFileSync(path.join(root, 'src', 'components', 'actions', 'button.js'), 'utf8');

const system = fs.readFileSync(path.join(root, 'src', 'styles', 'is-base.css'), 'utf8');
const styles = `${system}\n${palettes}\n${css}`;

for (const selector of ['.theme-light', '.theme-dark']) {
  assert(styles.includes(selector), `missing ${selector}`);
}
for (const palette of ['insoft', 'contapyme', 'agrowin']) {
  assert(styles.includes(`[data-palette="${palette}"]`), `missing ${palette} palette`);
}
assert(html.includes('data-palette="insoft"'), 'missing root palette');
assert(!/<(?:svg|symbol|use)\b/i.test(html), 'index contains inline SVG');
assert(!/<(?:svg|symbol|use)\b/i.test(component), 'component contains inline SVG');
assert(!/--pg-/.test(styles), 'presentation tokens still use --pg- prefix');
assert(styles.includes('--is-bg:'), 'missing generic --is-* surface tokens');
assert(!/\bsize\s*=|["']size["']|pgSize|small\s*\|\s*medium\s*\|\s*large/.test(`${html}\n${component}`), 'size API remains');
assert(!/\b(?:height|padding(?:-inline)?|gap):\s*\d+(?:\.\d+)?px/.test(component), 'component geometry must use em');
const manifestPath = path.join(root, 'manifest.js');
const generatorPath = path.join(root, 'scripts', 'generate-templates.mjs');
const previewPath = path.join(root, 'src', 'previews', 'actions', 'is-button.html');
const systemPath = path.join(root, 'src', 'styles', 'is-base.css');
const shellPath = path.join(root, 'src', 'styles', 'shell.css');
for (const file of [manifestPath, generatorPath, previewPath, systemPath, shellPath]) {
  assert(fs.existsSync(file), `missing ${path.relative(root, file)}`);
}
const preview = fs.readFileSync(previewPath, 'utf8');
assert(/<iframe\b/.test(html), 'shell iframe missing');
assert(/id="themeToggle"/.test(html), 'theme toggle missing');
assert(/id="fullscreenBtn"[\s\S]*?variant="plain"[\s\S]*?pill/.test(html) || /variant="plain"[\s\S]*?pill[\s\S]*?id="fullscreenBtn"/.test(html), 'fullscreen must be plain+pill icon button');
assert(/<is-button\b[^>]*id="fullscreenBtn"[^>]*>[\s\n]*<is-icon[^>]*>[\s\n]*<\/is-icon>[\s\n]*<\/is-button>/.test(html), 'fullscreen button must be icon-only is-button');
assert(/<is-theme-toggle\b[^>]*id="themeToggle"/.test(html), 'theme toggle must be is-theme-toggle');
assert(preview.includes('https://www.youtube.com/@JeffAporta'), 'JeffAporta channel missing');
const WA_RE = /webawesome|Web Awesome|\bwa-[a-z]/i;
assert(!WA_RE.test(preview), 'Web Awesome reference remains in is-button preview');
const previewsDir = path.join(root, 'src', 'previews');
const collectHtml = (dir) => {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectHtml(full));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      out.push(path.relative(root, full));
    }
  }
  return out;
};
for (const rel of collectHtml(previewsDir)) {
  const body = fs.readFileSync(path.join(root, rel), 'utf8');
  assert(!WA_RE.test(body), `Web Awesome reference remains in ${rel}`);
}
console.log('theme contract: ok');
