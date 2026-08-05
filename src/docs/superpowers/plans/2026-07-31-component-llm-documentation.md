# Component LLM Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear documentación jerárquica para 104 módulos/112 tags y un self-check que detecte inconsistencias futuras.

**Architecture:** Un MD vive junto a cada pareja JS/CSS; módulos multi-tag comparten MD. Diez `LLM.md` de categoría y `src/components/LLM.md` guían navegación, reutilización, reglas y errores. Checker Node deriva inventario desde `manifest.js`, evitando conteos manuales como única defensa.

**Tech Stack:** Markdown, Web Components vanilla, Node.js ESM, `node:assert`, npm; sin dependencias nuevas.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-31-component-llm-documentation-design.md`.
- Snapshot base: 103 scripts únicos públicos de `manifest.js` + `helpers/popup.js` = 104 MD de módulo, 112 tags.
- Crear 10 índices de categoría + `src/components/LLM.md`; 115 MD bajo `src/components/`.
- Español; identificadores técnicos exactos.
- Leer JS, CSS y preview exacto indicado en `manifest.js` antes de escribir cada MD.
- Fuente JS/CSS prevalece sobre preview.
- No modificar componentes, previews, manifest, build ni estilos.
- Excepción autorizada: crear `scripts/docs-consistency.selfcheck.mjs`.
- No modificar `package.json`; ejecutar checker directamente con Node.
- No crear TypeScript, test runner, dependencias, `tests/` ni archivos temporales. Reusar patrón `*.selfcheck.mjs` existente.
- No borrar archivos. No crear commits. Preservar cambios concurrentes.
- Si manifest cambia tras snapshot, `node scripts/docs-consistency.selfcheck.mjs` debe fallar; actualizar inventario/spec/plan antes de aceptar trabajo adicional.

## Inventario exacto congelado

- `src/components/actions/button.md`, `src/components/actions/button-group.md`, `src/components/actions/copy-button.md`, `src/components/actions/check-icon-button.md`, `src/components/actions/dropdown.md`, `src/components/actions/dropdown-item.md`, `src/components/actions/fab.md`.
- `src/components/charts/chart.md`, `src/components/charts/bar-chart.md`, `src/components/charts/line-chart.md`, `src/components/charts/pie-chart.md`, `src/components/charts/doughnut-chart.md`, `src/components/charts/radar-chart.md`, `src/components/charts/polar-area-chart.md`, `src/components/charts/scatter-chart.md`, `src/components/charts/bubble-chart.md`, `src/components/charts/sparkline.md`, `src/components/charts/waterfall-chart.md`, `src/components/charts/funnel-chart.md`, `src/components/charts/treemap.md`.
- `src/components/data/data-grid.md`, `src/components/data/stat.md`, `src/components/data/transfer.md`, `src/components/data/gauge.md`, `src/components/data/kanban.md`.
- `src/components/diagrams/flowchart.md`, `src/components/diagrams/sequence-diagram.md`, `src/components/diagrams/lightbox.md`, `src/components/diagrams/diagram-lightbox.md`, `src/components/diagrams/class-diagram.md`, `src/components/diagrams/state-diagram.md`, `src/components/diagrams/er-diagram.md`, `src/components/diagrams/block-diagram.md`, `src/components/diagrams/mindmap.md`, `src/components/diagrams/gantt.md`, `src/components/diagrams/timeline.md`.
- `src/components/feedback/spinner.md`, `src/components/feedback/badge.md`, `src/components/feedback/tag.md`, `src/components/feedback/skeleton.md`, `src/components/feedback/progress-bar.md`, `src/components/feedback/progress-ring.md`, `src/components/feedback/theme-toggle.md`, `src/components/feedback/toast.md`, `src/components/feedback/toast-item.md`, `src/components/feedback/tooltip.md`, `src/components/feedback/cdn-snippet.md`, `src/components/feedback/popconfirm.md`.
- `src/components/forms/combobox.md`, `src/components/forms/option.md`, `src/components/forms/checkbox.md`, `src/components/forms/switch.md`, `src/components/forms/radio-group.md`, `src/components/forms/radio.md`, `src/components/forms/input.md`, `src/components/forms/textarea.md`, `src/components/forms/slider.md`, `src/components/forms/rating.md`, `src/components/forms/select.md`, `src/components/forms/color-picker.md`, `src/components/forms/file-input.md`, `src/components/forms/date-picker.md`, `src/components/forms/month-calendar.md`, `src/components/forms/year-calendar.md`, `src/components/forms/date-range-picker.md`, `src/components/forms/time-clock.md`, `src/components/forms/digital-clock.md`, `src/components/forms/date-field.md`, `src/components/forms/time-field.md`, `src/components/forms/date-time-field.md`, `src/components/forms/date-input.md`, `src/components/forms/time-input.md`, `src/components/forms/date-time-input.md`, `src/components/forms/date-range-input.md`, `src/components/forms/pin-input.md`.
- `src/components/helpers/popover.md`, `src/components/helpers/relative-time.md`, `src/components/helpers/format-date.md`, `src/components/helpers/format-number.md`, `src/components/helpers/format-bytes.md`, `src/components/helpers/intersection-observer.md`, `src/components/helpers/mutation-observer.md`, `src/components/helpers/resize-observer.md`, `src/components/helpers/popup.md`.
- `src/components/layout/split-panel.md`, `src/components/layout/main.md`, `src/components/layout/card.md`, `src/components/layout/callout.md`, `src/components/layout/details.md`, `src/components/layout/dialog.md`, `src/components/layout/drawer.md`, `src/components/layout/divider.md`, `src/components/layout/scrollspy.md`.
- `src/components/media/icon.md`, `src/components/media/avatar.md`, `src/components/media/video.md`, `src/components/media/video-playlist.md`.
- `src/components/navigation/breadcrumb.md`, `src/components/navigation/breadcrumb-item.md`, `src/components/navigation/tab-group.md`, `src/components/navigation/scroller.md`, `src/components/navigation/carousel.md`, `src/components/navigation/tree.md`, `src/components/navigation/stepper.md`.
- Índices: `src/components/actions/LLM.md`, `src/components/charts/LLM.md`, `src/components/data/LLM.md`, `src/components/diagrams/LLM.md`, `src/components/feedback/LLM.md`, `src/components/forms/LLM.md`, `src/components/helpers/LLM.md`, `src/components/layout/LLM.md`, `src/components/media/LLM.md`, `src/components/navigation/LLM.md`, `src/components/LLM.md`.

Módulos multi-tag: `data/transfer.md`, `data/kanban.md`, `navigation/tab-group.md`, `navigation/carousel.md`, `navigation/tree.md`, `navigation/stepper.md`. Preview exacto siempre viene de `manifest.js.page`; `feedback/cdn-snippet.md` y `helpers/popup.md` no tienen preview.

## Contrato documental

Frontmatter, siempre:

```yaml
---
tag: is-primary
tags:
  - is-primary
category: physical-folder
status: public
source: ./name.js
style: ./name.css
preview: ../../previews/category/is-primary.html
---
```

- `tags` incluye todos los tags registrados por módulo.
- `helpers/popup.md`: `status: internal`.
- Omitir `preview` para `is-popup` e `is-cdn-snippet`.

Secciones de componente, orden exacto:

```markdown
# `<is-primary>`
## Propósito
## Cuándo usarlo
## Cuándo no usarlo
## Importación
## Ejemplo mínimo
## API
### Atributos y propiedades
### Slots
### Eventos
### Métodos y propiedades públicas
### CSS parts
### Custom states
### CSS custom properties
### Integración con formularios
## Comportamiento
## Dependencias y componentes relacionados
## Accesibilidad
## Ejemplo avanzado
## Errores comunes
## Reglas para LLM
## Fuentes
```

Sección sin API: `No expone`. Eventos: `detail`, `bubbles`, `composed`, `cancelable`. Errores y reglas deben ser concretos: acción correcta, acción prohibida, razón técnica.

Secciones de categoría `LLM.md`:

```markdown
# `<category>` para LLM
## Propósito
## Qué componente elegir
## Componentes
## Composición y relaciones
## Reusar antes de crear
## Dependencias compartidas
## Patrones comunes
## Qué hacer
## Qué no hacer
## Errores conocidos y prevención
## Módulos internos
## Navegación
```

---

### Task 1: Crear checker de consistencia documental

**Files:**
- Create: `scripts/docs-consistency.selfcheck.mjs`

**Interfaces:**
- Consumes: default export de `manifest.js`, árbol `src/components/`, previews.
- Produces: comando `node scripts/docs-consistency.selfcheck.mjs`; exit 0 con PASS, exit no-cero con inconsistencia concreta.

- [ ] **Step 1: Crear self-check que inicialmente falla por docs ausentes**

Crear `scripts/docs-consistency.selfcheck.mjs`:

```js
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import manifest from '../manifest.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const componentsRoot = path.join(root, 'components');

const extraEntries = [{
  tag: 'is-popup',
  category: 'helpers',
  script: '../components/helpers/popup.js',
  style: '../components/helpers/popup.css',
  internal: true,
}];

const requiredComponentHeadings = [
  '## Propósito',
  '## Cuándo usarlo',
  '## Cuándo no usarlo',
  '## Importación',
  '## Ejemplo mínimo',
  '## API',
  '### Atributos y propiedades',
  '### Slots',
  '### Eventos',
  '### Métodos y propiedades públicas',
  '### CSS parts',
  '### Custom states',
  '### CSS custom properties',
  '### Integración con formularios',
  '## Comportamiento',
  '## Dependencias y componentes relacionados',
  '## Accesibilidad',
  '## Ejemplo avanzado',
  '## Errores comunes',
  '## Reglas para LLM',
  '## Fuentes',
];

const requiredCategoryHeadings = [
  '## Propósito',
  '## Qué componente elegir',
  '## Componentes',
  '## Composición y relaciones',
  '## Reusar antes de crear',
  '## Dependencias compartidas',
  '## Patrones comunes',
  '## Qué hacer',
  '## Qué no hacer',
  '## Errores conocidos y prevención',
  '## Módulos internos',
  '## Navegación',
];

const componentRelative = (reference) => {
  const normalized = reference.replaceAll('\\', '/');
  const marker = 'src/components/';
  const index = normalized.indexOf(marker);
  assert(index >= 0, `${reference}: path does not contain src/components/`);
  return normalized.slice(index + marker.length);
};
const componentPath = (reference) => path.join(componentsRoot, componentRelative(reference));
const docRelative = (script) => componentRelative(script).replace(/\.js$/, '.md');
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function buildModules() {
  const modules = new Map();
  for (const entry of [...manifest, ...extraEntries]) {
    assert(entry.tag, 'manifest entry without tag');
    assert(entry.script, `manifest entry ${entry.tag} without script`);
    assert(entry.style, `manifest entry ${entry.tag} without style`);
    const key = entry.script;
    const current = modules.get(key);
    if (current) {
      assert.equal(current.style, entry.style, `${entry.tag}: inconsistent style for ${key}`);
      assert.equal(current.page ?? '', entry.page ?? '', `${entry.tag}: inconsistent preview for ${key}`);
      current.tags.push(entry.tag);
    } else {
      const rel = docRelative(entry.script);
      modules.set(key, {
        script: entry.script,
        style: entry.style,
        page: entry.page,
        tags: [entry.tag],
        category: rel.split('/')[0],
        doc: rel,
        internal: !!entry.internal,
      });
    }
  }
  return [...modules.values()];
}

function frontmatter(text, file) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  assert(match, `${file}: missing frontmatter`);
  return match[1];
}

function scalar(front, key) {
  return new RegExp(`^${escapeRegExp(key)}:\\s*(.+)$`, 'm').exec(front)?.[1]?.trim();
}

function list(front, key) {
  const lines = front.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `${key}:`);
  if (start < 0) return [];
  const values = [];
  for (let i = start + 1; i < lines.length; i++) {
    const match = /^\s+-\s+(.+?)\s*$/.exec(lines[i]);
    if (!match) break;
    values.push(match[1]);
  }
  return values;
}

async function actualComponentDocs() {
  const docs = [];
  const directories = await readdir(componentsRoot, { withFileTypes: true });
  for (const directory of directories) {
    if (!directory.isDirectory() || directory.name.startsWith('_')) continue;
    const entries = await readdir(path.join(componentsRoot, directory.name), { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'LLM.md') {
        docs.push(`${directory.name}/${entry.name}`);
      }
    }
  }
  return docs.sort();
}

async function assertRelativeLinks(files) {
  const failures = [];
  for (const file of files) {
    let text = await readFile(file, 'utf8');
    text = text.replace(/```[\s\S]*?```/g, '');
    for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1].split('#', 1)[0].trim();
      if (!target || /^(?:#|https?:|mailto:)/.test(target)) continue;
      if (!await exists(path.resolve(path.dirname(file), target))) failures.push(`${file}: ${match[1]}`);
    }
  }
  assert.deepEqual(failures, [], `broken relative links:\n${failures.join('\n')}`);
}

const modules = buildModules();
const categories = [...new Set(modules.map((item) => item.category))].sort();
const expectedDocs = modules.map((item) => item.doc).sort();

for (const item of modules) {
  assert(await exists(componentPath(item.script)), `${item.script}: source missing`);
  assert(await exists(componentPath(item.style)), `${item.style}: style missing`);
  if (item.page) assert(await exists(path.join(root, 'previews', item.page)), `${item.page}: preview missing`);
}

assert.deepEqual(
  await actualComponentDocs(),
  expectedDocs,
  'component docs differ from manifest scripts + is-popup',
);

const markdownFiles = [];
for (const item of modules) {
  const file = path.join(componentsRoot, item.doc);
  const text = await readFile(file, 'utf8');
  const front = frontmatter(text, file);
  assert.equal(scalar(front, 'tag'), item.tags[0], `${item.doc}: wrong primary tag`);
  assert.deepEqual(list(front, 'tags'), item.tags, `${item.doc}: wrong tags list`);
  assert.equal(scalar(front, 'category'), item.category, `${item.doc}: wrong physical category`);
  assert.equal(scalar(front, 'status'), item.internal ? 'internal' : 'public', `${item.doc}: wrong status`);
  assert.equal(scalar(front, 'source'), `./${path.basename(item.script)}`, `${item.doc}: wrong source`);
  assert.equal(scalar(front, 'style'), `./${path.basename(item.style)}`, `${item.doc}: wrong style`);
  const expectedPreview = item.page ? `../../previews/${item.page}` : undefined;
  assert.equal(scalar(front, 'preview'), expectedPreview, `${item.doc}: wrong preview`);
  for (const heading of requiredComponentHeadings) assert(text.includes(heading), `${item.doc}: missing ${heading}`);
  assert(!/\| `(?:if|for|while|switch|catch|with)\(\)`/.test(text), `${item.doc}: control keyword documented as method`);
  assert(!/\| `--(?:-+)?`/.test(text), `${item.doc}: invalid CSS custom property`);
  assert(!/\| `--[^`]*-`/.test(text), `${item.doc}: incomplete CSS custom property`);
  assert(!text.includes(':state(...)'), `${item.doc}: placeholder custom state`);
  markdownFiles.push(file);
}

for (const category of categories) {
  const file = path.join(componentsRoot, category, 'LLM.md');
  assert(await exists(file), `${category}/LLM.md missing`);
  const text = await readFile(file, 'utf8');
  for (const heading of requiredCategoryHeadings) assert(text.includes(heading), `${category}/LLM.md: missing ${heading}`);
  for (const item of modules.filter((candidate) => candidate.category === category)) {
    assert(text.includes(path.basename(item.doc)), `${category}/LLM.md: missing ${item.doc}`);
    for (const tag of item.tags) assert(text.includes(tag), `${category}/LLM.md: missing ${tag}`);
  }
  markdownFiles.push(file);
}

const globalFile = path.join(componentsRoot, 'LLM.md');
assert(await exists(globalFile), 'src/components/LLM.md missing');
const globalText = await readFile(globalFile, 'utf8');
for (const category of categories) assert(globalText.includes(`${category}/LLM.md`), `global LLM missing ${category}`);
for (const item of modules) {
  assert(globalText.includes(item.doc), `global LLM missing ${item.doc}`);
  for (const tag of item.tags) assert(globalText.includes(tag), `global LLM missing ${tag}`);
}
markdownFiles.push(globalFile);

const placeholders = [/\b(?:TBD|TODO)\b/, /por definir/i, /\?\?\?/];
for (const file of markdownFiles) {
  const text = await readFile(file, 'utf8');
  const match = placeholders.map((pattern) => text.match(pattern)).find(Boolean);
  assert(!match, `${file}: placeholder found: ${match?.[0]}`);
}

await assertRelativeLinks(markdownFiles);

const tagCount = modules.reduce((sum, item) => sum + item.tags.length, 0);
console.log(`docs consistency self-check: PASS (${modules.length} modules, ${tagCount} tags, ${categories.length} categories)`);
```

- [ ] **Step 2: Ejecutar checker y confirmar fallo esperado**

Run: `node scripts/docs-consistency.selfcheck.mjs`

Expected: exit no-cero con `component docs differ from manifest scripts + is-popup`, porque docs aún no existen.

---

### Task 2: Documentar actions

**Files:**
- Create: `src/components/actions/{button,button-group,copy-button,check-icon-button,dropdown,dropdown-item,fab}.md`
- Create: `src/components/actions/LLM.md`

**Interfaces:** Consume fuentes homónimas JS/CSS y previews de `manifest.js`. Produce 7 docs/7 tags e índice.

- [ ] Documentar `button.md` (`is-button`).
- [ ] Documentar `button-group.md` (`is-button-group`).
- [ ] Documentar `copy-button.md` (`is-copy-button`).
- [ ] Documentar `check-icon-button.md` (`is-check-icon-button`).
- [ ] Documentar `dropdown.md` (`is-dropdown`).
- [ ] Documentar `dropdown-item.md` (`is-dropdown-item`, preview compartido con dropdown).
- [ ] Documentar `fab.md` (`is-fab`).
- [ ] Crear `actions/LLM.md`; mapear button-group/button, dropdown/dropdown-item, Clipboard y shared icon/popup. Expresar do/don't y errores reales.
- [ ] Verificar archivos: `node --input-type=module -e "import fs from 'node:fs'; for (const n of 'button button-group copy-button check-icon-button dropdown dropdown-item fab LLM'.split(' ')) if (!fs.existsSync('src/components/actions/'+n+'.md')) throw Error(n); console.log('PASS actions')"`

Expected: `PASS actions`.

---

### Task 3: Documentar charts

**Files:**
- Create: `src/components/charts/{chart,bar-chart,line-chart,pie-chart,doughnut-chart,radar-chart,polar-area-chart,scatter-chart,bubble-chart,sparkline,waterfall-chart,funnel-chart,treemap}.md`
- Create: `src/components/charts/LLM.md`

**Interfaces:** Consume JS/CSS, previews `previews/data-viz/`, engines/palette/marks/specs existentes. Produce 13 docs/13 tags e índice.

- [ ] Documentar `chart.md` (`is-chart`).
- [ ] Documentar `bar-chart.md` (`is-bar-chart`).
- [ ] Documentar `line-chart.md` (`is-line-chart`).
- [ ] Documentar `pie-chart.md` (`is-pie-chart`).
- [ ] Documentar `doughnut-chart.md` (`is-doughnut-chart`).
- [ ] Documentar `radar-chart.md` (`is-radar-chart`).
- [ ] Documentar `polar-area-chart.md` (`is-polar-area-chart`).
- [ ] Documentar `scatter-chart.md` (`is-scatter-chart`).
- [ ] Documentar `bubble-chart.md` (`is-bubble-chart`).
- [ ] Documentar `sparkline.md` (`is-sparkline`).
- [ ] Documentar `waterfall-chart.md` (`is-waterfall-chart`).
- [ ] Documentar `funnel-chart.md` (`is-funnel-chart`).
- [ ] Documentar `treemap.md` (`is-treemap`).
- [ ] Crear `charts/LLM.md`; mapa tipo de dato → chart; reusar `chart.js`, `svg-chart-engine`, palette y marks; prohibir librerías/engines paralelos sin necesidad.
- [ ] Verificar: `node --input-type=module -e "import fs from 'node:fs'; for (const n of 'chart bar-chart line-chart pie-chart doughnut-chart radar-chart polar-area-chart scatter-chart bubble-chart sparkline waterfall-chart funnel-chart treemap LLM'.split(' ')) if (!fs.existsSync('src/components/charts/'+n+'.md')) throw Error(n); console.log('PASS charts')"`

Expected: `PASS charts`.

---

### Task 4: Documentar data

**Files:**
- Create: `src/components/data/{data-grid,stat,transfer,gauge,kanban}.md`
- Create: `src/components/data/LLM.md`

**Interfaces:** Produce 5 docs que cubren 8 tags.

- [ ] Documentar `data-grid.md` (`is-data-grid`); reusar `_shared/grid-*`.
- [ ] Documentar `stat.md` (`is-stat`).
- [ ] Documentar `transfer.md` con tags `is-transfer`, `is-transfer-item`; separar API parent/item.
- [ ] Documentar `gauge.md` (`is-gauge`, preview en `previews/data-viz/`).
- [ ] Documentar `kanban.md` con `is-kanban`, `is-kanban-column`, `is-kanban-card`; separar APIs y composición.
- [ ] Crear `data/LLM.md`; explicar multi-tag, grid/data structures y evitar duplicar componentes children.
- [ ] Verificar: `node --input-type=module -e "import fs from 'node:fs'; for (const n of 'data-grid stat transfer gauge kanban LLM'.split(' ')) if (!fs.existsSync('src/components/data/'+n+'.md')) throw Error(n); console.log('PASS data')"`

Expected: `PASS data`.

---

### Task 5: Documentar diagrams

**Files:**
- Create: `src/components/diagrams/{flowchart,sequence-diagram,lightbox,diagram-lightbox,class-diagram,state-diagram,er-diagram,block-diagram,mindmap,gantt,timeline}.md`
- Create: `src/components/diagrams/LLM.md`

**Interfaces:** Consume JS/CSS, previews, `*-spec`, turtle, layout y edit shared. Produce 11 docs/11 tags.

- [ ] Documentar `flowchart.md` (`is-flowchart`).
- [ ] Documentar `sequence-diagram.md` (`is-sequence-diagram`).
- [ ] Documentar `lightbox.md` (`is-lightbox`, preview lógico helpers).
- [ ] Documentar `diagram-lightbox.md` (`is-diagram-lightbox`).
- [ ] Documentar `class-diagram.md` (`is-class-diagram`).
- [ ] Documentar `state-diagram.md` (`is-state-diagram`).
- [ ] Documentar `er-diagram.md` (`is-er-diagram`).
- [ ] Documentar `block-diagram.md` (`is-block-diagram`).
- [ ] Documentar `mindmap.md` (`is-mindmap`).
- [ ] Documentar `gantt.md` (`is-gantt`).
- [ ] Documentar `timeline.md` (`is-timeline`).
- [ ] Crear `diagrams/LLM.md`; mapa caso → diagrama, schemas, viewer/edit/persistencia; reusar specs/layout/turtle; no usar internos como tags.
- [ ] Verificar: `node --input-type=module -e "import fs from 'node:fs'; for (const n of 'flowchart sequence-diagram lightbox diagram-lightbox class-diagram state-diagram er-diagram block-diagram mindmap gantt timeline LLM'.split(' ')) if (!fs.existsSync('src/components/diagrams/'+n+'.md')) throw Error(n); console.log('PASS diagrams')"`

Expected: `PASS diagrams`.

---

### Task 6: Documentar feedback

**Files:**
- Create: `src/components/feedback/{spinner,badge,tag,skeleton,progress-bar,progress-ring,theme-toggle,toast,toast-item,tooltip,cdn-snippet,popconfirm}.md`
- Create: `src/components/feedback/LLM.md`

**Interfaces:** Produce 12 docs/12 tags.

- [ ] Documentar `spinner.md` (`is-spinner`).
- [ ] Documentar `badge.md` (`is-badge`).
- [ ] Documentar `tag.md` (`is-tag`).
- [ ] Documentar `skeleton.md` (`is-skeleton`).
- [ ] Documentar `progress-bar.md` (`is-progress-bar`).
- [ ] Documentar `progress-ring.md` (`is-progress-ring`).
- [ ] Documentar `theme-toggle.md` (`is-theme-toggle`).
- [ ] Documentar `toast.md` (`is-toast`).
- [ ] Documentar `toast-item.md` (`is-toast-item`, preview compartido).
- [ ] Documentar `tooltip.md` (`is-tooltip`).
- [ ] Documentar `cdn-snippet.md` (`is-cdn-snippet`); omitir frontmatter `preview`.
- [ ] Documentar `popconfirm.md` (`is-popconfirm`).
- [ ] Crear `feedback/LLM.md`; composición toast, tooltip/popconfirm/popup, estados y cuándo no usar notificaciones intrusivas.
- [ ] Verificar: `node --input-type=module -e "import fs from 'node:fs'; for (const n of 'spinner badge tag skeleton progress-bar progress-ring theme-toggle toast toast-item tooltip cdn-snippet popconfirm LLM'.split(' ')) if (!fs.existsSync('src/components/feedback/'+n+'.md')) throw Error(n); console.log('PASS feedback')"`

Expected: `PASS feedback`.

---

### Task 7: Documentar forms

**Files:**
- Create: `src/components/forms/{combobox,option,checkbox,switch,radio-group,radio,input,textarea,slider,rating,select,color-picker,file-input,date-picker,month-calendar,year-calendar,date-range-picker,time-clock,digital-clock,date-field,time-field,date-time-field,date-input,time-input,date-time-input,date-range-input,pin-input}.md`
- Create: `src/components/forms/LLM.md`

**Interfaces:** Consume form-associated/date/picker shared. Produce 27 docs/27 tags.

- [ ] Documentar `combobox.md` (`is-combobox`).
- [ ] Documentar `option.md` (`is-option`, child de combobox/select según fuente).
- [ ] Documentar `checkbox.md` (`is-checkbox`).
- [ ] Documentar `switch.md` (`is-switch`).
- [ ] Documentar `radio-group.md` (`is-radio-group`).
- [ ] Documentar `radio.md` (`is-radio`).
- [ ] Documentar `input.md` (`is-input`).
- [ ] Documentar `textarea.md` (`is-textarea`).
- [ ] Documentar `slider.md` (`is-slider`).
- [ ] Documentar `rating.md` (`is-rating`).
- [ ] Documentar `select.md` (`is-select`).
- [ ] Documentar `color-picker.md` (`is-color-picker`).
- [ ] Documentar `file-input.md` (`is-file-input`).
- [ ] Documentar `date-picker.md` (`is-date-picker`).
- [ ] Documentar `month-calendar.md` (`is-month-calendar`).
- [ ] Documentar `year-calendar.md` (`is-year-calendar`).
- [ ] Documentar `date-range-picker.md` (`is-date-range-picker`).
- [ ] Documentar `time-clock.md` (`is-time-clock`).
- [ ] Documentar `digital-clock.md` (`is-digital-clock`).
- [ ] Documentar `date-field.md` (`is-date-field`).
- [ ] Documentar `time-field.md` (`is-time-field`).
- [ ] Documentar `date-time-field.md` (`is-date-time-field`).
- [ ] Documentar `date-input.md` (`is-date-input`).
- [ ] Documentar `time-input.md` (`is-time-input`).
- [ ] Documentar `date-time-input.md` (`is-date-time-input`).
- [ ] Documentar `date-range-input.md` (`is-date-range-input`).
- [ ] Documentar `pin-input.md` (`is-pin-input`).
- [ ] Crear `forms/LLM.md`; mapa dato/interacción → control; reusar form/date/picker cores; no duplicar validación ni crear size variants.
- [ ] Verificar: `node --input-type=module -e "import fs from 'node:fs'; for (const n of 'combobox option checkbox switch radio-group radio input textarea slider rating select color-picker file-input date-picker month-calendar year-calendar date-range-picker time-clock digital-clock date-field time-field date-time-field date-input time-input date-time-input date-range-input pin-input LLM'.split(' ')) if (!fs.existsSync('src/components/forms/'+n+'.md')) throw Error(n); console.log('PASS forms')"`

Expected: `PASS forms`.

---

### Task 8: Documentar helpers

**Files:**
- Create: `src/components/helpers/{popover,relative-time,format-date,format-number,format-bytes,intersection-observer,mutation-observer,resize-observer,popup}.md`
- Create: `src/components/helpers/LLM.md`

**Interfaces:** Produce 9 docs/9 tags; `is-popup` interno.

- [ ] Documentar `popover.md` (`is-popover`).
- [ ] Documentar `relative-time.md` (`is-relative-time`).
- [ ] Documentar `format-date.md` (`is-format-date`).
- [ ] Documentar `format-number.md` (`is-format-number`).
- [ ] Documentar `format-bytes.md` (`is-format-bytes`).
- [ ] Documentar `intersection-observer.md` (`is-intersection-observer`).
- [ ] Documentar `mutation-observer.md` (`is-mutation-observer`).
- [ ] Documentar `resize-observer.md` (`is-resize-observer`).
- [ ] Documentar `popup.md` (`is-popup`); `status: internal`, sin preview; explicar `position.js` y consumo por popover/tooltip.
- [ ] Crear `helpers/LLM.md`; separar públicos/interno y exigir Intl/Observer/position existentes antes de código custom.
- [ ] Verificar: `node --input-type=module -e "import fs from 'node:fs'; for (const n of 'popover relative-time format-date format-number format-bytes intersection-observer mutation-observer resize-observer popup LLM'.split(' ')) if (!fs.existsSync('src/components/helpers/'+n+'.md')) throw Error(n); console.log('PASS helpers')"`

Expected: `PASS helpers`.

---

### Task 9: Documentar layout

**Files:**
- Create: `src/components/layout/{split-panel,main,card,callout,details,dialog,drawer,divider,scrollspy}.md`
- Create: `src/components/layout/LLM.md`

**Interfaces:** Produce 9 docs/9 tags.

- [ ] Documentar `split-panel.md` (`is-split-panel`).
- [ ] Documentar `main.md` (`is-main`).
- [ ] Documentar `card.md` (`is-card`).
- [ ] Documentar `callout.md` (`is-callout`).
- [ ] Documentar `details.md` (`is-details`).
- [ ] Documentar `dialog.md` (`is-dialog`).
- [ ] Documentar `drawer.md` (`is-drawer`).
- [ ] Documentar `divider.md` (`is-divider`).
- [ ] Documentar `scrollspy.md` (`is-scrollspy`).
- [ ] Crear `layout/LLM.md`; composición estructural, scroll/persistencia, overlays; usar em/context font-size, no size variants.
- [ ] Verificar: `node --input-type=module -e "import fs from 'node:fs'; for (const n of 'split-panel main card callout details dialog drawer divider scrollspy LLM'.split(' ')) if (!fs.existsSync('src/components/layout/'+n+'.md')) throw Error(n); console.log('PASS layout')"`

Expected: `PASS layout`.

---

### Task 10: Documentar media

**Files:**
- Create: `src/components/media/{icon,avatar,video,video-playlist}.md`
- Create: `src/components/media/LLM.md`

**Interfaces:** Produce 4 docs/4 tags.

- [ ] Documentar `icon.md` (`is-icon`); reusar Iconify loader/assets.
- [ ] Documentar `avatar.md` (`is-avatar`).
- [ ] Documentar `video.md` (`is-video`).
- [ ] Documentar `video-playlist.md` (`is-video-playlist`).
- [ ] Crear `media/LLM.md`; fallbacks, accesibilidad y relación video/playlist; no crear loaders paralelos.
- [ ] Verificar: `node --input-type=module -e "import fs from 'node:fs'; for (const n of 'icon avatar video video-playlist LLM'.split(' ')) if (!fs.existsSync('src/components/media/'+n+'.md')) throw Error(n); console.log('PASS media')"`

Expected: `PASS media`.

---

### Task 11: Documentar navigation

**Files:**
- Create: `src/components/navigation/{breadcrumb,breadcrumb-item,tab-group,scroller,carousel,tree,stepper}.md`
- Create: `src/components/navigation/LLM.md`

**Interfaces:** Produce 7 docs que cubren 12 tags.

- [ ] Documentar `breadcrumb.md` (`is-breadcrumb`).
- [ ] Documentar `breadcrumb-item.md` (`is-breadcrumb-item`, preview compartido).
- [ ] Documentar `tab-group.md` con `is-tab-group`, `is-tab`, `is-tab-panel`; separar APIs parent/tab/panel.
- [ ] Documentar `scroller.md` (`is-scroller`).
- [ ] Documentar `carousel.md` con `is-carousel`, `is-carousel-item`.
- [ ] Documentar `tree.md` con `is-tree`, `is-tree-item`.
- [ ] Documentar `stepper.md` con `is-stepper`, `is-stepper-step`.
- [ ] Crear `navigation/LLM.md`; selección de patrón, teclado/ARIA, parent-child, composición; no duplicar children como módulos inexistentes.
- [ ] Verificar: `node --input-type=module -e "import fs from 'node:fs'; for (const n of 'breadcrumb breadcrumb-item tab-group scroller carousel tree stepper LLM'.split(' ')) if (!fs.existsSync('src/components/navigation/'+n+'.md')) throw Error(n); console.log('PASS navigation')"`

Expected: `PASS navigation`.

---

### Task 12: Crear índice global y cerrar inconsistencias

**Files:**
- Create: `src/components/LLM.md`
- Verify: `src/components/**/*.md`
- Verify: `scripts/docs-consistency.selfcheck.mjs`

**Interfaces:** Consume 10 índices, 104 docs y 112 tags. Produce entrada global y PASS automático.

- [ ] **Step 1: Crear `src/components/LLM.md`**

Incluir mapa de 10 categorías, selector, índice 104 docs/112 tags, convenciones, shared reuse map, reglas obligatorias, qué hacer/no hacer, errores aprendidos y prevención. Expresar: un MD por módulo, preview exacto desde manifest, localizar `src/components/` sin asumir cantidad de `../`, source-over-preview, multi-tag, no literal-regex discovery, no size variants, no commits/deletes automáticos.

- [ ] **Step 2: Ejecutar checker completo**

Run: `node scripts/docs-consistency.selfcheck.mjs`

Expected snapshot base: `docs consistency self-check: PASS (104 modules, 112 tags, 10 categories)`.

Si falla por nuevos scripts de manifest, detener cierre. Actualizar spec/plan/inventario y documentar módulos nuevos; no silenciar ni bajar validaciones.

- [ ] **Step 3: Revisar estado git**

Run:

```bash
git status --short --untracked-files=all -- components scripts/docs-consistency.selfcheck.mjs docs/superpowers
```

Expected: docs/checker previstos; cambios concurrentes fuente permanecen intactos.

- [ ] **Step 4: Cerrar sin commit ni borrado**

Reportar conteos reales, salida exacta del checker y cambios concurrentes. No ejecutar `git add`, `git commit`, `git clean`, `rm` ni equivalentes.
