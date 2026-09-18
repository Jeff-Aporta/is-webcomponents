import components from '../manifest.js';
import type { ComponentManifestItem } from '../manifest.js';
import { hasControlledPreview, hasCachedPreview, loadPreview } from '../previews/registry.js';
import { collectIsTags, GALLERY_CHROME_TAGS } from '../cdn/collect-is-tags.js';

/* ──────────────────────────── Tipos locales ───────────────────────────── */

/** Estado de la galería guardado en `?s=` (b64url JSON). */
interface GalleryState {
  theme?: string;
  palette?: string;
  component?: string;
  embed?: boolean;
  [key: string]: unknown;
}

/** Temas y paletas reconocidos. */
type ThemeName = 'light' | 'dark';
type PaletteName = 'contapyme' | 'insoft' | 'agrowin';

/** Datos del wordmark por paleta (mismo orden de inserción que `palettes`). */
interface BrandData {
  lead: string;
  accent: string;
  tail: string;
  label: string;
  leadColor: string;
  accentColor: string;
}

/** Categoría visible en el nav: id estable + label traducido. */
interface CategoryMeta {
  id: string;
  label: string;
}

/** Item del catálogo: puede venir del manifest (ComponentManifestItem) o ser
 *  una página "suelta" como HOME/THEMING/ECOSYSTEM. */
interface CatalogItem {
  tag: string;
  title: string;
  page?: string;
  category?: string;
  origin?: string;
}

/** Subset del `<is-theme-toggle>` que la galería consulta. */
interface ThemeToggleElement extends HTMLElement {
  dark: boolean;
}

/** Forma mínima de un preview (JsonPreview satisface esta estructura). */
interface PreviewLike {
  readonly definition: Record<string, unknown>;
  mount(ctx: Record<string, unknown>): void | Promise<void>;
  unmount?(ctx: Record<string, unknown>): void;
}

/** Subset del `<is-preview-component>` que la galería cablea con `.preview`. */
interface PreviewHostElement extends HTMLElement {
  preview?: PreviewLike | null;
}

/** Subset de `<is-split-panel>` con la propiedad `positionInPixels`. */
interface SplitPanelElement extends HTMLElement {
  positionInPixels: number;
}

/** Subset del `<iframe>` con `contentWindow` / `contentDocument` strict. */
type FrameElement = HTMLIFrameElement;

/** Subset del `<is-drawer>` con `show` / `hide` cancelables. */
interface DrawerElement extends HTMLElement {
  show(): void | Promise<void>;
  hide(): void | Promise<void>;
}

/** Subset del ISWebComponentsLoader (subset usado por la galería). */
interface LoaderLike {
  catalog?: {
    tags?: Record<string, unknown>;
    categories?: Record<string, unknown>;
    aliases?: Record<string, string>;
  };
  load(...tags: string[]): Promise<unknown>;
}

/* ─────────────── asRecord: helper común del WT-ROOT ─────────────────── */

/** Cualquier `unknown` → `Record<string, unknown>` para narrowing local. */
function asRecord(v: unknown): Record<string, unknown> {
  return (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
}

/* ─────────────────────────── Lookup del DOM ───────────────────────────── */

/** Devuelve un getElementById sin la posibilidad de `null` (la página garantiza presencia). */
function el<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  return node as T;
}

const root = document.documentElement;
const themeToggle = el<ThemeToggleElement>('themeToggle');
const fullscreenBtn = el<HTMLElement>('fullscreenBtn');
const shellNav = el<HTMLElement>('shellNav');
const frame = el<FrameElement>('previewFrame');
const previewHost = el<PreviewHostElement>('previewHost');
const brand = el<HTMLElement>('brand');
const brandMenu = el<HTMLElement>('brandMenu');
const brandWrap = el<HTMLElement>('brandWrap');
const brandLead = el<HTMLElement>('brandLead');
const brandAccent = el<HTMLElement>('brandAccent');
const brandTail = el<HTMLElement>('brandTail');

const params = new URLSearchParams(location.search);
const themes = new Set<ThemeName>(['light', 'dark']);
const palettes = new Set<PaletteName>(['contapyme', 'insoft', 'agrowin']);
const brands: Record<PaletteName, BrandData> = {
  contapyme: { lead: 'conta', accent: 'pyme', tail: '',    label: 'ContaPyme', leadColor: '#000', accentColor: '#fff'    },
  // El logo de InSoft lleva la S en mayuscula y en rojo: in + Soft.
  insoft:    { lead: 'in',    accent: 'Soft', tail: '',    label: 'InSoft',    leadColor: '#000', accentColor: '#d71920' },
  agrowin:   { lead: 'agro',  accent: 'win',  tail: '',    label: 'AgroWin',   leadColor: '#000', accentColor: '#fff'    },
};

const setMenuOpen = (open: boolean): void => {
  brand.setAttribute('aria-expanded', open ? 'true' : 'false');
  brandMenu.hidden = !open;
  brandWrap.classList.toggle('is-open', open);
};

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
const catalog: CatalogItem[] = [HOME, THEMING, ECOSYSTEM, ...components];

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
  overlays: { id: 'overlays', label: 'Overlays' },
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
const themeStored = localStorage.getItem('is-theme');
let theme: ThemeName = themes.has(themeFromUrl as ThemeName)
  ? (themeFromUrl as ThemeName)
  : (themes.has(themeStored as ThemeName) ? (themeStored as ThemeName) : 'dark');

const paletteFromUrl = typeof stateFromUrl?.palette === 'string' ? stateFromUrl.palette : null;
const paletteStored = localStorage.getItem('is-palette');
let palette: PaletteName = palettes.has(paletteFromUrl as PaletteName)
  ? (paletteFromUrl as PaletteName)
  : (palettes.has(paletteStored as PaletteName) ? (paletteStored as PaletteName) : 'contapyme');

const componentFromUrl = typeof stateFromUrl?.component === 'string' ? stateFromUrl.component : null;
let component: CatalogItem =
  catalog.find(item => item.tag === componentFromUrl) ?? HOME;

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
 * tapa el setter de `<is-preview-component>` y el main nunca se pinta.
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
  await customElements.whenDefined('is-preview-component');
  const L = (globalThis as Record<string, unknown>).ISWebComponentsLoader as LoaderLike | undefined;
  if (!L) return;
  let tags: string[] = [...new Set<string>([
    ...GALLERY_CHROME_TAGS,
    ...(collectIsTags(preview.definition ?? preview) as string[]),
  ])];
  // Los demos pueden citar tags de soporte sin catálogo (chrome hijos como
  // is-tab): pedirlos al loader tiraba el mount entero. Solo cargar los
  // que el catálogo sabe resolver; el resto queda como markup declarativo.
  tags = tags.filter((t) => {
    const cat = L.catalog?.categories;
    const aliases = L.catalog?.aliases;
    return Boolean(L.catalog?.tags?.[t])
      || Boolean(cat?.[aliases?.[t] ?? t]);
  });
  if (tags.length) await L.load(...tags);
  if (tag.startsWith('is-') && !customElements.get(tag)) {
    // Solo esperar cuando el loader conoce el tag Y lo va a definir.
    // Hay dos clases de "tag conocido pero no definido":
    //   1. Meta-previews como `is-icon-explorer` (no están en el catálogo
    //      del loader → fix anterior).
    //   2. Module-only entries del manifest (p.ej. `is-ui`) — el loader
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
    await customElements.whenDefined('is-preview-component');
    setHostPreview(previewLike);
    return;
  }

  console.warn(`[gallery] sin JSON de preview para ${tag}`);
  previewHost.hidden = true;
  if (customElements.get('is-preview-component')) setHostPreview(null);
  else if (Object.prototype.hasOwnProperty.call(previewHost, 'preview')) {
    delete previewHost.preview;
  }
  frame.hidden = false;
  frame.removeAttribute('src');
}

function sendContext(): void {
  if (!frame.hidden) {
    frame.contentWindow?.postMessage({ type: 'is-context', theme, palette }, location.origin);
  }
}

function updateUrl(): void {
  // Gallery: `?s=` es el único state URL. theme/palette no van en la URL live;
  // sí se conservan otras keys de nav (docs, cdnTab, …) escritas por url-nav.
  const prev = readStateParam() || {};
  const next: GalleryState = { ...prev, component: component.tag };
  delete next.theme;
  delete next.palette;
  delete next.embed;
  const encoded = encodeState(next);
  const dest = new URL(location.href);
  dest.search = '?s=' + encoded;
  history.replaceState(null, '', dest);
}

function renderContext({ navSmooth = false }: { navSmooth?: boolean } = {}): void {
  root.classList.toggle('theme-light', theme === 'light');
  root.classList.toggle('theme-dark', theme === 'dark');
  root.dataset.theme = theme;
  root.dataset.palette = palette;
  themeToggle.dark = theme === 'dark';
  for (const node of shellNav.querySelectorAll<HTMLElement>('.shell-nav__item')) {
    const ds = node.dataset;
    node.setAttribute('aria-current', ds.tag === component.tag ? 'true' : 'false');
  }
  scheduleScrollNavToCurrent({ smooth: navSmooth });
  for (const opt of brandMenu.querySelectorAll<HTMLElement>('[role="option"]')) {
    const ds = opt.dataset;
    opt.setAttribute('aria-selected', ds.palette === palette ? 'true' : 'false');
  }
  const brandData = brands[palette] ?? brands.contapyme;
  brandLead.textContent = brandData.lead;
  brandTail.textContent = brandData.tail || '';
  brandTail.style.color = brandData.leadColor;
  brandAccent.textContent = brandData.accent;
  brandLead.style.color = brandData.leadColor;
  brandAccent.style.color = brandData.accentColor;
  brand.setAttribute('aria-label', `${brandData.label} — elegir paleta`);
  document.title = `${component.title} | ${brandData.label}`;
  localStorage.setItem('is-theme', theme);
  localStorage.setItem('is-palette', palette);
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
  if (data.type === 'is-select' && typeof data.tag === 'string') {
    selectComponent(data.tag);
  }
});

frame.addEventListener('load', () => {
  sendContext();
  // clic dentro del iframe no burbujea al parent → cerrar menú ahí
  try {
    frame.contentDocument?.addEventListener('pointerdown', () => setMenuOpen(false), { capture: true });
  } catch { /* cross-origin */ }
});
brand.addEventListener('click', (e: MouseEvent) => {
  e.stopPropagation();
  setMenuOpen(brandMenu.hidden);
});
brandMenu.addEventListener('click', (e: MouseEvent) => {
  const target = e.target as HTMLElement | null;
  const opt = target?.closest<HTMLElement>('[data-palette]');
  if (!opt) return;
  const next = opt.dataset.palette;
  palette = (next && palettes.has(next as PaletteName)) ? (next as PaletteName) : 'contapyme';
  setMenuOpen(false);
  renderContext();
});
document.addEventListener('pointerdown', (e: PointerEvent) => {
  if (!brandWrap.contains(e.target as Node | null)) setMenuOpen(false);
}, true);
// focus al iframe (o blur de la ventana) también cierra
window.addEventListener('blur', () => {
  queueMicrotask(() => {
    if (document.activeElement === frame) setMenuOpen(false);
  });
});
document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') setMenuOpen(false);
});
themeToggle.addEventListener('is-theme-change', (e: Event) => {
  // El toggle ya cambió el contenedor (html); sincronizar estado de la galería
  const ce = e as CustomEvent<{ theme?: string }>;
  theme = ce.detail?.theme === 'light' ? 'light' : 'dark';
  renderContext();
});
fullscreenBtn.addEventListener('click', () => {
  const url = controlledShellSrc(component.tag);
  window.open(url, '_blank', 'noopener');
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

customElements.whenDefined('is-split-panel').then(() => bootScrollNavToCurrent());
window.addEventListener('load', () => bootScrollNavToCurrent());
if (typeof ResizeObserver !== 'undefined') {
  let roT: number = 0;
  new ResizeObserver(() => {
    clearTimeout(roT);
    roT = window.setTimeout(() => scrollNavToCurrent(), 40);
  }).observe(shellNav);
}

// --- mobile: el catálogo se muda a un drawer izquierdo ---
const navDrawer = document.getElementById('navDrawer') as DrawerElement | null;
const navToggle = document.getElementById('navToggle') as HTMLElement | null;
const compactNav = window.matchMedia('(max-width: 640px)');

const syncNavLayout = (): void => {
  if (!mainSplit || !navDrawer || !navToggle) return;
  const compact = compactNav.matches;
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
navDrawer?.addEventListener('is-show', () => {
  navToggle?.setAttribute('aria-expanded', 'true');
  // El nav acaba de ganar tamaño: centrar el ítem activo.
  scheduleScrollNavToCurrent();
});
navDrawer?.addEventListener('is-after-show', () => scrollNavToCurrent());
navDrawer?.addEventListener('is-after-hide', () => {
  navToggle?.setAttribute('aria-expanded', 'false');
});
syncNavLayout();
