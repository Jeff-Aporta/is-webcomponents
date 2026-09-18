/**
 * Prompt canónico para agentes + helpers de ensamblaje.
 * Fuente de verdad en prosa: `src/skills/is-webcomponents/PROMPT.md`
 * (se copia a `dist/cdn/skills/` en el build).
 */

/** Doc individual de skill/prompt referenciada por el prompt canónico. */
export type SkillDoc = { label: string; url: string };

/** Docs fijas del kit (preferir GitHub; raw solo lectura text/plain). */
export const SKILL_DOCS: readonly SkillDoc[] = [
  {
    label: 'Skill · instalación CDN',
    url: 'https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/skills/is-cdn-install/SKILL.md',
  },
  {
    label: 'Skill · kit (reuso is-*)',
    url: 'https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/skills/is-webcomponents/SKILL.md',
  },
  {
    label: 'Prompt · instrucciones LLM',
    url: 'https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/skills/is-webcomponents/PROMPT.md',
  },
  {
    label: 'Tools · build / migrate / local',
    url: 'https://github.com/Jeff-Aporta/is-webcomponents/tree/main/src/skills/is-webcomponents/tools',
  },
  {
    label: 'Skill CDN · is-cdn-install (jsDelivr)',
    url: 'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/cdn/skills/is-cdn-install/SKILL.md',
  },
];

/** Fallback corto si no se puede fetch de PROMPT.md. */
export const LLM_PROMPT_FALLBACK: string = [
  '# IS Web Components (Instrucciones para LLM)',
  '',
  'Utiliza **IS Web Components** exclusivamente mediante **CDN** (o `/is-webcomponents:local`).',
  'Nunca npm, npx, Bun, pnpm, Yarn, Vite, Webpack ni gestores de paquetes del kit.',
  'Reutiliza tags `is-*`. No inventes API. Lee skills + LLM.md de categoría + MD del módulo.',
  'Herramientas: `/is-webcomponents:build` · `/is-webcomponents:migrate` · `/is-webcomponents:local`.',
  'Iconos: `<is-icon icon="mdi:…">`. Tema: `data-theme` / `data-palette`.',
].join('\n');

let cachedPromptMd: string | null = null;
let loadPromise: Promise<string> | null = null;

export type PromptMdOpts = { importMetaUrl?: string };

/**
 * Resuelve URLs candidatas de PROMPT.md (src gallery + dist CDN).
 */
export function promptMdCandidates(importMetaUrl: string = import.meta.url): string[] {
  const list = [
    // src/components/_shared → src/skills/...
    new URL('../../skills/is-webcomponents/PROMPT.md', importMetaUrl).href,
    // dist/cdn/feedback/*.min.js → dist/cdn/skills/...
    new URL('../skills/is-webcomponents/PROMPT.md', importMetaUrl).href,
    // dist/cdn/all.min.js → dist/cdn/skills/...
    new URL('./skills/is-webcomponents/PROMPT.md', importMetaUrl).href,
  ];
  const loc = globalThis as { location?: { origin?: string } };
  const origin = loc.location?.origin;
  if (typeof origin === 'string') {
    list.push(`${origin}/src/skills/is-webcomponents/PROMPT.md`);
    list.push(`${origin}/dist/cdn/skills/is-webcomponents/PROMPT.md`);
  }
  return list;
}

export type LoadAgentPromptOpts = { importMetaUrl?: string; force?: boolean };

/**
 * Carga y cachea el PROMPT.md canónico.
 */
export async function loadAgentPromptMd(opts: LoadAgentPromptOpts = {}): Promise<string> {
  if (cachedPromptMd && !opts.force) return cachedPromptMd;
  if (loadPromise && !opts.force) return loadPromise;

  loadPromise = (async () => {
    const urls = promptMdCandidates(opts.importMetaUrl || import.meta.url);
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) continue;
        const text = await res.text();
        if (text && text.length > 80) {
          cachedPromptMd = text;
          return cachedPromptMd;
        }
      } catch { /* siguiente candidato */ }
    }
    cachedPromptMd = LLM_PROMPT_FALLBACK;
    return cachedPromptMd;
  })();

  try {
    return await loadPromise;
  } finally {
    loadPromise = null;
  }
}

export type BuildLlmPromptOpts = { sha?: string; base?: string };

/**
 * Ensambla el prompt copiable: PROMPT.md + SHA + docs del módulo.
 */
export function buildLlmPrompt(docs: readonly SkillDoc[], opts: BuildLlmPromptOpts = {}): string {
  const sha = opts.sha || 'main';
  let base = opts.base || cachedPromptMd || LLM_PROMPT_FALLBACK;
  base = base.replaceAll('{{SHA}}', sha);

  const lines = [base.trimEnd(), '', '## Referencias de este componente', ''];
  for (const d of docs || []) {
    if (!d?.url) continue;
    lines.push(`- ${d.label || 'Documentación'}: ${d.url}`);
  }
  return lines.join('\n');
}
