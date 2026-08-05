/** Movido a `_shared/path-turtle.js` (lo comparten charts y diagramas).
 *  Se conserva este módulo como alias para no romper imports existentes. */
export { PathTurtle, SequenceTurtle, TURTLE_AUTO_GAP, TURTLE_AUTO_GAP as SEQUENCE_TURTLE_AUTO_GAP }
  from '../_shared/path-turtle.js';
