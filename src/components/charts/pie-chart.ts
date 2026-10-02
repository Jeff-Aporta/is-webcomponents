import './chart.js';
import { drawPieMarks } from './marks-radial.js';

(() => {
  window.__isDefineTypedChart?.('iswc-pie-chart', 'pie', drawPieMarks);
})();
