import './chart.js';
import { drawBubbleMarks } from './marks-cartesian.js';
(() => {
  window.__isDefineTypedChart?.('is-bubble-chart', 'bubble', drawBubbleMarks);
})();
