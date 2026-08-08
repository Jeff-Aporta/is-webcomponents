// tests/component-sources.test.mjs
import { resolveSourceFiles, manifestToComponentsPath } from '../scripts/component-sources.js';

const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };

check(
  manifestToComponentsPath('../../components/actions/button.js') === 'components/actions/button.js',
  'manifestToComponentsPath debe normalizar ../../',
);

const files = resolveSourceFiles({
  tag: 'is-button',
  script: '../../components/actions/button.js',
  style: '../../components/actions/button.css',
});

check(files.js?.repoPath === 'src/components/actions/button.js', `js path: ${files.js?.repoPath}`);
check(files.css?.repoPath === 'src/components/actions/button.css', `css path: ${files.css?.repoPath}`);
check(files.md?.repoPath === 'src/components/actions/button.md', `md path: ${files.md?.repoPath}`);

const noStyle = resolveSourceFiles({
  tag: 'is-x',
  script: '../../components/isp/heading.js',
});
check(noStyle.css?.repoPath === 'src/components/isp/heading.css', 'css inferido desde script');
check(noStyle.md?.repoPath === 'src/components/isp/heading.md', 'md inferido desde script');

if (failures.length) {
  console.error(`component-sources.test.mjs: FAIL — ${failures.length}`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('component-sources.test.mjs: PASS');
