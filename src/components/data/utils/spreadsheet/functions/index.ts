// index.ts — carga todas las familias de funciones en el registro.
import './math.js';
import './stats.js';
import './logical.js';
import './text.js';
import './datetime.js';
import './lookup.js';
import './financial.js';
import './dynamic.js';
import './engineering.js';
import './aliases-es.js';

export { allFunctions, aliasOf, canonicalName, lookupFn, suggest } from './registry.js';
export type { FnDef } from './registry.js';
