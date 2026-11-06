/**
 * 00-context.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from 'zod';
import type { TNode, TRecord, PendingDeleteSnapshot, TreeContext } from '@jeff-aporta/iswc-base/components/isp/schemas/tree-view-types.schemas.js';

const _AnyRecordSchema = z.record(z.string(), z.unknown());
export type _AnyRecord = z.infer<typeof _AnyRecordSchema>;

const _AnyCtxPropsSchema = _AnyRecordSchema;
export type _AnyCtxProps = z.infer<typeof _AnyCtxPropsSchema>;

const _BAllowedShapeSchema = z.object({
  Crear: z.boolean().optional(),
  Modificar: z.boolean().optional(),
  Eliminar: z.boolean().optional(),
  Visualizar: z.boolean().optional(),
});
export type _BAllowedShape = z.infer<typeof _BAllowedShapeSchema>;

const _PendingDeleteSnapSchema = z.union([z.object({
  prevVisibleIds: z.array(z.string()),
  prevDeleteIdx: z.number(),
}), z.null()]);
export type _PendingDeleteSnap = z.infer<typeof _PendingDeleteSnapSchema>;

const _TNodeLikeSchema = z.object({
  flatPath: z.string(),
  /* TODO: member [key: string]: unknown */
});
export type _TNodeLike = z.infer<typeof _TNodeLikeSchema>;

const _TRecordLikeSchema = z.intersection(_TNodeLikeSchema, z.object({
  iplan: z.string().optional(),
  idrow: z.string().optional(),
}));
export type _TRecordLike = z.infer<typeof _TRecordLikeSchema>;

// ── Module augmentation ──────────────────────────────────────────────────
// Las clases base del treeview declaran sus campos vía `__publicField(...)`,
// que escapa al análisis estático de TypeScript (el helper tiene tipo `any`
// y la inferencia de propiedades de clase no ve efectos secundarios). Aquí
// reabrimos los módulos y declaramos las propiedades con tipos concretos para
// que strictNullChecks + noImplicitAny no se quejen al hacer `this.foo` en
// los archivos que tipamos.
// TTreeAdapterContext declara campos con `__publicField` invisibles a TS.
// Re-declaramos las propiedades que las subclases consumen.
// TTreeAdapterContract: añade más campos via `__publicField`.
declare module '@jeff-aporta/iswc-base/components/isp/utils/tree-view-context.js' {
  //
  
  interface TTreeAdapterContext {
      context: TreeContext;
      treeRootId: string;
      bshowFrm: boolean;
      bLostFocus: boolean;
      _selectedFlatPath: string;
      _focusedFlatPath: string;
      _hoveredFlatPath: string;
      record: TRecord | null;
      _pendingDeleteFlatPath: string;
      _pendingDeleteSnapshot: PendingDeleteSnapshot | null;
      _lastProcessedObj: TRecord | null;
      _expandedFlatPaths: string[];
      _treeNodes: TNode[];
      bcanMoveOutside: boolean;
      _domRoot?: HTMLElement;
      selectedNode: TNode | null;
      focusedNode: TNode | null;
      hoveredNode: TNode | null;
      rootNodes: TNode[];
      treeNodes: TNode[];
      expandedNodes: TNode[];
      expandedFlatPaths: string[];
      isReadOnly: boolean;
      canMutate: boolean;
      canCreate: boolean;
      canModify: boolean;
      canDelete: boolean;
      draggable: boolean;
      normalizeFlatPath(id: string | null | undefined): string;
      findNodeByFlatPath(id: string | null | undefined, branches?: TNode[]): TNode | null;
      onstateupdate(ctx: Record<string, unknown>): void;
  }
  
  interface TTreeAdapterContract {
      disabledNodes: string[];
      flashFlatPaths: string[];
      flashErrorFlatPaths: string[];
      didNodesExpand: boolean;
      currentNode: TNode | null;
      lastProcessedNode: TNode | null;
      rowAdapters: Map<string, unknown>;
      uiTick: number;
      _uiListeners: Array<() => void>;
      lastNodesRef: TNode[];
      lastObjRefId: string;
      flashClearTimer: ReturnType<typeof setTimeout> | undefined;
      flashErrorClearTimer: ReturnType<typeof setTimeout> | undefined;
      getReferenceFlatPath(node: TNode): string;
      addUiListener(fn: () => void): () => void;
      notifyUI(): void;
      getVisibleFlatPaths(nodes: TNode[], expandedSet: Set<string>): string[];
      toNode(obj: Partial<TNode> | TNode | null | undefined, isCopy?: boolean): TNode | null;
      onrefresh(): void;
      applySelection(obj: TNode | null | undefined): void;
      resyncExpandedToCurrentTree(): void;
      syncAllRowAdapters(): void;
      syncRowAdaptersByFlatPaths(ids: readonly string[]): void;
      createNode(data: Partial<TNode> | TNode): TNode | null;
      // List2Rows: lo declara la clase (get/set) en este mismo archivo.
      findNodeByFlatPath(
        id: string | null | undefined,
        branches?: TNode[],
      ): TNode | null;
      findNodeByPathInit(
        pathInit: string | null | undefined,
        branches?: TNode[],
      ): TNode | null;
      normalizeFlatPath(id: string | null | undefined): string;
      getEditAttrsForLevel(
        driverAttrs: Record<string, unknown>,
        plan?: TNode,
      ): Record<string, unknown>;
      canEditSelectResource(plan: TNode | null | undefined, draft: TNode | null | undefined): boolean;
  }
}
