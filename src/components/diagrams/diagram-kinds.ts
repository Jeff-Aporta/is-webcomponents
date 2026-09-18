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

const REGISTRY = new Map<string, string>();

/** Asocia el `kind` de un diagrama (cadena, se normaliza a minúsculas) al
 *  nombre del web component que sabe pintarlo. Si ya existía, se reemplaza. */
export function registerDiagramKind(kind: string, tagName: string): void {
  REGISTRY.set(String(kind).toLowerCase(), tagName);
}

/** Devuelve el tag del web component registrado para un `kind`, o `undefined`
 *  si no hay soporte. Acepta `string | null | undefined`. */
export function getDiagramTag(kind: string | null | undefined): string | undefined {
  return REGISTRY.get(String(kind ?? '').toLowerCase());
}

/** Lista de todos los `kind` registrados (en minúsculas, orden de inserción). */
export function listDiagramKinds(): string[] {
  return [...REGISTRY.keys()];
}

if (typeof window !== 'undefined') {
  (window as unknown as { __isDiagramKinds: unknown }).__isDiagramKinds = {
    registerDiagramKind, getDiagramTag, listDiagramKinds,
  };
}
