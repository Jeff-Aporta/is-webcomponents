/**
 * Behavior migrado desde HTML inline de home.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
  const postSelect = (tag) => {
        if (window.parent !== window) {
          try { parent.postMessage({ type: 'is-select', tag }, location.origin); return; }
          catch { /* cae al fallback de navegacion */ }
        }
        // Standalone (sin shell): navegar al index con estado. Ruta relativa
        // (../) - nunca root-absolute, porque en GH Pages el sitio vive bajo
        // /<repo>/ y "/" apuntaria fuera del proyecto.
        const b64url = (x) => btoa(String.fromCharCode(...new TextEncoder().encode(x)))
          .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        location.href = new URL('../index.html?s=' + b64url(JSON.stringify({ component: tag })), location.href).href;
      };
      document.getElementById('ctaExplore')?.addEventListener('click', () => postSelect('is-button'));
      document.getElementById('ctaButton')?.addEventListener('click', () => postSelect('is-button'));
      document.getElementById('ctaCharts')?.addEventListener('click', () => postSelect('is-bar-chart'));
  
      // El resto (snippets, copy, download) vive en scripts/home-cdn.js

  // Parallax del collage 3D: cada card se traslada horizontalmente en
      // función del scroll vertical del contenedor, simulando un carrusel
      // apilado en perspectiva. Desactivado con prefers-reduced-motion.
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const main = document.querySelector('is-main.home-main');
      const track = document.getElementById('homeCollageTrack');
      if (main && track && !reduce) {
        const cards = [...track.querySelectorAll('.collage-card')];
        // Cada card recibe un "lane" en función de su índice para crear el
        // desfase: pares a la derecha, impares a la izquierda, con magnitud
        // proporcional al scroll vertical del contenedor.
        // Lane acotado: sin tope, las últimas cards se salían del grid por
        // la derecha y quedaban cortadas contra el borde de la página.
        cards.forEach((c, i) => {
          const depth = Math.min(2, 1 + Math.floor(i / 2) * 0.25);
          c.dataset.lane = (i % 2 === 0 ? 1 : -1) * depth;
        });
        let raf = 0;
        const apply = () => {
          raf = 0;
          // OJO: `main` ES el contenedor scrolleable, así que su propio rect no
          // cambia al scrollear (antes se medía eso y el parallax quedaba
          // congelado). El progreso se mide con el rect del TRACK relativo al
          // viewport del scroller: 0 al entrar por abajo, 1 al salir por arriba.
          const view = main.getBoundingClientRect();
          const rect = track.getBoundingClientRect();
          const total = rect.height + view.height;
          const t = Math.min(1, Math.max(0, (view.bottom - rect.top) / total));
          for (const c of cards) {
            const lane = Number(c.dataset.lane) || 0;
            // Se escriben custom props, no style.transform: así el :hover
            // puede sumar su propio lift sin que el inline lo pise.
            c.style.setProperty('--px', `${lane * 9 * (1 - t)}px`);
            c.style.setProperty('--py', `${-lane * 6 * (1 - t)}px`);
            c.style.setProperty('--pz', `${lane * 6}px`);
            c.style.setProperty('--pry', `${lane * 1.2}deg`);
            c.style.setProperty('--prx', `${-lane * 1.1}deg`);
          }
        };
        const onScroll = () => {
          if (raf) return;
          raf = requestAnimationFrame(apply);
        };
        main.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        apply();
      }

  /* Orquestador de scroll del home.
         1. Barra de progreso de lectura (is-progress-bar) en el borde superior.
         2. Reveal de tiles/lab-cards por IntersectionObserver — fallback para
            navegadores sin `animation-timeline: view()` (Safari/Firefox).
         3. Contadores KPI que cuentan al entrar en pantalla, una sola vez.
         Todo se apaga con prefers-reduced-motion. */
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const main = document.querySelector('is-main.home-main');
  
      if (main && !reduce) {
        /* ── 1. progreso de lectura ─────────────────────────────────── */
        const bar = document.getElementById('homeProgress');
        if (bar) {
          let raf = 0;
          const sync = () => {
            raf = 0;
            const max = main.scrollHeight - main.clientHeight;
            bar.value = max > 0 ? Math.round((main.scrollTop / max) * 100) : 0;
          };
          main.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(sync); }, { passive: true });
          sync();
        }
  
        /* ── 2. reveal (solo si el navegador NO soporta scroll timelines) ── */
        const hasViewTimeline = CSS.supports('animation-timeline: view()');
        const revealables = document.querySelectorAll('.tile, .lab-card, .home-lab__head');
        if (!hasViewTimeline && revealables.length) {
          for (const el of revealables) el.classList.add('is-reveal');
          const io = new IntersectionObserver((entries) => {
            for (const e of entries) {
              if (!e.isIntersecting) continue;
              e.target.classList.add('is-revealed');
              io.unobserve(e.target);
            }
          }, { root: main, rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
          for (const el of revealables) io.observe(el);
        }
  
        /* ── 3. contadores KPI ──────────────────────────────────────── */
        const counters = document.querySelectorAll('[data-count-to]');
        if (counters.length) {
          const run = (el) => {
            const to = Number(el.dataset.countTo);
            const decimals = Number(el.dataset.countDecimals || 0);
            const prefix = el.dataset.countPrefix || '';
            const suffix = el.dataset.countSuffix || '';
            if (!Number.isFinite(to)) return;
            const dur = 900;
            const t0 = performance.now();
            const step = (now) => {
              const p = Math.min(1, (now - t0) / dur);
              // ease-out exponencial: arranca rápido, aterriza suave
              const eased = 1 - Math.pow(1 - p, 3);
              el.textContent = prefix + (to * eased).toLocaleString('es', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
              }) + suffix;
              if (p < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
          };
          const io = new IntersectionObserver((entries) => {
            for (const e of entries) {
              if (!e.isIntersecting) continue;
              run(e.target);
              io.unobserve(e.target);
            }
          }, { root: main, threshold: 0.6 });
          for (const el of counters) io.observe(el);
        }
      }

  // Marquee de las cintas: el bucle CSS es translateX(-50%), así que el
      // carril necesita exactamente 2 grupos idénticos y cada grupo debe ser
      // más ancho que la cinta. Con el contenido escrito a mano las cintas
      // cortas dejaban un hueco y parecían no desplazarse: aquí se rellena
      // hasta cubrir el ancho y luego se clona el grupo entero.
      const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      for (const ribbon of document.querySelectorAll('.collage-ribbon')) {
        const track = ribbon.querySelector('.collage-ribbon__track');
        if (!track || !track.children.length) continue;
        if (reduceMotion) continue;
  
        const group = [...track.children].map((n) => n.cloneNode(true));
        let guard = 0;
        // +1 grupo hasta que un grupo solo ya sobrepase el ancho visible.
        while (track.scrollWidth < ribbon.clientWidth * 1.05 && guard++ < 20) {
          for (const node of group) track.appendChild(node.cloneNode(true));
        }
        // Segundo grupo idéntico → el -50% empalma sin salto.
        for (const node of [...track.children]) track.appendChild(node.cloneNode(true));
      }

  // Botón "abrir demo" en cada card con un is-* compatible. Detecta el
      // primer is-* soportado dentro de la card, monta el icono en la
      // esquina superior derecha y al hacer click postSelect(tag) al padre.
      const demoable = new Set([
        'is-bar-chart', 'is-line-chart', 'is-doughnut-chart', 'is-pie-chart',
        'is-polar-area-chart', 'is-radar-chart', 'is-scatter-chart',
        'is-bubble-chart', 'is-sparkline', 'is-flowchart', 'is-timeline',
      ]);
      const postSelect = (tag) => {
        if (window.parent !== window) {
          try { parent.postMessage({ type: 'is-select', tag }, location.origin); return; }
          catch { /* cae al fallback de navegacion */ }
        }
        // Standalone (sin shell): navegar al index con estado. Ruta relativa
        // (../) - nunca root-absolute, porque en GH Pages el sitio vive bajo
        // /<repo>/ y "/" apuntaria fuera del proyecto.
        const b64url = (x) => btoa(String.fromCharCode(...new TextEncoder().encode(x)))
          .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        location.href = new URL('../index.html?s=' + b64url(JSON.stringify({ component: tag })), location.href).href;
      };
      for (const card of document.querySelectorAll('.tile, .collage-card, .lab-card')) {
        const comp = [...card.querySelectorAll('*')]
          .find(el => demoable.has(el.tagName.toLowerCase()));
        if (!comp) continue;
        const tag = comp.tagName.toLowerCase();
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'card-demo';
        btn.title = 'Abrir demo';
        btn.setAttribute('aria-label', `Abrir demo de ${tag}`);
        const icon = document.createElement('is-icon');
        icon.setAttribute('icon', 'mdi:open-in-new');
        btn.appendChild(icon);
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          postSelect(tag);
        });
        card.appendChild(btn);
      }
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
