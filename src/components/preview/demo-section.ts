/**
 * <iswc-demo-section> — Phase W32 wrapper para homogeneidad visual de las
 * secciones de los demos.
 *
 * Estandar del usuario (2026-10-03-zod-migration):
 *   "El contenido de TODAS las sections de un demo debe ir dentro de un card.
 *    Solo los titulos y el resumen principal (lede) pueden ir flotantes
 *    (full-width)."
 *
 * Este componente es el punto unico donde se aplica esa politica. El renderer
 * (`src/previews/_kit/render.ts`) crea un `<iswc-demo-section>` por seccion y
 * la decora con `class="section"` + `id` + los aria-label / role heredados,
 * para que las reglas de `presentation.css` (`.section h2`, `.section .lede`,
 * `.section:first-of-type h2::after`, etc.) sigan aplicando al header.
 *
 * Markup esperado (lo produce el renderer):
 *   <iswc-demo-section id="intro" class="section">
 *     <h2 slot="title">…</h2>            <!-- omitido si hideTitle:true -->
 *     <p class="lede" slot="lede">…</p>  <!-- omitido si no hay lede -->
 *     <iswc-demo>…</iswc-demo>           <!-- bloque kind:"demo" -->
 *     <iswc-code>…</iswc-code>           <!-- bloque kind:"code" -->
 *     …                                  <!-- resto de bloques -->
 *   </iswc-demo-section>
 *
 * El shadow DOM proyecta:
 *   - `slot[name="title"]` y `slot[name="lede"]` arriba (flotante, fuera).
 *   - `slot` (default) abajo, dentro de una card homogenea.
 *
 * Atributos
 *   id        string   — para anclas del TOC / scrollspy.
 *   as        section | aside   — preserva el semantico del JSON (default
 *                                  'section'). Si `aside`, `role` se vuelve
 *                                  `complementary` salvo que el JSON ya traiga
 *                                  un `role` explicito.
 *
 * CSS Parts: ::part(head) ::part(card)
 */
import { adoptCss, defineElement } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';
import { setStringAttr } from '../_shared/reflect.js';

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div class="head" part="head">
      <slot name="title"></slot>
      <slot name="lede"></slot>
    </div>
    <div class="card" part="card">
      <slot></slot>
    </div>
  `;

  const OBSERVED = ['id', 'as', 'aria-label', 'aria-labelledby', 'role'];

  class IswcDemoSection extends ElementBase {
    static get observedAttributes(): string[] { return OBSERVED; }

    #headEl!: HTMLElement;
    #titleSlot!: HTMLSlotElement;
    #ledeSlot!: HTMLSlotElement;
    #defaultSlot!: HTMLSlotElement;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#headEl = shadow.querySelector<HTMLElement>('.head')!;
      this.#titleSlot = shadow.querySelector<HTMLSlotElement>('slot[name="title"]')!;
      this.#ledeSlot = shadow.querySelector<HTMLSlotElement>('slot[name="lede"]')!;
      this.#defaultSlot = shadow.querySelector<HTMLSlotElement>('slot:not([name])')!;
      // Cada slot notifica al head si hay contenido. Tambien se evalua una vez
      // en el constructor por si el renderer ya inyecto nodos antes del upgrade
      // (es lo normal en `renderSection`).
      for (const slot of [this.#titleSlot, this.#ledeSlot]) {
        slot.addEventListener('slotchange', () => this.#syncHeadEmpty());
      }
      queueMicrotask(() => this.#syncHeadEmpty());
    }

    onConnected(): void {
      this.#syncHeadEmpty();
      this.#syncRole();
    }

    onAttributeChanged(name: string): void {
      if (name === 'as') this.#syncRole();
    }

    // ---- properties ----

    get id(): string { return this.getAttribute('id') ?? ''; }
    set id(v: string) {
      if (v == null || v === '') this.removeAttribute('id');
      else this.setAttribute('id', String(v));
    }

    get as(): 'section' | 'aside' {
      const v = this.getAttribute('as');
      return v === 'aside' ? 'aside' : 'section';
    }
    set as(v: 'section' | 'aside' | null) {
      if (v == null || v === '' || v === 'section') this.removeAttribute('as');
      else this.setAttribute('as', String(v));
    }

    get ariaLabel(): string { return this.getAttribute('aria-label') ?? ''; }
    set ariaLabel(v: string) { setStringAttr(this, 'aria-label', v); }

    get ariaLabelledby(): string { return this.getAttribute('aria-labelledby') ?? ''; }
    set ariaLabelledby(v: string) { setStringAttr(this, 'aria-labelledby', v); }

    get role(): string { return this.getAttribute('role') ?? ''; }
    set role(v: string) { setStringAttr(this, 'role', v); }

    // ---- private ----

    /**
     * El header colapsa a 0 alto cuando ni el titulo ni el lede tienen
     * contenido sloteado: las secciones `hideTitle: true` y sin lede no deben
     * dejar un hueco vacio entre el borde superior y la card.
     */
    #syncHeadEmpty(): void {
      const empty = !this.#hasSlotted(this.#titleSlot)
        && !this.#hasSlotted(this.#ledeSlot);
      this.#headEl.hidden = empty;
    }

    #hasSlotted(slot: HTMLSlotElement): boolean {
      // `flatten: true` para no contar fallback content recursivo.
      if (slot.assignedElements({ flatten: true }).length > 0) return true;
      // Tambien contar nodos de texto sueltos (no deberia pasar, pero por si).
      for (const node of slot.assignedNodes({ flatten: true })) {
        if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim()) {
          return true;
        }
      }
      return false;
    }

    /**
     * Conserva el rol del JSON. Sin `role` explicito, deriva uno por defecto
     * segun `as`: los `<aside>` del JSON original son landmarks
     * `complementary` y queremos no perder eso al cambiar a un custom element.
     */
    #syncRole(): void {
      if (this.hasAttribute('role')) return;
      const role = this.as === 'aside' ? 'complementary' : '';
      if (role) this.setAttribute('role', role);
      else this.removeAttribute('role');
    }
  }

  defineElement('iswc-demo-section', IswcDemoSection, 'IswcDemoSection');
})();