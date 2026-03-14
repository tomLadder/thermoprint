import {
  Type,
  ImageIcon,
  QrCode,
  Barcode,
  Square,
  Minus,
  Undo2,
  Redo2,
} from "lucide-react";
import { useEditorStore } from "../../store/editor-store.ts";
import { useHistory } from "../../hooks/use-history.ts";
import type { EditorElement } from "../../store/types.ts";
import { LabelSizeSelector } from "../../label/label-size-selector.tsx";
import { ThemeToggle } from "../../theme/theme-toggle.tsx";
import { Tooltip } from "../../components/tooltip.tsx";

function makeId(): string {
  return crypto.randomUUID();
}

export function Toolbar() {
  const addElement = useEditorStore((s) => s.addElement);
  const { undo, redo, canUndo, canRedo } = useHistory();

  const addText = () => {
    const { widthPx, heightPx } = useEditorStore.getState().labelConfig;
    const fontSize = 20;
    const textW = 100;
    const textH = fontSize + 4;
    const el: EditorElement = {
      id: makeId(),
      type: "text",
      x: Math.round((widthPx - textW) / 2),
      y: Math.round((heightPx - textH) / 2),
      width: textW,
      height: textH,
      rotation: 0,
      props: {
        text: "Label Text",
        fontSize,
        fontFamily: "Saira",
        fontStyle: "",
        fill: "#000000",
        align: "center",
      },
    };
    addElement(el);
  };

  const addImage = () => {
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
          const maxW = 200, maxH = 200;
          let w = img.naturalWidth, h = img.naturalHeight;
          if (w > maxW || h > maxH) {
            const ratio = Math.min(maxW / w, maxH / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }
          const el: EditorElement = {
            id: makeId(),
            type: "image",
            x: 8, y: 8,
            width: w, height: h,
            rotation: 0,
            props: { src: reader.result as string, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight },
          };
          addElement(el);
        };
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const addQrCode = () => {
    const el: EditorElement = {
      id: makeId(),
      type: "qrcode",
      x: 16, y: 16,
      width: 96, height: 96,
      rotation: 0,
      props: { content: "https://example.com", errorCorrectionLevel: "M" },
    };
    addElement(el);
  };

  const addBarcode = () => {
    const el: EditorElement = {
      id: makeId(),
      type: "barcode",
      x: 8, y: 8,
      width: 200, height: 72,
      rotation: 0,
      props: { content: "1234567890", format: "CODE128", displayValue: true },
    };
    addElement(el);
  };

  const addRect = () => {
    const el: EditorElement = {
      id: makeId(),
      type: "rect",
      x: 16, y: 16,
      width: 80, height: 50,
      rotation: 0,
      props: { shapeType: "rect", fill: "", stroke: "#000000", strokeWidth: 2 },
    };
    addElement(el);
  };

  const addLine = () => {
    const el: EditorElement = {
      id: makeId(),
      type: "line",
      x: 16, y: 16,
      width: 100, height: 0,
      rotation: 0,
      props: { shapeType: "line", fill: "", stroke: "#000000", strokeWidth: 2 },
    };
    addElement(el);
  };

  const addBtn =
    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors " +
    "bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900/40 " +
    "text-gray-700 dark:text-gray-200 hover:text-blue-700 dark:hover:text-blue-300";

  const iconBtn =
    "p-2 rounded-lg cursor-pointer transition-colors " +
    "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 " +
    "disabled:opacity-30 disabled:cursor-not-allowed";

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm relative z-10">
      {/* Logo — matches left sidebar width (w-60 = 15rem) */}
      <div className="flex items-center gap-2 select-none shrink-0 border-r border-gray-200 dark:border-gray-700 pr-4 mr-2" style={{ width: "calc(15rem - 1rem)" }}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <span className="text-white text-sm font-bold">T</span>
        </div>
        <span className="font-semibold tracking-tight text-gray-800 dark:text-gray-200">Thermoprint</span>
      </div>

      {/* Primary add-element buttons */}
      <div className="flex items-center gap-1.5">
        <Tooltip label="Add Text">
          <button className={addBtn} onClick={addText}><Type size={18} /> Text</button>
        </Tooltip>
        <Tooltip label="Add Image">
          <button className={addBtn} onClick={addImage}><ImageIcon size={18} /> Image</button>
        </Tooltip>
        <Tooltip label="Add QR Code">
          <button className={addBtn} onClick={addQrCode}><QrCode size={18} /> QR</button>
        </Tooltip>
        <Tooltip label="Add Barcode">
          <button className={addBtn} onClick={addBarcode}><Barcode size={18} /> Barcode</button>
        </Tooltip>
        <Tooltip label="Add Rectangle">
          <button className={addBtn} onClick={addRect}><Square size={18} /></button>
        </Tooltip>
        <Tooltip label="Add Line">
          <button className={addBtn} onClick={addLine}><Minus size={18} /></button>
        </Tooltip>
      </div>

      <div className="w-px h-7 bg-gray-200 dark:bg-gray-700 mx-1" />

      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <Tooltip label="Undo (Ctrl+Z)">
          <button className={iconBtn} onClick={undo} disabled={!canUndo}><Undo2 size={18} /></button>
        </Tooltip>
        <Tooltip label="Redo (Ctrl+Shift+Z)">
          <button className={iconBtn} onClick={redo} disabled={!canRedo}><Redo2 size={18} /></button>
        </Tooltip>
      </div>

      <div className="w-px h-7 bg-gray-200 dark:bg-gray-700 mx-1" />

      <LabelSizeSelector />

      <div className="flex-1" />
      <ThemeToggle />
    </div>
  );
}
