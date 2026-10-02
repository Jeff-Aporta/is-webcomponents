import './chart.js';
import { drawDoughnutMarks } from './marks-radial.js';

(() => {
  window.__isDefineTypedChart?.('iswc-doughnut-chart', 'doughnut', drawDoughnutMarks);
})();
