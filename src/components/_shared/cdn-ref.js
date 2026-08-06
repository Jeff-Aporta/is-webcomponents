/**
 * cdn-ref.js — pin de `main` → SHA + espejos CDN del kit.
 *
 * Primario: jsDelivr (`@<sha>` inmutable). Espejo: GitHub Pages (tip
 * desplegado). Un solo origen por sesión: mezclar bases rompe imports
 * relativos entre bundles.
 */
export const GH_REPO = 'Jeff-Aporta/is-webcomponents';

const REF_KEY = 'is-wc:cdn-ref';
const MIRROR_KEY = 'is-wc:cdn-mirror';
let refPromise = null;

export const resolveRef = () => {
  if (refPromise) return refPromise;
  let cached = null;
  try { cached = globalThis.sessionStorage?.getItem(REF_KEY); } catch { /* modo privado */ }
  if (cached) { refPromise = Promise.resolve(cached); return refPromise; }
  refPromise = fetch(`https://api.github.com/repos/${GH_REPO}/commits/main`, {
    headers: { Accept: 'application/vnd.github.sha' },
  })
    .then((r) => (r.ok ? r.text() : ''))
    .then((sha) => {
      const ref = /^[0-9a-f]{40}$/i.test(sha.trim()) ? sha.trim() : 'main';
      try { globalThis.sessionStorage?.setItem(REF_KEY, ref); } catch { /* modo privado */ }
      return ref;
    })
    .catch(() => 'main');
  return refPromise;
};

export const jsdelivrBase = (ref = 'main') =>
  `https://cdn.jsdelivr.net/gh/${GH_REPO}@${ref}/dist/cdn`;

export const pagesBase = () =>
  'https://jeff-aporta.github.io/is-webcomponents/dist/cdn';

/**
 * Espejos ofrecibles en la UI y en el boot con fallback.
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
    id: 'pages',
    label: 'GitHub Pages',
    hint: 'Espejo · tip desplegado',
    pin: false,
    base: () => pagesBase(),
  },
];

export const mirrorById = (id) =>
  MIRRORS.find((m) => m.id === id) || MIRRORS[0];

export const readMirrorId = () => {
  try {
    const id = globalThis.sessionStorage?.getItem(MIRROR_KEY);
    if (id && MIRRORS.some((m) => m.id === id)) return id;
  } catch { /* modo privado */ }
  return 'jsdelivr';
};

export const writeMirrorId = (id) => {
  if (!MIRRORS.some((m) => m.id === id)) return;
  try { globalThis.sessionStorage?.setItem(MIRROR_KEY, id); } catch { /* modo privado */ }
};

/** Base ya congelada al último commit (jsDelivr). */
export const resolvedBase = async () => jsdelivrBase(await resolveRef());

/**
 * Bases en orden de fallback para el snippet de boot.
 * jsDelivr primero (pin), Pages de reserva.
 */
export const fallbackBases = (ref = 'main') =>
  MIRRORS.map((m) => m.base(ref));
