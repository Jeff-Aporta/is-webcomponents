import './chart.js';
import { drawBubbleMarks } from './marks-cartesian.js';

(() => {
  window.__isDefineTypedChart?.('iswc-bubble-chart', 'bubble', drawBubbleMarks);
})();
