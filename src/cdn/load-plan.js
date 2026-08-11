/**
 * Planificador de cargas CDN — sin I/O.
 * Evita re-fetch si ya hay categoría/`all` que cubre el tag.
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
 *   kind: 'all' | 'category' | 'tag',
 *   path: string,
 *   category?: string,
 *   tagKey?: string,
 * }} LoadJob
 */

/**
 * @param {string} id
 * @param {Catalog} catalog
 */
export function resolveCategoryId(id, catalog) {
  const raw = String(id || '').trim().toLowerCase();
  if (!raw) return null;
  const aliased = catalog.aliases[raw] || raw;
  return catalog.categories[aliased] ? aliased : null;
}

/**
 * @param {string} id
 * @param {Catalog} catalog
 * @returns {TagEntry | null}
 */
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

/** @param {TagEntry} tag */
export function tagKey(tag) {
  return `${tag.category}/${tag.file}`;
}

/**
 * ¿El registro ya cubre este tag (vía all, categoría o carga puntual)?
 * @param {TagEntry} tag
 * @param {LoadRegistry} reg
 */
export function isTagCovered(tag, reg) {
  if (reg.all) return true;
  if (reg.cats.has(tag.category)) return true;
  return reg.tags.has(tagKey(tag));
}

/**
 * Planifica fetches nuevos. No muta `reg` — el caller marca tras éxito.
 * @param {string[]} ids
 * @param {LoadRegistry} reg
 * @param {Catalog} catalog
 * @returns {{ jobs: LoadJob[], skipped: string[] }}
 */
export function planLoads(ids, reg, catalog) {
  /** @type {LoadJob[]} */
  const jobs = [];
  /** @type {string[]} */
  const skipped = [];
  /** @type {Set<string>} */
  const batchCats = new Set();
  /** @type {Set<string>} */
  const batchTags = new Set();
  let batchAll = false;

  const coveredCat = (c) => reg.all || reg.cats.has(c) || batchAll || batchCats.has(c);
  const coveredTag = (t) => {
    if (reg.all || batchAll) return true;
    if (reg.cats.has(t.category) || batchCats.has(t.category)) return true;
    const k = tagKey(t);
    return reg.tags.has(k) || batchTags.has(k);
  };

  for (const id of ids) {
    if (id === 'all' || id === '*') {
      if (reg.all || batchAll) {
        skipped.push(id);
        continue;
      }
      batchAll = true;
      jobs.push({ kind: 'all', path: 'all.min.js' });
      continue;
    }

    const cat = resolveCategoryId(id, catalog);
    if (cat) {
      if (coveredCat(cat)) {
        skipped.push(id);
        continue;
      }
      batchCats.add(cat);
      jobs.push({ kind: 'category', path: `${cat}/category.${cat}.min.js`, category: cat });
      continue;
    }

    const tag = resolveTagId(id, catalog);
    if (tag) {
      if (coveredTag(tag)) {
        skipped.push(id);
        continue;
      }
      const k = tagKey(tag);
      batchTags.add(k);
      jobs.push({
        kind: 'tag',
        path: `${tag.category}/${tag.file}.min.js`,
        category: tag.category,
        tagKey: k,
      });
      continue;
    }

    throw new Error(
      `ISWebComponentsLoader.load: desconocido "${id}". Usa tag, categoría, o "all".`,
    );
  }

  return { jobs, skipped };
}

/**
 * Aplica jobs exitosos al registro (cubre tags hijos de categorías / all).
 * @param {LoadJob[]} jobs
 * @param {LoadRegistry} reg
 * @param {Catalog} catalog
 */
export function commitLoads(jobs, reg, catalog) {
  for (const job of jobs) {
    if (job.kind === 'all') {
      reg.all = true;
      for (const c of Object.keys(catalog.categories)) reg.cats.add(c);
      for (const t of Object.values(catalog.tags)) reg.tags.add(tagKey(t));
      continue;
    }
    if (job.kind === 'category' && job.category) {
      reg.cats.add(job.category);
      for (const file of catalog.categories[job.category] || []) {
        reg.tags.add(`${job.category}/${file}`);
      }
      continue;
    }
    if (job.kind === 'tag' && job.tagKey) {
      reg.tags.add(job.tagKey);
    }
  }
}

/** @returns {LoadRegistry} */
export function createRegistry() {
  return { all: false, cats: new Set(), tags: new Set() };
}
