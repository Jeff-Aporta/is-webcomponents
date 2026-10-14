import './chart.js';
import { drawBarMarks } from './utils/marks-cartesian.js';

(() => {
  window.__isDefineTypedChart?.('iswc-bar-chart', 'bar', drawBarMarks);
})();
