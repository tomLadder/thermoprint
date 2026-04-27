import {
  Type,
  QrCode,
  Barcode,
  Square,
  Minus,
  ImageIcon,
  Copy,
  ArrowUp,
  ArrowDown,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEditorV2Store, type BaseElement } from "../../store/editor-store.ts";
import { TransformSection } from "./sections/transform-section.tsx";
import { TextSection } from "./sections/text-section.tsx";
import { QrSection } from "./sections/qr-section.tsx";
import { BarcodeSection } from "./sections/barcode-section.tsx";
import { ShapeSection } from "./sections/shape-section.tsx";

const TYPE_LABELS: Record<string, string> = {
  text: "Text",
  qrcode: "QR Code",
  barcode: "Barcode",
  rect: "Rectangle",
  line: "Line",
  image: "Image",
};

const TYPE_ICONS: Record<string, LucideIcon> = {
  text: Type,
  qrcode: QrCode,
  barcode: Barcode,
  rect: Square,
  line: Minus,
  image: ImageIcon,
};

export function Inspector() {
  const elements = useEditorV2Store((s) => s.elements);
  const selectedIds = useEditorV2Store((s) => s.selectedIds);
  const duplicateSelected = useEditorV2Store((s) => s.duplicateSelected);
  const removeSelected = useEditorV2Store((s) => s.removeSelected);
  const zOrder = useEditorV2Store((s) => s.zOrder);

  const selected = elements.filter((e) => selectedIds.includes(e.id));

  // Hidden when selection is empty
  if (selected.length === 0) return null;

  const el: BaseElement | null = selected.length === 1 ? selected[0] : null;
  const TypeIcon = el ? TYPE_ICONS[el.type] : null;
  const typeLabel = el ? TYPE_LABELS[el.type] : null;

  return (
    <div
      className="fixed inset-x-2 bottom-20 max-h-[80vh] overflow-y-auto md:max-h-none md:overflow-hidden md:inset-auto md:absolute md:top-4 md:right-3 md:w-72 bg-ink-850/95 backdrop-blur-sm border border-white/8 rounded-lg shadow-panel z-10"
      style={{ maxHeight: "calc(100vh - 180px)" }}
    >
      {el ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-3 h-9 border-b border-white/5 bg-ink-800/50">
            <div className="flex items-center gap-2">
              {TypeIcon && <TypeIcon size={15} className="text-accent" />}
              <span className="text-ui-base font-semibold text-ink-100">
                {typeLabel}
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={duplicateSelected}
                className="w-6 h-6 rounded hover:bg-ink-700 text-ink-400 hover:text-ink-100 flex items-center justify-center"
                title="Duplicate (⌘D)"
              >
                <Copy size={14} />
              </button>
              <button
                onClick={() => zOrder(el.id, "up")}
                className="w-6 h-6 rounded hover:bg-ink-700 text-ink-400 hover:text-ink-100 flex items-center justify-center"
                title="Bring forward"
              >
                <ArrowUp size={14} />
              </button>
              <button
                onClick={() => zOrder(el.id, "down")}
                className="w-6 h-6 rounded hover:bg-ink-700 text-ink-400 hover:text-ink-100 flex items-center justify-center"
                title="Send backward"
              >
                <ArrowDown size={14} />
              </button>
              <button
                onClick={removeSelected}
                className="w-6 h-6 rounded hover:bg-red-500/20 text-ink-400 hover:text-red-400 flex items-center justify-center"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Sections */}
          <div
            className="overflow-y-auto"
            style={{ maxHeight: "calc(100vh - 230px)" }}
          >
            <TransformSection element={el} />
            {el.type === "text" && <TextSection element={el} />}
            {el.type === "qrcode" && <QrSection element={el} />}
            {el.type === "barcode" && <BarcodeSection element={el} />}
            {(el.type === "rect" || el.type === "line") && (
              <ShapeSection element={el} />
            )}
          </div>
        </>
      ) : (
        <div className="p-4 text-center text-ui-sm text-ink-400">
          {selected.length} elements selected
        </div>
      )}
    </div>
  );
}
