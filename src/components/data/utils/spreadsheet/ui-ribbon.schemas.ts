// ribbon.schemas.ts: contratos de tipos de ribbon.ts.

/** Elemento de la cinta. */
export interface RibbonItem {
  cmd: string; label: string; icon?: string; kind?: 'button' | 'toggle' | 'menu' | 'select' | 'color'; big?: boolean;
  options?: { value: string; label: string }[]; menu?: MenuItem[]; key?: string;
}

/** Entrada de menú. Sin cmd es un separador. */
export interface MenuItem { cmd?: string; label?: string; icon?: string; arg?: string; key?: string; disabled?: boolean }

/** Grupo de la cinta. */
interface RibbonGroup { label: string; items: RibbonItem[] }

/** Pestaña de la cinta. */
export interface RibbonTab { id: string; label: string; groups: RibbonGroup[] }
