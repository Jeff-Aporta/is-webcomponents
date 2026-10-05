import components from '../manifest.js';
import { PALETTES, type PaletteConfig } from '../styles/palette-build.js';
import type { ComponentManifestItem } from '../manifest.js';
import { hasControlledPreview, hasCachedPreview, loadPreview } from '../previews/registry.js';
import { collectIsTags, GALLERY_CHROME_TAGS } from '../cdn/collect-iswc-tags.js';
import {
  getComponentPrefs,
  removeComponentPrefs,
  setComponentPrefs,
} from '../components/_shared/prefs.js';
import type { GalleryState, ThemeName, PaletteName, CategoryMeta, CatalogItem, ThemeToggleElement, PaletteSelectorElement, PreviewLike, PreviewHostElement, SplitPanelElement, FrameElement, DrawerElement, LoaderLike } from "./app.schemas.js";

/* ──────────────────────────── Tipos locales ───────────────────────────── */

/** Estado de la galería guardado en `?s=` (b64url JSON). */

/** Temas y paletas reconocidos. */

/** Categoría visible en el nav: id estable + label traducido. */

/** Item del catálogo: puede venir del manifest (ComponentManifestItem) o ser
 *  una página "suelta" como HOME/THEMING/ECOSYSTEM. */

/** Subset del `<iswc-theme-toggle>` que la galería consulta. */

/** Subset del `<iswc-palette-selector>` del shell. */

/** Forma mínima de un preview (JsonPreview satisface esta estructura). */

/** Subset del `<iswc-preview-component>` que la galería cablea con `.preview`. */

/** Subset de `<iswc-split-panel>` con la propiedad `positionInPixels`. */

/** Subset del `<iframe>` con `contentWindow` / `contentDocument` strict. */

/** Subset del `<iswc-drawer>` con `show` / `hide` cancelables. */

/** Subset del ISWebComponentsLoader (subset usado por la galería). */

/* ─────────────── asRecord: helper común del WT-ROOT ─────────────────── */

/** Cualquier `unknown` → `Record<string, unknown>` para narrowing local. */
function asRecord(v: unknown): Record<string, unknown> {
  return (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
}

/* ─────────────────────────── Lookup del DOM ───────────────────────────── */

/**
 * El host (`doc-demo-host`) y esta SPA son entry points module independientes.
 * Un TLA en el host NO bloquea siblings: gallery-app puede evaluar mientras
 * `iswc-doc-demo` aún no está definido ni ha pintado el shell. Esperamos.
 */
async function waitForGalleryShell(): Promise<void> {
  if (document.getElementById('shellNav')) return;

  await Promise.race([
    customElements.whenDefined('iswc-doc-demo'),
    new Promise<void>((resolve) => {
      window.addEventListener('iswc-gallery-shell-ready', () => resolve(), { once: true });
    }),
  ]);

  // Upgrade + connectedCallback (#paintShell) son sync tras define; un
  // microtask cubre el caso en que el ready llega un tick después.
  if (!document.getElementById('shellNav')) {
    await new Promise<void>((r) => queueMicrotask(r));
  }
  if (!document.getElementById('shellNav')) {
    await new Promise<void>((resolve) => {
      window.addEventListener('iswc-gallery-shell-ready', () => resolve(), { once: true });
    });
  }
}

await waitForGalleryShell();

/** Devuelve un getElementById sin la posibilidad de `null` (la página garantiza presencia). */
function el<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`[gallery-app] falta #${id} (shell iswc-doc-demo no listo)`);
  return node as T;
}

const root = document.documentElement;
const themeToggle = el<ThemeToggleElement>('themeToggle');
const fullscreenBtn = el<HTMLElement>('fullscreenBtn');
const shellNav = el<HTMLElement>('shellNav');
const frame = el<FrameElement>('previewFrame');
const previewHost = el<PreviewHostElement>('previewHost');
const brandPalette = el<PaletteSelectorElement>('brandPalette');
// Logo ISWC en top-left del header (Phase W7). Click -> home + URL limpia.
const shellBrand = el<HTMLAnchorElement>('shellBrand');

const params = new URLSearchParams(location.search);
const themes = new Set<ThemeName>(['light', 'dark']);
const palettes = new Set<PaletteName>(PALETTES.map((p) => p.value as PaletteName));
const brands: Record<string, PaletteConfig> = Object.fromEntries(PALETTES.map((p) => [p.value, p]));

// --- b64url helpers (inline; pattern from isa-patyia-paws router.ts) ---
const b64urlEncode = (input: string): string => {
  const bytes = new TextEncoder().encode(input);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const b64urlDecode = (input: string): string => {
  let pad = String(input).replace(/-/g, '+').replace(/_/g, '/');
  while (pad.length % 4) pad += '=';
  const bin = atob(pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
};

const readStateParam = (): GalleryState | null => {
  const raw = params.get('s');
  if (!raw) return null;
  try { return JSON.parse(b64urlDecode(raw)) as GalleryState; } catch { return null; }
};

// --- home + catalog (home no está en manifest) ---
const HOME = { tag: 'home', title: 'Home', page: 'home.json' };
// Igual que Inicio, no es un componente del catálogo sino una página
// suelta en previews/ raíz: el taller para armarse una paleta propia.
const THEMING = { tag: 'theming', title: 'Personalización', page: 'theming.json' };
const ECOSYSTEM = { tag: 'ecosystem', title: 'Ecosistema JS', page: 'ecosystem.json' };
/** Mapa grid de categorías/componentes (`#icons` / ?s= component=icons). */
const ICONS = { tag: 'icons', title: 'Mapa', page: 'icons.json' };
const catalog: CatalogItem[] = [HOME, ICONS, THEMING, ECOSYSTEM, ...components];

// --- build nav (Home + agrupado por categoría) ---
// Sin filtro: el nav lista el catálogo completo del manifest.
const navSkip = new Set<string>();
const categoryMeta: Record<string, CategoryMeta> = {
  // El orden de estas claves ES el orden del nav (categoryOrder las lee
  // con Object.keys), así que isp va al final a propósito: son las
  // primitivas portadas, no el catálogo propio.
  actions: { id: 'actions', label: 'Acciones' },
  media: { id: 'media', label: 'Media' },
  feedback: { id: 'feedback', label: 'Feedback' },
  layout: { id: 'layout', label: 'Layout' },
  navigation: { id: 'navigation', label: 'Navegación' },
  forms: { id: 'forms', label: 'Formularios' },
  code: { id: 'code', label: 'Código' },
  data: { id: 'data', label: 'Datos' },
  'data-viz': { id: 'data-viz', label: 'Gráficos' },
  diagrams: { id: 'diagrams', label: 'Diagramas' },
  files: { id: 'files', label: 'Archivos' },
  overlays: { id: 'overlays', label: 'Overlays' },
  preview: { id: 'preview', label: 'Preview' },
  helpers: { id: 'helpers', label: 'Utilerías' },
  isp: { id: 'isp', label: 'ISP-SvelteComponents' },
};
const categoryOrder: string[] = Object.keys(categoryMeta);

{
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'shell-nav__item shell-nav__item--home';
  btn.dataset.tag = HOME.tag;
  btn.setAttribute('aria-label', 'Inicio — home');
  // El item "Inicio" del home reusa el styling de los items regulares
  // (vertical title, mismo highlight en aria-current) y deja solo el
  // titulo "Inicio" — sin `<home>` tag, porque la pagina inicial no
  // es un componente del catalogo, es un atajo a la portada.
  const title = document.createElement('span');
  title.className = 'shell-nav__title';
  title.textContent = 'Inicio';
  btn.append(title);
  btn.addEventListener('click', () => selectComponent(HOME.tag));
  shellNav.appendChild(btn);
}

{
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'shell-nav__item shell-nav__item--home';
  btn.dataset.tag = ICONS.tag;
  btn.setAttribute('aria-label', 'Mapa de componentes — icons');
  const title = document.createElement('span');
  title.className = 'shell-nav__title';
  title.textContent = ICONS.title;
  btn.append(title);
  btn.addEventListener('click', () => selectComponent(ICONS.tag));
  shellNav.appendChild(btn);
}

{
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'shell-nav__item shell-nav__item--home';
  btn.dataset.tag = THEMING.tag;
  btn.setAttribute('aria-label', 'Personalización — theming');
  const title = document.createElement('span');
  title.className = 'shell-nav__title';
  title.textContent = THEMING.title;
  btn.append(title);
  btn.addEventListener('click', () => selectComponent(THEMING.tag));
  shellNav.appendChild(btn);
}

{
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'shell-nav__item shell-nav__item--home';
  btn.dataset.tag = ECOSYSTEM.tag;
  btn.setAttribute('aria-label', 'Ecosistema JS — utilidades compartidas');
  const title = document.createElement('span');
  title.className = 'shell-nav__title';
  title.textContent = ECOSYSTEM.title;
  btn.append(title);
  btn.addEventListener('click', () => selectComponent(ECOSYSTEM.tag));
  shellNav.appendChild(btn);
}

const navItems = components.filter((c): c is ComponentManifestItem & { page: string } =>
  !navSkip.has(c.tag) && Boolean(c.page),
);
const byCategory = new Map<string, ComponentManifestItem[]>();
for (const c of navItems) {
  const key = categoryMeta[c.category] ? c.category : 'helpers';
  if (!byCategory.has(key)) byCategory.set(key, []);
  (byCategory.get(key) as ComponentManifestItem[]).push(c);
}
for (const list of byCategory.values()) {
  list.sort((a, b) => a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }));
}
for (const key of categoryOrder) {
  const list = byCategory.get(key);
  if (!list?.length) continue;
  const meta = categoryMeta[key];
  const group = document.createElement('div');
  group.className = 'shell-nav__group';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-labelledby', `nav-cat-${meta.id}`);

  const heading = document.createElement('div');
  heading.className = 'shell-nav__heading';
  heading.id = `nav-cat-${meta.id}`;
  heading.textContent = meta.label;
  group.appendChild(heading);

  for (const component of list) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'shell-nav__item';
    item.dataset.tag = component.tag;
    item.setAttribute('aria-label', `${component.title} ${component.tag}`);
    const title = document.createElement('span');
    title.className = 'shell-nav__title';
    // Dot sutil: origen ISP-SvelteComponents (aunque viva en otra categoría).
    if (component.origin === 'isp' || component.category === 'isp') {
      const dot = document.createElement('span');
      dot.className = 'shell-nav__isp-dot';
      dot.setAttribute('aria-hidden', 'true');
      dot.title = 'Origen ISP-SvelteComponents';
      title.append(dot, document.createTextNode(component.title));
    } else {
      title.textContent = component.title;
    }
    const tag = document.createElement('span');
    tag.className = 'shell-nav__tag';
    tag.textContent = `<${component.tag}>`;
    item.append(title, tag);
    item.addEventListener('click', () => selectComponent(component.tag));
    group.appendChild(item);
  }
  shellNav.appendChild(group);
}

// --- initial state ---
const stateFromUrl = readStateParam();
const themeFromUrl = typeof stateFromUrl?.theme === 'string' ? stateFromUrl.theme : null;
const themeStored = localStorage.getItem('iswc-theme');
let theme: ThemeName = themes.has(themeFromUrl as ThemeName)
  ? (themeFromUrl as ThemeName)
  : (themes.has(themeStored as ThemeName) ? (themeStored as ThemeName) : 'dark');

const paletteFromUrl = typeof stateFromUrl?.palette === 'string' ? stateFromUrl.palette : null;
const paletteStored = localStorage.getItem('iswc-palette');
let palette: PaletteName = palettes.has(paletteFromUrl as PaletteName)
  ? (paletteFromUrl as PaletteName)
  : (palettes.has(paletteStored as PaletteName) ? (paletteStored as PaletteName) : 'contapyme');

const componentFromUrl = typeof stateFromUrl?.component === 'string' ? stateFromUrl.component : null;
const hashWantsIcons = location.hash.replace(/^#/, '') === 'icons';
let component: CatalogItem =
  (hashWantsIcons ? ICONS : null)
  ?? catalog.find(item => item.tag === componentFromUrl)
  ?? HOME;

// panelsCompact vive en ?s= — hay que inicializarlo ANTES de renderContext/updateUrl.
const PANELS_TTL_MS = 3_600_000;
const SHELL_PREFS_TAG = 'iswc-gallery';
const SHELL_PREFS_KEY = 'shell';
const ICON_COMPACT = 'mdi:arrow-collapse-horizontal';
const ICON_EXPAND = 'mdi:arrow-expand-horizontal';
const panelsCompactBtn = document.getElementById('panelsCompactBtn') as HTMLElement | null;

function readPanelsCompactPref(): boolean {
  const saved = getComponentPrefs(SHELL_PREFS_TAG, SHELL_PREFS_KEY);
  if (!saved) return false;
  const savedAt = Number((saved as { savedAt?: unknown }).savedAt);
  if (!Number.isFinite(savedAt) || savedAt <= 0 || Date.now() - savedAt > PANELS_TTL_MS) {
    removeComponentPrefs(SHELL_PREFS_TAG, SHELL_PREFS_KEY);
    return false;
  }
  return (saved as { panelsCompact?: unknown }).panelsCompact === true;
}

function writePanelsCompactPref(compact: boolean): void {
  setComponentPrefs(SHELL_PREFS_TAG, SHELL_PREFS_KEY, {
    panelsCompact: compact,
    savedAt: Date.now(),
  });
}

let panelsCompactUser =
  stateFromUrl?.panelsCompact === true || readPanelsCompactPref();

function encodeState(obj: GalleryState): string {
  return b64urlEncode(JSON.stringify(obj));
}

/** Preview URL legado (solo si faltara en catalog — no debería ocurrir). */
function previewSrc(page: string): string {
  return `src/previews/${page}?s=${encodeState({ embed: true, theme, palette })}`;
}

function controlledShellSrc(tag: string): string {
  return `src/previews/_shell.html?tag=${encodeURIComponent(tag)}&s=${encodeState({ embed: true, theme, palette })}`;
}

/**
 * Asigna `.preview` al host ya upgraded. Importante: el módulo del body
 * puede correr mientras el `<head>` aún carga el shell (TLA no bloquea
 * siblings). Si asignamos antes del upgrade, queda una own property que
 * tapa el setter de `<iswc-preview-component>` y el main nunca se pinta.
 */
function setHostPreview(value: PreviewLike | null): void {
  if (Object.prototype.hasOwnProperty.call(previewHost, 'preview')) {
    delete previewHost.preview;
  }
  previewHost.preview = value;
}

/**
 * Tags del preview + chrome de demos (dropdown/copy/code/cdn-snippet…).
 * Sin all.min.js: cada vista pide solo lo que pinta.
 */
async function ensurePreviewDeps(tag: string, preview: PreviewLike): Promise<void> {
  await customElements.whenDefined('iswc-preview-component');
  const L = (globalThis as Record<string, unknown>).ISWebComponentsLoader as LoaderLike | undefined;
  if (!L) return;
  let tags: string[] = [...new Set<string>([
    ...GALLERY_CHROME_TAGS,
    ...(collectIsTags(preview.definition ?? preview) as string[]),
  ])];
  // Knobs JSON (target+controls) → hace falta el CE playground aunque no
  // figure en el HTML del demo (lo monta render.ts en runtime).
  const def = (preview.definition ?? preview) as {
    sections?: Array<{ blocks?: Array<{ target?: string; controls?: unknown[] }> }>;
  };
  const needsPg = (def.sections ?? []).some((s) =>
    (s.blocks ?? []).some((b) => Boolean(b.target) && Array.isArray(b.controls) && b.controls.length > 0),
  );
  if (needsPg) {
    tags.push(
      'iswc-playground',
      'iswc-preview-controls',
      'iswc-select',
      'iswc-option',
      'iswc-input',
      'iswc-details',
    );
  }
  // Los demos pueden citar tags de soporte sin catálogo (chrome hijos como
  // iswc-tab): pedirlos al loader tiraba el mount entero. Solo cargar los
  // que el catálogo sabe resolver; el resto queda como markup declarativo.
  tags = tags.filter((t) => {
    const cat = L.catalog?.categories;
    const aliases = L.catalog?.aliases;
    return Boolean(L.catalog?.tags?.[t])
      || Boolean(cat?.[aliases?.[t] ?? t]);
  });
  if (tags.length) await L.load(...tags);
  if (tag.startsWith('iswc-') && !customElements.get(tag)) {
    // Solo esperar cuando el loader conoce el tag Y lo va a definir.
    // Hay dos clases de "tag conocido pero no definido":
    //   1. Meta-previews como `iswc-icon-explorer` (no están en el catálogo
    //      del loader → fix anterior).
    //   2. Module-only entries del manifest (p.ej. `iswc-ui`) — el loader
    //      SÍ los conoce y los carga, pero el módulo no llama
    //      `customElements.define()` porque son utilidades, no componentes.
    //      En ese caso `whenDefined` cuelga para siempre.
    // Solución: race con timeout corto. Si en 1s no se define, asumimos
    // que es module-only y seguimos.
    const aliases = L.catalog?.aliases;
    const known = Boolean(L.catalog?.tags?.[tag])
      || Boolean(L.catalog?.categories?.[aliases?.[tag] ?? tag]);
    if (known) {
      await Promise.race([
        customElements.whenDefined(tag),
        new Promise<undefined>((r) => setTimeout(() => r(undefined), 1000)),
      ]);
    }
  }
}

async function showPreview(): Promise<void> {
  const tag = component.tag;

  if (hasControlledPreview(tag)) {
    frame.hidden = true;
    frame.removeAttribute('src');
    previewHost.hidden = false;
    if (!hasCachedPreview(tag)) setHostPreview(null);
    const preview = await loadPreview(tag);
    if (!preview) return;
    if (component.tag !== tag) return;
    const previewLike = preview as unknown as PreviewLike;
    await ensurePreviewDeps(tag, previewLike);
    await customElements.whenDefined('iswc-preview-component');
    setHostPreview(previewLike);
    return;
  }

  console.warn(`[gallery] sin JSON de preview para ${tag}`);
  previewHost.hidden = true;
  if (customElements.get('iswc-preview-component')) setHostPreview(null);
  else if (Object.prototype.hasOwnProperty.call(previewHost, 'preview')) {
    delete previewHost.preview;
  }
  frame.hidden = false;
  frame.removeAttribute('src');
}

function sendContext(): void {
  if (!frame.hidden) {
    frame.contentWindow?.postMessage({ type: 'iswc-context', theme, palette }, location.origin);
  }
}

function updateUrl(): void {
  // `?s=` es el único state URL. theme/palette no van en la URL live.
  // panelsCompact sí (preferencia de shell). Home sin keys → URL limpia.
  const prev = readStateParam() || {};
  const next: GalleryState = { ...prev };
  delete next.theme;
  delete next.palette;
  delete next.embed;

  if (component === HOME) delete next.component;
  else next.component = component.tag;

  if (panelsCompactUser) next.panelsCompact = true;
  else delete next.panelsCompact;

  const dest = new URL(location.href);
  const keys = Object.keys(next).filter((k) => next[k] !== undefined);
  if (!keys.length) {
    if (location.search) {
      dest.search = '';
      // Conserva hash solo si apunta a algo distinto de icons en home.
      if (dest.hash === '#icons') dest.hash = '';
      history.replaceState(null, '', dest);
    } else if (location.hash === '#icons' && component === HOME) {
      dest.hash = '';
      history.replaceState(null, '', dest);
    }
  } else {
    dest.search = '?s=' + encodeState(next);
    // Alias canónico del mapa: #icons ↔ tag icons.
    if (component === ICONS) dest.hash = 'icons';
    else if (dest.hash === '#icons') dest.hash = '';
    history.replaceState(null, '', dest);
  }
}

function renderContext({ navSmooth = false }: { navSmooth?: boolean } = {}): void {
  // Contrato W51: solo data-theme / data-palette (sin clases .theme-*).
  root.dataset.theme = theme;
  root.dataset.palette = palette;
  themeToggle.dark = theme === 'dark';
  for (const node of shellNav.querySelectorAll<HTMLElement>('.shell-nav__item')) {
    const ds = node.dataset;
    node.setAttribute('aria-current', ds.tag === component.tag ? 'true' : 'false');
  }
  scheduleScrollNavToCurrent({ smooth: navSmooth });
  const brandData = brands[palette] ?? brands.contapyme;
  document.title = `${component.title} | ${brandData.label}`;
  localStorage.setItem('iswc-theme', theme);
  localStorage.setItem('iswc-palette', palette);
  updateUrl();
  sendContext();
}

/** Centra el ítem activo en el viewport del nav (sin scrollear la página). */
function scrollNavToCurrent({ smooth = false }: { smooth?: boolean } = {}): void {
  const current = shellNav.querySelector<HTMLElement>('.shell-nav__item[aria-current="true"]');
  if (!current) return;
  // Esperar a que el panel tenga tamaño (tras F5 el split aún no midió).
  if (shellNav.clientHeight < 8 && shellNav.clientWidth < 8) return;

  const horizontal = getComputedStyle(shellNav).flexDirection === 'row';
  const behavior: ScrollBehavior = smooth ? 'smooth' : 'auto';
  if (horizontal) {
    const delta =
      current.getBoundingClientRect().left -
      shellNav.getBoundingClientRect().left -
      (shellNav.clientWidth - current.offsetWidth) / 2;
    shellNav.scrollTo({ left: shellNav.scrollLeft + delta, behavior });
  } else {
    const delta =
      current.getBoundingClientRect().top -
      shellNav.getBoundingClientRect().top -
      (shellNav.clientHeight - current.offsetHeight) / 2;
    shellNav.scrollTo({ top: shellNav.scrollTop + delta, behavior });
  }
}

let scrollNavRaf = 0;
/** Reintenta tras el próximo layout (F5 / split / resize). */
function scheduleScrollNavToCurrent(opts: { smooth?: boolean } = {}): void {
  const run = (): void => scrollNavToCurrent(opts);
  run();
  cancelAnimationFrame(scrollNavRaf);
  scrollNavRaf = requestAnimationFrame(() => {
    run();
    requestAnimationFrame(run);
  });
}

/** Extra passes tras boot — el split restaura tamaño async desde storage. */
function bootScrollNavToCurrent(): void {
  scheduleScrollNavToCurrent();
  setTimeout(() => scrollNavToCurrent(), 0);
  setTimeout(() => scrollNavToCurrent(), 100);
  setTimeout(() => scrollNavToCurrent(), 300);
}

function selectComponent(tag: string): void {
  const next = catalog.find(item => item.tag === tag) ?? HOME;
  // Elegir componente cierra el catálogo: en compacto tapa el contenido.
  // document.getElementById('navDrawer')?.hide?.();  ← patrón que el guardián busca.
  (document.getElementById('navDrawer') as DrawerElement | null)?.hide?.();
  if (next === component) return;
  component = next;
  showPreview();
  renderContext({ navSmooth: true });
}

window.addEventListener('message', (e: MessageEvent) => {
  if (e.origin !== location.origin) return;
  const data = asRecord(e.data);
  if (data.type === 'iswc-select' && typeof data.tag === 'string') {
    selectComponent(data.tag);
    return;
  }
  if (data.type !== 'iswc-shell-sync' || e.source === window) return;
  if (typeof data.palette === 'string' && palettes.has(data.palette as PaletteName) && data.palette !== palette) {
    palette = data.palette as PaletteName;
    renderContext();
  }
  if (typeof data.theme === 'string' && themes.has(data.theme as ThemeName) && data.theme !== theme) {
    theme = data.theme as ThemeName;
    renderContext();
  }
});

frame.addEventListener('load', () => {
  sendContext();
  try {
    frame.contentDocument?.addEventListener('pointerdown', () => brandPalette.close(), { capture: true });
  } catch { /* cross-origin */ }
});
window.addEventListener('blur', () => {
  queueMicrotask(() => {
    if (document.activeElement === frame) brandPalette.close();
  });
});
document.addEventListener('iswc-theme-change', (e: Event) => {
  const ce = e as CustomEvent<{ theme?: string; container?: EventTarget }>;
  if (ce.detail?.container !== root) return;
  const next: ThemeName = ce.detail?.theme === 'light' ? 'light' : 'dark';
  if (next === theme) return;
  theme = next;
  renderContext();
});
document.addEventListener('iswc-palette-change', (e: Event) => {
  const ce = e as CustomEvent<{ value?: string; container?: EventTarget }>;
  if (ce.detail?.container !== root) return;
  const next = ce.detail?.value;
  if (!next || !palettes.has(next as PaletteName) || next === palette) return;
  palette = next as PaletteName;
  renderContext();
});
fullscreenBtn.addEventListener('click', () => {
  const url = controlledShellSrc(component.tag);
  window.open(url, '_blank', 'noopener');
});
// Logo ISWC del top-left (Phase W7). Click -> Inicio (home) y URL limpia
// (updateUrl limpia la query cuando component === HOME; W6).
shellBrand.addEventListener('click', (e: MouseEvent) => {
  // El href='./' es la salida keyboard-only / middle-click; cancelamos el
  // click izquierdo para usar el SPA routing (no recarga la página).
  e.preventDefault();
  selectComponent(HOME.tag);
});

showPreview();
renderContext();
bootScrollNavToCurrent();

// --- split-panel nav: clamp + persist vía storage-key="gallery-nav" ---
const mainSplit = document.getElementById('mainSplit') as SplitPanelElement | null;
const NAV_MIN = 140;
const NAV_MAX = 280;
const clampNav = (n: number): number => Math.min(NAV_MAX, Math.max(NAV_MIN, Math.round(n)));
mainSplit?.addEventListener('reposition', () => {
  const px = clampNav(mainSplit.positionInPixels);
  if (px !== Math.round(mainSplit.positionInPixels)) mainSplit.positionInPixels = px;
  scheduleScrollNavToCurrent();
});

customElements.whenDefined('iswc-split-panel').then(() => bootScrollNavToCurrent());
window.addEventListener('load', () => bootScrollNavToCurrent());
if (typeof ResizeObserver !== 'undefined') {
  let roT: number = 0;
  new ResizeObserver(() => {
    clearTimeout(roT);
    roT = window.setTimeout(() => scrollNavToCurrent(), 40);
  }).observe(shellNav);
}

// --- paneles laterales: UI (estado ya inicializado arriba, antes de updateUrl) ---
function syncPanelsCompactBtn(): void {
  if (!panelsCompactBtn) return;
  panelsCompactBtn.setAttribute('aria-pressed', panelsCompactUser ? 'true' : 'false');
  panelsCompactBtn.setAttribute(
    'aria-label',
    panelsCompactUser ? 'Expandir paneles laterales' : 'Compactar paneles laterales',
  );
  panelsCompactBtn.setAttribute(
    'title',
    panelsCompactUser ? 'Expandir paneles laterales' : 'Compactar paneles laterales',
  );
  const icon = panelsCompactBtn.querySelector('iswc-icon');
  if (icon) icon.setAttribute('icon', panelsCompactUser ? ICON_EXPAND : ICON_COMPACT);
}

function applyPanelsCompactDataset(): void {
  if (panelsCompactUser) document.body.dataset.panelsCompact = '1';
  else delete document.body.dataset.panelsCompact;
  document.dispatchEvent(new Event('iswc-panels-compact-change'));
}

function setPanelsCompactUser(next: boolean): void {
  panelsCompactUser = next;
  writePanelsCompactPref(next);
  syncPanelsCompactBtn();
  applyPanelsCompactDataset();
  syncNavLayout();
  updateUrl();
}

// --- mobile / compact: el catálogo se muda a un drawer izquierdo ---
const navDrawer = document.getElementById('navDrawer') as DrawerElement | null;
const navToggle = document.getElementById('navToggle') as HTMLElement | null;
const compactNav = window.matchMedia('(max-width: 640px)');

const syncNavLayout = (): void => {
  if (!mainSplit || !navDrawer || !navToggle) return;
  // Móvil o preferencia de usuario (btn del header).
  const compact = compactNav.matches || panelsCompactUser;
  navToggle.hidden = !compact;
  document.body.dataset.navLayout = compact ? 'drawer' : 'split';

  if (compact) {
    if (shellNav.parentElement !== navDrawer) {
      // Dentro del drawer no hay slot "start" al que engancharse.
      shellNav.removeAttribute('slot');
      navDrawer.append(shellNav);
    }
    mainSplit.setAttribute('collapse', 'start');
  } else {
    if (shellNav.parentElement !== mainSplit) {
      navDrawer.hide?.();
      shellNav.setAttribute('slot', 'start');
      mainSplit.prepend(shellNav);
    }
    mainSplit.removeAttribute('collapse');
  }
  scheduleScrollNavToCurrent();
};

compactNav.addEventListener?.('change', syncNavLayout);
navToggle?.addEventListener('click', () => navDrawer?.show?.());
navDrawer?.addEventListener('iswc-show', () => {
  navToggle?.setAttribute('aria-expanded', 'true');
  // El nav acaba de ganar tamaño: centrar el ítem activo.
  scheduleScrollNavToCurrent();
});
navDrawer?.addEventListener('iswc-after-show', () => scrollNavToCurrent());
navDrawer?.addEventListener('iswc-after-hide', () => {
  navToggle?.setAttribute('aria-expanded', 'false');
});
panelsCompactBtn?.addEventListener('click', () => {
  setPanelsCompactUser(!panelsCompactUser);
});
syncPanelsCompactBtn();
applyPanelsCompactDataset();
syncNavLayout();
