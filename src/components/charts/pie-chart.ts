// @contexto INDICE.md · src/components/charts/pie-chart.md
import './chart.js';
import { drawPieMarks } from './utils/marks-radial.js';

(() => {
  window.__isDefineTypedChart?.('iswc-pie-chart', 'pie', drawPieMarks);
})();
