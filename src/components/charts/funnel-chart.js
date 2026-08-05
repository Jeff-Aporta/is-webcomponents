import './chart.js';
import { drawFunnelMarks } from './marks-funnel.js';
(() => {
  window.__isDefineTypedChart?.('is-funnel-chart', 'funnel', drawFunnelMarks);
})();
