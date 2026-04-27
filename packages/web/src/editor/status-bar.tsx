import { useEditorV2Store } from "../store/editor-store.ts";

export function StatusBar() {
  const label = useEditorV2Store((s) => s.label);
  const elements = useEditorV2Store((s) => s.elements);
  const selectedIds = useEditorV2Store((s) => s.selectedIds);
  const paperType = useEditorV2Store((s) => s.paperType);
  const dirty = useEditorV2Store((s) => s.currentLabelDirty || s.currentLabelId === null);

  const sel = elements.filter((e) => selectedIds.includes(e.id));

  return (
    <div className="hidden md:flex absolute bottom-0 left-0 right-0 h-6 px-3 items-center justify-between text-ui-xs font-mono text-ink-500 bg-ink-900/80 border-t border-white/5 backdrop-blur-sm z-10">
      <div className="flex items-center gap-4">
        <span>
          {label.widthMm}×{label.heightMm}mm
        </span>
        <span>{paperType === "gap" ? "GAP" : "CONT"}</span>
        <span>{elements.length} elements</span>
        {sel.length === 1 && (
          <span className="text-accent">
            {sel[0].type.toUpperCase()} · {Math.round(sel[0].width)}×
            {Math.round(sel[0].height)}px · ({Math.round(sel[0].x)},{" "}
            {Math.round(sel[0].y)})
          </span>
        )}
        {sel.length > 1 && (
          <span className="text-accent">{sel.length} selected</span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${dirty ? "bg-amber-400" : "bg-emerald-400"}`} />
          {dirty ? "Unsaved changes" : "Saved"}
        </span>
      </div>
    </div>
  );
}
