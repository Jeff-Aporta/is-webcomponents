/** Tipos de alturas.ts. */

import type { crearAlturas } from './alturas.js';

export type VentanaFilas = { inicio: number; fin: number; total: number; };

export type Alturas = ReturnType<typeof crearAlturas>;
