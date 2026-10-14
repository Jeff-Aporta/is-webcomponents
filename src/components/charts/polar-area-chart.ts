import './chart.js';
import { drawPolarAreaMarks } from './utils/marks-radial.js';

(() => {
  window.__isDefineTypedChart?.('iswc-polar-area-chart', 'polarArea', drawPolarAreaMarks);
})();
