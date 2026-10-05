/**
 * Breaking: prefix tags/eventos is-* → iswc-*.
 * Uso: node scripts/rename-is-to-iswc.mjs [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');
const EXTS = new Set(['.ts', '.js', '.mjs', '.cjs', '.json', '.md', '.css', '.html']);

/** No renombrar estos literales. */
const PRESERVE = new Set([
  'is-webcomponents',
  'is-cdn-install',
]);

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name === '.git') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else {
      const ext = path.extname(ent.name);
      if (EXTS.has(ext) || ent.name.endsWith('.d.ts')) out.push(p);
    }
  }
  return out;
}

function extractTags(manifestSrc) {
  const tags = new Set();
  for (const m of manifestSrc.matchAll(/tag:\s*'([^']+)'/g)) {
    if (m[1].startsWith('is-')) tags.add(m[1]);
  }
  return [...tags].sort((a, b) => b.length - a.length);
}

function globalFromTag(tag) {
  return tag.replace(/(^|-)([a-z0-9])/g, (_m, _s, c) => c.toUpperCase());
}

/** Eventos del kit (no tags). Ampliable. */
const EVENT_SUFFIXES = [
  'change', 'input', 'persist', 'cancel', 'submit', 'open', 'close',
  'before-close', 'after-close', 'before-open', 'after-open',
  'select', 'deselect', 'toggle', 'load', 'error', 'ready',
  'stroke-end', 'stroke-start', 'resize', 'scroll', 'focus', 'blur',
  'remove', 'add', 'move', 'drop', 'drag', 'click', 'action',
  'value-change', 'selection-change', 'page-change', 'sort', 'filter',
  'expand', 'collapse', 'navigate', 'search', 'clear', 'copy', 'share',
  'play', 'pause', 'ended', 'timeupdate', 'recording-start', 'recording-stop',
  'scan', 'detect', 'confirm', 'dismiss', 'show', 'hide', 'mount', 'unmount',
];

function transform(text, tags) {
  let out = text;
  let hits = 0;

  const bump = (next) => {
    if (next !== out) {
      hits++;
      out = next;
    }
  };

  bump(out.replaceAll('is-preview/v1', 'iswc-preview/v1'));
  bump(out.replaceAll("'$schema': 'is-preview/v1'", "'$schema': 'iswc-preview/v1'"));

  // Tags conocidos (más largos primero)
  for (const tag of tags) {
    const next = `iswc-${tag.slice(3)}`;
    const re = new RegExp(tag.replace(/-/g, '\\-'), 'g');
    const before = out;
    out = out.replace(re, next);
    if (out !== before) hits++;

    const oldG = globalFromTag(tag);
    const newG = globalFromTag(next);
    if (oldG !== newG) {
      const reG = new RegExp(`\\b${oldG}\\b`, 'g');
      const b2 = out;
      out = out.replace(reG, newG);
      if (out !== b2) hits++;
    }
  }

  // Eventos entre comillas: 'is-change' → 'iswc-change'
  for (const suf of EVENT_SUFFIXES) {
    const oldE = `is-${suf}`;
    const newE = `iswc-${suf}`;
    if (out.includes(oldE)) {
      bump(out.split(oldE).join(newE));
    }
  }

  // Prefijos de detección residuales
  bump(out.replaceAll("startsWith('is-')", "startsWith('iswc-')"));
  bump(out.replaceAll('startsWith("is-")', 'startsWith("iswc-")'));
  bump(out.replaceAll('/<(is-[a-z0-9-]+)/gi', '/<(iswc-[a-z0-9-]+)/gi'));
  bump(out.replaceAll('/<(is-[a-z0-9-]+)/g', '/<(iswc-[a-z0-9-]+)/g'));

  // load-plan: `is-${lower}` / startsWith('is-') / replace(/^is-/, '')
  bump(out.replaceAll("startsWith('is-') ? lower : `is-${lower}`", "startsWith('iswc-') ? lower : `iswc-${lower}`"));
  bump(out.replaceAll('startsWith("is-") ? lower : `is-${lower}`', 'startsWith("iswc-") ? lower : `iswc-${lower}`'));
  bump(out.replaceAll(".replace(/^is-/, '')", ".replace(/^iswc-/, '')"));
  bump(out.replaceAll('.replace(/^is-/, "")', '.replace(/^iswc-/, "")'));

  // md-iswc-fences residual: return `is-${name}` → iswc-
  bump(out.replaceAll('return `is-${name}`', 'return `iswc-${name}`'));

  // GALLERY_CHROME_TAGS / defineElement ya cubiertos por tag replace

  // Preservar literales bloqueados si se colaron
  for (const p of PRESERVE) {
    const bad = p.replace(/^is-/, 'iswc-');
    if (bad !== p && out.includes(bad) && !text.includes(bad)) {
      out = out.split(bad).join(p);
    }
  }

  return { out, hits };
}

function main() {
  const tags = extractTags(fs.readFileSync(path.join(ROOT, 'src/manifest.ts'), 'utf8'));
  console.log(`tags=${tags.length}`);

  const roots = ['src', 'specs', 'scripts']
    .map((d) => path.join(ROOT, d))
    .filter(fs.existsSync);
  const files = roots.flatMap((r) => walk(r)).filter((f) => !f.includes('rename-is-to-iswc'));

  let changed = 0;
  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8');
    if (raw.includes('\0')) continue;
    const { out, hits } = transform(raw, tags);
    if (out === raw) continue;
    changed++;
    console.log(`${DRY ? 'DRY' : 'WR'} ${path.relative(ROOT, file)} hits~${hits}`);
    if (!DRY) fs.writeFileSync(file, out, 'utf8');
  }
  console.log(`changed=${changed} dry=${DRY}`);
}

main();
