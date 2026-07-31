import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import components from '../manifest.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const previews = path.join(root, 'previews');
const forceIndex = process.argv.indexOf('--force');
const forceTag = forceIndex >= 0 ? process.argv[forceIndex + 1] : null;

for (const component of components) {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/.test(component.tag)) {
    throw new Error(`invalid custom-element tag: ${component.tag}`);
  }

  const destination = path.join(previews, component.page);
  if (fs.existsSync(destination) && forceTag !== component.tag) {
    console.log(`skip ${component.tag}: preview exists`);
    continue;
  }

  const html = `<!DOCTYPE html>
<html lang="es" class="theme-dark" data-theme="dark" data-palette="insoft">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${component.tag} · IS Web Components</title>
  <link rel="stylesheet" href="../styles/is-base.css">
  <link rel="stylesheet" href="../styles/presentation.css">
  <script type="module" src="../components/media/icon.js"></script>
  <script type="module" src="${component.script}"></script>
</head>
<body>
  <main class="main">
    <section class="section">
      <h1>&lt;${component.tag}&gt;</h1>
      <div class="demo"><${component.tag}>${component.title}</${component.tag}></div>
    </section>
  </main>
  <script>
    const root = document.documentElement;
    const themes = new Set(['light', 'dark']);
    const palettes = new Set(['insoft', 'contapyme', 'agrowin']);
    addEventListener('message', ({ data }) => {
      if (data?.type !== 'is-context') return;
      if (themes.has(data.theme)) {
        root.classList.toggle('theme-light', data.theme === 'light');
        root.classList.toggle('theme-dark', data.theme === 'dark');
        root.dataset.theme = data.theme;
      }
      if (palettes.has(data.palette)) root.dataset.palette = data.palette;
    });
  </script>
</body>
</html>
`;

  fs.writeFileSync(destination, html, 'utf8');
  console.log(`write ${component.tag}: ${path.relative(root, destination)}`);
}
