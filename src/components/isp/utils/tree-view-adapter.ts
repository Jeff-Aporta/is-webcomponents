// @contexto INDICE.md · src/components/isp/README.md
import { resolveColor } from './tree-view-context.js';
import { TARowBase } from './tree-view-as-row.js';

const FLEX_BTN_STYLE = "flex: 1 1 0; width: 100%;";
class TreeRowViewAdapter extends TARowBase {
  buildEditDrawerStructure(ctx: any) {
    const itd = ctx.readonly ? "view" : ctx.itdForm;
    const viewBlocked = itd === "view" && !(ctx.bAllowed?.Visualizar ?? true);
    const blockedMsg = { type: "FlexLayout", direction: "column", items: "center", justify: "center", style: "padding: 2em; flex: 1;", children: [{ type: "Text", color: "neutral", slot: { default: "No tiene permisos para visualizar este registro." } }] };
    const accionesGen = () => !ctx.record ? null : {
      type: "AccionesGenEmbedded",
      itdForm: ctx.itdForm,
      onItdFormChange: ctx.onItdFormChange,
      postSubmit: ctx.postSubmit,
      onError: ctx.onError,
      onCancel: ctx.onclose,
      Controller: this,
      Obj: ctx.record,
      children: [{ type: "slotDefault" }]
    };
    return [{
      type: "ActionDrawer",
      bshow: ctx.bshow,
      onclose: ctx.onclose,
      notClose: ctx.notClose,
      style: "width: 36.25em; max-width: 90vw;",
      children: [{
        type: "FlexLayout",
        direction: "column",
        class: "flex-1 min-h-0 custom-scrollbar",
        cscroll: true,
        style: `height: 100%; background-color: ${resolveColor("bg")}; overflow: hidden; flex: 1 1 auto; min-height: 0;`,
        children: [{
          type: "FormJConfig",
          oninput: ctx.oninput,
          onchange: ctx.oninput,
          style: "display: contents; height: 100%; flex: 1 1 auto; min-height: 0;",
          children: [viewBlocked ? blockedMsg : accionesGen]
        }]
      }]
    }];
  }
  buildDeleteModalStructure(ctx: any) {
    return [{
      type: "Modal",
      bshow: ctx.bshow,
      loading: ctx.loading,
      onClose: ctx.onclose,
      slot: { title: { type: "Text", color: "danger", icon: "mdi:trash-can-outline", slot: { default: `Eliminar ${this.customs?.entrie ?? "registro"}` } } },
      children: [{
        type: "FlexLayout",
        direction: "column",
        style: "padding: 0.75em; min-width: 21.875em;",
        children: [
          { type: "Text", slot: { default: "Confirme la eliminación digitando el código de seguridad del registro." } },
          { type: "Input", label: "Código esperado", value: ctx.codeExpected, readonly: true },
          { type: "Input", label: "Confirme código de seguridad", required: true, maxLength: 60, value: ctx.codeInput, onvalue: ctx.oncodeinput },
          {
            type: "GridLayout",
            cells: 2,
            items: "stretch",
            style: "width: 100%; margin-top: 1em;",
            children: [
              { type: "Button", color: "neutral", variant: "outlined", loading: ctx.loading, onClick: ctx.oncancel, slot: { default: "Cancelar" } },
              { type: "Button", color: "danger", disabled: ctx.loading || ctx.isBlocked, loading: ctx.loading, onClick: ctx.onconfirm, slot: { default: "Eliminar" } }
            ]
          }
        ]
      }]
    }];
  }
  buildProtectionModalStructure(ctx: any) {
    const canRedo = this.historyCanRedo;
    return [{
      type: "Modal",
      bshow: ctx.bshow,
      onClose: ctx.onclose,
      slot: { title: { type: "Text", color: "warning", icon: "mdi:lock-outline", slot: { default: "Árbol protegido" } } },
      children: [{
        type: "FlexLayout",
        direction: "column",
        style: "padding: 0.75em; min-width: 22.5em;",
        children: [
          { type: "Text", slot: { default: "El árbol está protegido contra edición. ¿Cómo desea continuar?" } },
          {
            type: "FlexLayout",
            direction: "row",
            items: "stretch",
            gap: "0.5em",
            style: "width: 100%; margin-top: 1em;",
            children: [
              { type: "Button", color: "neutral", variant: "outlined", style: FLEX_BTN_STYLE, onClick: ctx.oncancel, slot: { default: "Cancelar" } },
              ...canRedo ? [{ type: "Button", color: "warning", variant: "ghost", title: "Rehace todo el historial pendiente y desprotege", style: FLEX_BTN_STYLE, onClick: ctx.onredoall, slot: { default: "Rehacer al actual" } }] : [],
              { type: "Button", color: "warning", style: FLEX_BTN_STYLE, onClick: ctx.onconfirm, slot: { default: "Desproteger" } }
            ]
          }
        ]
      }]
    }];
  }
}
export {
  TreeRowViewAdapter
};
