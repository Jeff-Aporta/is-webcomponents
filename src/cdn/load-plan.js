/**
 * Planificador de cargas CDN — sin I/O.
 * Cada job es un `<cat>/<file>.min.js`. Categoría / `all` se expanden a tags.
 */

/**
 * @typedef {{ category: string, file: string }} TagEntry
 * @typedef {{
 *   categories: Record<string, string[]>,
 *   tags: Record<string, TagEntry>,
 *   aliases: Record<string, string>,
 * }} Catalog
 * @typedef {{
 *   all: boolean,
 *   cats: Set<string>,
 *   tags: Set<string>,
 * }} LoadRegistry
 * @typedef {{
 *   kind: 'tag',
 *   path: string,
 *   category?: string,
 *   tagKey?: string,
 * }} LoadJob
 */

export function resolveCategoryId(id, catalog) {
  const raw = String(id || '').trim().toLowerCase();
  if (!raw) return null;
  const aliased = catalog.aliases[raw] || raw;
  return catalog.categories[aliased] ? aliased : null;
}

export function resolveTagId(id, catalog) {
  const raw = String(id || '').trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (catalog.tags[lower]) return catalog.tags[lower];
  const withIs = lower.startsWith('is-') ? lower : `is-${lower}`;
  if (catalog.tags[withIs]) return catalog.tags[withIs];
  const bare = lower.replace(/^is-/, '');
  for (const entry of Object.values(catalog.tags)) {
    if (entry.file === bare) return entry;
  }
  return null;
}

export function tagKey(tag) {
  return `${tag.category}/${tag.file}`;
}

export function isTagCovered(tag, reg) {
  if (reg.all) return true;
  if (reg.cats.has(tag.category)) return true;
  return reg.tags.has(tagKey(tag));
}

function pushTagJob(jobs, batchTags, tag, catalogCovered) {
  const k = tagKey(tag);
  if (catalogCovered(tag) || batchTags.has(k)) return false;
  batchTags.add(k);
  jobs.push({
    kind: 'tag',
    path: `${tag.category}/${tag.file}.min.js`,
    category: tag.category,
    tagKey: k,
  });
  return true;
}

export function planLoads(ids, reg, catalog) {
  /** @type {LoadJob[]} */
  const jobs = [];
  /** @type {string[]} */
  const skipped = [];
  const batchCats = new Set();
  const batchTags = new Set();
  let batchAll = false;

  const coveredCat = (c) => reg.all || reg.cats.has(c) || batchAll || batchCats.has(c);
  const coveredTag = (t) => {
    if (reg.all || batchAll) return true;
    if (reg.cats.has(t.category)) return true;
    const k = tagKey(t);
    return reg.tags.has(k) || batchTags.has(k);
  };

  const expandCat = (cat) => {
    if (coveredCat(cat)) return false;
    batchCats.add(cat);
    for (const file of catalog.categories[cat] || []) {
      pushTagJob(jobs, batchTags, { category: cat, file }, coveredTag);
    }
    return true;
  };

  for (const id of ids) {
    if (id === 'all' || id === '*') {
      if (reg.all || batchAll) {
        skipped.push(id);
        continue;
      }
      for (const cat of Object.keys(catalog.categories)) expandCat(cat);
      batchAll = true;
      continue;
    }

    const cat = resolveCategoryId(id, catalog);
    if (cat) {
      if (!expandCat(cat)) skipped.push(id);
      continue;
    }

    const tag = resolveTagId(id, catalog);
    if (tag) {
      if (!pushTagJob(jobs, batchTags, tag, coveredTag)) skipped.push(id);
      continue;
    }

    throw new Error(
      `ISWebComponentsLoader.load: desconocido "${id}". Usa tag o categoría.`,
    );
  }

  return { jobs, skipped };
}

export function commitLoads(jobs, reg, catalog) {
  for (const job of jobs) {
    if (job.kind === 'tag' && job.tagKey) {
      reg.tags.add(job.tagKey);
      if (job.category) {
        const files = catalog.categories[job.category] || [];
        if (files.every((f) => reg.tags.has(`${job.category}/${f}`))) {
          reg.cats.add(job.category);
        }
      }
    }
  }
  const cats = Object.keys(catalog.categories);
  if (cats.length && cats.every((c) => reg.cats.has(c))) reg.all = true;
}

export function createRegistry() {
  return { all: false, cats: new Set(), tags: new Set() };
}
