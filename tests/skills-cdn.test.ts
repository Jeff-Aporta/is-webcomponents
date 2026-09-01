/**
 * skills-cdn.test.ts — skills de agentes publicadas en dist/cdn/skills/.
 *
 *   node --test tests/skills-cdn.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

test('existe skill is-cdn-install en fuente', async () => {
  const skill = join(raiz, 'src/skills/is-cdn-install/SKILL.md');
  await access(skill);
  const src = await readFile(skill, 'utf8');
  assert.match(src, /^name:\s*is-cdn-install/m);
  assert.match(src, /sin npm ni npx/i);
  assert.match(src, /is-base\.min\.css/);
  assert.match(src, /Boot con fallback|MIRRORS/);
  assert.match(src, /dist\/cdn\/skills\/is-cdn-install/);
});

test('build.mjs copia src/skills → dist/cdn/skills', async () => {
  const build = await readFile(join(raiz, 'scripts/build.mjs'), 'utf8');
  assert.match(build, /src['"], ['"]skills|skillsSrc|dist\/cdn\/skills|skillsOut/);
  assert.match(build, /is-cdn-install/);
});

test('is-cdn-snippet compacta skills + docs en un solo prompt', async () => {
  const src = await readFile(join(raiz, 'src/components/feedback/cdn-snippet.ts'), 'utf8');
  assert.match(src, /SKILL_DOCS/);
  assert.match(src, /buildLlmPrompt/);
  // El armado del prompt vive en `_shared/llm-agent-prompt.ts`: cdn-snippet lo
  // consume, no lo reimplementa.
  const prompt = await readFile(join(raiz, 'src/components/_shared/llm-agent-prompt.ts'), 'utf8');
  assert.match(prompt, /## Referencias de este componente/);
  assert.match(prompt, /skills\/is-cdn-install\/SKILL\.md/);
  assert.doesNotMatch(src, /cdn__docs-list|#renderDocs/);
});

test('cdn-panel incluye skill en llmDocs', async () => {
  const src = await readFile(join(raiz, 'scripts/cdn-panel.js'), 'utf8');
  assert.match(src, /skills\/is-cdn-install\/SKILL\.md/);
});
