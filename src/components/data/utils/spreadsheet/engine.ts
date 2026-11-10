// @contexto INDICE.md · src/components/data/README.md
// engine.ts — libro en memoria y recálculo: grafo de dependencias, orden topológico (Tarjan),
// detección de ciclos, desbordes de matrices dinámicas y volátiles. Sin DOM.
import { parseRange } from './address.js';
import type { Rect } from './address.schemas.js';
import { evaluate } from './evaluator.js';
import type { Ctx, EvalHost } from './evaluator.schemas.js';
import { lookupFn } from './fn-registry.js';
import './fn-aliases-es.js';
import type { Node } from './parser.schemas.js';
import { formulaBody, parseFormula } from './parser.js';
import { adjustFormula, dropSheetInFormula, renameSheetInFormula } from './rewrite.js';
import type { StructuralOp } from './rewrite.schemas.js';
import { ERR, LambdaValue, RefValue } from './values.js';
import type { EvalValue, Matrix, Scalar } from './values.schemas.js';
import type { CellData, RangeDep, FormulaInfo } from './engine.schemas.js';


const COLS = 16384;
const SHEET_FACTOR = 2 ** 34;
const BUCKET_SHIFT = 10;
const MAX_BUCKETS = 256;
const MAX_PASSES = 16;

/** Clave de celda dentro de una hoja. */
export function cellKey(r: number, c: number): number {
  return r * COLS + c;
}

/** Fila de una clave. */
export function keyRow(k: number): number {
  return Math.floor(k / COLS);
}

/** Columna de una clave. */
export function keyCol(k: number): number {
  return k % COLS;
}

/** Hoja: celdas y valores calculados. */
export class Sheet {
  cells = new Map<number, CellData>();
  calc = new Map<number, Scalar>();
  spills = new Map<number, { rows: number; cols: number }>();
  spillOwner = new Map<number, number>();
  blocked = new Map<number, Rect>();
  constructor(readonly id: number, public name: string, public rows: number, public cols: number) {}
}



/** Libro con cálculo incremental. */
export class Engine implements EvalHost {
  sheets: Sheet[] = [];
  names = new Map<string, { name: string; ref: string; ast: Node | null }>();
  #nextId = 1;
  #byId = new Map<number, Sheet>();
  #formulas = new Map<number, FormulaInfo>();
  #cellDeps = new Map<number, Set<number>>();
  #rangeDeps = new Map<string, RangeDep>();
  #buckets = new Map<number, RangeDep[]>();
  #bigRanges: RangeDep[] = [];
  #volatile = new Set<number>();
  #changed = new Set<number>();
  #pending = new Set<number>();
  #active = new Set<number>();
  #spillSeeds = new Set<number>();
  #generation = 0;
  #batching = 0;

  /** Sube con cada recálculo: sirve para invalidar memorias externas. */
  get generation(): number { return this.#generation; }

  // ---- hojas ----

  addSheet(name: string, rows = 100, cols = 26, at = this.sheets.length): Sheet {
    const s = new Sheet(this.#nextId++, name, rows, cols);
    this.sheets.splice(at, 0, s);
    this.#byId.set(s.id, s);
    return s;
  }

  /** Vuelve a colgar una hoja restaurada del historial. */
  reattach(sheet: Sheet): void {
    this.#byId.set(sheet.id, sheet);
  }

  sheetByName(name: string): Sheet | null {
    const u = name.toLowerCase();
    return this.sheets.find((s) => s.name.toLowerCase() === u) ?? null;
  }

  byId(id: number): Sheet {
    return this.#byId.get(id)!;
  }

  renameSheet(sheet: Sheet, to: string): void {
    const from = sheet.name;
    sheet.name = to;
    this.#rewriteAll((f) => renameSheetInFormula(f, from, to));
    this.rebuild();
  }

  removeSheet(sheet: Sheet): void {
    this.sheets = this.sheets.filter((s) => s !== sheet);
    this.#byId.delete(sheet.id);
    this.#rewriteAll((f) => dropSheetInFormula(f, sheet.name));
    this.rebuild();
  }

  // ---- celdas ----

  getCell(sheet: Sheet, r: number, c: number): CellData | undefined {
    return sheet.cells.get(cellKey(r, c));
  }

  /** Escribe una celda (undefined la borra) y deja el recálculo pendiente. */
  setCell(sheet: Sheet, r: number, c: number, data: CellData | undefined): void {
    const ck = cellKey(r, c);
    const gk = sheet.id * SHEET_FACTOR + ck;
    const prev = sheet.cells.get(ck);
    if (prev?.f !== undefined && prev.f !== data?.f) this.#unregister(gk);
    if (data && (data.v !== undefined || data.f !== undefined || data.s !== undefined || data.c !== undefined || data.l !== undefined)) sheet.cells.set(ck, data);
    else sheet.cells.delete(ck);
    if (data?.f !== undefined && prev?.f !== data.f) this.#register(sheet, r, c, data.f);
    if (prev?.f === data?.f && prev?.v === data?.v) return;
    if (data?.f === undefined) sheet.calc.delete(ck);
    this.#changed.add(gk);
    const owner = sheet.spillOwner.get(ck);
    if (owner !== undefined) this.#changed.add(sheet.id * SHEET_FACTOR + owner);
    for (const [anchor, rect] of sheet.blocked) {
      if (r >= rect.r1 && r <= rect.r2 && c >= rect.c1 && c <= rect.c2) this.#changed.add(sheet.id * SHEET_FACTOR + anchor);
    }
  }

  /** Valor calculado de una celda. */
  getValue(sheet: Sheet, r: number, c: number): Scalar {
    const ck = cellKey(r, c);
    const cell = sheet.cells.get(ck);
    if (cell?.f !== undefined) return sheet.calc.get(ck) ?? null;
    if (cell?.v !== undefined) return cell.v;
    return sheet.calc.get(ck) ?? null;
  }

  /** Agrupa escrituras: recalcula al cerrar el lote más externo. */
  batch<T>(fn: () => T): T {
    this.#batching++;
    try { return fn(); } finally {
      this.#batching--;
      if (this.#batching === 0) this.recalc();
    }
  }

  // ---- nombres ----

  setName(name: string, ref: string): void {
    this.setNameQuiet(name, ref);
    this.rebuild();
  }

  /** Define un nombre sin reconstruir; el llamador reconstruye al terminar la carga. */
  setNameQuiet(name: string, ref: string): void {
    const text = ref.trimStart().startsWith('=') ? ref : `=${ref}`;
    let ast: Node | null = null;
    try { ast = parseFormula(formulaBody(text)); } catch { ast = null; }
    this.names.set(name.toUpperCase(), { name, ref: text, ast });
  }

  removeName(name: string): void {
    this.names.delete(name.toUpperCase());
    this.rebuild();
  }

  // ---- EvalHost ----

  value(id: number, r: number, c: number): Scalar {
    const sheet = this.#byId.get(id);
    if (!sheet) return ERR.REF;
    const gk = id * SHEET_FACTOR + cellKey(r, c);
    if (this.#active.has(gk)) return ERR.CYCLE;
    if (this.#pending.has(gk)) this.#evalCell(gk);
    return this.getValue(sheet, r, c);
  }

  sheetId(name: string): number | null {
    return this.sheetByName(name)?.id ?? null;
  }

  dims(id: number): { rows: number; cols: number } {
    const s = this.#byId.get(id);
    return s ? { rows: s.rows, cols: s.cols } : { rows: 1, cols: 1 };
  }

  used(id: number): { rows: number; cols: number } {
    const s = this.#byId.get(id);
    if (!s) return { rows: 0, cols: 0 };
    return s.rows * s.cols < 200000 ? { rows: s.rows, cols: s.cols } : this.usedBounds(s);
  }

  /** Último alcance realmente ocupado. */
  usedBounds(s: Sheet): { rows: number; cols: number } {
    let rows = 0;
    let cols = 0;
    const visit = (k: number): void => {
      rows = Math.max(rows, keyRow(k) + 1);
      cols = Math.max(cols, keyCol(k) + 1);
    };
    for (const k of s.cells.keys()) visit(k);
    for (const k of s.calc.keys()) visit(k);
    return { rows, cols };
  }

  name(name: string, _sheet: number): Node | null {
    return this.names.get(name.toUpperCase())?.ast ?? null;
  }

  spill(id: number, r: number, c: number): RefValue | null {
    const s = this.#byId.get(id);
    const shape = s?.spills.get(cellKey(r, c));
    return shape ? new RefValue(id, r, c, r + shape.rows - 1, c + shape.cols - 1) : null;
  }

  sheetName(id: number): string { return this.#byId.get(id)?.name ?? ''; }
  sheetCount(): number { return this.sheets.length; }
  sheetIndex(id: number): number { return this.sheets.findIndex((s) => s.id === id); }
  isFormula(id: number, r: number, c: number): boolean { return this.#byId.get(id)?.cells.get(cellKey(r, c))?.f !== undefined; }
  formulaText(id: number, r: number, c: number): string | null { return this.#byId.get(id)?.cells.get(cellKey(r, c))?.f ?? null; }

  // ---- grafo ----

  #register(sheet: Sheet, r: number, c: number, text: string): void {
    const gk = sheet.id * SHEET_FACTOR + cellKey(r, c);
    let ast: Node | null = null;
    try { ast = parseFormula(formulaBody(text)); } catch { ast = null; }
    const info: FormulaInfo = { sheet, r, c, ast, volatile: false, refs: [] };
    if (ast) this.#collect(ast, sheet, info, new Set());
    this.#formulas.set(gk, info);
    if (info.volatile) this.#volatile.add(gk);
    for (const dep of info.refs) this.#link(dep.sheet, dep.rect, gk);
  }

  #collect(n: Node, sheet: Sheet, info: FormulaInfo, seen: Set<string>): void {
    switch (n.t) {
      case 'ref': {
        const target = n.sheet === undefined ? sheet : this.sheetByName(n.sheet);
        if (!target) return;
        const b = n.b ?? n.a;
        const rect = { r1: n.a.r < 0 ? 0 : n.a.r, c1: n.a.c < 0 ? 0 : n.a.c, r2: b.r < 0 ? target.rows - 1 : b.r, c2: b.c < 0 ? target.cols - 1 : b.c };
        info.refs.push({ sheet: target.id, rect: { r1: Math.min(rect.r1, rect.r2), c1: Math.min(rect.c1, rect.c2), r2: Math.max(rect.r1, rect.r2), c2: Math.max(rect.c1, rect.c2) } });
        return;
      }
      case 'name': {
        const key = n.name.toUpperCase();
        const def = this.names.get(key);
        if (def?.ast && !seen.has(key)) {
          seen.add(key);
          this.#collect(def.ast, sheet, info, seen);
        }
        return;
      }
      case 'call': {
        if (lookupFn(n.name)?.volatile) info.volatile = true;
        const def = this.names.get(n.name.toUpperCase());
        if (def?.ast && !seen.has(n.name.toUpperCase())) {
          seen.add(n.name.toUpperCase());
          this.#collect(def.ast, sheet, info, seen);
        }
        for (const a of n.args) this.#collect(a, sheet, info, seen);
        return;
      }
      case 'un': case 'pct': case 'spill': this.#collect(n.x, sheet, info, seen); return;
      case 'bin':
        this.#collect(n.l, sheet, info, seen);
        this.#collect(n.r, sheet, info, seen);
        return;
      case 'arr':
        for (const row of n.rows) for (const x of row) this.#collect(x, sheet, info, seen);
        return;
      default:
    }
  }

  #link(sheet: number, rect: Rect, gk: number): void {
    if (rect.r1 === rect.r2 && rect.c1 === rect.c2) {
      const key = sheet * SHEET_FACTOR + cellKey(rect.r1, rect.c1);
      let set = this.#cellDeps.get(key);
      if (!set) this.#cellDeps.set(key, (set = new Set()));
      set.add(gk);
      return;
    }
    const id = `${sheet}!${rect.r1},${rect.c1},${rect.r2},${rect.c2}`;
    let dep = this.#rangeDeps.get(id);
    if (!dep) {
      dep = { sheet, rect, users: new Set() };
      this.#rangeDeps.set(id, dep);
      const buckets = ((rect.r2 >> BUCKET_SHIFT) - (rect.r1 >> BUCKET_SHIFT) + 1) * (rect.c2 - rect.c1 + 1);
      if (buckets > MAX_BUCKETS) this.#bigRanges.push(dep);
      else {
        for (let c = rect.c1; c <= rect.c2; c++) {
          for (let b = rect.r1 >> BUCKET_SHIFT; b <= rect.r2 >> BUCKET_SHIFT; b++) {
            const key = sheet * SHEET_FACTOR + b * COLS + c;
            const list = this.#buckets.get(key);
            if (list) list.push(dep);
            else this.#buckets.set(key, [dep]);
          }
        }
      }
    }
    dep.users.add(gk);
  }

  #unregister(gk: number): void {
    const info = this.#formulas.get(gk);
    if (!info) return;
    this.#formulas.delete(gk);
    this.#volatile.delete(gk);
    for (const dep of info.refs) {
      const rect = dep.rect;
      if (rect.r1 === rect.r2 && rect.c1 === rect.c2) {
        this.#cellDeps.get(dep.sheet * SHEET_FACTOR + cellKey(rect.r1, rect.c1))?.delete(gk);
      } else {
        this.#rangeDeps.get(`${dep.sheet}!${rect.r1},${rect.c1},${rect.r2},${rect.c2}`)?.users.delete(gk);
      }
    }
  }

  #dependents(gk: number): number[] {
    const out = new Set<number>(this.#cellDeps.get(gk) ?? []);
    const sheet = Math.floor(gk / SHEET_FACTOR);
    const ck = gk - sheet * SHEET_FACTOR;
    const r = keyRow(ck);
    const c = keyCol(ck);
    const test = (dep: RangeDep): void => {
      if (dep.sheet !== sheet) return;
      const x = dep.rect;
      if (r < x.r1 || r > x.r2 || c < x.c1 || c > x.c2) return;
      for (const u of dep.users) out.add(u);
    };
    for (const dep of this.#buckets.get(sheet * SHEET_FACTOR + (r >> BUCKET_SHIFT) * COLS + c) ?? []) test(dep);
    for (const dep of this.#bigRanges) test(dep);
    return [...out];
  }

  /** Orden de evaluación del conjunto afectado y fórmulas en ciclo (Tarjan iterativo). */
  #plan(seeds: Iterable<number>): { order: number[]; cyclic: Set<number> } {
    const index = new Map<number, number>();
    const low = new Map<number, number>();
    const onStack = new Set<number>();
    const stack: number[] = [];
    const emitted: number[] = [];
    const cyclic = new Set<number>();
    let counter = 0;
    for (const seed of seeds) {
      if (index.has(seed)) continue;
      const frames: { node: number; next: number[]; i: number }[] = [];
      const open = (node: number): void => {
        index.set(node, counter);
        low.set(node, counter);
        counter++;
        stack.push(node);
        onStack.add(node);
        frames.push({ node, next: this.#dependents(node), i: 0 });
      };
      open(seed);
      while (frames.length) {
        const f = frames[frames.length - 1];
        if (f.i < f.next.length) {
          const to = f.next[f.i++];
          if (to === f.node) cyclic.add(to);
          if (!index.has(to)) open(to);
          else if (onStack.has(to)) low.set(f.node, Math.min(low.get(f.node)!, index.get(to)!));
          continue;
        }
        frames.pop();
        const parent = frames[frames.length - 1];
        if (parent) low.set(parent.node, Math.min(low.get(parent.node)!, low.get(f.node)!));
        if (low.get(f.node) === index.get(f.node)) {
          const comp: number[] = [];
          for (;;) {
            const x = stack.pop()!;
            onStack.delete(x);
            comp.push(x);
            if (x === f.node) break;
          }
          if (comp.length > 1) for (const x of comp) cyclic.add(x);
          for (const x of comp) emitted.push(x);
        }
      }
    }
    return { order: emitted.reverse(), cyclic };
  }

  /** Recalcula lo pendiente. Devuelve cuántas fórmulas evaluó. */
  recalc(): number {
    if (this.#batching > 0) return 0;
    let evaluated = 0;
    const first = new Set<number>(this.#changed);
    for (const v of this.#volatile) first.add(v);
    this.#changed.clear();
    let seeds: Set<number> = first;
    for (let pass = 0; pass < MAX_PASSES && seeds.size > 0; pass++) {
      const { order, cyclic } = this.#plan(seeds);
      for (const gk of order) if (this.#formulas.has(gk)) this.#pending.add(gk);
      for (const gk of cyclic) {
        if (!this.#formulas.has(gk)) continue;
        this.#pending.delete(gk);
        this.#store(gk, ERR.CYCLE);
      }
      for (const gk of order) {
        if (!this.#pending.has(gk)) continue;
        this.#evalCell(gk);
        evaluated++;
      }
      seeds = this.#spillSeeds;
      this.#spillSeeds = new Set();
    }
    this.#generation++;
    return evaluated;
  }

  #evalCell(gk: number): void {
    const info = this.#formulas.get(gk);
    this.#pending.delete(gk);
    if (!info) return;
    if (!info.ast) { this.#store(gk, ERR.NAME); return; }
    this.#active.add(gk);
    const ctx: Ctx = { host: this, sheet: info.sheet.id, r: info.r, c: info.c, env: null, depth: 0 };
    const result = evaluate(info.ast, ctx);
    this.#active.delete(gk);
    this.#store(gk, result);
  }

  /** Normaliza un resultado a escalar o matriz. */
  materialize(v: EvalValue, ctx: Ctx): Scalar | Matrix {
    if (v instanceof LambdaValue) return ERR.CALC;
    if (v instanceof RefValue) {
      if (v.single) return ctx.host.value(v.sheet, v.r1, v.c1) ?? 0;
      const out: Matrix = [];
      for (let r = v.r1; r <= v.r2; r++) {
        const row: Scalar[] = [];
        for (let c = v.c1; c <= v.c2; c++) row.push(ctx.host.value(v.sheet, r, c));
        out.push(row);
      }
      return out;
    }
    return v;
  }

  #store(gk: number, result: EvalValue): void {
    const info = this.#formulas.get(gk)!;
    const sheet = info.sheet;
    const ck = cellKey(info.r, info.c);
    const ctx: Ctx = { host: this, sheet: sheet.id, r: info.r, c: info.c, env: null, depth: 0 };
    let value = this.materialize(result, ctx);
    if (Array.isArray(value) && value.length === 1 && value[0].length === 1) value = value[0][0];
    const old = sheet.spills.get(ck);
    if (Array.isArray(value)) {
      this.#spill(sheet, info.r, info.c, value, old);
      return;
    }
    if (old) this.#clearSpill(sheet, info.r, info.c, old);
    sheet.blocked.delete(ck);
    sheet.calc.set(ck, value);
  }

  #spill(sheet: Sheet, r: number, c: number, m: Matrix, old: { rows: number; cols: number } | undefined): void {
    const ck = cellKey(r, c);
    const rows = m.length;
    const cols = m[0].length;
    const rect = { r1: r, c1: c, r2: r + rows - 1, c2: c + cols - 1 };
    let blocked = rect.r2 >= sheet.rows || rect.c2 >= sheet.cols;
    for (let y = rect.r1; y <= rect.r2 && !blocked; y++) {
      for (let x = rect.c1; x <= rect.c2; x++) {
        if (y === r && x === c) continue;
        const k = cellKey(y, x);
        const cell = sheet.cells.get(k);
        const owner = sheet.spillOwner.get(k);
        if (cell?.v !== undefined || cell?.f !== undefined || (owner !== undefined && owner !== ck)) { blocked = true; break; }
      }
    }
    if (old) {
      const fresh = !blocked && old.rows === rows && old.cols === cols;
      if (!fresh) this.#clearSpill(sheet, r, c, old);
    }
    if (blocked) {
      sheet.blocked.set(ck, rect);
      sheet.calc.set(ck, ERR.SPILL);
      return;
    }
    sheet.blocked.delete(ck);
    sheet.spills.set(ck, { rows, cols });
    sheet.calc.set(ck, m[0][0] ?? 0);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (y === 0 && x === 0) continue;
        const k = cellKey(r + y, c + x);
        const v = m[y][x];
        const had = sheet.calc.get(k);
        sheet.spillOwner.set(k, ck);
        sheet.calc.set(k, v);
        if (had !== v) this.#spillSeeds.add(sheet.id * SHEET_FACTOR + k);
      }
    }
  }

  #clearSpill(sheet: Sheet, r: number, c: number, shape: { rows: number; cols: number }): void {
    const ck = cellKey(r, c);
    sheet.spills.delete(ck);
    for (let y = 0; y < shape.rows; y++) {
      for (let x = 0; x < shape.cols; x++) {
        if (y === 0 && x === 0) continue;
        const k = cellKey(r + y, c + x);
        if (sheet.spillOwner.get(k) !== ck) continue;
        sheet.spillOwner.delete(k);
        sheet.calc.delete(k);
        this.#spillSeeds.add(sheet.id * SHEET_FACTOR + k);
      }
    }
    for (const [anchor, rect] of sheet.blocked) {
      if (rect.r1 <= r + shape.rows - 1 && rect.r2 >= r && rect.c1 <= c + shape.cols - 1 && rect.c2 >= c) this.#spillSeeds.add(sheet.id * SHEET_FACTOR + anchor);
    }
  }

  /** Vacía grafo y resultados y vuelve a registrar todo. */
  rebuild(): void {
    this.#formulas.clear();
    this.#cellDeps.clear();
    this.#rangeDeps.clear();
    this.#buckets.clear();
    this.#bigRanges = [];
    this.#volatile.clear();
    for (const s of this.sheets) {
      s.calc.clear();
      s.spills.clear();
      s.spillOwner.clear();
      s.blocked.clear();
      for (const [k, cell] of s.cells) {
        if (cell.f === undefined) continue;
        this.#register(s, keyRow(k), keyCol(k), cell.f);
        this.#changed.add(s.id * SHEET_FACTOR + k);
      }
    }
    this.recalc();
  }

  #rewriteAll(fn: (formula: string, own: Sheet) => string): void {
    for (const s of this.sheets) {
      for (const [k, cell] of s.cells) {
        if (cell.f === undefined) continue;
        const f = fn(cell.f, s);
        if (f !== cell.f) s.cells.set(k, { ...cell, f });
      }
    }
    const own = this.sheets[0];
    for (const def of this.names.values()) {
      const ref = fn(def.ref, own);
      if (ref === def.ref) continue;
      def.ref = ref;
      try { def.ast = parseFormula(formulaBody(ref)); } catch { def.ast = null; }
    }
  }

  /** Inserta o borra filas o columnas: mueve celdas y reescribe fórmulas de todo el libro. */
  structural(sheet: Sheet, axis: 'row' | 'col', at: number, count: number, insert: boolean): void {
    const op: StructuralOp = { sheet: sheet.name, axis, at, count, insert };
    const moved = new Map<number, CellData>();
    for (const [k, cell] of sheet.cells) {
      const r = keyRow(k);
      const c = keyCol(k);
      const i = axis === 'row' ? r : c;
      let j = i;
      if (insert) { if (i >= at) j = i + count; } else {
        if (i >= at && i < at + count) continue;
        if (i >= at + count) j = i - count;
      }
      moved.set(axis === 'row' ? cellKey(j, c) : cellKey(r, j), cell);
    }
    sheet.cells = moved;
    if (axis === 'row') sheet.rows += insert ? count : -count;
    else sheet.cols += insert ? count : -count;
    this.#rewriteAll((f, own) => adjustFormula(f, own.name, op));
    this.rebuild();
  }

  /** Evalúa una fórmula suelta en el contexto de una celda, sin guardarla. */
  evalText(text: string, sheet: Sheet, r = 0, c = 0): Scalar | Matrix {
    let ast: Node;
    try { ast = parseFormula(formulaBody(text.trimStart().startsWith('=') ? text : `=${text}`)); } catch { return ERR.NAME; }
    const ctx: Ctx = { host: this, sheet: sheet.id, r, c, env: null, depth: 0 };
    return this.materialize(evaluate(ast, ctx), ctx);
  }

  /** Valores de un rango A1 de una hoja. */
  rangeValues(sheet: Sheet, range: string): Matrix {
    const x = parseRange(range, sheet.rows, sheet.cols);
    if (!x) return [];
    const out: Matrix = [];
    for (let r = x.r1; r <= x.r2; r++) {
      const row: Scalar[] = [];
      for (let c = x.c1; c <= x.c2; c++) row.push(this.getValue(sheet, r, c));
      out.push(row);
    }
    return out;
  }
}
