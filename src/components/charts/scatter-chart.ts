import './chart.js';
import { drawScatterMarks } from './marks-cartesian.js';

(() => {
  window.__isDefineTypedChart?.('iswc-scatter-chart', 'scatter', drawScatterMarks);
})();
