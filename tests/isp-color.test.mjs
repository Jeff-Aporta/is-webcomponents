// tests/isp-color.test.mjs
import {
  classifyColor,
  normalizeMix,
  resolveMixWith,
  SEMANTIC_COLORS,
} from '../src/components/_shared/isp-color.js';

const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };

check(SEMANTIC_COLORS.includes('brand'), 'brand semántico');
check(classifyColor('').kind === 'none', 'vacío → none');
check(classifyColor('BRAND').kind === 'semantic' && classifyColor('BRAND').value === 'brand', 'BRAND → brand');
check(classifyColor('current').kind === 'current', 'current');
check(classifyColor('Current').kind === 'current', 'Current');
check(classifyColor('#e8590c').kind === 'css' && classifyColor('#e8590c').value === '#e8590c', 'hex css');
check(classifyColor('tomato').kind === 'css', 'nombre CSS');
check(classifyColor('oklch(0.5 0.1 40)').kind === 'css', 'oklch');
check(normalizeMix(30) === '30%', 'mix número');
check(normalizeMix('40%') === '40%', 'mix %');
check(resolveMixWith('transparent') === 'transparent', 'mix-with transparent');
check(resolveMixWith('text')?.includes('--is-text'), 'mix-with text');
check(resolveMixWith('#abc') === '#abc', 'mix-with css');

if (failures.length) {
  console.error(`isp-color.test.mjs: FAIL — ${failures.length}`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('isp-color.test.mjs: PASS');
