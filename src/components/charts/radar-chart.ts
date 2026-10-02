import './chart.js';
import { drawRadarMarks } from './marks-radial.js';

(() => {
  window.__isDefineTypedChart?.('iswc-radar-chart', 'radar', drawRadarMarks);
})();
