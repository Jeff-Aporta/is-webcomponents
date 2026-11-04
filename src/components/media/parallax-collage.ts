import { adoptCss, defineElement } from '@jeff-aporta/iswc-base/core/element.js';
import { ElementBase } from '@jeff-aporta/iswc-base/core/element-base.js';
import type { Capa } from './schemas/parallax-collage.schemas.js';

/**
 * <iswc-parallax-collage> — Collage por capas (imágenes y formas teñidas con la paleta) con parallax opcional.
 *
 *   <iswc-parallax-collage efecto="capas" direccion="pegajoso" distancia="2"></iswc-parallax-collage>
 *   el.capas = [{ tipo: 'forma', forma: 'circulo', x: 20, y: 30, ancho: 18, anim: 'flotar' }];
 *
 * Atributos
 *   efecto      ninguno | desplazar | rotar | capas   (default ninguno: collage estático)
 *   direccion   corriente | pegajoso                  (corriente sigue al cursor; pegajoso va en contra)
 *   distancia   número, em de recorrido               (default 1.4)
 *   velocidad   número, 1 = asienta en ~3 s           (default 1)
 *   proporcion  alto / ancho del lienzo               (default 1)
 *   quieto      boolean: apaga las animaciones `anim` de las capas
 *   etiqueta    string: la anuncia como imagen; sin ella es decorativa
 *
 * Propiedades
 *   capas       Capa[]   (ver schemas/parallax-collage.schemas.ts)
 *
 * CSS Parts
 *   ::part(lienzo) ::part(capa)
 *
 * El cursor lo provoca el visitante y es un recorrido corto: no depende de `prefers-reduced-motion`. Las animaciones
 * `anim` corren solas y sí se apagan con esa preferencia. Solo con ratón: en táctil no hay cursor que seguir.
 */
(() => {
  const OBSERVED = ['efecto', 'direccion', 'distancia', 'velocidad', 'proporcion', 'quieto', 'etiqueta'];
  // Constante de tiempo del seguimiento, en ms, con velocidad 1: va por tiempo real, igual en 60 Hz y en 144 Hz.
  const TAU = 1000;

  type Seguidor = (x: number, y: number) => void;
  const seguidores = new Set<Seguidor>();

  const avisar = (x: number, y: number): void => {
    for (const s of seguidores) s(x, y);
  };
  const alMover = (ev: PointerEvent): void => {
    if (ev.pointerType === 'mouse') avisar((ev.clientX / innerWidth) * 2 - 1, (ev.clientY / innerHeight) * 2 - 1);
  };
  const alSalir = (): void => avisar(0, 0);

  /** Un solo oyente por página, sea cual sea el número de collages. */
  function seguir(s: Seguidor): void {
    if (!seguidores.size) {
      addEventListener('pointermove', alMover, { passive: true });
      document.addEventListener('pointerleave', alSalir);
    }
    seguidores.add(s);
  }

  function dejarDeSeguir(s: Seguidor): void {
    seguidores.delete(s);
    if (seguidores.size) return;
    removeEventListener('pointermove', alMover);
    document.removeEventListener('pointerleave', alSalir);
  }

  /** Lo que está más arriba parece más cerca y se mueve más. */
  const profundidad = (c: Capa): number => c.prof ?? 0.4 + (c.z ?? 1) * 0.3;

  function capaDom(c: Capa): HTMLElement {
    const capa = document.createElement('div');
    capa.className = 'capa';
    capa.setAttribute('part', 'capa');
    capa.style.cssText = `--x:${c.x}%;--y:${c.y}%;--ancho:${c.ancho}%;--z:${c.z ?? 1};--prof:${profundidad(c)};--retraso:${c.retraso ?? 0}s;--giro:${c.giro ?? 0}deg`;
    const cuerpo = document.createElement(c.tipo === 'imagen' ? 'img' : 'span');
    cuerpo.className = 'cuerpo';
    cuerpo.dataset['anim'] = c.anim ?? 'ninguna';
    if (c.tipo === 'imagen') {
      const img = cuerpo as HTMLImageElement;
      img.src = c.src;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.draggable = false;
    } else {
      cuerpo.dataset['forma'] = c.forma;
      cuerpo.dataset['color'] = c.color ?? 'acento';
    }
    capa.append(cuerpo);
    return capa;
  }

  class IswcParallaxCollage extends ElementBase {
    static get observedAttributes(): string[] { return OBSERVED; }
    #lienzo!: HTMLElement;
    #capas: Capa[] = [];
    #siguiendo = false;
    #destino = { x: 0, y: 0 };
    #actual = { x: 0, y: 0 };
    #corriendo = false;
    #antes = 0;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      this.#lienzo = document.createElement('figure');
      this.#lienzo.className = 'lienzo';
      this.#lienzo.setAttribute('part', 'lienzo');
      shadow.append(this.#lienzo);
    }

    get capas(): Capa[] { return this.#capas; }

    set capas(valor: Capa[]) {
      this.#capas = Array.isArray(valor) ? valor : [];
      this.#lienzo.replaceChildren(...this.#capas.map(capaDom));
    }

    onConnected(): void {
      this.#sync();
    }

    onDisconnected(): void {
      this.#soltar();
    }

    onAttributeChanged(): void {
      this.#sync();
    }

    #numero(nombre: string, porDefecto: number): number {
      const n = Number.parseFloat(this.getAttribute(nombre) ?? '');
      return Number.isFinite(n) ? n : porDefecto;
    }

    #sync(): void {
      const efecto = this.getAttribute('efecto') ?? 'ninguno';
      const etiqueta = this.getAttribute('etiqueta');
      const estilo = this.#lienzo.style;
      this.#lienzo.dataset['efecto'] = efecto;
      this.#lienzo.toggleAttribute('data-quieto', this.hasAttribute('quieto'));
      estilo.setProperty('--proporcion', String(this.#numero('proporcion', 1)));
      estilo.setProperty('--distancia', String(this.#numero('distancia', 1.4)));
      estilo.setProperty('--sentido', this.getAttribute('direccion') === 'pegajoso' ? '-1' : '1');
      if (etiqueta) {
        this.#lienzo.setAttribute('role', 'img');
        this.#lienzo.setAttribute('aria-label', etiqueta);
        this.#lienzo.removeAttribute('aria-hidden');
      } else {
        this.#lienzo.removeAttribute('role');
        this.#lienzo.removeAttribute('aria-label');
        this.#lienzo.setAttribute('aria-hidden', 'true');
      }
      if (efecto === 'ninguno') this.#soltar();
      else this.#tomar();
    }

    #tomar(): void {
      if (this.#siguiendo || !this.isConnected || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      this.#siguiendo = true;
      seguir(this.#mover);
    }

    #soltar(): void {
      if (this.#siguiendo) dejarDeSeguir(this.#mover);
      this.#siguiendo = false;
      this.#mover(0, 0);
    }

    #mover = (x: number, y: number): void => {
      this.#destino = { x, y };
      if (this.#corriendo) return;
      this.#corriendo = true;
      this.#antes = performance.now();
      requestAnimationFrame(this.#cuadro);
    };

    #cuadro = (t: number): void => {
      const tau = TAU / Math.max(0.05, this.#numero('velocidad', 1));
      const k = 1 - Math.exp(-Math.min(100, t - this.#antes) / tau);
      this.#antes = t;
      const { x, y } = this.#destino;
      this.#actual.x += (x - this.#actual.x) * k;
      this.#actual.y += (y - this.#actual.y) * k;
      const llego = Math.abs(x - this.#actual.x) < 0.001 && Math.abs(y - this.#actual.y) < 0.001;
      if (llego) this.#actual = { x, y };
      this.#lienzo.style.setProperty('--px', this.#actual.x.toFixed(4));
      this.#lienzo.style.setProperty('--py', this.#actual.y.toFixed(4));
      this.#corriendo = !llego;
      if (this.#corriendo) requestAnimationFrame(this.#cuadro);
    };
  }

  defineElement('iswc-parallax-collage', IswcParallaxCollage, 'IswcParallaxCollage');
})();
