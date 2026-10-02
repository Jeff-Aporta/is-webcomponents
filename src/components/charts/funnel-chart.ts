import './chart.js';
import { drawFunnelMarks } from './marks-funnel.js';

(() => {
  window.__isDefineTypedChart?.('iswc-funnel-chart', 'funnel', drawFunnelMarks);
})();
