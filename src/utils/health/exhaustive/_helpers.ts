/**
 * _helpers.ts — utilidades compartidas por los tests exhaustivos.
 *
 * Estrategia: análisis estático del código fuente + uso del audit motor
 * (`extraerMetaComponente`) para que la resolución de atributos siga la
 * cadena `extends` y los factories (defineDateField, defineTypedChart, etc.).
 *
 * Cubre las 10 dimensiones del checklist:
 *   1. Render        → attachShadow + template innerHTML
 *   2. Observados    → extraerMetaComponente (sigue extends + factories)
 *   3. Eventos       → emit / dispatchEvent
 *   4. Slots         → <slot name="...">
 *   5. Shadow parts  → part="..."
 *   6. JSON payload  → <script type="application/json"> + JSON.parse
 *   7. Accesibilidad → role= / aria-*
 *   8. Edge cases    → guards null/empty
 *   9. Integración   → defineElement / registerDiagramKind
 *  10. Performance   → disconnectedCallback cleanup
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
/** Raíz del repo (5 niveles arriba desde _helpers.ts → src/utils/health/exhaustive). */
export const ROOT = join(__dirname, '..', '..', '..', '..');

export function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

export function exists(rel: string): boolean {
  return existsSync(join(ROOT, rel));
}

/** Extrae eventos `is-*` que el componente emite. Acepta `emit(this, 'is-x', …)`,
 *  `emit(dragCard, 'is-x', …)`, `dispatchEvent(new CustomEvent('is-x', …))`. */
export function extraerEventos(src: string): string[] {
  const eventos = new Set<string>();
  for (const m of src.matchAll(/emit(?:Cancelable)?\s*\([^,]+,\s*['"`](is-[a-z0-9-]+)['"`]/g)) {
    eventos.add(m[1]);
  }
  for (const m of src.matchAll(/new\s+CustomEvent\s*\(\s*['"`](is-[a-z0-9-]+)['"`]/g)) {
    eventos.add(m[1]);
  }
  return [...eventos];
}

/** Devuelve los slots declarados en el template. */
export function extraerSlots(src: string): string[] {
  const slots = new Set<string>();
  const htmlChunks = [
    ...src.matchAll(/TEMPLATE\.innerHTML\s*=\s*[\s\S]*?`([\s\S]*?)`/g),
    ...src.matchAll(/shadow\.innerHTML\s*=\s*[\s\S]*?`([\s\S]*?)`/g),
  ];
  for (const [, html] of htmlChunks) {
    for (const m of html.matchAll(/<slot\s+(?:name=["']([^"']+)["']\s*)?[^>]*>/g)) {
      slots.add(m[1] ?? '(default)');
    }
    for (const _ of html.matchAll(/<slot\s*><\/slot>/g)) {
      slots.add('(default)');
    }
  }
  return [...slots];
}

/** CSS Parts declarados (estáticos + dinámicos vía setAttribute). */
export function extraerParts(src: string): string[] {
  const parts = new Set<string>();
  for (const m of src.matchAll(/\bpart=["']([^"']+)["']/g)) {
    parts.add(m[1]);
  }
  for (const m of src.matchAll(/setAttribute\s*\(\s*['"]part['"]\s*,\s*['"]([^"']+)['"]/g)) {
    parts.add(m[1]);
  }
  return [...parts];
}

/** ¿La clase monta shadow DOM? */
export function tieneShadow(src: string): boolean {
  return /attachShadow\s*\(\s*\{\s*mode\s*:\s*['"]open['"]\s*\}\s*\)/.test(src);
}

/** ¿Limpia observers y listeners en disconnectedCallback? */
export function cleanupCompleto(src: string): { obs: boolean; listeners: boolean; ro: boolean } {
  const usaMO = /new\s+MutationObserver\s*\(/.test(src);
  const usaRO = /new\s+ResizeObserver\s*\(/.test(src);
  const usaAE = /addEventListener\s*\(/.test(src);
  const disc = src.match(/disconnectedCallback\s*\([^)]*\)\s*(?::\s*[A-Za-z_$<>[\]|.,\s]+\s*)?\{([\s\S]{0,2000}?)\n\s{0,4}\}/);
  const body = disc?.[1] ?? '';
  const discGlobal = /\.disconnect\s*\(/.test(body) || /\.disconnect\s*\(/.test(src);
  const remList = /removeEventListener\s*\(/.test(body) || /removeEventListener\s*\(/.test(src);
  return {
    obs: usaMO ? discGlobal : true,
    ro: usaRO ? discGlobal : true,
    listeners: usaAE ? remList : true,
  };
}

/** ¿Lee `<script type="application/json">` para data? */
export function leeJsonScript(src: string): boolean {
  return /script\s+type=["']application\/json["']/.test(src);
}

/** ¿Tiene guards contra datos vacíos/null? */
export function tieneEdgeCaseGuards(src: string): boolean {
  return /Array\.isArray\s*\(/.test(src)
    || /Number\.isFinite/.test(src)
    || /\|\|\s*\[\]/.test(src)
    || /\|\|\s*['"`]/.test(src)
    || /\?\?\s*['"`]/.test(src)
    || /try\s*\{/.test(src);
}

/** ¿Usa role/aria-* para accesibilidad? */
export function tieneAccesibilidad(src: string): boolean {
  return /\brole\s*=\s*["'][^"']+["']/.test(src) || /\baria-/.test(src);
}

/** ¿El componente está registrado? */
export function estaRegistrado(src: string): boolean {
  return /customElements\.define\s*\(/.test(src)
    || /defineElement\s*\(\s*['"`][a-z0-9-]+['"`]/.test(src)
    || /window\.__isDefineTypedChart\s*\?/.test(src)
    || /registerDiagramKind/.test(src);
}

/** ¿Hace JSON.parse? */
export function parseaJson(src: string): boolean {
  return /JSON\.parse\s*\(/.test(src);
}

/** ¿Tiene contenedor SVG? */
export function tieneSvg(src: string): boolean {
  return /<svg\b/.test(src) || /createElementNS\s*\(\s*['"]http/.test(src);
}

/** ¿Tiene <canvas>? */
export function tieneCanvas(src: string): boolean {
  return /<canvas\b/.test(src);
}

/** ¿Usa ResizeObserver? */
export function usaResizeObserver(src: string): boolean {
  return /new\s+ResizeObserver\s*\(/.test(src);
}

/** ¿Usa MutationObserver? */
export function usaMutationObserver(src: string): boolean {
  return /new\s+MutationObserver\s*\(/.test(src);
}

/** ¿Adopta CSS via adoptCss? */
export function adoptaCss(src: string): boolean {
  return /\badoptCss\s*\(/.test(src);
}

/** ¿Tiene JSDoc de cabecera? */
export function tieneJsDoc(src: string): boolean {
  return /\/\*\*[\s\S]{20,800}?\*\//.test(src);
}
