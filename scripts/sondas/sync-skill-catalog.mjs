// @contexto INDICE.md · scripts/README.md
// Regenera el índice de la skill general y completa guías o páginas que falten.
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = join(import.meta.dirname, '..', '..');
const comp = join(root, 'src', 'components');
const gh = 'https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components';

const faltantes = [
  ['actions/speed-dial-action.md', 'iswc-speed-dial-action', 'actions', 'Acción hija de `<iswc-speed-dial>`. No se usa sola: vive dentro del speed dial y dispara su comando.'],
  ['data/kanban-column.md', 'iswc-kanban-column', 'data', 'Columna de `<iswc-kanban>`. Declara el estado del tablero; las tarjetas van dentro.'],
  ['data/kanban-card.md', 'iswc-kanban-card', 'data', 'Tarjeta de `<iswc-kanban>`. Representa un ítem movible dentro de una columna.'],
  ['data/transfer-item.md', 'iswc-transfer-item', 'data', 'Ítem de `<iswc-transfer>`. Es una opción de la lista origen o destino, no un control suelto.'],
  ['data-viz/map-marker.md', 'iswc-map-marker', 'data-viz', 'Marcador de `<iswc-maps>`. Señala un punto; el mapa lo posiciona.'],
  ['layout/dock-item.md', 'iswc-dock-item', 'layout', 'Ítem de `<iswc-dock>`. Un acceso del dock, con icono y acción.'],
  ['layout/demo.md', 'iswc-demo', 'layout', 'Caja de demostración de la galería. Envuelve un ejemplo y ofrece ver código y fuentes.'],
  ['layout/preview-component.md', 'iswc-preview-component', 'preview', 'Shell de la galería. Pinta una definición JSON de preview; no es un control de producto.'],
  ['layout/preview-controls.md', 'iswc-preview-controls', 'preview', 'Panel de controles del playground. Aplica props de la definición JSON al ejemplo activo.'],
  ['navigation/carousel-item.md', 'iswc-carousel-item', 'navigation', 'Lámina de `<iswc-carousel>`. Un paso del carrusel; el grupo controla el avance.'],
  ['navigation/stepper-step.md', 'iswc-stepper-step', 'navigation', 'Paso de `<iswc-stepper>`. Marca una etapa; el stepper lleva el estado activo.'],
  ['navigation/tab.md', 'iswc-tab', 'navigation', 'Pestaña de `<iswc-tab-group>`. Elige el panel; no sustituye al grupo.'],
  ['navigation/tab-panel.md', 'iswc-tab-panel', 'navigation', 'Panel de `<iswc-tab-group>`. El contenido que se muestra al activar su `<iswc-tab>`.'],
  ['navigation/tree-item.md', 'iswc-tree-item', 'navigation', 'Nodo de `<iswc-tree>`. Puede tener hijos y se expande dentro del árbol.'],
  ['helpers/floating.md', 'iswc-floating', 'helpers', 'Posicionamiento anclado interno. No es API de producto: en apps se usa `<iswc-popover>` o `<iswc-tooltip>`.'],
];

for (const [rel, tag, category, resumen] of faltantes) {
  const file = join(comp, rel);
  if (existsSync(file)) continue;
  mkdirSync(dirname(file), { recursive: true });
  const interno = tag === 'iswc-floating' ? 'internal' : 'public';
  writeFileSync(file, `---
tag: ${tag}
tags:
  - ${tag}
category: ${category}
status: ${interno}
---
# \`<${tag}>\`

## Propósito

${resumen}

## Cuándo usarlo

Cuando el componente padre ya está en la pantalla y este tag es la pieza que le falta.

## Cuándo no usarlo

No lo reimplementes ni lo uses para sustituir al padre. La guía del padre documenta el conjunto.

## Ejemplo mínimo

\`\`\`html
<${tag}></${tag}>
\`\`\`
`, 'utf8');
  console.log('md', rel);
}

/** Tags CE en títulos → entidades (el H2 usa textContent y las decodifica). */
function escapeTitleCe(title) {
  return String(title).replace(/<\/?([a-zA-Z][\w]*-[\w.-]*)\b[^>]*>/g, (m) =>
    m.includes('&lt;') ? m : m.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
}

function preview(tag, category, title, lede, html) {
  const safeTitle = escapeTitleCe(title);
  return {
    $schema: 'iswc-preview/v1',
    tag,
    category,
    title: safeTitle,
    titleHtml: false,
    description: lede,
    sections: [{
      id: 'intro',
      title: safeTitle,
      lede,
      blocks: [{ kind: 'demo', html }],
    }],
  };
}

const pages = [
  ['layout/demo.json', preview(
    'iswc-demo', 'layout', '<iswc-demo>',
    'Caja de los ejemplos de la galería.',
    '<iswc-demo heading="Ejemplo"><p>El contenido del ejemplo va en light DOM.</p></iswc-demo>',
  )],
  ['helpers/floating.json', preview(
    'iswc-floating', 'helpers', '<iswc-floating> (interno)',
    'Building block interno. En producto usa iswc-popover o iswc-tooltip.',
    '<iswc-floating placement="bottom" active><button slot="anchor" type="button">Ancla</button><div>Contenido anclado. No usar este tag en apps.</div></iswc-floating>',
  )],
  ['layout/preview-component.json', preview(
    'iswc-preview-component', 'preview', '<iswc-preview-component>',
    'Shell que monta una definición JSON de la galería. La propia galería es el ejemplo vivo.',
    '<p>La galería asigna la propiedad <code>preview</code> y este tag pinta el documento, el índice y los demos. No evalúa código de comportamiento.</p>',
  )],
  ['layout/preview-controls.json', preview(
    'iswc-preview-controls', 'preview', '<iswc-preview-controls>',
    'Panel de knobs del playground. La galería le pasa spec y escucha iswc-controls-change.',
    '<iswc-preview-controls label="Controles"></iswc-preview-controls>',
  )],
];

for (const [rel, data] of pages) {
  const file = join(comp, rel);
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  const dist = join(root, 'dist', 'previews', rel);
  mkdirSync(dirname(dist), { recursive: true });
  copyFileSync(file, dist);
  console.log('page', rel);
}

function resumenDe(md, fallback) {
  const cuando = md.match(/## Cuándo usarlo\s*\r?\n+([^\r\n#].+)/);
  const prop = md.match(/## Propósito\s*\r?\n+([\s\S]*?)(?:\r?\n## |\r?\n# |$)/);
  let text = '';
  if (prop) {
    text = prop[1].replace(/\[(.*?)\]\([^)]*\)/g, '$1').replace(/[`*]/g, '').replace(/\s+/g, ' ').trim();
    if (/accesible y personalizable|Este módulo registra/.test(text) && cuando) {
      text = cuando[1].replace(/[`*]/g, '').replace(/\s+/g, ' ').trim();
    }
  }
  if (!text && cuando) text = cuando[1].replace(/[`*]/g, '').replace(/\s+/g, ' ').trim();
  if (!text) text = fallback;
  const frase = text.split(/(?<=\.)\s/)[0];
  return (frase || text).slice(0, 220);
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === '_shared' || name.name.startsWith('.')) continue;
      walk(p, out);
    } else if (name.name.endsWith('.md')) out.push(p);
  }
  return out;
}

const porTag = new Map();
for (const file of walk(comp)) {
  const md = readFileSync(file, 'utf8');
  const rel = file.slice(comp.length + 1).replace(/\\/g, '/');
  const folder = rel.split('/')[0];
  const tagRaw = (md.match(/^tag:\s*(\S+)/m) || [])[1];
  const tag = tagRaw && tagRaw !== '—' && tagRaw !== '-' ? tagRaw : null;
  const tags = [...md.matchAll(/^ {2}- (iswc-[\w-]+)/gm)].map((m) => m[1]);
  const lista = tags.length ? tags : (tag?.startsWith('iswc-') ? [tag] : []);
  const resumen = resumenDe(md, rel);
  const status = (md.match(/^status:\s*(\S+)/m) || [])[1] || 'public';
  for (const t of lista) {
    if (!porTag.has(t)) porTag.set(t, { rel, folder, resumen, status });
  }
  if (!lista.length) porTag.set(rel, { rel, folder, resumen, status });
}

const manifest = readFileSync(join(root, 'src', 'manifest.ts'), 'utf8');
const orden = [...manifest.matchAll(/tag:\s*'(iswc-[^']+)'[\s\S]*?category:\s*'([^']+)'/g)].map((m) => ({
  tag: m[1],
  category: m[2],
}));

const grupos = new Map();
for (const item of orden) {
  if (!grupos.has(item.category)) grupos.set(item.category, []);
  const info = porTag.get(item.tag) || { rel: '', folder: item.category, resumen: 'Ver la guía del módulo antes de crear otro control.' };
  grupos.get(item.category).push({ ...item, ...info });
}

const lineas = ['', 'Cada `.min.js` enlaza la guía de su fila y esta skill.', ''];
for (const [category, items] of grupos) {
  lineas.push(`### ${category}`, '', '| Tag | Resumen | Guía |', '| --- | --- | --- |');
  for (const item of items) {
    const guia = item.rel
      ? `[${item.rel}](${gh}/${item.rel})`
      : '—';
    const resumen = String(item.resumen).replace(/\|/g, '/');
    lineas.push(`| \`<${item.tag}>\` | ${resumen} | ${guia} |`);
  }
  lineas.push('');
}

/** Módulos / APIs públicas que no son custom elements (contexto obligatorio para agentes). */
const API_MODULES = [
  {
    id: 'iswcLoader',
    cdn: 'core/loader.min.mjs',
    guia: 'https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/cdn/loader.md',
    resumen: 'Entry CDN: loadCSS*, load/ensure/has, pin, configure, espejos jsDelivr -> githack -> Pages, sheets, registerApp, SHA quemado.',
  },
  {
    id: 'IswcUi / Ui',
    cdn: 'helpers/ui.min.mjs',
    guia: `${gh}/helpers/ui.md`,
    resumen: 'html, adoptCss, define, css, el: primitivas de apps dominio. No es CE.',
  },
  {
    id: 'mdToHtml',
    cdn: 'helpers/md-lite.min.mjs',
    guia: `${gh}/helpers/utils/md-lite.md`,
    resumen: 'Markdown -> HTML sin npm; fences codigo e iswc-* (y los diagramas del plugin `iswd-`).',
  },
  {
    id: 'resolveIswcFenceTag',
    cdn: 'helpers/md-iswc-fences.min.mjs',
    guia: `${gh}/helpers/utils/md-iswc-fences.md`,
    resumen: 'Lang fence iswc-<kind> -> tag del diagrama del plugin (iswd-flowchart, iswd-er-diagram, ...).',
  },
  {
    id: 'hydrateMdEmbeds',
    cdn: 'helpers/md-hydrate.min.mjs',
    guia: `${gh}/helpers/utils/md-hydrate.md`,
    resumen: 'Carga perezosa de los iswc-* que pusieron los renders por defecto del markdown.',
  },
  {
    id: 'md-editor-api',
    cdn: 'helpers/md-editor-api.min.mjs',
    guia: `${gh}/helpers/utils/md-editor-api.md`,
    resumen: 'CRUD/normalizacion para iswc-md-editor (endpoints, fieldMap, token).',
  },
  {
    id: 'IswcResponseCache',
    cdn: 'helpers/response-cache.min.mjs',
    guia: `${gh}/helpers/utils/response-cache.md`,
    resumen: 'SWR IndexedDB: vivo/leer/guardar/invalidar; no bloquea el pintado.',
  },
  {
    id: 'ai/motores',
    cdn: 'lib/ai/motores.min.mjs',
    guia: 'https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/ai/ai.md',
    resumen: 'IA en el navegador sin UI: ejecutar(herramienta, entrada); 13 motores runonweb fuera de los barriles.',
  },
  {
    id: 'ai/descarga',
    cdn: 'lib/ai/descarga.min.mjs',
    guia: 'https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/ai/ai.md',
    resumen: 'conDescarga: regla única para bajar un modelo (hasta 20 MB toast; más, modal); pospuesta, medidor.',
  },
  {
    id: 'ai/vector-local',
    cdn: 'lib/ai/vector-local.min.mjs',
    guia: 'https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/ai/ai.md',
    resumen: 'vectorLocal, cargarCorpus, ordenarPorSentido: buscar por significado con el modelo multilingüe; null si no está.',
  },
  {
    id: 'ai/orden',
    cdn: 'lib/ai/orden.min.mjs',
    guia: 'https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/ai/ai.md',
    resumen: 'ordenarAplanado: exactas primero, luego embeddings y léxico tolerante. Puro.',
  },
  {
    id: 'ai/aplanado',
    cdn: 'lib/ai/aplanado.min.mjs',
    guia: 'https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/ai/ai.md',
    resumen: 'Reducción de vectores: aplanar, abrirCorpus, empacar; ajustar (PCA/LDA) en aplanado-ajuste para el build.',
  },
  {
    id: 'sync-pins',
    cdn: 'scripts/sync-pins.mjs (repo)',
    guia: 'https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/scripts/sync-pins.mjs',
    resumen: 'Tras commit del kit: propaga SHA a kit-pin / ISS / PIN (deno task sync:pins).',
  },
];

const apisLineas = [
  '',
  'APIs y módulos **sin** tag `iswc-*`. Misma obligación de reuso que el catálogo de componentes.',
  'Detalle operativo: [`tools/runtime.md`](tools/runtime.md).',
  '',
  '| API / módulo | CDN o ruta | Resumen | Guía |',
  '| --- | --- | --- | --- |',
];
for (const m of API_MODULES) {
  const guia = m.guia.startsWith('http') ? `[docs](${m.guia})` : m.guia;
  apisLineas.push(`| \`${m.id}\` | \`${m.cdn}\` | ${m.resumen.replace(/\|/g, '/')} | ${guia} |`);
}
apisLineas.push('');

const skillPath = join(root, 'skills', 'iswc-base', 'SKILL.md');
let skill = readFileSync(skillPath, 'utf8');
if (!/<!-- apis:inicio -->/.test(skill)) {
  skill = skill.replace(
    /## Catálogo de componentes/,
    `## Módulos API (sin custom element)\n\n<!-- apis:inicio -->\n<!-- apis:fin -->\n\n## Catálogo de componentes`,
  );
}
skill = skill.replace(
  /<!-- apis:inicio -->[\s\S]*<!-- apis:fin -->/,
  `<!-- apis:inicio -->\n${apisLineas.join('\n')}\n<!-- apis:fin -->`,
);
skill = skill.replace(
  /<!-- catalogo:inicio -->[\s\S]*<!-- catalogo:fin -->/,
  `<!-- catalogo:inicio -->\n${lineas.join('\n')}\n<!-- catalogo:fin -->`,
);
writeFileSync(skillPath, skill, 'utf8');
console.log('catalogo', orden.length, 'tags;', API_MODULES.length, 'apis');

// catalog.md — inventario completo (tags + APIs) para agentes
const catPath = join(root, 'skills', 'iswc-base', 'catalog.md');
const catOut = [
  '# Catálogo iswc-* (inventario completo)',
  '',
  'Fuente viva: regenerar con `node scripts/sondas/sync-skill-catalog.mjs`.',
  'Skill general: [SKILL.md](SKILL.md) · Runtime sin tag: [tools/runtime.md](tools/runtime.md).',
  '',
  '## Categorías',
  '',
  '| Carpeta | Propósito |',
  '| --- | --- |',
  '| `actions` | Acciones, comandos, menús |',
  '| `charts` / `data-viz` | Series, distribuciones, mapas |',
  '| `code` | Editor / visor de código |',
  '| `data` | Grid, stats, transfer, kanban, pivot |',
  '| `feedback` | Toast, tag, skeleton, progress, CDN snippet |',
  '| `forms` | Captura y validación |',
  '| `helpers` | Formato, observers, MD, popover, APIs módulo |',
  '| `isp` | Layout/forms Acme (ISP) |',
  '| `layout` | Regiones, dialog, drawer, demo, dock |',
  '| `media` | Iconos, avatar, video |',
  '| `navigation` | Tabs, tree, stepper, breadcrumb, carousel |',
  '| `overlays` | Command palette, PDF, window |',
  '| `preview` | Shell de galería (no producto) |',
  '| `cdn` / `core` | Loader y base CE (sin tag de producto) |',
  '',
  '## Módulos API (sin custom element)',
  '',
  '| API / módulo | CDN o ruta | Resumen | Guía |',
  '| --- | --- | --- | --- |',
];
for (const m of API_MODULES) {
  const guia = m.guia.startsWith('http') ? `[docs](${m.guia})` : m.guia;
  catOut.push(`| \`${m.id}\` | \`${m.cdn}\` | ${m.resumen.replace(/\|/g, '/')} | ${guia} |`);
}
catOut.push('', '## Tags por categoría', '');
for (const [category, items] of grupos) {
  catOut.push(`### ${category}`, '', '| Doc | Tags |', '| --- | --- |');
  const byRel = new Map();
  for (const item of items) {
    const key = item.rel || item.tag;
    if (!byRel.has(key)) byRel.set(key, []);
    byRel.get(key).push(`\`<${item.tag}>\``);
  }
  for (const [rel, tags] of byRel) {
    catOut.push(`| \`${rel || '—'}\` | ${tags.join(', ')} |`);
  }
  catOut.push('');
}
writeFileSync(catPath, `${catOut.join('\n')}\n`, 'utf8');
console.log('catalog.md', orden.length, 'tags');
