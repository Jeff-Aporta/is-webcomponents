import './chart.js';
import { drawScatterMarks } from './marks-cartesian.js';
(() => {
  window.__isDefineTypedChart?.('is-scatter-chart', 'scatter', drawScatterMarks);
})();
