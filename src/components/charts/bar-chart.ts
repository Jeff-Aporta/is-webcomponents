import './chart.js';
import { drawBarMarks } from './marks-cartesian.js';

(() => {
  window.__isDefineTypedChart?.('iswc-bar-chart', 'bar', drawBarMarks);
})();
