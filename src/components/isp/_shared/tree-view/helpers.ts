/**
 * Stubs de ispgen / ispsveltecomponents para el port vanilla del TreeView.
 * El adapter original habla con TObject y resolveColor; aquí se cubre lo
 * mínimo para que la lógica corra sin esas libs.
 */

export class TObject {
  f: Record<string, unknown>;
  constructor() {
    this.f = {};
  }
  clone(): TObject {
    const o = new TObject();
    Object.assign(o, structuredClone({ ...this }));
    return o;
  }
  toJSON(): Record<string, unknown> {
    const j = { ...this } as Record<string, unknown>;
    delete j.f;
    return j;
  }
  loadFromJSON(j: Record<string, unknown>): this {
    Object.assign(this, j);
    return this;
  }
}

export function capitalizar(s: string): string {
  const t = String(s ?? '').trim();
  if (!t) return '';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const COLOR_VARS: Record<string, string> = {
  border: '--is-border',
  bg: '--is-bg',
  color: '--is-text',
  text: '--is-text',
  primary: '--is-accent',
  brand: '--is-accent',
  success: '--is-color-success',
  danger: '--is-color-danger',
  warning: '--is-color-warning',
  info: '--is-color-info',
  error: '--is-color-danger',
  neutral: '--is-text-muted',
};

export function resolveColor(color: string): string {
  if (!color) return '';
  const s = String(color);
  if (/^(#|rgb|hsl|oklch|var\()/i.test(s)) return s;
  return `var(${COLOR_VARS[s] || `--is-color-${s}`})`;
}
