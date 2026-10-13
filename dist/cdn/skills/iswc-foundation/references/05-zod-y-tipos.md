<!-- @vendor 2026-10-13T21:34:50.004Z Jeff-Aporta/is-webcomponents@main dist/cdn/skills/iswc-foundation/references/05-zod-y-tipos.md -->
# 05 — Zod y tipos

- `src/js/base/zod.ts` es el **único** módulo que importa `zod`; el build lo empaqueta. Los schemas
  importan `z` de ahí.
- **Todos los tipos** salen de `z.infer<>` en `src/js/consts/schemas/*.schemas.ts` (uno por área:
  `componentes`, `demo`, `loader`, y los del dominio de la app). Fuera de `*.schemas.ts` no hay
  `type`/`interface` top-level.
- **Datos externos** (API, URL `?s=`, `localStorage`, JSON de demos, payloads de un backend): se
  **parsean** con su schema (`parse`/`safeParse`), nunca `as`. Lo inválido se avisa (consola/UI) y se
  descarta o bloquea según la regla de su spec.
- **Props de componentes**: schema por componente en `componentes.schemas.ts` +
  `registrarClaves('<tag>', Schema)` en `props-registro.ts`. Todo setter de `props` pasa por
  `revisarProps`: una clave desconocida avisa `[<tag>] prop no identificada: "<k>"` (no lanza).
  `instalarVigilanciaAtributos('<p>')` avisa atributos fuera de `observedAttributes`, `data-*`, `aria-*`.
- **Contratos del kit**: `@iswc/component-schemas` (forma completa de `iswc-preview/v1`) y
  `@iswc/loader-schemas` (API del loader), importados por SHA en `deno.json`; los guardianes validan
  contra ellos.
- Sin `any` ni `as any`. Typecheck estricto (`deno task check`).
- **Sin re-exports ni barriles** (regla InSoft): se importa SIEMPRE del archivo de origen. Los tipos de las tools del kit
  vienen de `schemas.ts` (no de `pruebas.ts`, `jueces.ts`…), `z` de `zod`, y nada de `export * from`, `export {…} from`
  ni alias `export const X = importado`. En el kit lo vigila `meta/no-reexports.test.ts` (única excepción: `lib/zod.ts`,
  la copia única de Zod que publica el CDN).
