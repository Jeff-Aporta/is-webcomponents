import './chart.js';
import { drawFunnelMarks } from './utils/marks-funnel.js';

(() => {
  window.__isDefineTypedChart?.('iswc-funnel-chart', 'funnel', drawFunnelMarks);
})();
