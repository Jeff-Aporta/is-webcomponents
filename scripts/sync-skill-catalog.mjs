// Regenera el índice de la skill general y completa guías o páginas que falten.
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = join(import.meta.dirname, '..');
const comp = join(root, 'src', 'components');
const gh = 'https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components';

const faltantes = [
  ['actions/speed-dial-action.md', 'is-speed-dial-action', 'actions', 'Acción hija de `<is-speed-dial>`. No se usa sola: vive dentro del speed dial y dispara su comando.'],
  ['data/kanban-column.md', 'is-kanban-column', 'data', 'Columna de `<is-kanban>`. Declara el estado del tablero; las tarjetas van dentro.'],
  ['data/kanban-card.md', 'is-kanban-card', 'data', 'Tarjeta de `<is-kanban>`. Representa un ítem movible dentro de una columna.'],
  ['data/transfer-item.md', 'is-transfer-item', 'data', 'Ítem de `<is-transfer>`. Es una opción de la lista origen o destino, no un control suelto.'],
  ['data-viz/map-marker.md', 'is-map-marker', 'data-viz', 'Marcador de `<is-maps>`. Señala un punto; el mapa lo posiciona.'],
  ['layout/dock-item.md', 'is-dock-item', 'layout', 'Ítem de `<is-dock>`. Un acceso del dock, con icono y acción.'],
  ['layout/demo.md', 'is-demo', 'layout', 'Caja de demostración de la galería. Envuelve un ejemplo y ofrece ver código y fuentes.'],
  ['layout/preview-component.md', 'is-preview-component', 'preview', 'Shell de la galería. Pinta una definición JSON de preview; no es un control de producto.'],
  ['layout/preview-controls.md', 'is-preview-controls', 'preview', 'Panel de controles del playground. Aplica props de la definición JSON al ejemplo activo.'],
  ['navigation/carousel-item.md', 'is-carousel-item', 'navigation', 'Lámina de `<is-carousel>`. Un paso del carrusel; el grupo controla el avance.'],
  ['navigation/stepper-step.md', 'is-stepper-step', 'navigation', 'Paso de `<is-stepper>`. Marca una etapa; el stepper lleva el estado activo.'],
  ['navigation/tab.md', 'is-tab', 'navigation', 'Pestaña de `<is-tab-group>`. Elige el panel; no sustituye al grupo.'],
  ['navigation/tab-panel.md', 'is-tab-panel', 'navigation', 'Panel de `<is-tab-group>`. El contenido que se muestra al activar su `<is-tab>`.'],
  ['navigation/tree-item.md', 'is-tree-item', 'navigation', 'Nodo de `<is-tree>`. Puede tener hijos y se expande dentro del árbol.'],
  ['helpers/floating.md', 'is-floating', 'helpers', 'Posicionamiento anclado interno. No es API de producto: en apps se usa `<is-popover>` o `<is-tooltip>`.'],
];

for (const [rel, tag, category, resumen] of faltantes) {
  const file = join(comp, rel);
  if (existsSync(file)) continue;
  mkdirSync(dirname(file), { recursive: true });
  const interno = tag === 'is-floating' ? 'internal' : 'public';
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

function preview(tag, category, title, lede, html) {
  return {
    $schema: 'is-preview/v1',
    tag,
    category,
    title,
    titleHtml: false,
    description: lede,
    sections: [{
      id: 'intro',
      title,
      lede,
      blocks: [{ kind: 'demo', html }],
    }],
  };
}

const kinds = [
  ['flowchart', 'Flujo'],
  ['sequence', 'Secuencia'],
  ['class', 'Clases'],
  ['state', 'Estados'],
  ['er', 'Entidad-relación'],
  ['block', 'Bloques'],
  ['component', 'Componentes'],
  ['mindmap', 'Mapa mental'],
  ['gantt', 'Gantt'],
  ['timeline', 'Línea de tiempo'],
  ['org-chart', 'Organigrama'],
  ['sankey', 'Sankey'],
  ['quadrant', 'Cuadrantes'],
  ['venn', 'Venn'],
  ['usecase', 'Casos de uso'],
  ['swimlane', 'Carriles'],
  ['journey', 'Recorrido'],
];

const links = kinds.map(([kind, title]) =>
  `<li>${title}: <a href="demos/diagramas/app/view.html?kind=${kind}" target="_blank" rel="noopener">visor</a> · <a href="demos/diagramas/app/edit.html?kind=${kind}" target="_blank" rel="noopener">editor</a></li>`,
).join('');

const pages = [
  ['diagrams/diagram-view-app.json', preview(
    'is-diagram-view-app', 'diagrams', 'Visor de diagramas (API)',
    'Abre cualquier diagrama con ?kind= y ?json= en base64url. La dirección no cambia al mirar el documento.',
    `<iframe title="Visor de diagramas" src="demos/diagramas/app/view.html?kind=flowchart" style="width:100%;height:720px;border:1px solid var(--is-border);border-radius:12px;background:var(--is-bg)"></iframe><ul>${links}</ul>`,
  )],
  ['diagrams/diagram-edit-app.json', preview(
    'is-diagram-edit-app', 'diagrams', 'Editor de diagramas (API)',
    'Edita el diagrama y comparte un enlace nuevo. El ?json= con el que se abrió la página se queda igual.',
    `<iframe title="Editor de diagramas" src="demos/diagramas/app/edit.html?kind=er" style="width:100%;height:720px;border:1px solid var(--is-border);border-radius:12px;background:var(--is-bg)"></iframe><ul>${links}</ul>`,
  )],
  ['diagrams/er-editor.json', preview(
    'is-er-editor', 'diagrams', '<is-er-editor>',
    'Editor visual de entidad-relación. Compartir el resultado se hace con la app de edición, sin reescribir el enlace de entrada.',
    `<p><a href="demos/diagramas/app/edit.html?kind=er" target="_blank" rel="noopener">Abrir editor (API)</a> · <a href="demos/diagramas/app/view.html?kind=er" target="_blank" rel="noopener">Abrir visor</a></p><is-er-editor style="display:block;height:560px"><script type="application/json">{"entities":[{"id":"cliente","name":"Cliente","attributes":[{"name":"id","key":"PK","type":"uuid"}],"pos":[80,80]},{"id":"pedido","name":"Pedido","attributes":[{"name":"id","key":"PK","type":"uuid"},{"name":"cliente_id","key":"FK","type":"uuid"}],"pos":[380,80]}],"relations":[{"id":"r1","from":"cliente","to":"pedido","label":"hace","fromCard":"one","toCard":"many"}]}</script></is-er-editor>`,
  )],
  ['layout/demo.json', preview(
    'is-demo', 'layout', '<is-demo>',
    'Caja de los ejemplos de la galería.',
    '<is-demo heading="Ejemplo"><p>El contenido del ejemplo va en light DOM.</p></is-demo>',
  )],
  ['helpers/floating.json', preview(
    'is-floating', 'helpers', '<is-floating> (interno)',
    'Building block interno. En producto usa is-popover o is-tooltip.',
    '<is-floating placement="bottom" active><button slot="anchor" type="button">Ancla</button><div>Contenido anclado. No usar este tag en apps.</div></is-floating>',
  )],
  ['layout/preview-component.json', preview(
    'is-preview-component', 'preview', '<is-preview-component>',
    'Shell que monta una definición JSON de la galería. La propia galería es el ejemplo vivo.',
    '<p>La galería asigna la propiedad <code>preview</code> y este tag pinta el documento, el índice y los demos. No evalúa código de comportamiento.</p>',
  )],
  ['layout/preview-controls.json', preview(
    'is-preview-controls', 'preview', '<is-preview-controls>',
    'Panel de knobs del playground. La galería le pasa spec y escucha is-controls-change.',
    '<is-preview-controls label="Controles"></is-preview-controls>',
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

const diagramJson = [
  ['flowchart.json', 'flowchart'],
  ['sequence-diagram.json', 'sequence'],
  ['class-diagram.json', 'class'],
  ['state-diagram.json', 'state'],
  ['er-diagram.json', 'er'],
  ['block-diagram.json', 'block'],
  ['component-diagram.json', 'component'],
  ['mindmap.json', 'mindmap'],
  ['gantt.json', 'gantt'],
  ['timeline.json', 'timeline'],
  ['org-chart.json', 'org-chart'],
  ['sankey-diagram.json', 'sankey'],
  ['quadrant-chart.json', 'quadrant'],
  ['venn-diagram.json', 'venn'],
  ['use-case-diagram.json', 'usecase'],
  ['swimlane-diagram.json', 'swimlane'],
  ['journey-map.json', 'journey'],
];

for (const [file, kind] of diagramJson) {
  const abs = join(comp, 'diagrams', file);
  if (!existsSync(abs)) { console.log('sin json', file); continue; }
  let raw = readFileSync(abs, 'utf8');
  if (!raw.includes('"app-api"')) {
    const nl = raw.includes('\r\n') ? '\r\n' : '\n';
    const needle = `${nl}  ]${nl}}`;
    const idx = raw.lastIndexOf(needle);
    if (idx < 0) console.log('no cierre', file);
    else {
      const section = {
        id: 'app-api',
        title: 'App API',
        lede: 'El mismo documento se abre en el visor o en el editor. El parámetro json no se reescribe al modificar el diagrama.',
        blocks: [{
          kind: 'html',
          html: `<p><a href="demos/diagramas/app/view.html?kind=${kind}" target="_blank" rel="noopener">Abrir visor</a> · <a href="demos/diagramas/app/edit.html?kind=${kind}" target="_blank" rel="noopener">Abrir editor</a></p>`,
        }],
      };
      const body = JSON.stringify(section, null, 2).split('\n').map((line) => `    ${line}`).join(nl);
      raw = `${raw.slice(0, idx)},${nl}${body}${raw.slice(idx)}`;
      if (!raw.endsWith(nl)) raw += nl;
      writeFileSync(abs, raw, 'utf8');
      console.log('anexo', file);
    }
  }
  const dist = join(root, 'dist', 'previews', 'diagrams', file);
  if (existsSync(dirname(dist))) copyFileSync(abs, dist);
}

const appSection = (kind) => `

## App API

Visor: \`demos/diagramas/app/view.html?kind=${kind}&json=<base64url>\`.
Editor: \`demos/diagramas/app/edit.html?kind=${kind}&json=<base64url>\`.

\`json\` es el documento completo en base64url. Editar no reescribe ese parámetro: Compartir arma un enlace nuevo con el JSON resultante.
`;

for (const [file, kind] of diagramJson) {
  const md = join(comp, 'diagrams', file.replace(/\.json$/, '.md'));
  if (!existsSync(md)) continue;
  const text = readFileSync(md, 'utf8');
  if (text.includes('## App API')) continue;
  writeFileSync(md, text.replace(/\s*$/, '') + appSection(kind), 'utf8');
  console.log('guia', file);
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
  const tag = (md.match(/^tag:\s*(\S+)/m) || [])[1];
  const tags = [...md.matchAll(/^ {2}- (is-[\w-]+)/gm)].map((m) => m[1]);
  const lista = tags.length ? tags : (tag ? [tag] : []);
  const resumen = resumenDe(md, rel);
  for (const t of lista) {
    if (!porTag.has(t)) porTag.set(t, { rel, folder, resumen });
  }
  if (!lista.length) porTag.set(rel, { rel, folder, resumen });
}

const manifest = readFileSync(join(root, 'src', 'manifest.ts'), 'utf8');
const orden = [...manifest.matchAll(/tag:\s*'(is-[^']+)'[\s\S]*?category:\s*'([^']+)'/g)].map((m) => ({
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

const skillPath = join(root, 'src', 'skills', 'is-webcomponents', 'SKILL.md');
const skill = readFileSync(skillPath, 'utf8');
const next = skill.replace(
  /<!-- catalogo:inicio -->[\s\S]*<!-- catalogo:fin -->/,
  `<!-- catalogo:inicio -->\n${lineas.join('\n')}\n<!-- catalogo:fin -->`,
);
writeFileSync(skillPath, next, 'utf8');
console.log('catalogo', orden.length, 'tags');
