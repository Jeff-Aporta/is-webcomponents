---
name: especificar-what
description: Cómo se escriben specs y pruebas en una app iswc (estándar común). Úsala antes de escribir o cambiar una spec, una prueba o un comportamiento observable.
---

# Specs y pruebas WHAT (estándar iswc)

Copia sembrada por `create-iswc-app` desde el kit (`iswc-root/skills/iswc-foundation`). Todas las
apps iswc especifican y prueban igual, para que cualquier agente, en cualquier sesión, siga lo mismo.

## 1. Prioridad de redacción

1. **WHAT** (foco): lo que el usuario ve y puede hacer, reglas, estados, entradas/salidas, errores,
   casos borde. Sin nombrar archivos ni funciones internas.
2. **HOW WEAK**: guía semántica que deja libertad al implementador.
3. **HOW STRONG**: solo para contratos preexistentes o decisiones sin libertad (tecnologías, API
   pública de un componente, formas de payload, rutas de un backend, formato de un archivo publicado).

IDs, uno por viñeta y verificable: `[W-<AREA>-NN]`, `[HW-<AREA>-NN]`, `[HS-<AREA>-NN]`.

## 2. Formato de una spec fundación (`specs/foundation/NN-tema.md`)

```
# <NN> — <Tema>
> Alcance (qué cubre y qué no).
## 1. Propósito (WHAT)
## 2. Requisitos WHAT
## 3. Guía HOW WEAK
## 4. Contratos HOW STRONG
## 5. Casos borde y errores
## 6. Pruebas (WHAT / HOW WEAK)
## 7. Notas
```

Las 7 secciones son obligatorias (vacía = «No aplica.»). Un ID no se repite entre specs. La sección 6
dice QUÉ se verifica, no cómo.

## 3. Pruebas: caja negra

- Una prueba sabe QUÉ hace la app y QUÉ responde; nunca CÓMO lo hace. No lee código fuente para
  afirmar comportamiento.
- **Excepción declarada**: los guardianes de estructura (invariantes de arquitectura que el navegador
  no ve: anatomía de componentes, pines, tokens). Su cabecera dice qué bug protegen.
- **UI** → Stagehand determinista (`scripts/gate/e2e/harness.ts`): opera la página como un usuario.
- **API / datos sin UI** → los controladores de cliente de la app (la fachada tipada), nunca `fetch`
  a mano; rutas y métodos salen del contrato, nunca quemados.
- **Dominio puro** → importando el módulo publicado en `dist/cdn/` (lo que de verdad se sirve).

## 4. Formato común de un archivo de pruebas

Todas en `tests/<area>/*.test.ts` (áreas: `plataforma`, `componentes`, `vistas`, `e2e`, …). Cada
archivo exporta su lista:

```ts
import { definirPruebas } from '../../src/vendor/iswc-root/tools/ISPruebas.ts';
export default definirPruebas([
  { nombre: 'bienvenida W-CAT-02 cuatro piezas del estándar', categoria: 'what', correr({ eq }) {
    eq('títulos', caracteristicas().map((c) => c.titulo), ['Componentes', 'Vistas', 'Tipos', 'Pruebas']);
  } },
]);
```

- `nombre` es el id de la prueba: único en toda la corrida y llave de su cooldown. Incluye el ID de
  la spec que verifica (`W-…`).
- `categoria: 'what'` (comportamiento) o `'how'` (guardián de estructura).
- Cada prueba afirma algo (`expect`/`eq`) o se salta con motivo (`saltar('…')`): nunca un verde vacío.
- Lo que una prueba crea, lo limpia.

## 5. Cobertura (método deep-test-proposals)

1. Inventario de lo testeable (requisitos `[W-*]` + API pública de cada componente + utils).
2. Agrupar por área.
3. Proponer por grupo pruebas WHAT.
4. Cada `[W-*]` de las specs tiene al menos una prueba que lo nombra, y cada prueba nombra un
   `[W-*]` existente. Lo que no aplica se declara en la sección 7 de su spec con el motivo.

## 6. Gate

`deno task test:all` = build → check → pin → test:health → test:e2e, con cooldown (x600). Hecho =
verde. Nada en rojo al cerrar un cambio.
