import { useEditorStore } from "../store/editor-store.ts";
import { Type, Image, QrCode, Barcode, Square, Minus, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import type { EditorElement } from "../store/types.ts";

const typeIcons: Record<EditorElement["type"], typeof Type> = {
  text: Type,
  image: Image,
  qrcode: QrCode,
  barcode: Barcode,
  rect: Square,
  line: Minus,
};

function getElementLabel(el: EditorElement): string {
  switch (el.type) {
    case "text": {
      const text = (el.props as { text: string }).text;
      return text.length > 20 ? text.slice(0, 20) + "…" : text || "Empty text";
    }
    case "image":
      return "Image";
    case "qrcode":
      return "QR Code";
    case "barcode":
      return "Barcode";
    case "rect":
      return "Rectangle";
    case "line":
      return "Line";
  }
}

export function ElementTree() {
  const elements = useEditorStore((s) => s.elements);
  const selectedId = useEditorStore((s) => s.selectedId);
  const setSelectedId = useEditorStore((s) => s.setSelectedId);
  const moveElement = useEditorStore((s) => s.moveElement);
  const removeElement = useEditorStore((s) => s.removeElement);

  if (elements.length === 0) {
    return (
      <div className="px-3 py-2">
        <h3 className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 mb-2">Elements</h3>
        <p className="text-xs text-gray-400 dark:text-gray-500">No elements yet</p>
      </div>
    );
  }

  // Show in reverse order (top of z-stack first)
  const reversed = [...elements].reverse();

  return (
    <div className="px-3 py-2">
      <h3 className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 mb-2">Elements</h3>
      <div className="flex flex-col gap-0.5">
        {reversed.map((el) => {
          const Icon = typeIcons[el.type];
          const isSelected = el.id === selectedId;
          return (
            <div
              key={el.id}
              className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer text-xs group transition-colors ${
                isSelected
                  ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400"
              }`}
              onClick={() => setSelectedId(isSelected ? null : el.id)}
            >
              <Icon size={13} className="shrink-0" />
              <span className="flex-1 truncate">{getElementLabel(el)}</span>
              <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); moveElement(el.id, "up"); }}
                  title="Move up"
                >
                  <ChevronUp size={12} />
                </button>
                <button
                  className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); moveElement(el.id, "down"); }}
                  title="Move down"
                >
                  <ChevronDown size={12} />
                </button>
                <button
                  className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-red-400 hover:text-red-500 cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); removeElement(el.id); }}
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
