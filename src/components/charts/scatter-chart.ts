import './chart.js';
import { drawScatterMarks } from './utils/marks-cartesian.js';

(() => {
  window.__isDefineTypedChart?.('iswc-scatter-chart', 'scatter', drawScatterMarks);
})();
