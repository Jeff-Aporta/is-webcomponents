/**
 * Registro de tipos de diagrama: `kind` (string del JSON) → tag del web component.
 *
 * Es la pieza que permite migrar más diagramas Mermaid sin tocar el visor: cada
 * componente nuevo se auto-registra al importarse y el lightbox ya sabe montarlo.
 *
 *   registerDiagramKind('flow', 'is-flow-diagram');
 *
 * El componente registrado debe aceptar la propiedad `payload` y el atributo
 * `color="viewer"`.
 */

const REGISTRY = new Map();

/** @param {string} kind @param {string} tagName */
export function registerDiagramKind(kind: string, tagName: string) {
  REGISTRY.set(String(kind).toLowerCase(), tagName);
}

/** Tag registrado para un `kind`, o undefined si no hay soporte. */
export function getDiagramTag(kind) {
  return REGISTRY.get(String(kind ?? '').toLowerCase());
}

export function listDiagramKinds() {
  return [...REGISTRY.keys()];
}

if (typeof window !== 'undefined') {
  window.__isDiagramKinds = { registerDiagramKind, getDiagramTag, listDiagramKinds };
}
