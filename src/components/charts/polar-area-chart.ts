import './chart.js';
import { drawPolarAreaMarks } from './marks-radial.js';

(() => {
  window.__isDefineTypedChart?.('iswc-polar-area-chart', 'polarArea', drawPolarAreaMarks);
})();
