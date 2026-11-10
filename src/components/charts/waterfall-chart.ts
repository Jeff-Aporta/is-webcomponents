// @contexto INDICE.md · src/components/charts/waterfall-chart.md
import './chart.js';
import { drawWaterfallMarks } from './utils/marks-waterfall.js';

(() => {
  window.__isDefineTypedChart?.('iswc-waterfall-chart', 'waterfall', drawWaterfallMarks);
})();
