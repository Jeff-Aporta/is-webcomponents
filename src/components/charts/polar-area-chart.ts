// @contexto INDICE.md · src/components/charts/polar-area-chart.md
import './chart.js';
import { drawPolarAreaMarks } from './utils/marks-radial.js';

(() => {
  window.__isDefineTypedChart?.('iswc-polar-area-chart', 'polarArea', drawPolarAreaMarks);
})();
