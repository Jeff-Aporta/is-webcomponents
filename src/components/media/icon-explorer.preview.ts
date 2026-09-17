/**
 * Behavior migrado desde HTML inline de icon-explorer.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param ctx Contexto de montaje (root, main, aside, definition).
 */
export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext): Promise<void> {
  const root = ctx.main;
  void root;

  /* ── Tipos internos del behavior ───────────────────────────────────── */

  /** Cast seguro de `document.getElementById` a `T | null`. */
  const $byId = <T extends Element>(id: string): T | null =>
    document.getElementById(id) as T | null;

  /** Cast seguro a `T` cuando sabemos que el id existe en este preview. */
  const $mustId = <T extends Element>(id: string): T => {
    const el = document.getElementById(id) as T | null;
    if (!el) throw new Error(`icon-explorer: missing #${id}`);
    return el;
  };

  /** `<is-input>`: input de texto/número/search. */
  interface IsInput extends HTMLElement {
    value: string;
    error: boolean;
  }

  /** `<is-color-picker>`: igual que IsInput pero emite `is-input` con `detail.value`. */
  interface IsColorPicker extends HTMLElement {
    value: string;
  }

  /** `<is-select>`: value como string. */
  interface IsSelect extends HTMLElement {
    value: string;
  }

  /** `<is-checkbox>`: checked como boolean. */
  interface IsCheckbox extends HTMLElement {
    checked: boolean;
  }

  /** `<is-slider>`: value como string. */
  interface IsSlider extends HTMLElement {
    value: string;
  }

  /** `<is-drawer>`: open como boolean. */
  interface IsDrawer extends HTMLElement {
    open: boolean;
  }

  /** `<is-button>` / `<is-copy-button>`: disabled / value. */
  interface IsButton extends HTMLElement {
    disabled: boolean;
  }
  interface IsCopyButton extends HTMLElement {
    value: string;
  }

  /** `<is-code>`: contenedor de código que admite `textContent` y opcionalmente `value`. */
  interface IsCode extends HTMLElement {
    value?: string;
  }

  /** `<is-toast>` raíz (toaster): expone `create(message, opts)`. */
  interface IsToast extends HTMLElement {
    create(message: string, opts?: { variant?: string }): void;
  }

  /** Detail de los eventos `is-input` / `is-change` que disparan los `<is-*>` con `value`. */
  interface IsInputDetail {
    value: string;
  }

  /* ── Datos servidos por el builder: index, familias y SVGs ─────────── */

  interface CollectionMeta {
    name?: string;
    category?: string;
    author?: string;
    license?: string;
    /** Tamaño de la rejilla en píxeles (puede no estar para iconos sin grid). */
    height?: number;
    /** `true` cuando la familia tiene paleta en color; `false`/`undefined` → monocromo. */
    palette?: string | boolean;
  }

  interface FamilyItem {
    prefix: string;
    count: number;
  }

  interface IndexJson {
    families: FamilyItem[];
    total: number;
  }

  interface IconsJson {
    icons: string[];
  }

  interface SvgParsed {
    body: string;
    left: number;
    top: number;
    w: number;
    h: number;
  }

  interface IconListItem {
    prefix: string;
    name: string;
  }

  interface IconState {
    prefix: string | null;
    name: string | null;
    list: IconListItem[];
    pos: number;
    svg: SvgParsed | null;
  }

  interface FilterValues {
    q: string;
    category: string;
    author: string;
    grid: string;
    palette: string;
    license: string;
  }

  interface OutDims {
    w: string;
    h: string;
  }

  /* ── Helpers DOM (tipados) ─────────────────────────────────────────── */

  const app = $byId<HTMLElement>('app');
  const scroller = $byId<HTMLElement>('scroller');

  // Misma lógica que `{assets}` en render.js: la página vive en la raíz o en
  // `_shell.html`, así que no se puede fijar un relativo a `location.href`.
  const raiz = (() => {
    const href = location.href;
    const corte = href.search(/\/(?:src\/previews|index\.html)/);
    return corte > 0 ? href.slice(0, corte + 1) : new URL('./', href).href;
  })();
  // Los iconos viven sólo en dist/assets/: única copia, es la publicada.
  const base = new URL('dist/assets/icons/', raiz);
  const params = new URLSearchParams(location.search);
  const family = params.get('f');
  const PAGE = 240;

  const esc = (s: string): string =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  /* jsonCache: nombre → promesa del JSON parseado. */
  const jsonCache = new Map<string, Promise<unknown>>();

  async function loadJson<T = unknown>(name: string): Promise<T> {
    const cached = jsonCache.get(name);
    if (cached) return cached as Promise<T>;
    const p: Promise<T> = fetch(new URL(name, base)).then((r) => {
      if (!r.ok) throw new Error(name);
      return r.json() as Promise<T>;
    });
    jsonCache.set(name, p as Promise<unknown>);
    return p;
  }

  /* El feedback de "copiado" lo da <is-copy-button> por sí solo; el toaster
     queda para lo que no nace de un botón de copia (descargas, errores). */
  const toaster = $byId<IsToast>('toaster');
  const toast = (message: string, variant: 'brand' | 'danger' | 'success' = 'brand'): void => {
    toaster?.create(message, { variant });
  };

  /* ══ Personalizador (drawer) ════════════════════════════════════════ */
  const F = {
    root: $mustId<IsDrawer>('form'),
    id: $mustId<HTMLElement>('fId'),
    collection: $mustId<HTMLElement>('fCollection'),
    size: $mustId<HTMLElement>('fSize'),
    alt: $mustId<HTMLElement>('fAlt'),
    preview: $mustId<HTMLElement>('fPreview'),
    options: $mustId<HTMLElement>('fOptions'),
    format: $mustId<IsSelect>('fFormat'),
    sizeVal: $mustId<IsInput>('fSizeVal'),
    unit: $mustId<IsSelect>('fUnit'),
    color: $mustId<IsInput>('fColor'),
    colorPick: $mustId<IsColorPicker>('fColorPick'),
    pretty: $mustId<IsCheckbox>('fPretty'),
    rect: $mustId<IsCheckbox>('fRect'),
    code: $mustId<IsCode>('fCode'),
    codeLabel: $mustId<HTMLElement>('fCodeLabel'),
    copyId: $mustId<IsCopyButton>('fCopyId'),
    copyCode: $mustId<IsCopyButton>('fCopyCode'),
    copyUrl: $mustId<IsCopyButton>('fCopyUrl'),
  };

  /** Estado del formulario. Se conserva al cambiar de icono (requisito). */
  const state: IconState = { prefix: null, name: null, list: [], pos: -1, svg: null };

  /* svgCache: `${prefix}:${name}` → SvgParsed. */
  const svgCache = new Map<string, Promise<SvgParsed>>();

  async function loadSvg(prefix: string, name: string): Promise<SvgParsed> {
    const key = `${prefix}:${name}`;
    const cached = svgCache.get(key);
    if (cached) return cached;
    const p: Promise<SvgParsed> = fetch(new URL(`${prefix}/${name}.svg`, base))
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(key))))
      .then((txt: string): SvgParsed => {
        const vb = txt.match(/viewBox="\s*([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s*"/);
        const body = txt.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
        return {
          body,
          left: vb ? +vb[1]! : 0,
          top: vb ? +vb[2]! : 0,
          w: vb ? +vb[3]! : 24,
          h: vb ? +vb[4]! : 24,
        };
      });
    svgCache.set(key, p);
    return p;
  }

  const isValidSize = (v: number): boolean => Number.isFinite(v) && v > 0 && v <= 4096;

  function isValidColor(v: string): boolean {
    const s = String(v).trim();
    if (!s) return false;
    if (s === 'currentColor' || s.startsWith('var(')) return true;
    return CSS.supports('color', s);
  }

  /** Dimensiones de salida según tamaño + unidad + proporción original. */
  function outDims(): OutDims | null {
    const n = parseFloat(F.sizeVal.value);
    const ratio = state.svg ? state.svg.w / state.svg.h : 1;
    if (F.unit.value === 'auto') {
      // Convención Iconify: alto 1em, ancho proporcional.
      return { w: `${+(ratio).toFixed(4)}em`, h: '1em' };
    }
    if (!isValidSize(n)) return null;
    const u = F.unit.value === 'none' ? '' : F.unit.value;
    return { w: `${+(n * ratio).toFixed(4)}${u}`, h: `${n}${u}` };
  }

  const prettyBody = (body: string, indent = '  '): string =>
    body
      .replace(/></g, '>\n<')
      .split('\n')
      .map((l: string): string => indent + l.trim())
      .filter((l: string): boolean => l.trim() !== '')
      .join('\n');

  function buildSvg({ forRaster = false }: { forRaster?: boolean } = {}): string {
    if (!state.svg) return '';
    const dims = outDims();
    if (!dims) return '';
    const { left, top, w, h } = state.svg;
    const color = String(F.color.value).trim();
    let body = state.svg.body;
    // `currentColor` solo hereda dentro del DOM. Para un archivo suelto (PNG,
    // data-URI de CSS) hay que materializarlo o el icono sale negro/vacío.
    if (color && color !== 'currentColor') body = body.replaceAll('currentColor', color);
    else if (forRaster) body = body.replaceAll('currentColor', '#000');

    const rect = F.rect.checked
      ? `<rect x="${left}" y="${top}" width="${w}" height="${h}" fill="transparent"/>`
      : '';
    const inner = rect + body;
    const open = `<svg xmlns="http://www.w3.org/2000/svg" width="${forRaster ? w : dims.w}" height="${forRaster ? h : dims.h}" viewBox="${left} ${top} ${w} ${h}">`;
    return F.pretty.checked && !forRaster ? `${open}\n${prettyBody(inner)}\n</svg>` : `${open}${inner}</svg>`;
  }

  function buildCss(): string {
    const svg = buildSvg();
    if (!svg) return '';
    const dims = outDims();
    if (!dims) return '';
    const uri = `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\n\s*/g, ''))}")`;
    return [
      `.icon-${state.name?.replace(/[^a-z0-9]+/gi, '-')} {`,
      `  display: inline-block;`,
      `  width: ${dims.w};`,
      `  height: ${dims.h};`,
      `  background-image: ${uri};`,
      `  background-repeat: no-repeat;`,
      `  background-size: 100% 100%;`,
      `}`,
    ].join('\n');
  }

  function currentCode(): string {
    if (F.format.value === 'css') return buildCss();
    if (F.format.value === 'png') {
      const dims = outDims();
      return dims
        ? `/* PNG ${dims.w} × ${dims.h} — se genera al pulsar «Descargar».\n   Fuente rasterizada: */\n${buildSvg()}`
        : '';
    }
    return buildSvg();
  }

  /** Marca los campos inválidos usando el estado `error` de <is-input>. */
  function validate(): boolean {
    const okSize = F.unit.value === 'auto' || isValidSize(parseFloat(F.sizeVal.value));
    const okColor = isValidColor(F.color.value);
    F.sizeVal.toggleAttribute('error', !okSize);
    F.sizeVal.setAttribute('error-text', okSize ? '' : 'Entre 1 y 4096');
    F.color.toggleAttribute('error', !okColor);
    F.color.setAttribute('error-text', okColor ? '' : 'Color CSS no válido');
    return okSize && okColor;
  }

  /** Único punto de verdad: recalcula vista previa + código a la vez. */
  function sync(): void {
    if (!state.svg) return;
    if (!validate()) {
      F.code.textContent = '/* Corrige los valores marcados para generar el código. */';
      F.copyCode.value = '';
      return;
    }
    F.preview.innerHTML = buildSvg();
    const el = F.preview.querySelector<HTMLElement>('svg');
    if (el && F.unit.value === 'auto') el.style.fontSize = `${parseFloat(F.sizeVal.value) || 24}px`;
    const code = currentCode();
    F.code.textContent = code;
    F.codeLabel.textContent = F.format.value === 'css' ? 'CSS generado' : 'SVG generado';
    // <is-copy-button> copia su propio `value`: no hace falta un handler.
    F.copyCode.value = code;
  }

  async function showIcon(
    prefix: string,
    name: string,
    list: IconListItem[] | null,
    pos: number | null,
  ): Promise<void> {
    state.prefix = prefix;
    state.name = name;
    if (list) {
      state.list = list;
      state.pos = pos ?? -1;
    }
    F.root.open = true;
    F.id.textContent = `${prefix}:${name}`;
    F.copyId.value = `${prefix}:${name}`;
    F.copyUrl.value = new URL(`${prefix}/${name}.svg`, base).href;
    F.alt.textContent = `Alt sugerido: “${name.replace(/[-_]/g, ' ')}”`;
    const meta: CollectionMeta = collectionsMeta[prefix] ?? {};
    F.collection.textContent = meta
      ? `${meta.name ?? ''} · ${meta.category ?? ''}${meta.license ? ` · ${meta.license}` : ''}`
      : prefix;
    try {
      state.svg = await loadSvg(prefix, name);
      F.size.textContent = `Tamaño original: ${state.svg.w} × ${state.svg.h}`;
    } catch {
      state.svg = null;
      F.size.textContent = 'No se pudo cargar el SVG';
      F.code.textContent = '';
      F.preview.innerHTML = '';
      return;
    }
    const fPrev = $mustId<IsButton>('fPrev');
    const fNext = $mustId<IsButton>('fNext');
    fPrev.disabled = state.pos <= 0;
    fNext.disabled = state.pos < 0 || state.pos >= state.list.length - 1;
    sync();
  }

  function step(delta: number): void {
    const next = state.pos + delta;
    if (next < 0 || next >= state.list.length) return;
    const it = state.list[next];
    if (!it) return;
    void showIcon(it.prefix, it.name, state.list, next);
  }

  for (const el of [F.format, F.unit, F.pretty, F.rect, F.sizeVal, F.color]) {
    el.addEventListener('is-change', sync);
    el.addEventListener('is-input', sync);
  }
  F.colorPick.addEventListener('is-input', (e: Event): void => {
    const detail = (e as CustomEvent<IsInputDetail>).detail;
    F.color.value = detail.value;
    sync();
  });
  const fPrevBtn = $mustId<IsButton>('fPrev');
  const fNextBtn = $mustId<IsButton>('fNext');
  fPrevBtn.addEventListener('click', () => step(-1));
  fNextBtn.addEventListener('click', () => step(1));
  $mustId<IsButton>('fMore').addEventListener('click', (e: Event): void => {
    const open = F.options.hidden;
    F.options.hidden = !open;
    const t = e.currentTarget as HTMLElement | null;
    t?.setAttribute('aria-expanded', String(open));
  });
  F.copyCode.addEventListener('click', (): void => {
    if (!validate()) toast('Corrige los valores inválidos', 'danger');
  });

  const fDownload = $mustId<IsButton>('fDownload');
  fDownload.addEventListener('click', async (): Promise<void> => {
    if (!state.svg || !validate()) {
      toast('Corrige los valores inválidos', 'danger');
      return;
    }
    const fileBase = `${state.prefix}-${state.name}`;
    if (F.format.value === 'png') {
      await downloadPng(fileBase);
      return;
    }
    const isCss = F.format.value === 'css';
    saveBlob(
      new Blob([currentCode()], { type: isCss ? 'text/css' : 'image/svg+xml' }),
      `${fileBase}.${isCss ? 'css' : 'svg'}`,
    );
    toast('Descargado', 'success');
  });

  function saveBlob(blob: Blob, filename: string): void {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  async function downloadPng(fileBase: string): Promise<void> {
    if (!state.svg) {
      toast('No hay SVG cargado', 'danger');
      return;
    }
    const n = F.unit.value === 'auto' ? 256 : parseFloat(F.sizeVal.value);
    const ratio = state.svg.w / state.svg.h;
    const h = Math.max(1, Math.round(n));
    const w = Math.max(1, Math.round(n * ratio));
    const url = URL.createObjectURL(
      new Blob([buildSvg({ forRaster: true })], { type: 'image/svg+xml' }),
    );
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = (): void => res();
      img.onerror = (): void => rej(new Error('image load failed'));
      img.src = url;
    }).catch(() => {
      /* swallow: toBlob reportará el fallo abajo */
    });
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob: Blob | null): void => {
      if (!blob) {
        toast('No se pudo generar el PNG', 'danger');
        return;
      }
      saveBlob(blob, `${fileBase}-${w}x${h}.png`);
      toast('PNG descargado', 'success');
    }, 'image/png');
  }

  /* ══ Datos compartidos ══════════════════════════════════════════════ */
  let collectionsMeta: Record<string, CollectionMeta> = {};

  async function loadMeta(): Promise<void> {
    try {
      collectionsMeta = await loadJson<Record<string, CollectionMeta>>('collections.json');
    } catch {
      collectionsMeta = {};
    }
  }

  const uniqSorted = (vals: string[]): string[] =>
    [...new Set(vals.filter((v: string): boolean => Boolean(v)))].sort((a: string, b: string): number =>
      a.localeCompare(b, 'es'),
    );

  function filterFamilies(families: FamilyItem[], f: Partial<FilterValues>): FamilyItem[] {
    return families.filter((fam: FamilyItem): boolean => {
      const m: CollectionMeta = collectionsMeta[fam.prefix] ?? {};
      if (f.q && !`${fam.prefix} ${m.name ?? ''}`.toLowerCase().includes(f.q)) return false;
      if (f.category && m.category !== f.category) return false;
      if (f.author && m.author !== f.author) return false;
      if (f.license && m.license !== f.license) return false;
      if (f.grid && String(m.height ?? '') !== f.grid) return false;
      if (f.palette === 'color' && !m.palette) return false;
      if (f.palette === 'mono' && m.palette) return false;
      return true;
    });
  }

  function filtersMarkup(): string {
    const metas: CollectionMeta[] = Object.values(collectionsMeta);
    const sel = (id: string, label: string, vals: string[], todos: string): string => `
      <is-select id="${id}" label="${label}" value="" clearable>
        <is-option value="">${todos}</is-option>
        ${vals.map((v: string): string => `<is-option value="${esc(v)}">${esc(v)}</is-option>`).join('')}
      </is-select>`;
    const grids: string[] = uniqSorted(
      metas.map((m: CollectionMeta): string => (m.height == null ? '' : String(m.height))),
    ).sort((a: string, b: string): number => Number(a) - Number(b));
    return `
      <div class="filters">
        ${sel('fltCategory', 'Categoría', uniqSorted(metas.map((m: CollectionMeta): string => m.category ?? '')), 'Todas')}
        ${sel('fltAuthor', 'Autor / tag', uniqSorted(metas.map((m: CollectionMeta): string => m.author ?? '')), 'Todos')}
        ${sel('fltGrid', 'Grid', grids, 'Cualquiera')}
        <is-select id="fltPalette" label="Paleta" value="">
          <is-option value="">Cualquiera</is-option>
          <is-option value="mono">Monocromo</is-option>
          <is-option value="color">Color</is-option>
        </is-select>
        ${sel('fltLicense', 'Licencia', uniqSorted(metas.map((m: CollectionMeta): string => m.license ?? '')), 'Cualquiera')}
        <is-button id="fltReset" color="neutral" variant="plain">Limpiar</is-button>
      </div>`;
  }

  const FILTER_IDS = ['fltCategory', 'fltAuthor', 'fltGrid', 'fltPalette', 'fltLicense'] as const;

  /* ══ Vista índice: familias + búsqueda global de iconos ════════════ */
  async function renderIndex(): Promise<void> {
    const { families, total } = await loadJson<IndexJson>('index.json');
    if (!app) return;
    app.innerHTML = `
      <div class="xp-head">
        <h1>Explorador de iconos</h1>
        <span class="count">${families.length} familias · ${total.toLocaleString('es')} iconos</span>
      </div>
      <div class="xp-bar">
        <div class="xp-bar__search">
          <is-input id="q" type="search" clearable placeholder="Buscar por palabra clave (mdi, tabler, lucide...)">
            <is-icon slot="start" icon="mdi:magnify"></is-icon>
          </is-input>
          <is-button-group id="scope" select="single" value="fam" label="Ámbito de búsqueda">
            <is-button value="fam">Familias</is-button>
            <is-button value="icon">Iconos</is-button>
          </is-button-group>
        </div>
        ${filtersMarkup()}
      </div>
      <div id="results"></div>`;

    const q = $mustId<IsInput>('q');
    const results = $mustId<HTMLElement>('results');
    const scopeGroup = $mustId<HTMLElement>('scope');
    let scope: 'fam' | 'icon' = 'fam';

    const readFilters = (): FilterValues => ({
      q: String(q.value).trim().toLowerCase(),
      category: $mustId<IsSelect>('fltCategory').value,
      author: $mustId<IsSelect>('fltAuthor').value,
      grid: $mustId<IsSelect>('fltGrid').value,
      palette: $mustId<IsSelect>('fltPalette').value,
      license: $mustId<IsSelect>('fltLicense').value,
    });

    /* — familias — */
    let io: IntersectionObserver | null = null;

    function paintFamilies(): void {
      io?.disconnect();
      const list = filterFamilies(families, readFilters());
      if (list.length === 0) {
        results.innerHTML = `<is-callout color="neutral" variant="outlined" icon="mdi:filter-off">Ninguna familia coincide con los filtros.</is-callout>`;
        return;
      }
      results.innerHTML = `<div class="fam-grid">${list
        .map((f: FamilyItem): string => {
          const m: CollectionMeta = collectionsMeta[f.prefix] ?? {};
          return `
            <a class="fam" href="?f=${encodeURIComponent(f.prefix)}">
              <is-card variant="outlined">
                <b>${esc(m.name ?? f.prefix)}</b>
                <small>${esc(f.prefix)} · ${f.count.toLocaleString('es')} iconos</small>
                <span class="sample" data-prefix="${esc(f.prefix)}"></span>
                <span class="meta">
                  ${m.category ? `<is-tag color="neutral" variant="outlined" pill>${esc(m.category)}</is-tag>` : ''}
                  ${m.height ? `<is-tag color="neutral" variant="outlined" pill>${m.height}px</is-tag>` : ''}
                  <is-tag color="${m.palette ? 'info' : 'neutral'}" variant="outlined" pill>${m.palette ? 'color' : 'mono'}</is-tag>
                  ${m.license ? `<is-tag color="neutral" variant="outlined" pill>${esc(m.license)}</is-tag>` : ''}
                </span>
              </is-card>
            </a>`;
        })
        .join('')}</div>`;

      const root0 = scroller as Element | null;
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            io?.unobserve(e.target);
            const prefix = (e.target as HTMLElement).dataset.prefix ?? '';
            loadJson<IconsJson>(`${prefix}.json`)
              .then((d: IconsJson) => {
                for (const n of d.icons.slice(0, 4)) {
                  const ic = document.createElement('is-icon');
                  ic.setAttribute('icon', `${prefix}:${n}`);
                  e.target.appendChild(ic);
                }
              })
              .catch(() => {
                /* muestreo opcional: ignorar fallos individuales */
              });
          }
        },
        { root: root0, rootMargin: '160px' },
      );
      results
        .querySelectorAll<HTMLElement>('.sample')
        .forEach((el: HTMLElement) => io?.observe(el));
    }

    /* — búsqueda global de iconos —
       Los nombres viven en 231 JSON sueltos (~5,7 MB). Se cargan bajo demanda
       la primera vez que se busca en modo «Iconos» y quedan en caché. */
    let allIcons: IconListItem[] | null = null;
    let loadingIcons: Promise<IconListItem[]> | null = null;

    async function ensureIcons(onProgress?: (done: number, total: number) => void): Promise<IconListItem[]> {
      if (allIcons) return allIcons;
      if (loadingIcons) return loadingIcons;
      loadingIcons = (async (): Promise<IconListItem[]> => {
        const out: IconListItem[] = [];
        let done = 0;
        const queue: FamilyItem[] = families.slice();
        const worker = async (): Promise<void> => {
          while (queue.length > 0) {
            const fam = queue.shift();
            if (!fam) break;
            try {
              const d = await loadJson<IconsJson>(`${fam.prefix}.json`);
              for (const n of d.icons) out.push({ prefix: fam.prefix, name: n });
            } catch {
              /* familia inaccesible: seguimos */
            }
            onProgress?.(++done, families.length);
          }
        };
        await Promise.all(Array.from({ length: 8 }, () => worker()));
        allIcons = out;
        return out;
      })();
      return loadingIcons;
    }

    let searchToken = 0;

    async function paintIcons(): Promise<void> {
      const f = readFilters();
      const token = ++searchToken;
      const allowed = new Set(
        filterFamilies(families, { ...f, q: '' }).map((x: FamilyItem): string => x.prefix),
      );
      if (!allIcons) {
        results.innerHTML = `
          <div class="status">
            <is-progress-bar id="prog" value="0" label="Indexando iconos"></is-progress-bar>
            <span class="count" id="progTxt">Indexando iconos… 0%</span>
          </div>`;
        const loaded = await ensureIcons((done: number, total: number): void => {
          const pct = Math.round((done / total) * 100);
          document.getElementById('prog')?.setAttribute('value', String(pct));
          const t = document.getElementById('progTxt');
          if (t) t.textContent = `Indexando iconos… ${pct}%`;
        });
        allIcons = loaded;
        if (token !== searchToken) return;
      }
      const term = f.q;
      const matches: IconListItem[] = [];
      const LIMIT = 600;
      const icons = allIcons;
      if (!icons) return;
      for (const it of icons) {
        if (!allowed.has(it.prefix)) continue;
        if (term && !it.name.includes(term) && !`${it.prefix}:${it.name}`.includes(term)) continue;
        matches.push(it);
        if (matches.length >= LIMIT) break;
      }
      if (matches.length === 0) {
        results.innerHTML = `<is-callout color="neutral" variant="outlined" icon="mdi:magnify-close">Ningún icono coincide${term ? ` con “${esc(term)}”` : ''}.</is-callout>`;
        return;
      }
      results.innerHTML =
        `<p class="count" style="margin:6px 0">${matches.length}${matches.length >= LIMIT ? '+' : ''} coincidencias</p>` +
        `<div class="icon-grid" id="grid"></div>`;
      const grid = $mustId<HTMLElement>('grid');
      const frag = document.createDocumentFragment();
      matches.forEach((it: IconListItem, i: number): void => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'icon-cell';
        btn.dataset.pos = String(i);
        const ic = document.createElement('is-icon');
        ic.setAttribute('icon', `${it.prefix}:${it.name}`);
        const nm = document.createElement('small');
        nm.textContent = it.name;
        const fam = document.createElement('small');
        fam.className = 'fam-tag';
        fam.textContent = it.prefix;
        btn.append(ic, nm, fam);
        frag.appendChild(btn);
      });
      grid.appendChild(frag);
      grid.addEventListener('click', (e: Event): void => {
        const cell = (e.target as Element | null)?.closest('.icon-cell');
        if (!cell) return;
        grid.querySelector<HTMLElement>('.icon-cell.sel')?.classList.remove('sel');
        cell.classList.add('sel');
        const pos = Number((cell as HTMLElement).dataset.pos ?? '-1');
        const it = matches[pos];
        if (!it) return;
        void showIcon(it.prefix, it.name, matches, pos);
      });
    }

    const paint = (): void => {
      if (scope === 'fam') paintFamilies();
      else void paintIcons();
    };
    let debounce: ReturnType<typeof setTimeout> | null = null;
    q.addEventListener('is-input', () => {
      if (debounce !== null) clearTimeout(debounce);
      debounce = setTimeout(paint, scope === 'fam' ? 60 : 220);
    });
    for (const id of FILTER_IDS) {
      const el = $mustId<IsSelect>(id);
      el.addEventListener('is-change', paint);
    }
    const fltReset = $mustId<IsButton>('fltReset');
    fltReset.addEventListener('click', (): void => {
      for (const id of FILTER_IDS) {
        const el = $mustId<IsSelect>(id);
        el.value = '';
      }
      q.value = '';
      paint();
    });
    scopeGroup.addEventListener('is-change', (e: Event): void => {
      const detail = (e as CustomEvent<IsInputDetail>).detail;
      scope = detail.value === 'icon' ? 'icon' : 'fam';
      q.setAttribute(
        'placeholder',
        scope === 'fam'
          ? 'Buscar por palabra clave (mdi, tabler, lucide...)'
          : 'Buscar icono en todas las familias (home, arrow-left...)',
      );
      paint();
    });

    paint();
  }

  /* ══ Vista familia (?f=mdi) ════════════════════════════════════════ */
  async function renderFamily(prefix: string): Promise<void> {
    let data: IconsJson;
    try {
      data = await loadJson<IconsJson>(`${prefix}.json`);
    } catch {
      if (app) {
        app.innerHTML = `<is-callout color="danger" variant="outlined" icon="mdi:alert">No existe la familia <code>${esc(prefix)}</code>. <a href="icon-explorer.html">Volver</a></is-callout>`;
      }
      return;
    }
    const meta: CollectionMeta = collectionsMeta[prefix] ?? {};
    document.title = `${prefix} · Explorador de iconos`;
    if (!app) return;
    app.innerHTML = `
      <is-breadcrumb style="margin-bottom:6px">
        <is-breadcrumb-item href="icon-explorer.html">Todas las familias</is-breadcrumb-item>
        <is-breadcrumb-item>${esc(meta.name ?? prefix)}</is-breadcrumb-item>
      </is-breadcrumb>
      <div class="xp-head">
        <h1>${esc(meta.name ?? prefix)}</h1>
        <span class="count">${esc(prefix)} · ${data.icons.length.toLocaleString('es')} iconos${meta.height ? ` · grid ${meta.height}px` : ''}${meta.license ? ` · ${esc(meta.license)}` : ''}</span>
      </div>
      <div class="xp-bar">
        <div class="xp-bar__search">
          <is-input id="q" type="search" clearable placeholder="Buscar en ${esc(prefix)}...">
            <is-icon slot="start" icon="mdi:magnify"></is-icon>
          </is-input>
        </div>
        <div class="tools">
          <is-color-picker id="tColor" label="Color" value="#e8eaf1"></is-color-picker>
          <is-checkbox id="tInherit" checked>Heredar del tema</is-checkbox>
          <is-slider id="tSize" label="Tamaño" min="16" max="64" value="26" value-label with-tooltip format="{v}px"></is-slider>
        </div>
      </div>
      <div class="icon-grid" id="grid"></div>
      <is-button class="more" id="more" color="neutral" variant="outlined">Mostrar más</is-button>`;

    const grid = $mustId<HTMLElement>('grid');
    const q = $mustId<IsInput>('q');
    const more = $mustId<IsButton>('more');
    const tColor = $mustId<IsColorPicker>('tColor');
    const tInherit = $mustId<IsCheckbox>('tInherit');
    const tSize = $mustId<IsSlider>('tSize');
    let filtered: string[] = data.icons;
    let shown = 0;

    const applyTools = (): void => {
      grid.style.setProperty('--xp-size', `${tSize.value}px`);
      if (tInherit.checked) grid.style.removeProperty('--xp-color');
      else grid.style.setProperty('--xp-color', tColor.value);
    };
    tColor.addEventListener('is-input', (): void => {
      tInherit.checked = false;
      applyTools();
    });
    tInherit.addEventListener('is-change', applyTools);
    tSize.addEventListener('is-input', applyTools);
    tSize.addEventListener('is-change', applyTools);

    const appendPage = (): void => {
      const frag = document.createDocumentFragment();
      for (const name of filtered.slice(shown, shown + PAGE)) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'icon-cell';
        btn.dataset.name = name;
        const ic = document.createElement('is-icon');
        ic.setAttribute('icon', `${prefix}:${name}`);
        const nm = document.createElement('small');
        nm.textContent = name;
        btn.append(ic, nm);
        frag.appendChild(btn);
      }
      grid.appendChild(frag);
      shown = Math.min(shown + PAGE, filtered.length);
      more.hidden = shown >= filtered.length;
    };
    const repaint = (): void => {
      grid.innerHTML = '';
      shown = 0;
      appendPage();
    };
    more.addEventListener('click', appendPage);
    q.addEventListener('is-input', (): void => {
      const term = String(q.value).trim().toLowerCase();
      filtered = term ? data.icons.filter((n: string): boolean => n.includes(term)) : data.icons;
      repaint();
    });

    grid.addEventListener('click', (e: Event): void => {
      const cell = (e.target as Element | null)?.closest('.icon-cell');
      if (!cell) return;
      grid.querySelector<HTMLElement>('.icon-cell.sel')?.classList.remove('sel');
      cell.classList.add('sel');
      const name = (cell as HTMLElement).dataset.name ?? '';
      void showIcon(
        prefix,
        name,
        filtered.map((n: string): IconListItem => ({ prefix, name: n })),
        filtered.indexOf(name),
      );
    });

    applyTools();
    appendPage();
  }

  await loadMeta();
  try {
    if (family) await renderFamily(family);
    else await renderIndex();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (app) {
      app.innerHTML = `<is-callout color="danger" variant="outlined" icon="mdi:alert">Error cargando el índice de iconos: ${esc(msg)}</is-callout>`;
    }
  }
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}