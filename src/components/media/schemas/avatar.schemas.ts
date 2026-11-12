// @contexto INDICE.md · src/components/media/README.md
/**
 * avatar.schemas.ts — tipos de `<iswc-avatar>`.
 */

/** Formas admitidas por el recorte del avatar. */
export type AvatarShape = 'circle' | 'square' | 'rounded';

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type AvatarEventos = { 'iswc-error': undefined };
