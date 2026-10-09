/**
 * componentes.schemas.ts — forma de las `props` de cada componente y tipos auxiliares de la base.
 *
 * Regla: los tipos salen de `z.infer<>`; no hay `type`/`interface` sueltos fuera de `*.schemas.ts`.
 * Datos que vienen de fuera (API, URL, almacenamiento) se PARSEAN con su schema (`safeParse`),
 * nunca se castean con `as`.
 */
import { z } from '../../base/zod.js';

/** `<__PREFIJO__-app>`: el shell. Recibe la vista activa. */
export const __CLASE__AppPropsSchema = z.object({
  vista: z.string().default('hola'),
});
export type __CLASE__AppProps = z.infer<typeof __CLASE__AppPropsSchema>;

/** `<__PREFIJO__-hola>`: pantalla de bienvenida. `modal` abre/cierra el modal. */
export const __CLASE__HolaPropsSchema = z.object({
  modal: z.boolean().default(false),
});
export type __CLASE__HolaProps = z.infer<typeof __CLASE__HolaPropsSchema>;

/** Tarjeta de la portada (dominio de la vista `hola`). */
export const CaracteristicaSchema = z.object({ icono: z.string(), titulo: z.string().min(1), texto: z.string().min(1) });
export type Caracteristica = z.infer<typeof CaracteristicaSchema>;

/** Comando para empezar, con su propósito. */
export const PasoInicioSchema = z.object({ comando: z.string().min(1), para: z.string().min(1) });
export type PasoInicio = z.infer<typeof PasoInicioSchema>;

/** Base (`componente.ts`): atributos e hijos del helper `el()`. */
export type Atributos = Record<string, unknown>;
export type Hijos = Array<Node | string | null | undefined> | Node | string | null | undefined;
