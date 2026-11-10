/**
 * diagram-styles.ts — Estilos de diagrama con carga diferida.
 *
 * El consumidor no define temas a mano: elige un estilo por atributo.
 *
 *   <iswc-component-diagram diagram-style="iswc"></iswc-component-diagram>
 *
 * Un estilo es un paquete de temas JSON, uno por tipo de diagrama (`er`,
 * `component`, `class`, `sequence`), y se descarga una sola vez, la primera vez que un
 * diagrama lo pide. Así los estilos no viajan dentro de cada bundle: el de
 * iswc se carga junto (sus tres temas) y un estilo nuevo es otra carga.
 *
 * API pública:
 *   registerStyleDiagram({ miEstilo: ['https://…/mi-er.json', '…/mi-clases.json'] })
 *     — para librerías de estilos: registra archivos bajo un nombre.
 *
 * Interno (no es API del consumidor):
 *   loadStylesDiagram(nombre) — lo llama DiagramElementBase antes de
 *     renderizar cuando el host trae `diagram-style`.
 *   styleThemeFor(nombre, tipo) — el tema ya cargado para un tipo.
 */
import { registerErTheme } from './theme.js';
import type { ErThemeJson } from '@jeff-aporta/iswc-base/components/diagrams/schemas/theme.schemas.js';
import { ErThemeJsonSchema } from '@jeff-aporta/iswc-base/components/diagrams/schemas/theme.schemas.js';
import type { DiagramStyleKind, DiagramStyleRegistry, DiagramStyleStore } from '@jeff-aporta/iswc-base/components/diagrams/schemas/diagram-styles.schemas.js';

const GLOBAL_KEY = '__iswcDiagramStyles';
const raiz = globalThis as typeof globalThis & { [GLOBAL_KEY]?: DiagramStyleStore };
const STORE: DiagramStyleStore = raiz[GLOBAL_KEY] ??= { archivos: new Map(), cargas: new Map(), temas: new Map() };
const ARCHIVOS = STORE.archivos;
const CARGAS = STORE.cargas;
const TEMAS = STORE.temas;

/** Normaliza el nombre del estilo (a minúsculas, sin espacios). */
function clave(nombre: string): string {
  return String(nombre ?? '').trim().toLowerCase();
}

/**
 * Registra estilos: `{ nombre: [archivos] }`. Las rutas relativas se
 * resuelven contra `base` (por defecto, la ubicación de este módulo). Volver
 * a registrar un nombre reemplaza sus archivos y descarta la carga previa.
 */
export function registerStyleDiagram(registro: DiagramStyleRegistry, base: string | URL = import.meta.url): void {
  for (const [nombre, archivos] of Object.entries(registro)) {
    const k = clave(nombre);
    if (!k || !Array.isArray(archivos) || !archivos.length) continue;
    ARCHIVOS.set(k, archivos.map((a) => new URL(a, base).href));
    CARGAS.delete(k);
    TEMAS.delete(k);
  }
}

/** Estilos registrados (cargados o no). */
export function listStylesDiagram(): string[] {
  return [...ARCHIVOS.keys()];
}

/** true si el estilo ya terminó de cargar. */
export function isStyleDiagramLoaded(nombre: string): boolean {
  return TEMAS.has(clave(nombre));
}

/**
 * Interno: descarga (una sola vez) los temas de un estilo y los registra.
 * Un estilo desconocido resuelve sin error: el diagrama se pinta con su
 * tema por defecto en vez de quedarse vacío.
 */
export function loadStylesDiagram(nombre: string): Promise<void> {
  const k = clave(nombre);
  const enCurso = CARGAS.get(k);
  if (enCurso) return enCurso;
  const archivos = ARCHIVOS.get(k);
  if (!archivos) return Promise.resolve();
  const carga = (async () => {
    const temas = await Promise.all(archivos.map(async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`diagram-style "${k}": ${url} → HTTP ${res.status}`);
      // Validado: un JSON de tema mal formado falla aquí con su ruta, no al pintar.
      return ErThemeJsonSchema.passthrough().parse(await res.json());
    }));
    const porTipo = new Map<DiagramStyleKind, ErThemeJson>();
    for (const t of temas) {
      registerErTheme(t);
      if (t.kind) porTipo.set(t.kind, t);
    }
    TEMAS.set(k, porTipo);
  })();
  // Una carga fallida no queda cacheada: el siguiente render reintenta.
  carga.catch(() => CARGAS.delete(k));
  CARGAS.set(k, carga);
  return carga;
}

/** Interno: tema cargado de `estilo` para el tipo de diagrama, o null. */
export function styleThemeFor(estilo: string | null | undefined, tipo: DiagramStyleKind): ErThemeJson | null {
  if (!estilo) return null;
  const t = TEMAS.get(clave(estilo))?.get(tipo);
  if (t) registerErTheme(t); // registro local del bundle que lo pide
  return t ?? null;
}

/**
 * Nombre del estilo que pide un host: `diagram-style`, o el atributo
 * heredado `theme` (`iswc` / `iswc-cd` → estilo `iswc`).
 */
export function hostStyleName(host: Element): string | null {
  const explicito = host.getAttribute('diagram-style');
  if (explicito) return clave(explicito);
  const legado = host.getAttribute('theme');
  if (!legado) return null;
  const k = clave(legado).replace(/-(cd|class|er)$/, '');
  return ARCHIVOS.has(k) ? k : null;
}

// Estilo iswc: los tres temas en una sola carga. Viven junto a los
// bundles de diagramas (`dist/cdn/diagrams/themes/`). Solo se registra si
// nadie lo hizo antes (otro bundle, o una librería que lo reemplazó).
// Publicado (`.mjs`) este código puede vivir en `diagrams/` o en un chunk de `_chunks/` (ambos a un nivel de
// `dist/cdn/`): la base es `../diagrams/`. Desde fuente, junto a este módulo (`utils/themes/`).
const BASE_TEMAS = /\.mjs(?:[?#]|$)/.test(import.meta.url) ? new URL('../diagrams/', import.meta.url) : import.meta.url;
if (!ARCHIVOS.has('iswc')) registerStyleDiagram({
  iswc: ['./themes/iswc.json', './themes/iswc-cd.json', './themes/iswc-class.json', './themes/iswc-seq.json', './themes/iswc-flow.json'],
}, BASE_TEMAS);

// ── oklch ──
/**
 * oklch — rotar el tono de un color en OKLCH conservando su luminosidad y croma (mismo «peso»
 * visual, otro tono). Devuelve hex para que el SVG exportado se vea igual en cualquier visor.
 * Conversión sRGB ↔ OKLab de Björn Ottosson. Si el tono rotado cae fuera del gamut sRGB se baja
 * el croma (bisección) hasta que entra, sin tocar L ni H.
 */

const lin = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c: number): number => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** `#rrggbb` / `#rgb` → OKLCH `[L, C, H°]`, o `null` si no es hex. */
export function hexToOklch(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1]!.length === 3 ? m[1]!.replace(/./g, '$&$&') : m[1]!;
  const [r, g, b] = [0, 2, 4].map((i) => lin(parseInt(h.slice(i, i + 2), 16) / 255)) as [number, number, number];
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}

/** OKLCH → sRGB lineal-a-gamma en [0,1] (puede salir de rango si está fuera del gamut). */
function oklchToRgb(L: number, C: number, H: number): [number, number, number] {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    gam(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    gam(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    gam(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
  ];
}

const enGamut = (rgb: number[]): boolean => rgb.every((c) => c >= -1e-4 && c <= 1 + 1e-4);

/** OKLCH → `#rrggbb`, bajando el croma lo justo para entrar en sRGB. */
export function oklchToHex(L: number, C: number, H: number): string {
  let rgb = oklchToRgb(L, C, H);
  if (!enGamut(rgb)) {
    let lo = 0;
    let hi = C;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (enGamut(oklchToRgb(L, mid, H))) lo = mid;
      else hi = mid;
    }
    rgb = oklchToRgb(L, lo, H);
  }
  return `#${rgb.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, '0')).join('')}`;
}

/** Mismo L y C, tono + `grados`. Un color que no es hex se devuelve tal cual. */
export function rotarTono(hex: string, grados: number): string {
  const o = hexToOklch(hex);
  if (!o) return hex;
  return oklchToHex(o[0], o[1], (o[2] + grados + 360) % 360);
}

/** Ángulo áureo: tonos sucesivos quedan lo más separados posible sin saber cuántos habrá. */
export const ANGULO_AUREO = 137.508;
