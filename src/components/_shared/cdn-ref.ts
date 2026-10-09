/**
 * cdn-ref.js — pin de `main` → SHA + espejos CDN del kit.
 *
 * Orden de fallback al cargar assets:
 *   1. jsDelivr (`@<sha>` inmutable)
 *   2. raw.githack (mismo pin; MIME JS fiable)
 *   3. GitHub Pages (tip desplegado; último recurso)
 *
 * Un módulo que arranca en un espejo resuelve sus `import` relativos en
 * ese mismo origen. Mezclar orígenes a medias no aplica: cada `load`
 * prueba la cadena hasta que uno responde.
 */
export const GH_REPO = 'Jeff-Aporta/iswc-root';

const REF_KEY = 'iswc-wc:cdn-ref';
const MIRROR_KEY = 'iswc-wc:cdn-mirror';
let refPromise: Promise<string> | null = null;

export const resolveRef = () => {
  if (refPromise) return refPromise;
  let cached = null;
  try { cached = globalThis.sessionStorage?.getItem(REF_KEY); } catch { /* modo privado */ }
  if (cached) { refPromise = Promise.resolve(cached); return refPromise; }
  refPromise = fetch(`https://api.github.com/repos/${GH_REPO}/commits/main`, {
    headers: { Accept: 'application/vnd.github.sha' },
  })
    .then((r) => (r.ok ? r.text() : ''))
    .then((sha: string) => {
      const ref = /^[0-9a-f]{40}$/i.test(sha.trim()) ? sha.trim() : 'main';
      try { globalThis.sessionStorage?.setItem(REF_KEY, ref); } catch { /* modo privado */ }
      return ref;
    })
    .catch(() => 'main');
  return refPromise;
};

export const jsdelivrBase = (ref = 'main') =>
  `https://cdn.jsdelivr.net/gh/${GH_REPO}@${ref}/dist/cdn`;

/** raw.githack: `/user/repo/<ref>/path` (ref = SHA o `main`). */
export const githackBase = (ref = 'main') =>
  `https://raw.githack.com/${GH_REPO}/${ref}/dist/cdn`;

export const pagesBase = () =>
  'https://jeff-aporta.github.io/iswc-root/dist/cdn';

/**
 * Espejos en orden de fallback.
 * `base(ref)` — ref es SHA o `main`. Pages ignora el pin (siempre tip).
 */
export const MIRRORS = [
  {
    id: 'jsdelivr',
    label: 'jsDelivr',
    hint: 'Primario · pin por commit',
    pin: true,
    base: (ref = 'main') => jsdelivrBase(ref),
  },
  {
    id: 'githack',
    label: 'raw.githack',
    hint: 'Fallback · mismo pin · MIME JS',
    pin: true,
    base: (ref = 'main') => githackBase(ref),
  },
  {
    id: 'pages',
    label: 'GitHub Pages',
    hint: 'Último recurso · tip desplegado',
    pin: false,
    base: () => pagesBase(),
  },
];

export const mirrorById = (id: string) =>
  MIRRORS.find((m) => m.id === id) || MIRRORS[0];

export const readMirrorId = () => {
  try {
    const id = globalThis.sessionStorage?.getItem(MIRROR_KEY);
    if (id && MIRRORS.some((m) => m.id === id)) return id;
  } catch { /* modo privado */ }
  return 'jsdelivr';
};

export const writeMirrorId = (id: string): void => {
  if (!MIRRORS.some((m) => m.id === id)) return;
  try { globalThis.sessionStorage?.setItem(MIRROR_KEY, id); } catch { /* modo privado */ }
};

/** Base ya congelada al último commit (jsDelivr). */
export const resolvedBase = async () => jsdelivrBase(await resolveRef());

/**
 * Bases en orden de fallback: jsDelivr → githack → Pages.
 */
export const fallbackBases = (ref = 'main') =>
  MIRRORS.map((m) => m.base(ref));

/** Sustituye {{nombre}} en la plantilla del host. Lo que no esté en vars se queda. */
export function fillHostTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{([A-Za-z_][\w]*)\}\}/g, (all, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? vars[name]! : all);
}
