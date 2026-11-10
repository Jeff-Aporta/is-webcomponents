// @contexto INDICE.md · src/components/data/README.md
// xml.schemas.ts: contratos de tipos de xml.ts.
/** Nodo XML. El nombre conserva el prefijo solo si no es el espacio por defecto. */
export interface XNode { name: string; attrs: Record<string, string>; children: XNode[]; text: string }
