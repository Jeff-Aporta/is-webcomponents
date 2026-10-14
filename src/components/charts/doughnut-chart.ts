import './chart.js';
import { drawDoughnutMarks } from './utils/marks-radial.js';

(() => {
  window.__isDefineTypedChart?.('iswc-doughnut-chart', 'doughnut', drawDoughnutMarks);
})();
