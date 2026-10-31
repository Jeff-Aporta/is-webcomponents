/** Tipos de index.ts. */

import type { ParamsTema } from '../schemas.js';

export type ModoColor = 'light' | 'dark';

export type Tema = { nombre: string; params: ParamsTema; light: ParamsTema; dark: ParamsTema; withParams: (params: ParamsTema, modo?: ModoColor) => Tema };
