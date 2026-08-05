import './chart.js';
import { drawRadarMarks } from './marks-radial.js';
(() => {
  window.__isDefineTypedChart?.('is-radar-chart', 'radar', drawRadarMarks);
})();
