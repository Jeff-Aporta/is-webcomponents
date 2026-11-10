// @contexto INDICE.md · src/components/charts/bubble-chart.md
import './chart.js';
import { drawBubbleMarks } from './utils/marks-cartesian.js';

(() => {
  window.__isDefineTypedChart?.('iswc-bubble-chart', 'bubble', drawBubbleMarks);
})();
