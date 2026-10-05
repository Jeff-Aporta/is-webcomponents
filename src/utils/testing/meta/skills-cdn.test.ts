/**
 * skills-cdn.test.ts — skills de agentes publicadas en dist/cdn/skills/.
 *
 *   deno test -A --no-check tests/skills-cdn.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

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

test('iswc-cdn-snippet pinta Skill simple (enlaces + ver), sin visor MD', async () => {
  const src = await readFile(join(raiz, 'src/components/feedback/cdn-snippet.ts'), 'utf8');
  assert.match(src, /SKILL_DOCS/);
  assert.match(src, /#renderSkills|renderSkills/);
  assert.match(src, /data-ver-md|mdi:eye-outline/);
  assert.doesNotMatch(src, /iswc-md-editor|data-slot="llm-prompt"/);
  const prompt = await readFile(join(raiz, 'src/components/_shared/llm-agent-prompt.ts'), 'utf8');
  const skillDocs = prompt.match(/export const SKILL_DOCS[\s\S]*?\];/)?.[0] || '';
  assert.match(skillDocs, /skills\/is-webcomponents\/SKILL\.md/);
  assert.equal((skillDocs.match(/label:\s*'/g) || []).length, 1, 'SKILL_DOCS debe tener un solo enlace general');
  assert.doesNotMatch(skillDocs, /is-cdn-install|PROMPT\.md|tools\//);
});

test('cdn-panel solo aporta el MD del módulo (skill general vive en SKILL_DOCS)', async () => {
  const src = await readFile(join(raiz, 'scripts/cdn-panel.js'), 'utf8');
  assert.match(src, /label:\s*'Módulo'/);
  assert.doesNotMatch(src, /is-cdn-install|Índice global|specs\/componentes/);
});
