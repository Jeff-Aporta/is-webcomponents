// conditional.ts — evaluación de formato condicional por celda, con memoria por recálculo.
import { parseRange } from './address.js';
import type { Rect } from './address.schemas.js';
import type { SpreadsheetDoc } from './document.js';
import type { Sheet } from './engine.js';
import { shiftFormula } from './rewrite.js';
import { CellError, compare, toBool } from './values.js';
import type { Scalar } from './values.schemas.js';
import type { CfRule } from '@jeff-aporta/iswc-base/components/data/schemas/spreadsheet.schemas.js';
import type { CfEffect, RangeStats } from './conditional.schemas.js';



const ICONS = {
  arrows: ['mdi:arrow-down-bold', 'mdi:arrow-right-bold', 'mdi:arrow-up-bold'],
  dots: ['mdi:circle', 'mdi:circle', 'mdi:circle'],
  flags: ['mdi:flag', 'mdi:flag', 'mdi:flag'],
};
const ICON_COLORS = ['#d32f2f', '#f9a825', '#2e7d32'];

/** Mezcla dos colores hex. */
function mix(a: string, b: string, t: number): string {
  const p = (h: string, i: number): number => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  const ch = (i: number): string => Math.round(p(a, i) + (p(b, i) - p(a, i)) * t).toString(16).padStart(2, '0');
  return `#${ch(0)}${ch(1)}${ch(2)}`;
}

/** Evaluador de las reglas de una hoja. */
export class CfEvaluator {
  #doc: SpreadsheetDoc;
  #generation = -1;
  #stats = new Map<string, RangeStats>();
  #ranges = new Map<string, Rect | null>();

  constructor(doc: SpreadsheetDoc) {
    this.#doc = doc;
  }

  #rect(sheet: Sheet, range: string): Rect | null {
    const key = `${sheet.id}!${range}`;
    if (!this.#ranges.has(key)) this.#ranges.set(key, parseRange(range, sheet.rows, sheet.cols));
    return this.#ranges.get(key) ?? null;
  }

  #statsOf(sheet: Sheet, x: Rect, range: string): RangeStats {
    const key = `${sheet.id}!${range}`;
    const hit = this.#stats.get(key);
    if (hit) return hit;
    const nums: number[] = [];
    const counts = new Map<string, number>();
    const engine = this.#doc.engine;
    const rows = Math.min(x.r2, engine.usedBounds(sheet).rows - 1);
    for (let r = x.r1; r <= rows; r++) {
      for (let c = x.c1; c <= x.c2; c++) {
        const v = engine.getValue(sheet, r, c);
        if (typeof v === 'number') nums.push(v);
        if (v !== null && !(v instanceof CellError)) {
          const k = String(v).toLowerCase();
          counts.set(k, (counts.get(k) ?? 0) + 1);
        }
      }
    }
    nums.sort((a, b) => a - b);
    const avg = nums.length ? nums.reduce((s, v) => s + v, 0) / nums.length : 0;
    const out = { nums, min: nums[0] ?? 0, max: nums[nums.length - 1] ?? 0, avg, counts };
    this.#stats.set(key, out);
    return out;
  }

  /** Valor de un operando: fórmula relativa a la esquina de la regla, o literal. */
  #operand(rule: CfRule, text: string | undefined, sheet: Sheet, x: Rect, r: number, c: number): Scalar {
    if (text === undefined) return null;
    if (text.startsWith('=')) {
      const v = this.#doc.engine.evalText(shiftFormula(text, r - x.r1, c - x.c1, sheet.rows, sheet.cols), sheet, r, c);
      return Array.isArray(v) ? v[0][0] : v;
    }
    const n = Number(text);
    return text !== '' && !Number.isNaN(n) ? n : text;
  }

  #matches(rule: CfRule, sheet: Sheet, x: Rect, r: number, c: number, v: Scalar): boolean {
    switch (rule.type) {
      case 'cell': {
        if (v === null) return false;
        const a = this.#operand(rule, rule.a, sheet, x, r, c);
        const d = compare(v, a);
        switch (rule.op) {
          case 'gt': return d > 0;
          case 'lt': return d < 0;
          case 'gte': return d >= 0;
          case 'lte': return d <= 0;
          case 'eq': return d === 0;
          case 'ne': return d !== 0;
          case 'between': return d >= 0 && compare(v, this.#operand(rule, rule.b, sheet, x, r, c)) <= 0;
          default: return false;
        }
      }
      case 'text': return String(v ?? '').toLowerCase().includes((rule.a ?? '').toLowerCase());
      case 'formula': {
        const res = this.#operand(rule, rule.a?.startsWith('=') ? rule.a : `=${rule.a ?? ''}`, sheet, x, r, c);
        try { return toBool(res); } catch { return false; }
      }
      case 'top': case 'bottom': {
        if (typeof v !== 'number') return false;
        const s = this.#statsOf(sheet, x, rule.range);
        const k = Math.max(1, rule.rank ?? 10);
        return rule.type === 'top' ? v >= (s.nums[s.nums.length - k] ?? s.nums[0]) : v <= (s.nums[k - 1] ?? s.nums[s.nums.length - 1]);
      }
      case 'aboveAverage': return typeof v === 'number' && v > this.#statsOf(sheet, x, rule.range).avg;
      case 'belowAverage': return typeof v === 'number' && v < this.#statsOf(sheet, x, rule.range).avg;
      case 'duplicate': return v !== null && (this.#statsOf(sheet, x, rule.range).counts.get(String(v).toLowerCase()) ?? 0) > 1;
      case 'unique': return v !== null && this.#statsOf(sheet, x, rule.range).counts.get(String(v).toLowerCase()) === 1;
      case 'blank': return v === null || v === '';
      default: return false;
    }
  }

  /** Efecto combinado de todas las reglas sobre una celda. Null si ninguna aplica. */
  effect(sheet: Sheet, r: number, c: number): CfEffect | null {
    const rules = this.#doc.extras(sheet).cf;
    if (!rules.length) return null;
    if (this.#generation !== this.#doc.engine.generation) {
      this.#generation = this.#doc.engine.generation;
      this.#stats.clear();
      this.#ranges.clear();
    }
    let out: CfEffect | null = null;
    const v = this.#doc.engine.getValue(sheet, r, c);
    for (const rule of rules) {
      const x = this.#rect(sheet, rule.range);
      if (!x || r < x.r1 || r > x.r2 || c < x.c1 || c > x.c2) continue;
      if (rule.type === 'colorScale' || rule.type === 'dataBar' || rule.type === 'iconSet') {
        if (typeof v !== 'number') continue;
        const s = this.#statsOf(sheet, x, rule.range);
        const span = s.max - s.min;
        const t = span === 0 ? 0.5 : (v - s.min) / span;
        out ??= {};
        if (rule.type === 'colorScale') {
          const colors = rule.colors?.length ? rule.colors : ['#f8696b', '#ffeb84', '#63be7b'];
          const seg = t * (colors.length - 1);
          const i = Math.min(colors.length - 2, Math.floor(seg));
          out.bg ??= mix(colors[i], colors[i + 1], seg - i);
        } else if (rule.type === 'dataBar') {
          out.bar ??= { pct: Math.max(4, t * 100), color: rule.colors?.[0] ?? '#5b9bd5' };
        } else {
          const i = t >= 2 / 3 ? 2 : t >= 1 / 3 ? 1 : 0;
          out.icon ??= ICONS[rule.icons ?? 'arrows'][i];
          out.iconColor ??= ICON_COLORS[i];
        }
        continue;
      }
      if (!this.#matches(rule, sheet, x, r, c, v)) continue;
      out = { ...rule.style, ...out };
      if (rule.stop) break;
    }
    return out;
  }
}
