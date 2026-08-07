import './chart.js';
import { drawWaterfallMarks } from './marks-waterfall.js';

(() => {
  window.__isDefineTypedChart?.('is-waterfall-chart', 'waterfall', drawWaterfallMarks);
})();
