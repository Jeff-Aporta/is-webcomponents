// @contexto INDICE.md · src/components/charts/radar-chart.md
import './chart.js';
import { drawRadarMarks } from './utils/marks-radial.js';

(() => {
  window.__isDefineTypedChart?.('iswc-radar-chart', 'radar', drawRadarMarks);
})();
