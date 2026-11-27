// @contexto INDICE.md · src/components/helpers/README.md
/**
 * Fences MD ` ```iswc-<nombre> ` → tag iswc-* (diagramas en solo lectura).
 * Acepta kind corto (flowchart) o el nombre del tag (er-diagram).
 */

const KIND_TO_TAG: Record<string, string> = {
  flowchart: 'iswd-flowchart',
  sequence: 'iswd-sequence-diagram',
  'sequence-diagram': 'iswd-sequence-diagram',
  class: 'iswd-class-diagram',
  'class-diagram': 'iswd-class-diagram',
  state: 'iswd-state-diagram',
  'state-diagram': 'iswd-state-diagram',
  er: 'iswd-er-diagram',
  'er-diagram': 'iswd-er-diagram',
  block: 'iswd-block-diagram',
  'block-diagram': 'iswd-block-diagram',
  component: 'iswd-component-diagram',
  'component-diagram': 'iswd-component-diagram',
  mindmap: 'iswd-mindmap',
  gantt: 'iswd-gantt',
  timeline: 'iswd-timeline',
  'org-chart': 'iswd-org-chart',
  org: 'iswd-org-chart',
  sankey: 'iswd-sankey-diagram',
  'sankey-diagram': 'iswd-sankey-diagram',
  quadrant: 'iswd-quadrant-chart',
  'quadrant-chart': 'iswd-quadrant-chart',
  venn: 'iswd-venn-diagram',
  'venn-diagram': 'iswd-venn-diagram',
  usecase: 'iswd-use-case-diagram',
  'use-case': 'iswd-use-case-diagram',
  'use-case-diagram': 'iswd-use-case-diagram',
  swimlane: 'iswd-swimlane-diagram',
  'swimlane-diagram': 'iswd-swimlane-diagram',
  journey: 'iswd-journey-map',
  'journey-map': 'iswd-journey-map',
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
