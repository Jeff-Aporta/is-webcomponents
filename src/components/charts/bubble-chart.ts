import './chart.js';
import { drawBubbleMarks } from './utils/marks-cartesian.js';

(() => {
  window.__isDefineTypedChart?.('iswc-bubble-chart', 'bubble', drawBubbleMarks);
})();
