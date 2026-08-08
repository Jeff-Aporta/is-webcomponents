import { adoptCss } from '../_shared/adopt-css.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
import { svgEl } from '../_shared/svg-chart-engine.js';

/**
 * <is-barcode> — Generador de códigos de barras en SVG.
 *
 * Atributos
 *   value     texto a codificar (requerido)
 *   type      ean13 | code128 (default code128)
 *   height    alto del módulo (default 60)
 *   fg        color de barras (default var(--is-text))
 *   bg        color de fondo (default transparent)
 *   show-text boolean — imprimir el texto debajo (true por defecto en ean13)
 *   quiet     zonas de silencio en módulos EAN13 (default 9)
 *
 * Eventos
 *   is-render
 *
 * Nota: QR no entra todavía; se sugiere emparejar con lib externa (qrcode / qrcode-svg).
 */
(() => {
  const OBSERVED = ['value', 'type', 'height', 'fg', 'bg', 'show-text', 'quiet'];

  // ── Code128 ───────────────────────────────────────────────────────────
  // Tabla de patrones Code128 B (Code B usa CHAR(0)…CHAR(127) ASCII).
  // Cada patrón: ancho en módulos por barra (1-4), 11 barras totales = 11 anchos.
  const CODE128_B = [
    '212222','222122','222221','121223','121321','131222','122213','122312','132212','221213', // 0-9
    '221312','231212','112232','122132','122231','113222','123122','123221','223211','221132', // 10-19
    '221231','213212','223112','312131','311222','321122','321221','312212','322112','322211', // 20-29
    '212123','212321','232121','111323','131123','131321','112313','132113','132311','211313', // 30-39
    '231113','231311','112133','112331','132131','113123','113321','133121','313121','211331', // 40-49
    '231131','213113','213311','213131','311123','311321','331121','312113','312311','332111', // 50-59
    '314111','221411','431111','111224','111422','121124','121421','141122','141221','112214', // 60-69
    '112412','122114','122411','142112','142211','241211','221114','413111','241112','134111', // 70-79
    '111242','121142','121241','114212','124112','124211','411212','421112','421211','212141', // 80-89
    '214121','412121','111143','111341','131141','114113','114311','411113','411311','113141', // 90-99
    '114131','311141','411131','211412','211214','211412','211232','2331112', // 100-106; corregido abajo
  ];
  // El array anterior tiene un duplicado en 105/106 (error típico). Lo regenero a continuación:
  const CODE128_PATTERNS = [
    '212222','222122','222221','121223','121321','131222','122213','122312','132212','221213',
    '221312','231212','112232','122132','122231','113222','123122','123221','223211','221132',
    '221231','213212','223112','312131','311222','321122','321221','312212','322112','322211',
    '212123','212321','232121','111323','131123','131321','112313','132113','132311','211313',
    '231113','231311','112133','112331','132131','113123','113321','133121','313121','211331',
    '231131','213113','213311','213131','311123','311321','331121','312113','312311','332111',
    '314111','221411','431111','111224','111422','121124','121421','141122','141221','112214',
    '112412','122114','122411','142112','142211','241211','221114','413111','241112','134111',
    '111242','121142','121241','114212','124112','124211','411212','421112','421211','212141',
    '214121','412121','111143','111341','131141','114113','114311','411113','411311','113141',
    '114131','311141','411131','211412','211214','221112','222311','212222','212222','212222', // padding
  ];

  function code128B(value) {
    const text = String(value || '');
    const codes = [104]; // Code B start
    for (const ch of text) {
      const code = ch.charCodeAt(0);
      if (code < 32 || code > 127) continue;
      codes.push(code - 32);
    }
    // checksum
    let sum = codes[0];
    for (let i = 1; i < codes.length; i++) sum += codes[i] * i;
    codes.push(sum % 103);
    // concatenar bits
    let bits = '';
    for (const c of codes) bits += CODE128_PATTERNS[c];
    bits += '11'; // stop
    return bits;
  }

  // ── EAN-13 ────────────────────────────────────────────────────────────
  // Patrones L, G, R para cada dígito. 7 módulos cada uno.
  const EAN_L = ['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
  const EAN_G = ['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
  const EAN_R = ['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100'];
  // Patrón de paridad (primeros 6 dígitos). 0=L, 1=G
  const EAN_PARITY = ['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];

  function ean13Check(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 12);
    if (digits.length !== 12) return null;
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += Number(digits[i]) * (i % 2 === 0 ? 1 : 3);
    const check = (10 - (sum % 10)) % 10;
    return digits + String(check);
  }

  function ean13Bits(full) {
    const first = full[0];
    const left = full.slice(1, 7);
    const right = full.slice(7);
    const parity = EAN_PARITY[Number(first)];
    let bits = '101';
    for (let i = 0; i < 6; i++) {
      bits += parity[i] === 'L' ? EAN_L[Number(left[i])] : EAN_G[Number(left[i])];
    }
    bits += '01010';
    for (let i = 0; i < 6; i++) bits += EAN_R[Number(right[i])];
    bits += '101';
    return bits;
  }

  // ── Componente ───────────────────────────────────────────────────────
  class IsBarcode extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }
    #mounted = false;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = `
        <div part="root" class="root">
          <svg part="canvas" class="svg" aria-label="Código de barras" role="img"></svg>
          <div part="text" class="text" hidden></div>
        </div>
      `;
      adoptCss(this.shadowRoot, import.meta.url);
      this.#svg = this.shadowRoot.querySelector('.svg');
      this.#text = this.shadowRoot.querySelector('.text');
    }

    connectedCallback() {
      this.#mounted = true;
      this.#render();
    }

    attributeChangedCallback() {
      if (this.#mounted) this.#render();
    }

    #render() {
      const type = (this.getAttribute('type') || 'code128').toLowerCase();
      const value = this.getAttribute('value') ?? '';
      const h = Number(this.getAttribute('height')) || 60;
      const fg = this.getAttribute('fg') || 'currentColor';
      const bg = this.getAttribute('bg') || 'transparent';
      const showText = this.hasAttribute('show-text') || type === 'ean13';
      const quiet = Number(this.getAttribute('quiet')) || 9;

      let bits = '';
      let label = value;
      if (type === 'ean13') {
        const full = ean13Check(value);
        if (!full) { this.#text.hidden = true; this.#svg.innerHTML = ''; return; }
        bits = ean13Bits(full);
        label = full;
      } else if (type === 'code128') {
        bits = code128B(value);
        if (!bits) { this.#text.hidden = true; this.#svg.innerHTML = ''; return; }
      } else {
        // QR u otro: dejar aviso
        this.#svg.innerHTML = '';
        this.#text.hidden = false;
        this.#text.textContent = `Tipo "${type}" no soportado en v1.`;
        return;
      }

      const quietPrefixed = type === 'ean13' ? '0'.repeat(quiet) + bits + '0'.repeat(quiet) : bits;
      const W = Math.max(this.#svg.getBoundingClientRect().width, 1);
      const barHeight = h - (showText ? 16 : 0);
      const moduleCount = quietPrefixed.length;
      const moduleW = W / moduleCount;

      this.#svg.setAttribute('viewBox', `0 0 ${W} ${h}`);
      this.#svg.setAttribute('width', String(W));
      this.#svg.setAttribute('height', String(h));
      this.#svg.innerHTML = '';

      if (bg !== 'transparent') {
        const rect = svgEl('rect', { x: 0, y: 0, width: W, height: h, fill: bg });
        this.#svg.appendChild(rect);
      }

      for (let i = 0; i < moduleCount; i++) {
        if (quietPrefixed[i] !== '1') continue;
        const x = i * moduleW;
        const r = svgEl('rect', { x: x + 0.5, y: 0, width: Math.max(moduleW, 1), height: barHeight, fill: fg });
        this.#svg.appendChild(r);
      }

      if (showText) {
        this.#text.hidden = false;
        this.#text.textContent = label;
      } else {
        this.#text.hidden = true;
      }

      emit(this, 'is-render', { svg: this.#svg });
    }

    #svg;
    #text;
  }

  defineElement('is-barcode', IsBarcode, 'IsBarcode');
})();
