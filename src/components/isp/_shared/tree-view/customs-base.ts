/**
 * Toolbar default del TreeView (port de TreeCustomsBase en contracts.ts).
 * El consumidor puede extender y pisar hooks.
 */
export class TreeCustomsBase {
  topMenuActions(tree) {
    const ro = !!tree.isReadOnly;
    const addDisabled = ro || undefined;
    const nivel1 = (this.levelName?.({ depth: 0 }) ?? "").trim();
    const addTitle = nivel1 && nivel1 !== "---" ? `Agregar ${nivel1}` : "Agregar";
    const addGroup = [{
      icon: "mdi:plus-circle-outline",
      label: "Agregar",
      title: addTitle,
      hotkey: "Insert",
      disabled: addDisabled,
      onClick: () => { if (!addDisabled) tree.addRoot?.(); },
    }];
    const canCollapse = !!tree.canCollapseAll;
    const canExpand = !!tree.canExpandAll;
    const expandGroup = [
      { icon: "mdi:unfold-less-horizontal", title: "Colapsar todo", hotkey: "Ctrl+ArrowLeft", disabled: !canCollapse || undefined, onClick: () => { if (canCollapse) tree.collapseAll?.(); } },
      { icon: "mdi:unfold-more-horizontal", title: "Expandir todo", hotkey: "Ctrl+ArrowRight", disabled: !canExpand || undefined, onClick: () => { if (canExpand) tree.expandAll?.(); } },
    ];
    const externalRO = !!tree.isReadOnlyExternal;
    const undoDisabled = externalRO || !tree.historyCanUndo || undefined;
    const redoDisabled = externalRO || !tree.historyCanRedo || undefined;
    const protectedOn = !!tree.isProtected;
    const canToggleProtection = tree.canToggleProtection ?? true;
    const protectionDisabled = !canToggleProtection || undefined;
    const lockTitle = protectedOn ? "Desproteger" : "Proteger";
    const undoGroup = [
      { icon: "mdi:arrow-u-left-top", title: "Deshacer", hotkey: "Ctrl+KeyZ", disabled: undoDisabled, onClick: () => { if (!undoDisabled) tree.historyUndo?.(); } },
      {
        iconTrue: "mdi:lock-outline",
        iconFalse: "mdi:lock-open-variant-outline",
        checked: protectedOn,
        color: "warning",
        colorFalse: "neutral",
        title: lockTitle,
        disabled: protectionDisabled,
        onClick: () => { if (!protectionDisabled) tree.protectionToggle?.(); },
      },
      { icon: "mdi:arrow-u-right-top", title: "Rehacer", hotkey: "Ctrl+KeyY", disabled: redoDisabled, onClick: () => { if (!redoDisabled) tree.historyRedo?.(); } },
    ];
    return [addGroup, expandGroup, undoGroup];
  }
}
