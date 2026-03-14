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

      if (store.selectedId && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const el = store.elements.find((el) => el.id === store.selectedId);
        if (!el) return;
        store.pushHistory();
        switch (e.key) {
          case "ArrowUp":
            store.updateElement(el.id, { y: el.y - step });
            break;
          case "ArrowDown":
            store.updateElement(el.id, { y: el.y + step });
            break;
          case "ArrowLeft":
            store.updateElement(el.id, { x: el.x - step });
            break;
          case "ArrowRight":
            store.updateElement(el.id, { x: el.x + step });
            break;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
