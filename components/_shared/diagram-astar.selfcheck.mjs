import { makeCostGrid, blockRect } from './diagram-grid.js';
import { routeSequenceHorizontal, routeSequenceSelf } from './diagram-astar.js';

const g = makeCostGrid(400, 200);
blockRect(g, 150, 50, 100, 100);

const h = routeSequenceHorizontal(50, 350, 100, g);
assert(h.path.length > 0 && h.path.startsWith('M'), 'horizontal path invalid');
assert(typeof h.arrowTipX === 'number' && Number.isFinite(h.arrowTipX), 'horizontal arrowTipX invalid');

const s = routeSequenceSelf(100, 100, g);
assert(s.path.length > 0 && s.path.startsWith('M'), 'self path invalid');
assert(typeof s.arrowTipX === 'number' && Number.isFinite(s.arrowTipX), 'self arrowTipX invalid');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

console.log('diagram-astar self-check: PASS');
