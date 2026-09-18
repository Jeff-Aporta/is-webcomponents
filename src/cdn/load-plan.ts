/**
 * Planificador de cargas CDN — sin I/O.
 * Cada job es un `<cat>/<file>.min.js`. Categoría / `all` se expanden a tags.
 */

export interface TagEntry {
  category: string;
  file: string;
}

export interface Catalog {
  categories: Record<string, string[]>;
  tags: Record<string, TagEntry>;
  aliases: Record<string, string>;
}

export interface LoadRegistry {
  all: boolean;
  cats: Set<string>;
  tags: Set<string>;
}

export interface LoadJob {
  kind: 'tag';
  path: string;
  category?: string;
  tagKey?: string;
}

export function resolveCategoryId(id: string, catalog: Catalog): string | null {
  const raw = String(id || '').trim().toLowerCase();
  if (!raw) return null;
  const aliased = catalog.aliases[raw] || raw;
  return catalog.categories[aliased] ? aliased : null;
}

export function resolveTagId(id: string, catalog: Catalog): TagEntry | null {
  const raw = String(id || '').trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  const direct = catalog.tags[lower];
  if (direct) return direct;
  const withIs = lower.startsWith('is-') ? lower : `is-${lower}`;
  const prefixed = catalog.tags[withIs];
  if (prefixed) return prefixed;
  const bare = lower.replace(/^is-/, '');
  for (const entry of Object.values(catalog.tags)) {
    if (entry.file === bare) return entry;
  }
  return null;
}

export function tagKey(tag: TagEntry): string {
  return `${tag.category}/${tag.file}`;
}

export function isTagCovered(tag: TagEntry, reg: LoadRegistry): boolean {
  if (reg.all) return true;
  if (reg.cats.has(tag.category)) return true;
  return reg.tags.has(tagKey(tag));
}

function pushTagJob(
  jobs: LoadJob[],
  batchTags: Set<string>,
  tag: TagEntry,
  catalogCovered: (t: TagEntry) => boolean,
): boolean {
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

export interface PlanLoadsResult {
  jobs: LoadJob[];
  skipped: string[];
}

export function planLoads(ids: readonly string[], reg: LoadRegistry, catalog: Catalog): PlanLoadsResult {
  const jobs: LoadJob[] = [];
  const skipped: string[] = [];
  const batchCats = new Set<string>();
  const batchTags = new Set<string>();
  let batchAll = false;

  const coveredCat = (c: string): boolean =>
    reg.all || reg.cats.has(c) || batchAll || batchCats.has(c);
  const coveredTag = (t: TagEntry): boolean => {
    if (reg.all || batchAll) return true;
    if (reg.cats.has(t.category)) return true;
    const k = tagKey(t);
    return reg.tags.has(k) || batchTags.has(k);
  };

  const expandCat = (cat: string): boolean => {
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

export function commitLoads(jobs: readonly LoadJob[], reg: LoadRegistry, catalog: Catalog): void {
  for (const job of jobs) {
    if (job.kind === 'tag' && job.tagKey) {
      reg.tags.add(job.tagKey);
      if (job.category) {
        const files = catalog.categories[job.category] || [];
        if (files.every((f: string) => reg.tags.has(`${job.category}/${f}`))) {
          reg.cats.add(job.category);
        }
      }
    }
  }
  const cats = Object.keys(catalog.categories);
  if (cats.length && cats.every((c: string) => reg.cats.has(c))) reg.all = true;
}

export function createRegistry(): LoadRegistry {
  return { all: false, cats: new Set(), tags: new Set() };
}
