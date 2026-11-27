// @vendor 2026-10-13T14:13:48.240Z Jeff-Aporta/is-webcomponents@main src/vendor-distributions/client/tools/hosts.ts
// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/cdn/loader.md
/**
 * Hosts iswc-* que montan un <svg> de diagrama en shadow DOM.
 * Misma lista que usa el ISS al exportar docs.
 *
 * Perfil: client. Vendor: `dist/cdn/vendor-distributions/client/tools/hosts.ts` → carpeta `ISU/` del consumidor (`tools/vendor.ts`, pin por fecha ISO). Sin imports relativos.
 * Skill: skills/iswc-diagramas-enriquecidos/SKILL.md
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/cdn/loader.md
 */
export const DIAGRAM_HOSTS = [
  'iswc-er-diagram',
  'iswc-sequence-diagram',
  'iswc-flowchart',
  'iswc-state-diagram',
  'iswc-class-diagram',
  'iswc-block-diagram',
  'iswc-component-diagram',
  'iswc-swimlane-diagram',
  'iswc-use-case-diagram',
  'iswc-timeline',
  'iswc-gantt',
  'iswc-sankey-diagram',
  'iswc-quadrant-chart',
  'iswc-venn-diagram',
  'iswc-mindmap',
  'iswc-org-chart',
  // Plugin de diagramas (iswd-): mismos hosts con su prefijo.
  'iswd-er-diagram',
  'iswd-sequence-diagram',
  'iswd-flowchart',
  'iswd-state-diagram',
  'iswd-class-diagram',
  'iswd-block-diagram',
  'iswd-component-diagram',
  'iswd-swimlane-diagram',
  'iswd-use-case-diagram',
  'iswd-timeline',
  'iswd-gantt',
  'iswd-sankey-diagram',
  'iswd-quadrant-chart',
  'iswd-venn-diagram',
  'iswd-mindmap',
  'iswd-org-chart',
] as const;

/** Expresión JS evaluable en página: primer SVG útil del kit. */
export function probeSvgExpression(hosts: readonly string[] = DIAGRAM_HOSTS): string {
  return `(() => {
  const hosts = document.querySelectorAll(${JSON.stringify(hosts.join(', '))});
  const vale = (s) => {
    if (!s) return false;
    const r = s.getBoundingClientRect();
    return r.width > 10 && r.height > 10;
  };
  for (const h of hosts) {
    if (h.shadowRoot) {
      const s = h.shadowRoot.querySelector('svg');
      if (vale(s)) return s;
    }
    const s = h.querySelector('svg');
    if (vale(s)) return s;
  }
  for (const s of document.querySelectorAll('svg')) if (vale(s)) return s;
  // Plugins de otras apps: cualquier host con shadow root que pinte un <svg>.
  for (const h of document.querySelectorAll('*')) {
    const s = h.shadowRoot && h.shadowRoot.querySelector('svg');
    if (vale(s)) return s;
  }
  return null;
})()`;
}
