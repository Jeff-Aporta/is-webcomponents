import './chart.js';
import { drawDoughnutMarks } from './marks-radial.js';
(() => {
  window.__isDefineTypedChart?.('is-doughnut-chart', 'doughnut', drawDoughnutMarks);
})();
