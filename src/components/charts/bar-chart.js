import './chart.js';
import { drawBarMarks } from './marks-cartesian.js';
(() => {
  window.__isDefineTypedChart?.('is-bar-chart', 'bar', drawBarMarks);
})();
