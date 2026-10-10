/**
 * theme.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const ErThemeJsonSchema = z.object({
  /* TODO: parse fail $schema?: string */
  id: z.string(),
  /**
   * Diagrama al que aplica dentro de un estilo (`registerStyleDiagram`):
   * `er`, `component` o `class`. Un estilo trae un tema por tipo.
   */
  kind: z.union([z.literal('er'), z.literal('component'), z.literal('class'), z.literal('sequence'), z.literal('flowchart')]).optional(),
  label: z.string().optional(),
  font: z.object({
  family: z.string().optional(),
  import: z.string().optional(),
}).optional(),
  canvas: z.object({
  background: z.string().optional(),
  text: z.string().optional(),
  muted: z.string().optional(),
}).optional(),
  entity: z.object({
  fill: z.string().optional(),
  headerFill: z.string().optional(),
  border: z.string().optional(),
  borderWidth: z.number().optional(),
  radius: z.number().optional(),
  separator: z.string().optional(),
  separatorWidth: z.number().optional(),
}).optional(),
  orphan: z.object({
  fill: z.string().optional(),
  headerFill: z.string().optional(),
  border: z.string().optional(),
}).optional(),
  edge: z.object({
  stroke: z.string().optional(),
  strokeWidth: z.number().optional(),
  dasharray: z.string().optional(),
  labelBg: z.string().optional(),
  hideLabels: z.boolean().optional(),
}).optional(),
  cluster: z.object({
  border: z.string().optional(),
  borderWidth: z.number().optional(),
  radius: z.number().optional(),
  dasharray: z.union([z.string(), z.null()]).optional(),
  titleFill: z.string().optional(),
  palettes: z.record(z.string(), z.string()).optional(),
  fallback: z.string().optional(),
}).optional(),
  component: z.object({
  fill: z.string().optional(),
  headerFill: z.string().optional(),
  border: z.string().optional(),
  borderWidth: z.number().optional(),
  radius: z.number().optional(),
  lollipop: z.string().optional(),
  noPackageTab: z.boolean().optional(),
  titleBackground: z.boolean().optional(),
  /** true = InSoft: -( expone, -O consume (invierte glifos UML). */
  invertAssembly: z.boolean().optional(),
  /** Fill de filas EP (entidad hoja). */
  epFill: z.string().optional(),
  epBorder: z.string().optional(),
  /** Filas badge sin bg ni stroke negro. */
  epRowTransparent: z.boolean().optional(),
}).optional(),
  /**
   * Rellenos semánticos de cajas fuera del DER (el naranja de entidad es
   * exclusivo del DER): `service`, `app`, `store`, `leaf`, `external`…
   * El payload usa la clave; el tema decide el color.
   */
  fills: z.record(z.string(), z.string()).optional(),
  /**
   * Colores de LÍNEA por nombre (`auth`, `data`, `llm`…): saturados, para
   * aristas y grupos de mensajes; los `fills` pastel son para áreas.
   */
  lines: z.record(z.string(), z.string()).optional(),
  /**
   * Diagrama de secuencia: pintura de participantes, mensajes, grupos y
   * regiones. Los colores de grupo/región se piden por nombre de paleta
   * (`cluster.palettes` / `fills`) y el tema decide el hex.
   */
  sequence: z.object({
  actorFill: z.string().optional(),
  actorBorder: z.string().optional(),
  actorRadius: z.number().optional(),
  lifeline: z.string().optional(),
  messageStroke: z.string().optional(),
  messageWidth: z.number().optional(),
  /** Familia tipográfica de las etiquetas de mensaje (por defecto, la del tema). */
  labelFont: z.string().optional(),
  labelFill: z.string().optional(),
  labelText: z.string().optional(),
  fragmentFill: z.string().optional(),
  fragmentBorder: z.string().optional(),
  fragmentOpacity: z.number().optional(),
  boxOpacity: z.number().optional(),
  stepText: z.string().optional(),
  /** Repite las cabeceras de participantes al pie (UML clásico). */
  footerActors: z.boolean().optional(),
}).optional(),
  /**
   * Diagrama de flujo / actividad (`iswc-flowchart`). Los colores se piden
   * por NOMBRE de token del propio tema (`cluster.palettes`, `fills`,
   * `lines`) o como color literal; así el celeste de las acciones es el
   * mismo `primary` que usan los demás diagramas del estilo.
   */
  flow: z.object({
  actionFill: z.string().optional(),
  actionBorder: z.string().optional(),
  actionText: z.string().optional(),
  borderWidth: z.number().optional(),
  /** Radio de las acciones (rectángulos muy redondeados). */
  radius: z.number().optional(),
  decisionFill: z.string().optional(),
  startFill: z.string().optional(),
  endFill: z.string().optional(),
  edgeStroke: z.string().optional(),
  edgeWidth: z.number().optional(),
  labelText: z.string().optional(),
  /** Fondo por defecto de los nodos `kind: "nested"`. */
  nestedBg: z.string().optional(),
  fontSize: z.number().optional(),
  fontWeight: z.number().optional(),
  /**
   * Cada símbolo (acción, decisión…) con su propio tono: el relleno base rota en OKLCH por el
   * ángulo áureo, con la misma luminosidad y croma (el texto conserva el contraste).
   */
  hueRotate: z.boolean().optional(),
  /** Fondo de la insignia (número + ícono): `entity` = el tono de su entidad a L 0,25 (OKLCH), o un color. */
  pillTone: z.string().optional(),
  /** Rieles punteados con movimiento suave hacia su destino (animación SVG nativa). */
  dashFlow: z.boolean().optional(),
  /** Separadores de los carriles de contexto (por defecto celeste: distinto de flujos y usos). */
  laneLine: z.string().optional(),
}).optional(),
  diagramTheme: z.unknown() /* TODO: ref DiagramTheme */.optional(),
  light: z.unknown() /* TODO: ref Omit<...> */.optional(),
  dark: z.unknown() /* TODO: ref Omit<...> */.optional(),
});
export type ErThemeJson = z.infer<typeof ErThemeJsonSchema>;

