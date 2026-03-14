import { useEffect } from "react";
import { useEditorStore } from "../store/editor-store.ts";

export function useKeyboard() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      const store = useEditorStore.getState();

      if ((e.key === "Delete" || e.key === "Backspace") && store.selectedId) {
        e.preventDefault();
        store.removeElement(store.selectedId);
      }

      if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        store.undo();
      }

      if (e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
        store.redo();
      }

      if (e.key === "Escape") {
        store.setSelectedId(null);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
