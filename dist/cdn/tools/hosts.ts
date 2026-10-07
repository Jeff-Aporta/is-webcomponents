/**
 * Hosts iswc-* que montan un <svg> de diagrama en shadow DOM.
 * Misma lista que usa el ISS al exportar docs.
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
  return null;
})()`;
}
