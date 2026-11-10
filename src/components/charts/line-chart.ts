// @contexto INDICE.md · src/components/charts/line-chart.md
import './chart.js';
import { drawLineMarks } from './utils/marks-cartesian.js';

(() => {
  window.__isDefineTypedChart?.('iswc-line-chart', 'line', drawLineMarks);
})();
