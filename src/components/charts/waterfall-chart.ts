import './chart.js';
import { drawWaterfallMarks } from './marks-waterfall.js';

(() => {
  window.__isDefineTypedChart?.('iswc-waterfall-chart', 'waterfall', drawWaterfallMarks);
})();
