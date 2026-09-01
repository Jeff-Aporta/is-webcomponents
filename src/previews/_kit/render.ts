/**
 * Render de la definición tipada → DOM (sin ejecutar lógica de preview).
 * @typedef {import('./types.d.ts').PreviewDefinition} PreviewDefinition
 * @typedef {import('./types.d.ts').PreviewSection} PreviewSection
 * @typedef {import('./types.d.ts').PreviewBlock} PreviewBlock
 */

/**
 * Base de `dist/assets/` para el token `{assets}`.
 *
 * Una ruta relativa escrita en el JSON no puede acertar: los previews se pintan
 * desde `index.html` (raíz) y desde `src/previews/_shell.html`, y este módulo
 * se ejecuta tanto en fuente como inlineado en `dist/cdn/…`. Por eso la base se
 * deduce de la raíz del sitio, cortando la URL del módulo en `/src/` o
 * `/dist/cdn/`; así también acierta publicado (GitHub Pages, jsDelivr).
 *
 * Los assets viven **sólo** en `dist/assets/`: es lo que se publica y lo
 * que sirven Pages y jsDelivr. `src/assets/` se eliminó para no mantener dos
 * copias del mismo material.
 */
const RAIZ = (() => {
  const modulo = new URL(import.meta.url).href;
  const corte = modulo.search(/\/(?:dist\/cdn|src)\//);
  return corte > 0 ? modulo.slice(0, corte + 1) : new URL('./', modulo).href;
})();
const ASSETS = `${RAIZ}dist/assets/`;

/**
 * @param {string} html
 * @returns {string}
 */
export function resolveAssets(html: string) {
  return typeof html === 'string' ? html.replaceAll('{assets}', ASSETS) : html;
}

/**
 * @param {string} html
 * @returns {DocumentFragment}
 */
export function fragmentFromHtml(html: string) {
  const tpl = document.createElement('template');
  tpl.innerHTML = resolveAssets(html).trim();
  return tpl.content.cloneNode(true);
}

/**
 * @param {PreviewBlock} block
 * @returns {HTMLElement}
 */
export function renderBlock(block: PreviewBlock) {
  switch (block.kind) {
    case 'lede': {
      const p = document.createElement('p');
      p.className = 'lede';
      p.innerHTML = resolveAssets(block.html);
      return p;
    }
    case 'demo': {
      const wrap = document.createElement('div');
      wrap.className = 'demo-block';
      const demo = document.createElement('is-demo');
      demo.className = 'demo';
      if (block.heading) demo.setAttribute('heading', block.heading);
      if (block.contain) demo.setAttribute('contain', '');
      if (block.noCode) demo.dataset.noCode = '';
      demo.append(fragmentFromHtml(block.html));
      wrap.append(demo);
      return wrap;
    }
    case 'callout': {
      const el = document.createElement('div');
      el.className = 'callout';
      el.innerHTML = resolveAssets(block.html);
      return el;
    }
    case 'code': {
      const ed = document.createElement('is-code');
      ed.className = 'code is-code-view';
      ed.setAttribute('readonly', '');
      ed.setAttribute('compact', '');
      ed.setAttribute('wrap', '');
      ed.setAttribute('line-numbers', 'false');
      const raw = block.code ?? '';
      // Sin data-cm: highlight-code.paint infiere lang + softFormat.
      // Si el JSON trae lang, lo fijamos; si no, is-code infiere al montar.
      if (block.lang) {
        ed.setAttribute('lang', block.lang);
        ed.dataset.lang = block.lang;
      }
      ed.setAttribute('value', raw);
      ed.dataset.cmSource = raw;
      return ed;
    }
    case 'html': {
      const wrap = document.createElement('div');
      wrap.append(fragmentFromHtml(block.html));
      return wrap;
    }
    case 'table': {
      const wrap = document.createElement('div');
      wrap.className = 'ref-wrap';
      if (block.captionHtml) {
        const cap = document.createElement('div');
        cap.innerHTML = resolveAssets(block.captionHtml);
        wrap.append(cap);
      }
      const table = document.createElement('table');
      table.className = block.className
        ? `ref ${block.className}`.trim()
        : 'ref';
      const thead = document.createElement('thead');
      const hr = document.createElement('tr');
      for (const col of block.columns) {
        const th = document.createElement('th');
        th.textContent = col;
        hr.append(th);
      }
      thead.append(hr);
      const tbody = document.createElement('tbody');
      for (const row of block.rows) {
        const tr = document.createElement('tr');
        for (const cell of row) {
          const td = document.createElement('td');
          td.innerHTML = resolveAssets(cell);
          tr.append(td);
        }
        tbody.append(tr);
      }
      table.append(thead, tbody);
      wrap.append(table);
      return wrap;
    }
    default: {
      const _exhaustive = /** @type {never} */ (block);
      void _exhaustive;
      const err = document.createElement('p');
      err.textContent = `Bloque desconocido`;
      return err;
    }
  }
}

/** Contenedores permitidos para una sección: nunca un tag arbitrario del JSON. */
const CONTENEDORES = new Set(['section', 'aside']);

/**
 * @param {PreviewSection} section
 * @returns {HTMLElement}
 */
export function renderSection(section: PreviewSection) {
  const tag = CONTENEDORES.has(section.as ?? '') ? section.as : 'section';
  const el = document.createElement(tag);
  el.className = section.className ? `section ${section.className}` : 'section';
  el.id = section.id;
  if (section.ariaLabel) el.setAttribute('aria-label', section.ariaLabel);
  if (section.ariaLabelledby) el.setAttribute('aria-labelledby', section.ariaLabelledby);

  // `hideTitle` es para las secciones cuyo markup ya trae su encabezado: pintar
  // el <h2> del chrome encima duplicaría el título de la página.
  if (!section.hideTitle) {
    const h2 = document.createElement('h2');
    if (section.titleHtml) h2.innerHTML = section.title;
    else h2.textContent = section.title;
    el.append(h2);
  }

  if (section.lede) {
    const p = document.createElement('p');
    p.className = 'lede';
    p.innerHTML = resolveAssets(section.lede);
    el.append(p);
  }

  for (const block of section.blocks) {
    el.append(renderBlock(block));
  }
  return el;
}

/**
 * @param {PreviewDefinition} def
 * @param {{ main: HTMLElement, aside: HTMLElement }} targets
 */
export function renderDefinition(def: PreviewDefinition, targets) {
  const { main, aside } = targets;
  main.replaceChildren();
  aside.replaceChildren();

  // Las clases del preview anterior se retiran antes de poner las nuevas: el
  // `is-main` lo reusa el chrome entre previews, así que una clase de página
  // completa se quedaría pegada al siguiente componente.
  const previas = main.dataset.previewMainClass;
  if (previas) main.classList.remove(...previas.split(' '));
  delete main.dataset.previewMainClass;
  const clases = (def.mainClass ?? '').split(/\s+/).filter(Boolean);
  if (clases.length) {
    main.classList.add(...clases);
    main.dataset.previewMainClass = clases.join(' ');
  }

  const destino = def.wrapperClass ? document.createElement('div') : main;
  if (destino !== main) destino.className = def.wrapperClass;

  // El prelude va DENTRO del wrapper: es donde se declaran las custom
  // properties de la página, y fuera de ahí un `var(--propia)` queda vacío.
  if (def.prelude) destino.append(fragmentFromHtml(def.prelude));

  for (const section of def.sections) {
    destino.append(renderSection(section));
  }
  if (destino !== main) main.append(destino);

  if (def.withoutToc) return;

  const h1 = document.createElement('h1');
  h1.textContent = def.tag;
  aside.append(h1);

  const spy = document.createElement('is-scrollspy');
  spy.setAttribute('target', 'is-main');
  for (const section of def.sections) {
    const a = document.createElement('a');
    a.href = `#${section.id}`;
    a.textContent = section.title.replace(/<[^>]+>/g, '') || section.id;
    spy.append(a);
  }
  aside.append(spy);
}
