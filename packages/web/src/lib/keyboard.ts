import { useEffect } from "react";
import { useEditorV2Store, type BaseElement } from "../store/editor-store.ts";

// Module-level print callback, set by Editor when it mounts
let _printFn: ((copies: number) => Promise<boolean>) | null = null;
export function setPrintFn(fn: ((copies: number) => Promise<boolean>) | null) {
  _printFn = fn;
}

function uid(): string {
  return crypto.randomUUID();
}

function addTextEl() {
  const { label, addElement } = useEditorV2Store.getState();
  addElement({
    id: uid(),
    type: "text",
    x: Math.round(label.widthPx / 2 - 60),
    y: Math.round(label.heightPx / 2 - 12),
    width: 120,
    height: 24,
    rotation: 0,
    props: {
      text: "Label Text",
      fontSize: 18,
      fontFamily: "Inter",
      fontWeight: 600,
      letterSpacing: 0,
      fill: "#000000",
      align: "center",
      italic: false,
    },
  });
}

function addQrEl() {
  const { addElement } = useEditorV2Store.getState();
  addElement({
    id: uid(),
    type: "qrcode",
    x: 20,
    y: 20,
    width: 120,
    height: 120,
    rotation: 0,
    props: { content: "https://google.com", errorCorrectionLevel: "M" },
  });
}

function addBarcodeEl() {
  const { addElement } = useEditorV2Store.getState();
  addElement({
    id: uid(),
    type: "barcode",
    x: 20,
    y: 40,
    width: 220,
    height: 80,
    rotation: 0,
    props: { content: "1234567890", format: "CODE128", displayValue: true },
  });
}

function addImageEl() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.src = reader.result as string;
      img.onload = () => {
        const { label, addElement } = useEditorV2Store.getState();
        const maxW = Math.min(200, label.widthPx * 0.8);
        const maxH = Math.min(200, label.heightPx * 0.8);
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        addElement({
          id: uid(),
          type: "image",
          x: Math.round((label.widthPx - w) / 2),
          y: Math.round((label.heightPx - h) / 2),
          width: w,
          height: h,
          rotation: 0,
          props: { src: reader.result as string, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight },
        });
      };
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

function addRectEl() {
  const { addElement } = useEditorV2Store.getState();
  addElement({
    id: uid(),
    type: "rect",
    x: 24,
    y: 24,
    width: 100,
    height: 60,
    rotation: 0,
    props: { shapeType: "rect", fill: "", stroke: "#000000", strokeWidth: 2 },
  });
}

function addLineEl() {
  const { addElement } = useEditorV2Store.getState();
  addElement({
    id: uid(),
    type: "line",
    x: 24,
    y: 40,
    width: 140,
    height: 0,
    rotation: 0,
    props: { shapeType: "line", stroke: "#000000", strokeWidth: 2, fill: "" },
  });
}

// Export add functions for use by Dock
export {
  addTextEl,
  addQrEl,
  addBarcodeEl,
  addImageEl,
  addRectEl,
  addLineEl,
};

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      // Escape should always deselect, even from inputs — blur first then clear
      if (e.key === "Escape") {
        if (inInput) (target as HTMLInputElement).blur();
        useEditorV2Store.getState().clearSelection();
        return;
      }

      if (inInput) return;

      const cmd = e.metaKey || e.ctrlKey;
      const store = useEditorV2Store.getState();

      // Save
      if (cmd && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (e.shiftKey) {
          const name = prompt(
            "Save label as:",
            `${store.currentLabelName} copy`,
          );
          if (name) store.saveLabelAs(name);
        } else {
          store.saveLabel();
        }
        return;
      }

      // Command palette
      if (cmd && e.key.toLowerCase() === "k") {
        e.preventDefault();
        useEditorV2Store.setState({ paletteOpen: true });
        return;
      }

      // Undo
      if (cmd && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        useEditorV2Store.temporal.getState().undo();
        return;
      }

      // Redo
      if (
        cmd &&
        (e.key.toLowerCase() === "y" ||
          (e.shiftKey && e.key.toLowerCase() === "z"))
      ) {
        e.preventDefault();
        useEditorV2Store.temporal.getState().redo();
        return;
      }

      // Duplicate
      if (cmd && e.key.toLowerCase() === "d") {
        e.preventDefault();
        store.duplicateSelected();
        return;
      }

      // Select all
      if (cmd && e.key.toLowerCase() === "a") {
        e.preventDefault();
        store.selectAll();
        return;
      }

      // Print
      if (cmd && e.key.toLowerCase() === "p") {
        e.preventDefault();
        // If no printer connected, open the connect flow
        if (!store.printer.connected) {
          useEditorV2Store.setState((s) => ({
            connectFlow: { ...s.connectFlow, open: true, step: "idle" },
          }));
          return;
        }
        let copies = 1;
        try {
          copies = parseInt(localStorage.getItem("tp.copies") || "1", 10) || 1;
        } catch { /* noop */ }
        const duration = Math.min(4500, 1200 + copies * 220);
        useEditorV2Store.getState().startPrint(copies, duration);
        if (_printFn) {
          _printFn(copies)
            .then((sent) => {
              if (sent) setTimeout(() => useEditorV2Store.getState().endPrint(), 400);
              else setTimeout(() => useEditorV2Store.getState().endPrint(), duration + 400);
            })
            .catch(() => useEditorV2Store.getState().endPrint());
        } else {
          setTimeout(() => useEditorV2Store.getState().endPrint(), duration + 400);
        }
        return;
      }

      // Delete
      if (e.key === "Backspace" || e.key === "Delete") {
        store.removeSelected();
        return;
      }

      // Deselect (Escape handled above, before input check)
      if (e.key.toLowerCase() === "v") {
        store.clearSelection();
        return;
      }

      // Add element shortcuts
      if (!cmd) {
        switch (e.key.toLowerCase()) {
          case "t":
            addTextEl();
            return;
          case "q":
            addQrEl();
            return;
          case "b":
            addBarcodeEl();
            return;
          case "i":
            addImageEl();
            return;
          case "r":
            addRectEl();
            return;
          case "l":
            addLineEl();
            return;
          case "g":
            useEditorV2Store.setState((s) => ({
              gridVisible: !s.gridVisible,
            }));
            return;
        }
      }

      // Fit to screen
      if (e.key === "1" && !cmd) {
        const { label } = store;
        const cw = window.innerWidth - 100;
        const ch = window.innerHeight - 200;
        const fit = Math.max(
          0.5,
          Math.min(4, Math.min(cw / label.widthPx, ch / label.heightPx)),
        );
        store.setZoom(fit);
        store.setPan(0, 0);
        return;
      }

      // Arrow nudge
      if (
        store.selectedIds.length &&
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
      ) {
        e.preventDefault();
        const d = e.shiftKey ? 10 : 1;
        const dx =
          e.key === "ArrowLeft" ? -d : e.key === "ArrowRight" ? d : 0;
        const dy = e.key === "ArrowUp" ? -d : e.key === "ArrowDown" ? d : 0;
        store.selectedIds.forEach((id) => {
          const el = store.elements.find(
            (x: BaseElement) => x.id === id,
          );
          if (el) {
            store.updateElement(id, { x: el.x + dx, y: el.y + dy });
          }
        });
      }
    };

    window.addEventListener("keydown", onDown);
    return () => window.removeEventListener("keydown", onDown);
  }, []);
}
