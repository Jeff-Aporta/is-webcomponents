# diagram-flow — animación de flujo de los rieles

Estándar de **todos** los diagramas del kit: cada riel muestra hacia dónde va lo que transporta.

| Riel | Efecto |
|---|---|
| Punteado | el patrón de trazos avanza (`stroke-dashoffset`, SMIL) |
| Continuo | DETRÁS del riel, una línea de puntos del color de la arista (o `dots.color`), más gruesa (+3 px, o `dots.size` de diámetro) cada 100 px, que avanza a 120 px/s; late en alfa (pulso de 3 s) |
| O y ⦿ | cada bola `-(O-`, `-(O=` y cada fin ⦿ emite un pulso de radar cada 3 s (`pulsoRadar`), detrás de la figura |

Es animación SVG nativa: viaja con el SVG exportado. Se apaga con `prefers-reduced-motion` o con
`flow-anim="off"` en el host del diagrama. Todo pulso arranca transparente y empieza a los 1,5 s:
el PNG (captura estática) sale limpio, sin puntos ni anillos.

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
import { animarRielEn, flujoActivo, pulsoRadar } from './diagram-flow.js';

if (flujoActivo(host)) animarRielEn(g, path, { punteado, reverse }); // continuo: los puntos quedan DETRÁS del riel
g.appendChild(pulsoRadar(cx, cy, r, color)); // antes de pintar la O: el anillo nace detrás
```

Los conectores `-(O-` / `-(O=` se pintan con `pintarSocket` (`_shared/diagram-socket.ts`): palo,
socket `(`, pulso y bola, en ese orden; todos los diagramas usan el mismo pintor.

Guardianes: `src/utils/health/diagrams/flow-anim-sentido.test.ts` (sentido) y
`flowchart-lanes.test.ts` A1 (activo por defecto).
