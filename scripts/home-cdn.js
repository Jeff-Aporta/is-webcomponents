// home-cdn.js — Inicializa el módulo de consumo por CDN en el home.
// Sin literales `</script>` en este archivo: se construye con fromCharCode
// para evitar que el lexer HTML cierre el `<script>` de este módulo.

const CDN = 'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/cdn';

// dist/cdn folderizado por categoria: <categoria>/<tag>.min.js
import manifest from '../manifest.js';
const catOf = (name) => manifest.find((c) => c.tag === `is-${name}`)?.category || 'helpers';
const cdnJs = (name) => `${CDN}/${catOf(name)}/${name}.min.js`;
const open = String.fromCharCode(60);
const slash = String.fromCharCode(47);
const close = String.fromCharCode(62);

// Sin <link> de CSS: cada .min.js carga su .min.css hermano en su Shadow DOM.
const buildJsCssSnippet = () => [
  `${open}!-- Carga solo los componentes que necesites --${close}`,
  `${open}script type="module" src="${cdnJs('button')}"${close}${open}${slash}script${close}`,
  `${open}script type="module" src="${cdnJs('badge')}"${close}${open}${slash}script${close}`,
  `${open}script type="module" src="${cdnJs('rating')}"${close}${open}${slash}script${close}`,
  `${open}script type="module" src="${cdnJs('switch')}"${close}${open}${slash}script${close}`,
  `${open}script type="module" src="${cdnJs('sparkline')}"${close}${open}${slash}script${close}`,
  '',
  `${open}!-- ...y úsalos como HTML nativo --${close}`,
  `${open}is-button variant="brand"${close}Explorar${open}${slash}is-button${close}`,
  `${open}is-badge variant="success"${close}+12%${open}${slash}is-badge${close}`,
  `${open}is-rating value="4" readonly${close}${open}${slash}is-rating${close}`,
  `${open}is-switch checked${close}${open}${slash}is-switch${close}`,
  `${open}is-sparkline values="4,6,5,8,7,11,13"${close}${open}${slash}is-sparkline${close}`,
].join('\n');

const buildBundleSnippet = () => [
  `${open}!-- Todos los componentes en un solo archivo --${close}`,
  `${open}script type="module" src="${CDN}/all.min.js"${close}${open}${slash}script${close}`,
  '',
  `${open}!-- O una categoría completa (actions, forms, charts, ...) --${close}`,
  `${open}script type="module" src="${CDN}/actions/category.actions.min.js"${close}${open}${slash}script${close}`,
  '',
  `${open}is-button variant="brand"${close}Hola mundo${open}${slash}is-button${close}`,
].join('\n');

// ── html autocontenido para descargar ─────────────────────────────
const modules = [
  'button', 'card', 'badge', 'tag', 'icon', 'avatar',
  'toast', 'tooltip', 'theme-toggle',
  'split-panel', 'main',
  'combobox', 'select', 'input', 'textarea', 'slider', 'switch',
  'rating', 'checkbox', 'radio-group', 'file-input',
  'date-input', 'date-picker',
  'format-bytes', 'format-date', 'format-number',
  'chart', 'bar-chart', 'line-chart', 'doughnut-chart', 'pie-chart',
  'polar-area-chart', 'radar-chart', 'scatter-chart', 'bubble-chart', 'sparkline',
  'data-grid', 'lightbox', 'diagram-lightbox', 'popover',
  'sequence-diagram',
];

const chartTile = (type, json) => `        ${open}div class="tile"${close}
          ${open}small${close}${type}${open}${slash}small${close}
          ${open}is-${type}${close}
            ${open}script type="application/json"${close}
              ${json}
            ${open}${slash}script${close}
          ${open}${slash}is-${type}${close}
        ${open}${slash}div${close}`;

const buildDemoHtml = (variant) => {
  const imp = `${open}script type="importmap"${close}\n{\n  "imports": {\n    "@is-webcomponents/": "${CDN}/"\n  }\n}\n${open}${slash}script${close}`;
  const mod = `${open}script type="module"${close}\n  ${modules.map((m) => `import '@is-webcomponents/${catOf(m)}/${m}.min.js';`).join('\n  ')}\n${open}${slash}script${close}`;
  const moduleImports = (variant === 'bundle')
    ? `${imp}\n\n${mod}`
    : modules.map((m) => `  ${open}script type="module" src="${cdnJs(m)}"${close}${open}${slash}script${close}`).join('\n');

  return `<!DOCTYPE html>
<html lang="es" class="theme-dark" data-theme="dark" data-palette="insoft">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>IS Web Components · demo CDN</title>
  <link rel="stylesheet" href="${CDN}/is-base.min.css">
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      background: var(--is-bg);
      color: var(--is-text);
    }
    header {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--is-border);
    }
    header h1 { margin: 0; font-size: 1rem; font-weight: 700; }
    main {
      max-width: 60rem;
      margin: 0 auto;
      padding: 1.5rem;
      display: grid;
      gap: 1.5rem;
    }
    section { display: grid; gap: 0.65rem; }
    section h2 {
      margin: 0;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--is-text-soft);
    }
    .row { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr)); gap: 0.75rem; }
    .tile {
      border: 1px solid var(--is-border);
      border-radius: 0.65rem;
      padding: 0.85rem 1rem;
      background: var(--is-bg-elev);
    }
    is-bar-chart, is-line-chart, is-doughnut-chart, is-pie-chart,
    is-polar-area-chart, is-radar-chart, is-scatter-chart, is-bubble-chart,
    is-sparkline { display: block; width: 100%; }
    is-bar-chart, is-line-chart { height: 9rem; }
    is-doughnut-chart, is-pie-chart, is-polar-area-chart, is-radar-chart,
    is-scatter-chart, is-bubble-chart { height: 12rem; }
    pre.code {
      background: var(--is-code-bg, #0f1318);
      border: 1px solid var(--is-border);
      border-radius: 0.4rem;
      padding: 0.5rem 0.65rem;
      font-family: ui-monospace, Consolas, monospace;
      font-size: 0.8rem;
      overflow-x: auto;
      color: var(--is-text);
    }
    small { color: var(--is-text-soft); }
  </style>
</head>
<body>
  <header>
    <h1>IS Web Components — demo por CDN</h1>
    <small>Variante: ${variant === 'bundle' ? 'import map' : 'JS + CSS por componente'}</small>
  </header>

  <main>
    <section>
      <h2>Tema y tokens</h2>
      <div class="row">
        <is-theme-toggle id="theme"></is-theme-toggle>
        <label class="row" style="gap:0.35rem">
          <span>Paleta</span>
          <select id="palette" style="background:transparent;color:inherit;border:1px solid var(--is-border);border-radius:0.4rem;padding:0.25rem 0.5rem">
            <option value="insoft">Insoft</option>
            <option value="contapyme">ContaPyme</option>
            <option value="agrowin">AgroWin</option>
          </select>
        </label>
      </div>
      <small id="paletteTag"></small>
    </section>

    <section>
      <h2>Acciones</h2>
      <div class="row">
        <is-button variant="brand" appearance="filled">Primario</is-button>
        <is-button variant="neutral" appearance="outlined">Secundario</is-button>
        <is-button variant="danger" appearance="plain">Peligro</is-button>
        <is-tag variant="brand">Insoft</is-tag>
        <is-tag variant="success">Success</is-tag>
        <is-badge variant="danger">new</is-badge>
        <is-avatar initials="JE" label="Jeff"></is-avatar>
      </div>
    </section>

    <section>
      <h2>Forms</h2>
      <div class="row">
        <is-input label="Email" type="email" placeholder="hola@insoft.co" style="min-width:14rem"></is-input>
        <is-select label="Rol">
          <is-option value="dev">Dev</is-option>
          <is-option value="qa">QA</is-option>
          <is-option value="pm">PM</is-option>
        </is-select>
        <is-switch label="Notificaciones" checked></is-switch>
        <is-checkbox checked>Acepto términos</is-checkbox>
        <is-slider min="0" max="100" value="42" label="Volumen"></is-slider>
        <is-rating value="4" max="5"></is-rating>
      </div>
    </section>

    <section>
      <h2>Format</h2>
      <is-format-bytes value="1536"></is-format-bytes>,
      <is-format-number value="1234567.89" minimum-fraction-digits="2"></is-format-number>,
      <is-format-date value="2026-07-31" date-style="long"></is-format-date>
    </section>

    <section>
      <h2>Charts</h2>
      <div class="grid">
${chartTile('bar-chart', '{ "data": { "labels": ["Ene","Feb","Mar","Abr","May","Jun"], "datasets": [{ "label": "Ventas", "data": [12, 18, 9, 24, 22, 28] }] } }')}
${chartTile('line-chart', '{ "data": { "labels": ["L","M","X","J","V","S","D"], "datasets": [{ "label": "Visitas", "data": [120, 190, 170, 240, 280, 210, 150], "fill": true, "tension": 0.4 }] } }')}
${chartTile('doughnut-chart', '{ "data": { "labels": ["Inventario","Cartera","Bancos"], "datasets": [{ "data": [42, 28, 30] }] } }')}
        <div class="tile">
          <small>Sparkline</small>
          <is-sparkline data="4 6 5 8 7 11 13" trend="positive"></is-sparkline>
        </div>
      </div>
    </section>

    <section>
      <h2>Data grid</h2>
      <is-data-grid style="height:18rem" show-toolbar quick-filter checkbox-selection pagination page-size="5">
        <script type="application/json">
          {
            "columns": [
              { "field": "id", "headerName": "ID", "width": 64 },
              { "field": "name", "headerName": "Nombre", "flex": 1 },
              { "field": "city", "headerName": "Ciudad", "width": 140 },
              { "field": "gross", "headerName": "Bruto", "type": "number", "width": 120 }
            ],
            "rows": [
              { "id": 1, "name": "Ana P.", "city": "Bogotá", "gross": 4200 },
              { "id": 2, "name": "Luis M.", "city": "Medellín", "gross": 3800 },
              { "id": 3, "name": "Sofía R.", "city": "Cali", "gross": 5100 },
              { "id": 4, "name": "Diego L.", "city": "Barranquilla", "gross": 2950 },
              { "id": 5, "name": "Camila J.", "city": "Bogotá", "gross": 6300 },
              { "id": 6, "name": "Pedro G.", "city": "Pereira", "gross": 1820 }
            ]
          }
        </script>
      </is-data-grid>
    </section>

    <section>
      <h2>Diagrama</h2>
      <button type="button" id="openDiag">Abrir visor a pantalla completa</button>
      <is-diagram-lightbox id="dlb" kind="sequence"></is-diagram-lightbox>
    </section>

    <pre class="code">${variant === 'bundle'
  ? `&lt;script type="importmap"&gt;
  { "imports": { "@is-webcomponents/": "${CDN}/" } }
&lt;/script&gt;
&lt;script type="module"&gt;
  import '@is-webcomponents/button.min.js';
  // …
&lt;/script&gt;`
  : `&lt;link rel="stylesheet" href="${CDN}/is-base.min.css"&gt;
&lt;script type="module" src="${CDN}/button.min.js"&gt;&lt;/script&gt;`
}</pre>
  </main>

${moduleImports}

  <script>
    const root = document.documentElement;
    const palette = document.getElementById('palette');
    const tag = document.getElementById('paletteTag');
    palette.addEventListener('change', () => {
      root.dataset.palette = palette.value;
      tag.textContent = 'Paleta activa: ' + palette.value;
    });
    tag.textContent = 'Paleta activa: ' + (root.dataset.palette || 'insoft');

    document.getElementById('openDiag').addEventListener('click', () => {
      const lb = document.getElementById('dlb');
      lb.payload = { preset: 'tk1437191' };
      lb.open = true;
    });
  </script>
</body>
</html>
`;
};

const downloadHtml = (variant) => {
  const html = buildDemoHtml(variant);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = variant === 'bundle' ? 'is-webcomponents-demo-bundle.html' : 'is-webcomponents-demo.html';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// ── Init ──────────────────────────────────────────────────────────
const jsCssSnippet = buildJsCssSnippet();
const bundleSnippet = buildBundleSnippet();

const preJs = document.getElementById('cdnJsCss');
const preB = document.getElementById('cdnBundle');
if (preJs) preJs.textContent = jsCssSnippet;
if (preB) preB.textContent = bundleSnippet;

// Resaltado por CodeMirror (puede llegar tarde desde jsDelivr).
const highlightCdn = () => {
  if (typeof window.__isHighlightCode !== 'function') return false;
  window.__isHighlightCode(preJs);
  window.__isHighlightCode(preB);
  return true;
};
if (!highlightCdn()) {
  let tries = 0;
  const iv = setInterval(() => {
    if (highlightCdn() || ++tries > 60) clearInterval(iv);
  }, 100);
}

// Tabs.
const tabs = document.querySelectorAll('.home-cdn__tab');
const panels = document.querySelectorAll('.home-cdn__panel');
tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    tabs.forEach((t) => t.setAttribute('aria-pressed', String(t === tab)));
    panels.forEach((p) => { p.hidden = p.dataset.panel !== target; });
  });
});

// Copy-to-clipboard (fallback para file:// o contextos sin clipboard API).
const writeText = async (text) => {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;left:-9999px;top:0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
};

// Delegated handler: cualquier botón .home-cdn__copy se resuelve en click.
// Usamos delegación porque los botones pueden re-renderizarse (algunos
// componentes del home los reemplazan) y un listener directo se perdería.
document.addEventListener('click', async (ev) => {
  const btn = ev.target?.closest?.('.home-cdn__copy');
  if (!btn) return;
  ev.preventDefault();
  const key = btn.dataset.copy;
  if (key) {
    const text = key === 'bundle' ? bundleSnippet : jsCssSnippet;
    try {
      await writeText(text);
      btn.setAttribute('aria-pressed', 'true');
      const label = btn.querySelector('is-icon');
      if (label) label.setAttribute('icon', 'mdi:check');
      btn.lastChild && (btn.lastChild.textContent = ' Copiado');
      setTimeout(() => {
        btn.removeAttribute('aria-pressed');
        if (label) label.setAttribute('icon', 'mdi:content-copy');
        btn.lastChild && (btn.lastChild.textContent = ' Copiar');
      }, 1500);
    } catch {
      btn.lastChild && (btn.lastChild.textContent = ' Error');
      setTimeout(() => { btn.lastChild && (btn.lastChild.textContent = ' Copiar'); }, 1500);
    }
    return;
  }

  const kind = btn.dataset.download;
  if (kind) downloadHtml(kind);
});