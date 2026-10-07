// home-cdn.ts — Inicializa el módulo de consumo por CDN en el home.
// Migrado de `scripts/home-cdn.js` (2026-09-07): S-DEP-FUERA exige que
// `src/` no dependa de `scripts/`.
//
// Sin literales `</script>` en este archivo: se construye con fromCharCode
// para evitar que el lexer HTML cierre el `<script>` de este módulo.

import { paint } from '../components/_shared/highlight-code.js';

const LOADER =
  'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/cdn/core/loader.min.js';

const open = String.fromCharCode(60);
const slash = String.fromCharCode(47);
const close = String.fromCharCode(62);

/** Tags del snippet “por componente” (mismo set que el resultado en vivo). */
const DEMO_TAGS = [
  'iswc-button',
  'iswc-badge',
  'iswc-rating',
  'iswc-switch',
  'iswc-sparkline',
] as const;

/** Bloque module: import loader + palettes + load(...tags). */
const buildLoaderBoot = (tags: readonly string[]): string => [
  `${open}script type="module"${close}`,
  `  import { ISWebComponentsLoader as L } from '${LOADER}';`,
  `  // is-base.min.css se auto-carga al importar el loader (W52).`,
  `  await L.loadPageStyles(['iswc-palettes-default']);`,
  tags.length === 1
    ? `  await L.load('${tags[0]}');`
    : [
        `  await L.load(`,
        ...tags.map((t, i) => `    '${t}'${i < tags.length - 1 ? ',' : ''}`),
        `  );`,
      ].join('\n'),
  `${open}${slash}script${close}`,
].join('\n');

// Loader + tags concretos. Nunca rutas .min.js quemadas: el loader enruta.
const buildJsCssSnippet = (): string => [
  `${open}!-- Loader: pide solo los tags que uses --${close}`,
  buildLoaderBoot(DEMO_TAGS),
  '',
  `${open}!-- ...y úsalos como HTML nativo --${close}`,
  `${open}iswc-button color="brand"${close}Explorar${open}${slash}iswc-button${close}`,
  `${open}iswc-badge color="success"${close}+12%${open}${slash}iswc-badge${close}`,
  `${open}iswc-rating value="4" readonly${close}${open}${slash}iswc-rating${close}`,
  `${open}iswc-switch checked${close}${open}${slash}iswc-switch${close}`,
  `${open}iswc-sparkline values="4,6,5,8,7,11,13"${close}${open}${slash}iswc-sparkline${close}`,
].join('\n');

// Loader + kit completo (equivalente moderno a all.min.js).
const buildBundleSnippet = (): string => [
  `${open}!-- Loader: un solo load('all') trae el kit --${close}`,
  buildLoaderBoot(['all']),
  '',
  `${open}iswc-button color="brand"${close}Hola mundo${open}${slash}iswc-button${close}`,
].join('\n');

/** Tags del HTML descargable (demo amplia). */
const DOWNLOAD_TAGS = [
  'iswc-theme-toggle',
  'iswc-button', 'iswc-tag', 'iswc-badge', 'iswc-avatar', 'iswc-icon',
  'iswc-toast', 'iswc-tooltip',
  'iswc-input', 'iswc-select', 'iswc-option', 'iswc-switch', 'iswc-checkbox',
  'iswc-slider', 'iswc-rating',
  'iswc-format-bytes', 'iswc-format-date', 'iswc-format-number',
  'iswc-bar-chart', 'iswc-line-chart', 'iswc-doughnut-chart', 'iswc-sparkline',
  'iswc-data-grid', 'iswc-diagram-lightbox',
] as const;

const chartTile = (type: string, json: string): string => `        ${open}div class="tile"${close}
          ${open}small${close}${type}${open}${slash}small${close}
          ${open}iswc-${type}${close}
            ${open}script type="application/json"${close}
              ${json}
            ${open}${slash}script${close}
          ${open}${slash}iswc-${type}${close}
        ${open}${slash}div${close}`;

const buildDemoHtml = (variant: string): string => {
  const loadLine = variant === 'bundle'
    ? `  await L.load('all');`
    : [
        `  await L.load(`,
        ...DOWNLOAD_TAGS.map((t, i) => `    '${t}'${i < DOWNLOAD_TAGS.length - 1 ? ',' : ''}`),
        `  );`,
      ].join('\n');

  const moduleBoot = [
    `${open}script type="module"${close}`,
    `  import { ISWebComponentsLoader as L } from '${LOADER}';`,
    `  await L.loadPageStyles(['iswc-palettes-default']);`,
    loadLine,
    `${open}${slash}script${close}`,
  ].join('\n');

  return `<!DOCTYPE html>
<html lang="es" class="theme-dark" data-theme="dark" data-palette="contapyme">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ISWC · demo CDN</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      background: var(--iswc-bg);
      color: var(--iswc-text);
    }
    header {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--iswc-border);
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
      color: var(--iswc-text-soft);
    }
    .row { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr)); gap: 0.75rem; }
    .tile {
      border: 1px solid var(--iswc-border);
      border-radius: 0.65rem;
      padding: 0.85rem 1rem;
      background: var(--iswc-bg-elev);
    }
    iswc-bar-chart, iswc-line-chart, iswc-doughnut-chart, iswc-pie-chart,
    iswc-polar-area-chart, iswc-radar-chart, iswc-scatter-chart, iswc-bubble-chart,
    iswc-sparkline { display: block; width: 100%; }
    iswc-bar-chart, iswc-line-chart { height: 9rem; }
    iswc-doughnut-chart, iswc-pie-chart, iswc-polar-area-chart, iswc-radar-chart,
    iswc-scatter-chart, iswc-bubble-chart { height: 12rem; }
    pre.code {
      background: var(--iswc-code-bg, #0f1318);
      border: 1px solid var(--iswc-border);
      border-radius: 0.4rem;
      padding: 0.5rem 0.65rem;
      font-family: ui-monospace, Consolas, monospace;
      font-size: 0.8rem;
      overflow-x: auto;
      color: var(--iswc-text);
    }
    small { color: var(--iswc-text-soft); }
  </style>
${moduleBoot}
</head>
<body>
  <header>
    <h1>ISWC — demo por CDN</h1>
    <small>Variante: ${variant === 'bundle' ? "L.load('all')" : 'L.load(tags…)'}</small>
  </header>

  <main>
    <section>
      <h2>Tema y tokens</h2>
      <div class="row">
        <iswc-theme-toggle id="theme"></iswc-theme-toggle>
        <label class="row" style="gap:0.35rem">
          <span>Paleta</span>
          <select id="palette" style="background:transparent;color:inherit;border:1px solid var(--iswc-border);border-radius:0.4rem;padding:0.25rem 0.5rem">
            <option value="contapyme">ContaPyme</option>
            <option value="insoft">InSoft</option>
            <option value="agrowin">AgroWin</option>
          </select>
        </label>
      </div>
      <small id="paletteTag"></small>
    </section>

    <section>
      <h2>Acciones</h2>
      <div class="row">
        <iswc-button color="brand" variant="filled">Primario</iswc-button>
        <iswc-button color="neutral" variant="outlined">Secundario</iswc-button>
        <iswc-button color="danger" variant="plain">Peligro</iswc-button>
        <iswc-tag color="brand">InSoft</iswc-tag>
        <iswc-tag color="success">Success</iswc-tag>
        <iswc-badge color="danger">new</iswc-badge>
        <iswc-avatar initials="JE" label="Jeff"></iswc-avatar>
      </div>
    </section>

    <section>
      <h2>Forms</h2>
      <div class="row">
        <iswc-input label="Email" type="email" placeholder="hola@insoft.co" style="min-width:14rem"></iswc-input>
        <iswc-select label="Rol">
          <iswc-option value="dev">Dev</iswc-option>
          <iswc-option value="qa">QA</iswc-option>
          <iswc-option value="pm">PM</iswc-option>
        </iswc-select>
        <iswc-switch label="Notificaciones" checked></iswc-switch>
        <iswc-checkbox checked>Acepto términos</iswc-checkbox>
        <iswc-slider min="0" max="100" value="42" label="Volumen"></iswc-slider>
        <iswc-rating value="4" max="5"></iswc-rating>
      </div>
    </section>

    <section>
      <h2>Format</h2>
      <iswc-format-bytes value="1536"></iswc-format-bytes>,
      <iswc-format-number value="1234567.89" minimum-fraction-digits="2"></iswc-format-number>,
      <iswc-format-date value="2026-07-31" date-style="long"></iswc-format-date>
    </section>

    <section>
      <h2>Charts</h2>
      <div class="grid">
${chartTile('bar-chart', '{ "data": { "labels": ["Ene","Feb","Mar","Abr","May","Jun"], "datasets": [{ "label": "Ventas", "data": [12, 18, 9, 24, 22, 28] }] } }')}
${chartTile('line-chart', '{ "data": { "labels": ["L","M","X","J","V","S","D"], "datasets": [{ "label": "Visitas", "data": [120, 190, 170, 240, 280, 210, 150], "fill": true, "tension": 0.4 }] } }')}
${chartTile('doughnut-chart', '{ "data": { "labels": ["Inventario","Cartera","Bancos"], "datasets": [{ "data": [42, 28, 30] }] } }')}
        <div class="tile">
          <small>Sparkline</small>
          <iswc-sparkline data="4 6 5 8 7 11 13" trend="positive"></iswc-sparkline>
        </div>
      </div>
    </section>

    <section>
      <h2>Data grid</h2>
      <iswc-data-grid style="height:18rem" show-toolbar quick-filter checkbox-selection pagination page-size="5">
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
      </iswc-data-grid>
    </section>

    <section>
      <h2>Diagrama</h2>
      <button type="button" id="openDiag">Abrir visor a pantalla completa</button>
      <iswc-diagram-lightbox id="dlb" kind="sequence"></iswc-diagram-lightbox>
    </section>

    <pre class="code">${variant === 'bundle'
  ? `&lt;script type="module"&gt;
  import { ISWebComponentsLoader as L } from '${LOADER}';
  await L.loadPageStyles(['iswc-palettes-default']);
  await L.load('all');
&lt;/script&gt;`
  : `&lt;script type="module"&gt;
  import { ISWebComponentsLoader as L } from '${LOADER}';
  await L.loadPageStyles(['iswc-palettes-default']);
  await L.load('iswc-button', /* …tags */);
&lt;/script&gt;`
}</pre>
  </main>

  <script>
    const root = document.documentElement;
    const palette = document.getElementById('palette');
    const tag = document.getElementById('paletteTag');
    palette.addEventListener('change', () => {
      root.dataset.palette = palette.value;
      tag.textContent = 'Paleta activa: ' + palette.value;
    });
    tag.textContent = 'Paleta activa: ' + (root.dataset.palette || 'contapyme');

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

const downloadHtml = (variant: string): void => {
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

/** El handler delegado se registra una sola vez por documento. */
let copiaCableada = false;

/**
 * Rellena los snippets y cablea pestañas y copia dentro de `raiz`.
 *
 * Es una función y no efectos de módulo porque el home se monta y desmonta
 * dentro de la galería: con la lógica al importar, un segundo montaje dejaba
 * los `<pre>` vacíos (el módulo ya estaba en caché y no volvía a ejecutarse).
 */
export function init(raiz: ParentNode = document): void {
  const preJs = raiz.querySelector('#cdnJsCss');
  const preB = raiz.querySelector('#cdnBundle');
  // iswc-audit: diagnóstico para entender por qué los iswc-code no recibían
  // contenido. Antes: `preJs` se buscaba con el id solo, pero al haber
  // cambiado el contenedor `<pre>` por `<iswc-code>` el lookup seguía
  // funcionando. Lo que NO se actualizaba era el dataset cmSource + value
  // cuando el iswc-code aún no había sido upgraded: en ese momento
  // `el.value = text` no hace nada (la propiedad se setea DESPUÉS del
  // upgrade, vía attributeChangedCallback). Por eso el snippet quedaba
  // vacío. Fix: usar el atributo `value` directamente, que sí es
  // observado desde antes del upgrade.
  if (preJs && preJs.localName === 'iswc-code') {
    (preJs as HTMLElement).setAttribute('value', jsCssSnippet);
    (preJs as HTMLElement).dataset.cmSource = jsCssSnippet;
  } else if (preJs) {
    preJs.textContent = jsCssSnippet;
  }
  if (preB && preB.localName === 'iswc-code') {
    (preB as HTMLElement).setAttribute('value', bundleSnippet);
    (preB as HTMLElement).dataset.cmSource = bundleSnippet;
  } else if (preB) {
    preB.textContent = bundleSnippet;
  }
  // setSnippet ya no se necesita: el bloque de arriba cubre los tres
  // casos (iswc-code, pre/textarea, no-encontrado).

  // Resaltado vía <iswc-code readonly> (paint sustituye pre.code legacy).
  // Cast a Document: la firma de paint usa `(root = document)` por lo que TS
  // infiere el parámetro como `Document`, pero la implementación interna
  // acepta cualquier Element/ParentNode/ShadowRoot.
  Promise.all([
    preJs ? paint(preJs as unknown as Document) : null,
    preB ? paint(preB as unknown as Document) : null,
  ]).catch(console.error);

  // Tabs.
  const tabs = raiz.querySelectorAll('.home-cdn__tab');
  const panels = raiz.querySelectorAll('.home-cdn__panel');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = (tab as HTMLElement).dataset.tab;
      tabs.forEach((t) => t.setAttribute('aria-pressed', String(t === tab)));
      panels.forEach((p) => {
        (p as HTMLElement).hidden = (p as HTMLElement).dataset.panel !== target;
      });
    });
  });

  if (!copiaCableada) {
    cablearCopiaYDescarga();
    copiaCableada = true;
  }
}

// Copy-to-clipboard (fallback para file:// o contextos sin clipboard API).
const writeText = async (text: string): Promise<void> => {
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
function cablearCopiaYDescarga(): void {
  document.addEventListener('click', async (ev) => {
    const target = ev.target as HTMLElement | null;
    const btn = target?.closest?.('.home-cdn__copy') as HTMLElement | null;
    if (!btn) return;
    ev.preventDefault();
    const key = btn.dataset.copy;
    if (key) {
      const text = key === 'bundle' ? bundleSnippet : jsCssSnippet;
      try {
        await writeText(text);
        btn.setAttribute('aria-pressed', 'true');
        const label = btn.querySelector('iswc-icon');
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
}

export default init;