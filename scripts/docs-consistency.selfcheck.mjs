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
  const marker = 'components/';
  const index = normalized.indexOf(marker);
  assert(index >= 0, `${reference}: path does not contain components/`);
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
assert(await exists(globalFile), 'components/LLM.md missing');
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
