/**
 * Behavior migrado desde HTML inline de icon-explorer.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
  const app = document.getElementById('app');
  const scroller = document.getElementById('scroller');
  // Misma lógica que `{assets}` en render.js: la página vive en la raíz o en
  // `_shell.html`, así que no se puede fijar un relativo a `location.href`.
  const raiz = (() => {
    const href = location.href;
    const corte = href.search(/\/(?:src\/previews|index\.html)/);
    return corte > 0 ? href.slice(0, corte + 1) : new URL('./', href).href;
  })();
  const base = new URL('src/assets/icons/', raiz);
  const params = new URLSearchParams(location.search);
      const family = params.get('f');
      const PAGE = 240;
  
      const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const jsonCache = new Map();
  
      async function loadJson(name) {
        if (jsonCache.has(name)) return jsonCache.get(name);
        const p = fetch(new URL(name, base)).then((r) => {
          if (!r.ok) throw new Error(name);
          return r.json();
        });
        jsonCache.set(name, p);
        return p;
      }
  
      /* El feedback de "copiado" lo da <is-copy-button> por sí solo; el toaster
         queda para lo que no nace de un botón de copia (descargas, errores). */
      const toaster = document.getElementById('toaster');
      const toast = (message, variant = 'brand') => toaster.create(message, { variant });
  
      /* ══ Personalizador (drawer) ════════════════════════════════════════ */
      const F = {
        root: document.getElementById('form'),
        id: document.getElementById('fId'),
        collection: document.getElementById('fCollection'),
        size: document.getElementById('fSize'),
        alt: document.getElementById('fAlt'),
        preview: document.getElementById('fPreview'),
        options: document.getElementById('fOptions'),
        format: document.getElementById('fFormat'),
        sizeVal: document.getElementById('fSizeVal'),
        unit: document.getElementById('fUnit'),
        color: document.getElementById('fColor'),
        colorPick: document.getElementById('fColorPick'),
        pretty: document.getElementById('fPretty'),
        rect: document.getElementById('fRect'),
        code: document.getElementById('fCode'),
        codeLabel: document.getElementById('fCodeLabel'),
        copyId: document.getElementById('fCopyId'),
        copyCode: document.getElementById('fCopyCode'),
        copyUrl: document.getElementById('fCopyUrl'),
      };
  
      /** Estado del formulario. Se conserva al cambiar de icono (requisito). */
      const state = { prefix: null, name: null, list: [], pos: -1, svg: null };
  
      const svgCache = new Map();
      async function loadSvg(prefix, name) {
        const key = `${prefix}:${name}`;
        if (svgCache.has(key)) return svgCache.get(key);
        const p = fetch(new URL(`${prefix}/${name}.svg`, base))
          .then((r) => (r.ok ? r.text() : Promise.reject(new Error(key))))
          .then((txt) => {
            const vb = txt.match(/viewBox="\s*([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s*"/);
            const body = txt.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
            return { body, left: vb ? +vb[1] : 0, top: vb ? +vb[2] : 0, w: vb ? +vb[3] : 24, h: vb ? +vb[4] : 24 };
          });
        svgCache.set(key, p);
        return p;
      }
  
      const isValidSize = (v) => Number.isFinite(v) && v > 0 && v <= 4096;
      function isValidColor(v) {
        const s = String(v).trim();
        if (!s) return false;
        if (s === 'currentColor' || s.startsWith('var(')) return true;
        return CSS.supports('color', s);
      }
  
      /** Dimensiones de salida según tamaño + unidad + proporción original. */
      function outDims() {
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
  
      const prettyBody = (body, indent = '  ') =>
        body.replace(/></g, '>\n<').split('\n').map((l) => indent + l.trim()).filter((l) => l.trim()).join('\n');
  
      function buildSvg({ forRaster = false } = {}) {
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
  
      function buildCss() {
        const svg = buildSvg();
        if (!svg) return '';
        const dims = outDims();
        const uri = `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\n\s*/g, ''))}")`;
        return [
          `.icon-${state.name.replace(/[^a-z0-9]+/gi, '-')} {`,
          `  display: inline-block;`,
          `  width: ${dims.w};`,
          `  height: ${dims.h};`,
          `  background-image: ${uri};`,
          `  background-repeat: no-repeat;`,
          `  background-size: 100% 100%;`,
          `}`,
        ].join('\n');
      }
  
      function currentCode() {
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
      function validate() {
        const okSize = F.unit.value === 'auto' || isValidSize(parseFloat(F.sizeVal.value));
        const okColor = isValidColor(F.color.value);
        F.sizeVal.toggleAttribute('error', !okSize);
        F.sizeVal.setAttribute('error-text', okSize ? '' : 'Entre 1 y 4096');
        F.color.toggleAttribute('error', !okColor);
        F.color.setAttribute('error-text', okColor ? '' : 'Color CSS no válido');
        return okSize && okColor;
      }
  
      /** Único punto de verdad: recalcula vista previa + código a la vez. */
      function sync() {
        if (!state.svg) return;
        if (!validate()) {
          F.code.textContent = '/* Corrige los valores marcados para generar el código. */';
          F.copyCode.value = '';
          return;
        }
        F.preview.innerHTML = buildSvg();
        const el = F.preview.querySelector('svg');
        if (el && F.unit.value === 'auto') el.style.fontSize = `${parseFloat(F.sizeVal.value) || 24}px`;
        const code = currentCode();
        F.code.textContent = code;
        F.codeLabel.textContent = F.format.value === 'css' ? 'CSS generado' : 'SVG generado';
        // <is-copy-button> copia su propio `value`: no hace falta un handler.
        F.copyCode.value = code;
      }
  
      async function showIcon(prefix, name, list, pos) {
        state.prefix = prefix;
        state.name = name;
        if (list) { state.list = list; state.pos = pos ?? -1; }
        F.root.open = true;
        F.id.textContent = `${prefix}:${name}`;
        F.copyId.value = `${prefix}:${name}`;
        F.copyUrl.value = new URL(`${prefix}/${name}.svg`, base).href;
        F.alt.textContent = `Alt sugerido: “${name.replace(/[-_]/g, ' ')}”`;
        const meta = collectionsMeta[prefix];
        F.collection.textContent = meta
          ? `${meta.name} · ${meta.category}${meta.license ? ` · ${meta.license}` : ''}`
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
        document.getElementById('fPrev').disabled = state.pos <= 0;
        document.getElementById('fNext').disabled = state.pos < 0 || state.pos >= state.list.length - 1;
        sync();
      }
  
      function step(delta) {
        const next = state.pos + delta;
        if (next < 0 || next >= state.list.length) return;
        const it = state.list[next];
        showIcon(it.prefix, it.name, state.list, next);
      }
  
      for (const el of [F.format, F.unit, F.pretty, F.rect, F.sizeVal, F.color]) {
        el.addEventListener('is-change', sync);
        el.addEventListener('is-input', sync);
      }
      F.colorPick.addEventListener('is-input', (e) => { F.color.value = e.detail.value; sync(); });
      document.getElementById('fPrev').addEventListener('click', () => step(-1));
      document.getElementById('fNext').addEventListener('click', () => step(1));
      document.getElementById('fMore').addEventListener('click', (e) => {
        const open = F.options.hidden;
        F.options.hidden = !open;
        e.currentTarget.setAttribute('aria-expanded', String(open));
      });
      F.copyCode.addEventListener('click', () => { if (!validate()) toast('Corrige los valores inválidos', 'danger'); });
  
      document.getElementById('fDownload').addEventListener('click', async () => {
        if (!state.svg || !validate()) return toast('Corrige los valores inválidos', 'danger');
        const fileBase = `${state.prefix}-${state.name}`;
        if (F.format.value === 'png') return downloadPng(fileBase);
        const isCss = F.format.value === 'css';
        saveBlob(new Blob([currentCode()], { type: isCss ? 'text/css' : 'image/svg+xml' }),
          `${fileBase}.${isCss ? 'css' : 'svg'}`);
        toast('Descargado', 'success');
      });
  
      function saveBlob(blob, filename) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }
  
      async function downloadPng(fileBase) {
        const n = F.unit.value === 'auto' ? 256 : parseFloat(F.sizeVal.value);
        const ratio = state.svg.w / state.svg.h;
        const h = Math.max(1, Math.round(n));
        const w = Math.max(1, Math.round(n * ratio));
        const url = URL.createObjectURL(new Blob([buildSvg({ forRaster: true })], { type: 'image/svg+xml' }));
        const img = new Image();
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; }).catch(() => {});
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => {
          if (!blob) return toast('No se pudo generar el PNG', 'danger');
          saveBlob(blob, `${fileBase}-${w}x${h}.png`);
          toast('PNG descargado', 'success');
        }, 'image/png');
      }
  
      /* ══ Datos compartidos ══════════════════════════════════════════════ */
      let collectionsMeta = {};
      async function loadMeta() {
        try { collectionsMeta = await loadJson('collections.json'); }
        catch { collectionsMeta = {}; }
      }
  
      const uniqSorted = (vals) => [...new Set(vals.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  
      function filterFamilies(families, f) {
        return families.filter((fam) => {
          const m = collectionsMeta[fam.prefix] || {};
          if (f.q && !(`${fam.prefix} ${m.name || ''}`.toLowerCase().includes(f.q))) return false;
          if (f.category && m.category !== f.category) return false;
          if (f.author && m.author !== f.author) return false;
          if (f.license && m.license !== f.license) return false;
          if (f.grid && String(m.height ?? '') !== f.grid) return false;
          if (f.palette === 'color' && !m.palette) return false;
          if (f.palette === 'mono' && m.palette) return false;
          return true;
        });
      }
  
      function filtersMarkup() {
        const metas = Object.values(collectionsMeta);
        const sel = (id, label, vals, todos) => `
          <is-select id="${id}" label="${label}" value="" clearable>
            <is-option value="">${todos}</is-option>
            ${vals.map((v) => `<is-option value="${esc(v)}">${esc(v)}</is-option>`).join('')}
          </is-select>`;
        const grids = uniqSorted(metas.map((m) => (m.height == null ? '' : String(m.height)))).sort((a, b) => a - b);
        return `
          <div class="filters">
            ${sel('fltCategory', 'Categoría', uniqSorted(metas.map((m) => m.category)), 'Todas')}
            ${sel('fltAuthor', 'Autor / tag', uniqSorted(metas.map((m) => m.author)), 'Todos')}
            ${sel('fltGrid', 'Grid', grids, 'Cualquiera')}
            <is-select id="fltPalette" label="Paleta" value="">
              <is-option value="">Cualquiera</is-option>
              <is-option value="mono">Monocromo</is-option>
              <is-option value="color">Color</is-option>
            </is-select>
            ${sel('fltLicense', 'Licencia', uniqSorted(metas.map((m) => m.license)), 'Cualquiera')}
            <is-button id="fltReset" color="neutral" variant="plain">Limpiar</is-button>
          </div>`;
      }
  
      const FILTER_IDS = ['fltCategory', 'fltAuthor', 'fltGrid', 'fltPalette', 'fltLicense'];
  
      /* ══ Vista índice: familias + búsqueda global de iconos ════════════ */
      async function renderIndex() {
        const { families, total } = await loadJson('index.json');
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
  
        const q = document.getElementById('q');
        const results = document.getElementById('results');
        const scopeGroup = document.getElementById('scope');
        let scope = 'fam';
  
        const readFilters = () => ({
          q: String(q.value).trim().toLowerCase(),
          category: document.getElementById('fltCategory').value,
          author: document.getElementById('fltAuthor').value,
          grid: document.getElementById('fltGrid').value,
          palette: document.getElementById('fltPalette').value,
          license: document.getElementById('fltLicense').value,
        });
  
        /* — familias — */
        let io = null;
        function paintFamilies() {
          io?.disconnect();
          const list = filterFamilies(families, readFilters());
          if (!list.length) {
            results.innerHTML = `<is-callout color="neutral" variant="outlined" icon="mdi:filter-off">Ninguna familia coincide con los filtros.</is-callout>`;
            return;
          }
          results.innerHTML = `<div class="fam-grid">${list.map((f) => {
            const m = collectionsMeta[f.prefix] || {};
            return `
              <a class="fam" href="?f=${encodeURIComponent(f.prefix)}">
                <is-card variant="outlined">
                  <b>${esc(m.name || f.prefix)}</b>
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
          }).join('')}</div>`;
  
          io = new IntersectionObserver((entries) => {
            for (const e of entries) {
              if (!e.isIntersecting) continue;
              io.unobserve(e.target);
              const prefix = e.target.dataset.prefix;
              loadJson(`${prefix}.json`).then((d) => {
                for (const n of d.icons.slice(0, 4)) {
                  const ic = document.createElement('is-icon');
                  ic.setAttribute('icon', `${prefix}:${n}`);
                  e.target.appendChild(ic);
                }
              }).catch(() => {});
            }
          }, { root: scroller, rootMargin: '160px' });
          results.querySelectorAll('.sample').forEach((el) => io.observe(el));
        }
  
        /* — búsqueda global de iconos —
           Los nombres viven en 231 JSON sueltos (~5,7 MB). Se cargan bajo demanda
           la primera vez que se busca en modo «Iconos» y quedan en caché. */
        let allIcons = null;
        let loadingIcons = null;
        async function ensureIcons(onProgress) {
          if (allIcons) return allIcons;
          if (loadingIcons) return loadingIcons;
          loadingIcons = (async () => {
            const out = [];
            let done = 0;
            const queue = families.slice();
            const worker = async () => {
              while (queue.length) {
                const fam = queue.shift();
                try {
                  const d = await loadJson(`${fam.prefix}.json`);
                  for (const n of d.icons) out.push({ prefix: fam.prefix, name: n });
                } catch {}
                onProgress?.(++done, families.length);
              }
            };
            await Promise.all(Array.from({ length: 8 }, worker));
            allIcons = out;
            return out;
          })();
          return loadingIcons;
        }
  
        let searchToken = 0;
        async function paintIcons() {
          const f = readFilters();
          const token = ++searchToken;
          const allowed = new Set(filterFamilies(families, { ...f, q: '' }).map((x) => x.prefix));
          if (!allIcons) {
            results.innerHTML = `
              <div class="status">
                <is-progress-bar id="prog" value="0" label="Indexando iconos"></is-progress-bar>
                <span class="count" id="progTxt">Indexando iconos… 0%</span>
              </div>`;
            await ensureIcons((done, total) => {
              const pct = Math.round((done / total) * 100);
              document.getElementById('prog')?.setAttribute('value', String(pct));
              const t = document.getElementById('progTxt');
              if (t) t.textContent = `Indexando iconos… ${pct}%`;
            });
            if (token !== searchToken) return;
          }
          const term = f.q;
          const matches = [];
          const LIMIT = 600;
          for (const it of allIcons) {
            if (!allowed.has(it.prefix)) continue;
            if (term && !it.name.includes(term) && !`${it.prefix}:${it.name}`.includes(term)) continue;
            matches.push(it);
            if (matches.length >= LIMIT) break;
          }
          if (!matches.length) {
            results.innerHTML = `<is-callout color="neutral" variant="outlined" icon="mdi:magnify-close">Ningún icono coincide${term ? ` con “${esc(term)}”` : ''}.</is-callout>`;
            return;
          }
          results.innerHTML =
            `<p class="count" style="margin:6px 0">${matches.length}${matches.length >= LIMIT ? '+' : ''} coincidencias</p>` +
            `<div class="icon-grid" id="grid"></div>`;
          const grid = document.getElementById('grid');
          const frag = document.createDocumentFragment();
          matches.forEach((it, i) => {
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
          grid.addEventListener('click', (e) => {
            const cell = e.target.closest('.icon-cell');
            if (!cell) return;
            grid.querySelector('.icon-cell.sel')?.classList.remove('sel');
            cell.classList.add('sel');
            const pos = +cell.dataset.pos;
            showIcon(matches[pos].prefix, matches[pos].name, matches, pos);
          });
        }
  
        const paint = () => (scope === 'fam' ? paintFamilies() : paintIcons());
        let debounce = 0;
        q.addEventListener('is-input', () => {
          clearTimeout(debounce);
          debounce = setTimeout(paint, scope === 'fam' ? 60 : 220);
        });
        for (const id of FILTER_IDS) document.getElementById(id).addEventListener('is-change', paint);
        document.getElementById('fltReset').addEventListener('click', () => {
          for (const id of FILTER_IDS) document.getElementById(id).value = '';
          q.value = '';
          paint();
        });
        scopeGroup.addEventListener('is-change', (e) => {
          scope = e.detail.value || 'fam';
          q.setAttribute('placeholder', scope === 'fam'
            ? 'Buscar por palabra clave (mdi, tabler, lucide...)'
            : 'Buscar icono en todas las familias (home, arrow-left...)');
          paint();
        });
  
        paint();
      }
  
      /* ══ Vista familia (?f=mdi) ════════════════════════════════════════ */
      async function renderFamily(prefix) {
        let data;
        try { data = await loadJson(`${prefix}.json`); }
        catch {
          app.innerHTML = `<is-callout color="danger" variant="outlined" icon="mdi:alert">No existe la familia <code>${esc(prefix)}</code>. <a href="icon-explorer.html">Volver</a></is-callout>`;
          return;
        }
        const meta = collectionsMeta[prefix] || {};
        document.title = `${prefix} · Explorador de iconos`;
        app.innerHTML = `
          <is-breadcrumb style="margin-bottom:6px">
            <is-breadcrumb-item href="icon-explorer.html">Todas las familias</is-breadcrumb-item>
            <is-breadcrumb-item>${esc(meta.name || prefix)}</is-breadcrumb-item>
          </is-breadcrumb>
          <div class="xp-head">
            <h1>${esc(meta.name || prefix)}</h1>
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
  
        const grid = document.getElementById('grid');
        const q = document.getElementById('q');
        const more = document.getElementById('more');
        const tColor = document.getElementById('tColor');
        const tInherit = document.getElementById('tInherit');
        const tSize = document.getElementById('tSize');
        let filtered = data.icons;
        let shown = 0;
  
        const applyTools = () => {
          grid.style.setProperty('--xp-size', tSize.value + 'px');
          if (tInherit.checked) grid.style.removeProperty('--xp-color');
          else grid.style.setProperty('--xp-color', tColor.value);
        };
        tColor.addEventListener('is-input', () => { tInherit.checked = false; applyTools(); });
        tInherit.addEventListener('is-change', applyTools);
        tSize.addEventListener('is-input', applyTools);
        tSize.addEventListener('is-change', applyTools);
  
        const appendPage = () => {
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
        const repaint = () => { grid.innerHTML = ''; shown = 0; appendPage(); };
        more.addEventListener('click', appendPage);
        q.addEventListener('is-input', () => {
          const term = String(q.value).trim().toLowerCase();
          filtered = term ? data.icons.filter((n) => n.includes(term)) : data.icons;
          repaint();
        });
  
        grid.addEventListener('click', (e) => {
          const cell = e.target.closest('.icon-cell');
          if (!cell) return;
          grid.querySelector('.icon-cell.sel')?.classList.remove('sel');
          cell.classList.add('sel');
          const name = cell.dataset.name;
          showIcon(prefix, name, filtered.map((n) => ({ prefix, name: n })), filtered.indexOf(name));
        });
  
        applyTools();
        appendPage();
      }
  
      await loadMeta();
      (family ? renderFamily(family) : renderIndex()).catch((err) => {
        app.innerHTML = `<is-callout color="danger" variant="outlined" icon="mdi:alert">Error cargando el índice de iconos: ${esc(String(err))}</is-callout>`;
      });
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
