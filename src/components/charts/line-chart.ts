import './chart.js';
import { drawLineMarks } from './marks-cartesian.js';

(() => {
  window.__isDefineTypedChart?.('iswc-line-chart', 'line', drawLineMarks);
})();
