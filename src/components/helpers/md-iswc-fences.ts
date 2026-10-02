/**
 * Fences MD ` ```iswc-<nombre> ` → tag iswc-* (diagramas en solo lectura).
 * Acepta kind corto (flowchart) o el nombre del tag (er-diagram).
 */

const KIND_TO_TAG: Record<string, string> = {
  flowchart: 'iswc-flowchart',
  sequence: 'iswc-sequence-diagram',
  'sequence-diagram': 'iswc-sequence-diagram',
  class: 'iswc-class-diagram',
  'class-diagram': 'iswc-class-diagram',
  state: 'iswc-state-diagram',
  'state-diagram': 'iswc-state-diagram',
  er: 'iswc-er-diagram',
  'er-diagram': 'iswc-er-diagram',
  block: 'iswc-block-diagram',
  'block-diagram': 'iswc-block-diagram',
  component: 'iswc-component-diagram',
  'component-diagram': 'iswc-component-diagram',
  mindmap: 'iswc-mindmap',
  gantt: 'iswc-gantt',
  timeline: 'iswc-timeline',
  'org-chart': 'iswc-org-chart',
  org: 'iswc-org-chart',
  sankey: 'iswc-sankey-diagram',
  'sankey-diagram': 'iswc-sankey-diagram',
  quadrant: 'iswc-quadrant-chart',
  'quadrant-chart': 'iswc-quadrant-chart',
  venn: 'iswc-venn-diagram',
  'venn-diagram': 'iswc-venn-diagram',
  usecase: 'iswc-use-case-diagram',
  'use-case': 'iswc-use-case-diagram',
  'use-case-diagram': 'iswc-use-case-diagram',
  swimlane: 'iswc-swimlane-diagram',
  'swimlane-diagram': 'iswc-swimlane-diagram',
  journey: 'iswc-journey-map',
  'journey-map': 'iswc-journey-map',
};

/** Lang del fence → tag iswc-*, o null si no es fence iswc. */
export function resolveIswcFenceTag(lang: string | null | undefined): string | null {
  const raw = String(lang ?? '').trim().toLowerCase();
  if (!raw) return null;
  let name = raw;
  if (name.startsWith('iswc-')) name = name.slice(5);
  else return null;
  if (!name) return null;
  if (KIND_TO_TAG[name]) return KIND_TO_TAG[name];
  if (/^[a-z][\w-]*$/.test(name)) return `iswc-${name}`;
  return null;
}

/** Evita romper el cierre del script con el JSON. */
export function escapeJsonForScript(text: string): string {
  return String(text ?? '').replace(/<\/(script)/gi, '<\\/$1');
}
