import './chart.js';
import { drawLineMarks } from './marks-cartesian.js';
(() => {
  window.__isDefineTypedChart?.('is-line-chart', 'line', drawLineMarks);
})();
