import type { LucideIcon } from "lucide-react";
import {
  Type,
  QrCode,
  Barcode,
  Square,
  Minus,
  ImageIcon,
  Undo2,
  Redo2,
  Copy,
  Trash2,
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  Grid3x3,
  Ruler,
  Maximize2,
  Printer,
  Settings,
  LayoutTemplate,
} from "lucide-react";
import { useEditorV2Store } from "../../store/editor-store.ts";
import { mmToPx } from "../../utils/px-mm.ts";
import {
  addTextEl,
  addQrEl,
  addBarcodeEl,
  addImageEl,
  addRectEl,
  addLineEl,
} from "../../lib/keyboard.ts";

export interface Command {
  id: string;
  label: string;
  group: string;
  icon: LucideIcon;
  shortcut?: string;
  run: () => void;
}

function fitToScreen() {
  const { label } = useEditorV2Store.getState();
  const cw = window.innerWidth - 160;
  const ch = window.innerHeight - 200;
  const fit = Math.max(
    0.5,
    Math.min(4, Math.min(cw / label.widthPx, ch / label.heightPx)),
  );
  useEditorV2Store.getState().setZoom(fit);
  useEditorV2Store.getState().setPan(0, 0);
}

function setLabelSize(widthMm: number, heightMm: number) {
  useEditorV2Store.setState({
    label: {
      widthMm,
      heightMm,
      widthPx: mmToPx(widthMm),
      heightPx: mmToPx(heightMm),
    },
  });
}

export const commands: Command[] = [
  // Insert
  { id: "add-text", label: "Add text element", group: "Insert", icon: Type, shortcut: "T", run: addTextEl },
  { id: "add-qr", label: "Add QR code", group: "Insert", icon: QrCode, shortcut: "Q", run: addQrEl },
  { id: "add-barcode", label: "Add barcode", group: "Insert", icon: Barcode, shortcut: "B", run: addBarcodeEl },
  { id: "add-rect", label: "Add rectangle", group: "Insert", icon: Square, shortcut: "R", run: addRectEl },
  { id: "add-line", label: "Add line", group: "Insert", icon: Minus, shortcut: "L", run: addLineEl },
  { id: "add-image", label: "Add image", group: "Insert", icon: ImageIcon, shortcut: "I", run: addImageEl },

  // Edit
  { id: "undo", label: "Undo", group: "Edit", icon: Undo2, shortcut: "⌘Z", run: () => useEditorV2Store.temporal.getState().undo() },
  { id: "redo", label: "Redo", group: "Edit", icon: Redo2, shortcut: "⌘⇧Z", run: () => useEditorV2Store.temporal.getState().redo() },
  { id: "dup", label: "Duplicate selection", group: "Edit", icon: Copy, shortcut: "⌘D", run: () => useEditorV2Store.getState().duplicateSelected() },
  { id: "del", label: "Delete selection", group: "Edit", icon: Trash2, shortcut: "⌫", run: () => useEditorV2Store.getState().removeSelected() },

  // Align
  {
    id: "center",
    label: "Center selection on label",
    group: "Align",
    icon: AlignHorizontalJustifyCenter,
    run: () => {
      const { selectedIds, elements, label, updateElement } = useEditorV2Store.getState();
      selectedIds.forEach((id) => {
        const el = elements.find((e) => e.id === id);
        if (el) {
          updateElement(id, {
            x: Math.round((label.widthPx - el.width) / 2),
            y: Math.round((label.heightPx - el.height) / 2),
          });
        }
      });
    },
  },
  {
    id: "center-h",
    label: "Center horizontally",
    group: "Align",
    icon: AlignHorizontalJustifyCenter,
    run: () => {
      const { selectedIds, elements, label, updateElement } = useEditorV2Store.getState();
      selectedIds.forEach((id) => {
        const el = elements.find((e) => e.id === id);
        if (el) updateElement(id, { x: Math.round((label.widthPx - el.width) / 2) });
      });
    },
  },
  {
    id: "center-v",
    label: "Center vertically",
    group: "Align",
    icon: AlignVerticalJustifyCenter,
    run: () => {
      const { selectedIds, elements, label, updateElement } = useEditorV2Store.getState();
      selectedIds.forEach((id) => {
        const el = elements.find((e) => e.id === id);
        if (el) updateElement(id, { y: Math.round((label.heightPx - el.height) / 2) });
      });
    },
  },

  // View
  { id: "grid", label: "Toggle grid", group: "View", icon: Grid3x3, shortcut: "G", run: () => useEditorV2Store.setState((s) => ({ gridVisible: !s.gridVisible })) },
  { id: "rulers", label: "Toggle rulers", group: "View", icon: Ruler, run: () => useEditorV2Store.setState((s) => ({ rulersVisible: !s.rulersVisible })) },
  { id: "fit", label: "Fit label to screen", group: "View", icon: Maximize2, shortcut: "1", run: fitToScreen },

  // Label
  { id: "label-50x30", label: "Set label size · 50 × 30 mm", group: "Label", icon: Square, run: () => setLabelSize(50, 30) },
  { id: "label-40x12", label: "Set label size · 40 × 12 mm", group: "Label", icon: Square, run: () => setLabelSize(40, 12) },
  { id: "label-40x30", label: "Set label size · 40 × 30 mm", group: "Label", icon: Square, run: () => setLabelSize(40, 30) },
  { id: "label-70x40", label: "Set label size · 70 × 40 mm", group: "Label", icon: Square, run: () => setLabelSize(70, 40) },
  { id: "label-50x50", label: "Set label size · 50 × 50 mm", group: "Label", icon: Square, run: () => setLabelSize(50, 50) },

  // Print
  { id: "print", label: "Print label", group: "Print", icon: Printer, shortcut: "⌘P", run: () => {} },
  { id: "print-settings", label: "Open print settings", group: "Print", icon: Settings, run: () => {} },

  // Templates
  { id: "tpl-asset", label: "Template · Asset tag", group: "Templates", icon: LayoutTemplate, run: () => {} },
  { id: "tpl-shipping", label: "Template · Shipping label", group: "Templates", icon: LayoutTemplate, run: () => {} },
  { id: "tpl-price", label: "Template · Price tag", group: "Templates", icon: LayoutTemplate, run: () => {} },
];
