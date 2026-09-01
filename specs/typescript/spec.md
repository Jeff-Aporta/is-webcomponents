# Spec — TypeScript

Todo el fuente del kit es TypeScript en modo estricto. Esta spec fija las
decisiones que se repiten en cada fichero, para que no haya que volver a
tomarlas componente a componente.

Guardianes: [`tests/src-layout.test.ts`](../../tests/src-layout.test.ts) ·
[`tests/attr-enums.test.ts`](../../tests/attr-enums.test.ts) ·
[`tests/helpers-homogeneity.test.ts`](../../tests/helpers-homogeneity.test.ts)

## Contexto

Hasta el 31-ago-2026 el kit era ESM vanilla con JSDoc. La migración pasó los
388 ficheros de `src/` a `.ts`, más los 120 `.mjs` de `tests/` y `scripts/`.
No hay paso de compilación para desarrollar ni para probar: Node 22 borra los
tipos al cargar y esbuild los borra al construir. TypeScript aquí es una
herramienta de revisión, no de build.

## S-TS1 Extensión en disco

- `src/`, `tests/` y `scripts/` son **`.ts`**. No quedan `.js` ni `.mjs`
  salvo `scripts/build.mjs` y `scripts/serve.mjs`.
- `dist/cdn/` publica **solo `.js` minificado**, uno por componente. El `.ts`
  nunca se publica; lo único que viaja como fuente es `core/`.

## S-TS2 Extensión en los `import`

Los especificadores llevan **`.js`, siempre**, aunque en disco el fichero sea
`.ts`:

```ts
import { adoptCss } from '../../core/element.js';   // el fichero es element.ts
```

Es lo que exige `allowImportingTsExtensions: false`, y es la convención de
TypeScript para ESM: el especificador nombra lo que se ejecuta, no lo que se
edita. La traducción `.js` → `.ts` ocurre en **tres sitios y solo tres**:

| Entorno | Quién traduce |
|---|---|
| Node (tests, selfchecks, scripts) | `scripts/ts-resolve-hook.ts` |
| Navegador en desarrollo | `scripts/serve.mjs` (transpila al vuelo) |
| Build | esbuild |

Esto vale también para los datos que se importan en runtime —
`previews/catalog.ts`, `_shell.html`— y para las URL de `dist/cdn/`, que
apuntan a artefactos publicados y por tanto son `.js` de verdad.

## S-TS3 `strict: true`, sin excepciones

No se relaja el modo estricto ni por fichero ni por directorio, y no se usa
`@ts-ignore`, `@ts-expect-error` ni `any` para cerrar un error. Si el tipo
cuesta, el tipo cuesta: casi siempre significa que el dato de origen no estaba
tipado y hay que tiparlo ahí, no en el punto donde molesta.

`unknown` sí es una respuesta válida cuando el valor viene de fuera (atributos,
JSON, `postMessage`): obliga a estrechar antes de usarlo, que es justo lo que
se quiere.

## S-TS4 Campos privados que apuntan al shadow propio

Se declaran **no nulos**, y la afirmación se hace una sola vez, en el origen:

```ts
#labelEl!: HTMLElement;

constructor() {
  …
  this.#labelEl = shadow.getElementById('label')!;
}
```

`getElementById` devuelve `HTMLElement | null`, pero el elemento sale de la
plantilla que el propio componente acaba de clonar en su shadow root: si
faltara, el componente estaría roto de raíz. Sembrar `?.` en los cuarenta usos
posteriores mentiría cuarenta veces sobre el mismo hecho y escondería el fallo
lejos de su causa.

La regla **no** aplica cuando el elemento viene del documento del usuario
(`document.querySelector`, un slot que puede estar vacío, un argumento): ahí el
`null` es real y se trata como tal.

Automatizado en `scripts/ts-campos-dom.ts`.

## S-TS5 Listas de valores válidos

El vocabulario cerrado se declara una vez y el tipo se deriva de él, para que
no puedan separarse:

```ts
export const INTENT = ['info', 'success', 'warning', 'danger'] as const;
export type Intent = (typeof INTENT)[number];
```

Para estrechar un `string | null` contra una de esas listas se usa el guardia
compartido en vez de un `as`:

```ts
const esUno = <L extends readonly string[]>(lista: L, v: string | null | undefined): v is L[number] =>
  v != null && (lista as readonly string[]).includes(v);
```

## S-TS6 Componentes hermanos

Un componente **nunca importa la clase de otro** para tiparlo: la mayoría de
esas parejas se usan mutuamente y el import cierra un ciclo. Se declara en
local la interfaz mínima que se necesita:

```ts
interface DropdownLike extends HTMLElement { open: boolean; hide(): void }
```

## S-TS7 Decoradores

Decoradores TC39 (stage 3) con campos `accessor`. El criterio de `decors.ts`:
**decorador si el valor no lo necesita el cuerpo y hay más de un adoptante**.
Un decorador cuesta ~1,5 KB de runtime por bundle y no se comparte entre
salidas de esbuild, así que no se pone uno donde basta una función.

## S-TS8 Herramientas de migración

En `scripts/`. Todas son idempotentes y todas vuelven a parsear lo que
escribirían antes de escribirlo: si la reescritura rompiese la sintaxis, el
fichero se deja intacto y se avisa. Se invocan con el hook de resolución,
porque entre ellas se importan con `.js` según S-TS2:

```bash
node --import ./scripts/ts-resolve-hook.ts scripts/<script>.ts src/components
```

| Script | Qué hace |
|---|---|
| `ts-jsdoc-a-tipos.ts` | `@param {T} x` existente → anotación real |
| `ts-codemod.ts` | patrones mecánicos (`querySelector<T>`, `this.shadowRoot!`) |
| `ts-campos-dom.ts` | S-TS4: campos del shadow propio no nulos |
| `ts-tipo-por-selector.ts` | `querySelector<HTMLElement>('input')` → `HTMLInputElement` |
| `ts-tipo-arrays.ts` | campos `= []`: deduce el elemento de sus `push` (usa el verificador) |
| `ts-inferir-params.ts` | deduce el tipo de un parámetro por cómo se usa |
| `ts-revertir-inferencia.ts` | retira las anotaciones que `tsc` desmiente |

`ts-inferir-params.ts` solo anota con evidencia inequívoca y dos señales
contradictorias le hacen abstenerse: un tipo mal deducido hace pasar el
typecheck mintiendo, que es peor que no tener tipo.

Aun así se equivoca, y por eso existe su pareja. El orden es **inferir, mirar
qué dice `tsc`, revertir lo desmentido**:

```bash
npx tsc -p tsconfig.json > /tmp/err.txt
node --import ./scripts/ts-resolve-hook.ts scripts/ts-revertir-inferencia.ts /tmp/err.txt
```

Los dos comparten `scripts/ts-descartes.json`, donde la reversión apunta qué
parámetros resultaron mal deducidos y el inferidor los respeta. **Ese fichero se
versiona**: sin él los dos scripts se deshacían el trabajo en bucle —uno ponía
en cada pasada justo lo que el otro acababa de quitar— y además señala dónde
falla la heurística, que es información que merece conservarse.

## Fuera de alcance

- El pipeline de `dist/cdn/` (ver [`cdn/spec.md`](../cdn/spec.md)).
- Migrar `scripts/build.mjs` y `scripts/serve.mjs`.
