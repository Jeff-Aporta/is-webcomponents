import './chart.js';
import { drawPolarAreaMarks } from './marks-radial.js';

(() => {
  window.__isDefineTypedChart?.('is-polar-area-chart', 'polarArea', drawPolarAreaMarks);
})();
