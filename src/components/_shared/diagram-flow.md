# diagram-flow — animación de flujo de los rieles

Estándar de **todos** los diagramas del kit: cada riel muestra hacia dónde va lo que transporta.

| Riel | Efecto |
|---|---|
| Punteado | el patrón de trazos avanza (`stroke-dashoffset`, SMIL) |
| Continuo | encima, una línea de puntos más gruesa (+3 px) cada 100 px que avanza a 60 px/s |

Es animación SVG nativa: viaja con el SVG exportado. Se apaga con `prefers-reduced-motion` o con
`flow-anim="off"` en el host del diagrama.

## Sentido

Por defecto el flujo va del origen a la punta del trazo. Cada diagrama fija su estándar y la arista
lo puede invertir con `reverse: true`.

| Diagrama | Estándar |
|---|---|
| flowchart | del origen a la punta |
| clases | herencia y realización: del padre al hijo (al revés del trazo); el resto, con el trazo |
| DER | del lado N al lado 1; en 1:1, del lado opcional (0..1) al obligatorio |
| componentes | del origen a la punta |
| secuencia | del emisor al receptor |

## API

```ts
import { animarRiel, flujoActivo } from '../_shared/diagram-flow.js';

if (flujoActivo(host)) {
  const puntos = animarRiel(path, { punteado, reverse });
  if (puntos) g.appendChild(puntos); // continuo: la línea de puntos va encima del riel
}
```

Guardianes: `src/utils/health/diagrams/flow-anim-sentido.test.ts` (sentido) y
`flowchart-lanes.test.ts` A1 (activo por defecto).
