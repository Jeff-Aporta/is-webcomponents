import './chart.js';
import { drawPieMarks } from './marks-radial.js';
(() => {
  window.__isDefineTypedChart?.('is-pie-chart', 'pie', drawPieMarks);
})();
