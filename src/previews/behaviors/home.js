/**
 * Behavior del home: CTAs, parallax del collage, progreso de lectura, reveal,
 * contadores KPI, cintas en bucle y botón «abrir demo» de cada card.
 *
 * Todo se cablea contra `ctx.main`, que es el scroller que pinta el chrome. La
 * versión anterior buscaba `is-main.home-main` por `document`: cuando ese nodo
 * cambia de clase o de dueño, las mediciones de scroll se quedan mudas sin dar
 * ningún error.
 *
 * El chrome reusa ese `is-main` entre previews, así que los listeners de scroll
 * y resize van con el `signal` del preview: al desmontar se cortan solos en vez
 * de seguir midiendo un DOM que ya es de otro componente.
 *
 * @typedef {import('../_kit/types.d.ts').PreviewMountContext} PreviewMountContext
 * @typedef {import('../_kit/types.d.ts').ISComponentPreviewLike} ISComponentPreviewLike
 */
import { init as pintarConsumoCdn } from '../../../scripts/home-cdn.js';

/** Tags con demo propia: definen en qué cards aparece el botón de «abrir». */
const CON_DEMO = new Set([
  'is-bar-chart', 'is-line-chart', 'is-doughnut-chart', 'is-pie-chart',
  'is-polar-area-chart', 'is-radar-chart', 'is-scatter-chart',
  'is-bubble-chart', 'is-sparkline', 'is-flowchart', 'is-timeline',
]);

/**
 * Pide al shell que abra el preview de `tag`.
 *
 * `window.parent` es `window` cuando el home no está embebido, así que el mismo
 * mensaje sirve dentro y fuera del iframe: el listener del index lo recoge en
 * los dos casos.
 *
 * @param {string} tag
 */
function seleccionar(tag) {
  window.parent.postMessage({ type: 'is-select', tag }, location.origin);
}

/** @param {HTMLElement} raiz */
function cablearCtas(raiz) {
  /** @type {Array<[string, string]>} */
  const ctas = [
    ['ctaExplore', 'is-button'],
    ['ctaButton', 'is-button'],
    ['ctaCharts', 'is-bar-chart'],
  ];
  for (const [id, tag] of ctas) {
    raiz.querySelector(`#${id}`)?.addEventListener('click', () => seleccionar(tag));
  }
}

/**
 * Parallax del collage 3D: cada card se traslada en función del scroll,
 * simulando un carrusel apilado en perspectiva.
 *
 * @param {HTMLElement} raiz Es a la vez el scroller y la raíz de consulta.
 * @param {AbortSignal} signal
 */
function parallaxCollage(raiz, signal) {
  const track = raiz.querySelector('#homeCollageTrack');
  if (!track) return;
  const cards = [...track.querySelectorAll('.collage-card')];
  if (!cards.length) return;

  // Cada card recibe un «lane» según su índice: pares a la derecha, impares a
  // la izquierda. El lane está acotado porque sin tope las últimas cards se
  // salían del grid y quedaban cortadas contra el borde.
  cards.forEach((c, i) => {
    const profundidad = Math.min(2, 1 + Math.floor(i / 2) * 0.25);
    c.dataset.lane = String((i % 2 === 0 ? 1 : -1) * profundidad);
  });

  let raf = 0;
  const aplicar = () => {
    raf = 0;
    // El scroller no cambia su propio rect al scrollear: el progreso se mide
    // con el rect del track relativo al viewport del scroller — 0 al entrar
    // por abajo, 1 al salir por arriba.
    const vista = raiz.getBoundingClientRect();
    const caja = track.getBoundingClientRect();
    const total = caja.height + vista.height;
    const t = Math.min(1, Math.max(0, (vista.bottom - caja.top) / total));
    for (const c of cards) {
      const lane = Number(c.dataset.lane) || 0;
      // Custom props, no style.transform: así el :hover suma su propio lift
      // sin que el inline lo pise.
      c.style.setProperty('--px', `${lane * 9 * (1 - t)}px`);
      c.style.setProperty('--py', `${-lane * 6 * (1 - t)}px`);
      c.style.setProperty('--pz', `${lane * 6}px`);
      c.style.setProperty('--pry', `${lane * 1.2}deg`);
      c.style.setProperty('--prx', `${-lane * 1.1}deg`);
    }
  };
  const alScrollear = () => {
    if (!raf) raf = requestAnimationFrame(aplicar);
  };
  raiz.addEventListener('scroll', alScrollear, { passive: true, signal });
  window.addEventListener('resize', alScrollear, { signal });
  aplicar();
}

/**
 * Barra de progreso de lectura sobre el scroller del home.
 * @param {HTMLElement} raiz Es a la vez el scroller y la raíz de consulta.
 * @param {AbortSignal} signal
 */
function progresoDeLectura(raiz, signal) {
  const barra = raiz.querySelector('#homeProgress');
  if (!barra) return;
  let raf = 0;
  const sincronizar = () => {
    raf = 0;
    const max = raiz.scrollHeight - raiz.clientHeight;
    barra.value = max > 0 ? Math.round((raiz.scrollTop / max) * 100) : 0;
  };
  raiz.addEventListener(
    'scroll',
    () => {
      if (!raf) raf = requestAnimationFrame(sincronizar);
    },
    { passive: true, signal },
  );
  sincronizar();
}

/**
 * Reveal de tiles y cards. Solo para navegadores sin `animation-timeline:
 * view()` (Safari/Firefox): donde existe, lo hace el CSS.
 *
 * @param {HTMLElement} raiz Es a la vez el scroller y la raíz de consulta.
 * @param {AbortSignal} signal
 */
function revelarAlEntrar(raiz, signal) {
  if (CSS.supports('animation-timeline: view()')) return;
  const objetivos = raiz.querySelectorAll('.tile, .lab-card, .home-lab__head');
  if (!objetivos.length) return;
  for (const el of objetivos) el.classList.add('is-reveal');
  const io = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-revealed');
        io.unobserve(e.target);
      }
    },
    { root: raiz, rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
  );
  signal.addEventListener('abort', () => io.disconnect(), { once: true });
  for (const el of objetivos) io.observe(el);
}

/**
 * Contadores KPI: cuentan al entrar en pantalla, una sola vez.
 * @param {HTMLElement} raiz Es a la vez el scroller y la raíz de consulta.
 * @param {AbortSignal} signal
 */
function contadores(raiz, signal) {
  const nodos = raiz.querySelectorAll('[data-count-to]');
  if (!nodos.length) return;

  const contar = (el) => {
    const hasta = Number(el.dataset.countTo);
    const decimales = Number(el.dataset.countDecimals || 0);
    const prefijo = el.dataset.countPrefix || '';
    const sufijo = el.dataset.countSuffix || '';
    if (!Number.isFinite(hasta)) return;
    const duracion = 900;
    const t0 = performance.now();
    const paso = (ahora) => {
      const p = Math.min(1, (ahora - t0) / duracion);
      // ease-out exponencial: arranca rápido, aterriza suave
      const suave = 1 - Math.pow(1 - p, 3);
      el.textContent =
        prefijo +
        (hasta * suave).toLocaleString('es', {
          minimumFractionDigits: decimales,
          maximumFractionDigits: decimales,
        }) +
        sufijo;
      if (p < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  };

  const io = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        contar(e.target);
        io.unobserve(e.target);
      }
    },
    { root: raiz, threshold: 0.6 },
  );
  signal.addEventListener('abort', () => io.disconnect(), { once: true });
  for (const el of nodos) io.observe(el);
}

/**
 * Cintas en bucle: el CSS anima `translateX(-50%)`, así que el carril necesita
 * dos grupos idénticos y cada grupo debe ser más ancho que la cinta. Con el
 * contenido escrito a mano las cintas cortas dejaban un hueco y parecían
 * quietas: aquí se rellena hasta cubrir el ancho y luego se clona el grupo.
 *
 * @param {HTMLElement} raiz
 */
function cintasEnBucle(raiz) {
  for (const cinta of raiz.querySelectorAll('.collage-ribbon')) {
    const carril = cinta.querySelector('.collage-ribbon__track');
    if (!carril?.children.length) continue;
    const grupo = [...carril.children].map((n) => n.cloneNode(true));
    let guarda = 0;
    while (carril.scrollWidth < cinta.clientWidth * 1.05 && guarda++ < 20) {
      for (const nodo of grupo) carril.appendChild(nodo.cloneNode(true));
    }
    for (const nodo of [...carril.children]) carril.appendChild(nodo.cloneNode(true));
  }
}

/**
 * Botón «abrir demo» en cada card que contenga un `is-*` con preview propio.
 * @param {HTMLElement} raiz
 */
function botonesDeDemo(raiz) {
  for (const card of raiz.querySelectorAll('.tile, .collage-card, .lab-card')) {
    const componente = [...card.querySelectorAll('*')].find((el) =>
      CON_DEMO.has(el.tagName.toLowerCase()),
    );
    if (!componente) continue;
    const tag = componente.tagName.toLowerCase();
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'card-demo';
    boton.title = 'Abrir demo';
    boton.setAttribute('aria-label', `Abrir demo de ${tag}`);
    const icono = document.createElement('is-icon');
    icono.setAttribute('icon', 'mdi:open-in-new');
    boton.appendChild(icono);
    boton.addEventListener('click', (e) => {
      e.stopPropagation();
      seleccionar(tag);
    });
    card.appendChild(boton);
  }
}

/**
 * @param {PreviewMountContext} ctx
 * @param {ISComponentPreviewLike & { signal: AbortSignal }} preview
 */
export async function mount(ctx, preview) {
  const raiz = ctx.main;
  const { signal } = preview;
  const menosMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;

  pintarConsumoCdn(raiz);
  cablearCtas(raiz);
  botonesDeDemo(raiz);

  if (menosMovimiento) return;

  parallaxCollage(raiz, signal);
  cintasEnBucle(raiz);
  progresoDeLectura(raiz, signal);
  revelarAlEntrar(raiz, signal);
  contadores(raiz, signal);
}

export function unmount() {
  /* El corte lo hace el `signal` del preview: ISComponentPreview.unmount()
     aborta el controller y con él todos los listeners y observers. */
}
