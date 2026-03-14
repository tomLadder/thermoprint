import { useEditorStore } from "../store/editor-store.ts";

export function useHistory() {
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const canUndo = useEditorStore((s) => s.past.length > 0);
  const canRedo = useEditorStore((s) => s.future.length > 0);
  return { undo, redo, canUndo, canRedo };
}
